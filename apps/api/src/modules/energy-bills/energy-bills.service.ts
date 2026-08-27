import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createS3ClientForPresign, presignedPutObjectUrlOptions } from "../../common/s3/s3.util";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma, UtilityProvider } from "@prisma/client";
import { extname } from "node:path";
import { randomUUID } from "node:crypto";
import { assertLeadInTenant } from "../../common/assert-lead-in-tenant";
import { softDeleteWhere as soft } from "../../prisma/soft-delete";
import pdfParse from "pdf-parse";
import { createWorker } from "tesseract.js";

const BILL_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
] as const;

const BILL_EXTRACTION_SYSTEM_PROMPT = `Você é um motor especialista em visão computacional forense e extração de dados estruturados de faturas de energia elétrica brasileiras (Enel, CPFL, Cemig, Copel, Equatorial, Energisa, Neoenergia, Light, EDP, RGE, Celesc, etc.).

Sua missão é extrair com 100% DE PRECISÃO MATEMÁTICA E VISUAL todos os dados da conta de luz, com foco ABSOLUTO em ler sem erros cada número da tabela de Histórico de Consumo/Faturamento.

REGRAS DE LEITURA E PARSING CRÍTICAS:
1. TABELA DE HISTÓRICO DE CONSUMO ("CONSUMO / kWh", "HISTÓRICO DE CONSUMO", "Evolução do Consumo"):
   - Localize a tabela onde constam os meses de histórico faturados (geralmente entre 11 e 13 meses visíveis).
   - LEITURA SEQUENCIAL COMPLETA: Percorra CADA UMA das linhas da tabela, da primeira à última linha impressa, sem pular nenhuma linha.
   - Para CADA linha:
     * Identifique o mês/ano (ex: "AGO/26", "JUL/26", "JUN/26", "MAI/26", "ABR/26", "MAR/26", "FEV/26", "JAN/26", "DEZ/25", "NOV/25", "OUT/25", "SET/25", "AGO/25").
     * Identifique com máxima precisão o valor numérico na coluna de consumo faturado em kWh.
   
    - ATENÇÃO CRÍTICA À COPEL E FATURAS COM HISTÓRICO PARCIAL / MENOS DE 12 MESES:
      * Na Copel e unidades recentes, a tabela traz 13 meses no cabeçalho (ex: JUN26, MAI26, ABR26, MAR26, FEV26, JAN26, DEZ25...), mas apenas os meses ativos contêm números de consumo (ex: JUN26: 189, MAI26: 263, ABR26: 378, MAR26: 355, FEV26: 100). As linhas anteriores estão COMPLETAMENTE EM BRANCO.
      * No texto da fatura, os números da coluna 'Nº DIAS FAT.' (ex: 31, 30, 31, 29, 22) aparecem logo após os consumos. NUNCA atribua esses números de dias como consumo dos meses em branco!
      * Extraia ESTRITAMENTE os meses que possuem consumo medido real (ex: exatamente 5 meses). Meses vazios NÃO DEVEM entrar na lista 'consumptionHistoryLabeled'.

    - ATENÇÃO CRÍTICA À ENERGISA E DISTRIBUIDORAS COM TABELA [MÊS/ANO] [CONSUMO] [DIAS]:
      * Na Energisa e outras distribuidoras, a tabela de histórico traz colunas de Consumo e Dias lado a lado (ex: "OUT/25 1.971 45", "SET/25 2.041 29", "JAN/25 984 31", "DEZ/24 60 31", "NOV/24 59 30", "OUT/24 165 30").
      * O PRIMEIRO número após o mês é SEMPRE o CONSUMO FATURADO em kWh (ex: 1971, 2041, 984, 60, 59, 165).
      * O SEGUNDO número é o NÚMERO DE DIAS do ciclo (ex: 45, 29, 31, 31, 30, 30).
      * NUNCA troque o consumo pelo número de dias! Para "NOV/24 59 30", o consumo é 59 (não 30). Para "DEZ/24 60 31", o consumo é 60 (não 31).
      * Meses com consumo baixo (ex: 59, 60, 139 kWh) são CONSUMOS REAIS e DEVEM ser extraídos obrigatoriamente.
    
    - ATENÇÃO CRÍTICA À FORMATAÇÃO DA ENEL E DISTRIBUIDORAS:
      * Na Enel e diversas distribuidoras, os números na tabela de consumo aparecem formatados com ponto de milhar e 3 casas decimais (ex: "1.198,000", "1.525,000", "1.099,000", "965,000", "967,000", "939,000", "703,000", "698,000", "793,000", "961,000", "699,000", "807,000", "794,000").
      * "1.198,000" significa 1198 kWh. Retorne 1198.
      * "1.525,000" significa 1525 kWh. Retorne 1525.
      * "1.099,000" significa 1099 kWh. Retorne 1099.
      * "965,000" significa 965 kWh. Retorne 965.
      * "703,000" significa 703 kWh. Retorne 703.
    
    - Extraia todos os meses que possuem consumo na tabela sem omitir nenhuma linha preenchida!
    - NUNCA confunda 'consumptionKwh' com:
      * Quantidade de dias de faturamento (ex: 28, 29, 30, 31, 33).
      * Média diária (ex: 12.5 kWh/dia).
      * Demanda contratada ou medida em kW.
      * Leitura do medidor.
      * Valores monetários em R$.
      * Valores de iluminação pública ou multas.
      * Valores de energia injetada / saldo GD.

2. CONSUMO ATIVO E GERAÇÃO DISTRIBUÍDA (GD):
   - Se a fatura tiver créditos solares / GD, utilize sempre o Consumo Ativo Total Faturado/Consumido da rede (coluna de consumo faturado da tabela de histórico).

3. DADOS GERAIS:
   - provider / distribuidora: Nome da concessionária identificada no cabeçalho ou logotipo (ex: Enel, Copel, CPFL, Cemig, Equatorial, Energisa, etc.).
   - cidade: Cidade da unidade consumidora indicada no endereço (ex: SAO PAULO, SAO BERNARDO DO CAMPO, etc.).
   - uf: Sigla do estado com 2 letras (ex: SP, PR, MG, RJ, BA, GO, etc.).
   - tipo_conexao: "Monofásico", "Bifásico" ou "Trifásico" (identifique no campo Tipo de Fornecimento / Ligação).
   - nome_cliente: Nome completo do titular da conta.
   - referenceMonth: Mês/ano de referência da fatura (ex: "08/2026", "02/2026").
   - consumptionKwh: Consumo ativo faturado do mês atual (número inteiro).
   - totalAmount: Valor total a pagar em R$ (número float).

Retorne EXCLUSIVAMENTE um objeto JSON válido no seguinte formato:
{
  "provider": "string",
  "distribuidora": "string",
  "cidade": "string",
  "uf": "string",
  "tipo_conexao": "Monofásico" | "Bifásico" | "Trifásico",
  "nome_cliente": "string",
  "referenceMonth": "string",
  "consumptionKwh": number,
  "totalAmount": number,
  "consumptionHistoryLabeled": [
    { "month": "string", "consumptionKwh": number }
  ]
}`;

function parseBrazilianKwh(raw: unknown): number {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw <= 0) return 0;
    // Se veio como decimal menor que 10 em contexto que representa milhar
    if (raw > 0 && raw < 10 && raw % 1 !== 0) {
      return Math.round(raw * 1000);
    }
    return Math.round(raw);
  }
  const s = String(raw || "").trim();
  if (!s) return 0;

  // Caso 1: Formato Enel / CPFL / Equatorial com ponto de milhar e decimais (ex: "1.198,000" ou "1.525,50")
  if (s.includes(".") && s.includes(",")) {
    const clean = s.replace(/\./g, "").replace(",", ".");
    const parsed = parseFloat(clean);
    return Number.isFinite(parsed) ? Math.round(parsed) : 0;
  }

  // Caso 2: Formato Enel com 3 casas decimais usando vírgula (ex: "1198,000", "965,000", "703,000")
  if (/^\d+,\d{3}$/.test(s)) {
    const parsed = parseFloat(s.replace(",", "."));
    return Number.isFinite(parsed) ? Math.round(parsed) : 0;
  }

  // Caso 3: Ponto de milhar estrito sem vírgula (ex: "1.971", "2.041", "1.198")
  if (/^\d{1,3}\.\d{3}$/.test(s)) {
    const val = parseInt(s.replace(".", ""), 10);
    return Number.isFinite(val) ? val : 0;
  }

  // Caso 4: Decimal com vírgula comum (ex: "350,5", "476,00")
  if (/^\d+,\d+$/.test(s)) {
    const parsed = parseFloat(s.replace(",", "."));
    return Number.isFinite(parsed) ? Math.round(parsed) : 0;
  }

  // Caso 5: String numérica direta com ponto
  const cleanStr = s.replace(/[^0-9.,]/g, "");
  if (cleanStr.includes(",")) {
    const parsed = parseFloat(cleanStr.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(parsed) ? Math.round(parsed) : 0;
  }

  const num = parseFloat(cleanStr);
  if (Number.isFinite(num)) {
    if (num > 0 && num < 10 && num % 1 !== 0) {
      return Math.round(num * 1000);
    }
    return Math.round(num);
  }

  return 0;
}

@Injectable()
export class EnergyBillsService {
  private readonly logger = new Logger(EnergyBillsService.name);
  private readonly region: string;
  private readonly bucketName: string;
  private readonly s3: S3Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {
    this.region = this.config.get<string>("AWS_REGION") ?? "";
    this.bucketName =
      this.config.get<string>("S3_BUCKET_NAME") ?? this.config.get<string>("AWS_S3_BUCKET") ?? "";
    this.s3 = createS3ClientForPresign(this.region || undefined);
  }

  private parseBillText(text: string): {
    consumptionKwh?: number;
    totalAmount?: number;
    referenceMonth?: string;
    rawData?: Record<string, unknown>;
  } {
    const out: {
      consumptionKwh?: number;
      totalAmount?: number;
      referenceMonth?: string;
      rawData?: Record<string, unknown>;
    } = {};
    const t = (text || "").replace(/[\u00A0]/g, " ");

    // buscar consumo em kWh (ex: "350 kWh" ou "350kwh")
    const kwhMatch = t.match(/(\d{1,6}(?:[.,]\d{1,3})?)\s*(kwh|kw-h|kwh\/m[a-z]*)/i);
    if (kwhMatch && kwhMatch[1]) {
      const raw = String(kwhMatch[1]).replace(/\./g, "").replace(/,/, ".");
      const n = Number(raw);
      if (Number.isFinite(n)) out.consumptionKwh = Math.round(n);
    }

    // buscar valor em R$ (ex: R$ 123,45)
    const brlMatch = t.match(/r\$\s*(\d{1,3}(?:[\.\s]\d{3})*(?:,\d{2})?)/i);
    if (brlMatch && brlMatch[1]) {
      const raw = String(brlMatch[1]).replace(/\s/g, "").replace(/\./g, "").replace(/,/, ".");
      const n = Number(raw);
      if (Number.isFinite(n)) out.totalAmount = Number(n.toFixed(2));
    }

    // buscar referência/competência (MM/YYYY ou M/YYYY)
    const refMatch = t.match(
      /(compet[eê]ncia|refer[eê]ncia|referencia)[:\s]*([0-1]?\d\s*\/?\s*(?:20)?\d{2})/i
    );
    if (refMatch && refMatch[2]) {
      out.referenceMonth = String(refMatch[2]).replace(/\s/g, "").replace(/\//, "/");
    } else {
      const mmMatch = t.match(/(0[1-9]|1[0-2])\s*[\/-]\s*(20\d{2}|\d{2})/);
      if (mmMatch) out.referenceMonth = `${mmMatch[1]}/${mmMatch[2]}`;
    }
    out.rawData = { text: t };
    return out;
  }

  private async ensureLeadInTenant(tenantId: string, leadId: string): Promise<void> {
    await assertLeadInTenant(this.prisma, tenantId, leadId);
  }

  private normalizeBillExtension(fileName: string, contentType: string): string {
    const ext = extname(fileName).toLowerCase();
    const ct = contentType.toLowerCase();
    const byType: Record<string, string[]> = {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
    };
    const allowed = byType[ct];
    if (!allowed)
      throw new BadRequestException("Tipo de arquivo não suportado para conta de energia.");
    if (allowed.includes(ext)) return ext;
    return allowed[0]!;
  }

  async createPresignedUploadUrl(
    tenantId: string,
    leadId: string,
    data: { fileName: string; contentType: string }
  ): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
    if (!this.region || !this.bucketName) {
      throw new BadRequestException(
        "Configure as variáveis de ambiente AWS_REGION e S3_BUCKET_NAME."
      );
    }

    const ct = data.contentType.toLowerCase();
    if (!BILL_CONTENT_TYPES.includes(ct as (typeof BILL_CONTENT_TYPES)[number])) {
      throw new BadRequestException("Tipo de arquivo não suportado para conta de energia.");
    }

    await this.ensureLeadInTenant(tenantId, leadId);

    const extension = this.normalizeBillExtension(data.fileName, ct);
    const billId = randomUUID();
    const key = `uploads/bills/${tenantId}/${leadId}/${billId}${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: ct,
    });
    const uploadUrl = await getSignedUrl(this.s3, command, presignedPutObjectUrlOptions(60 * 5));
    const fileUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;

    return { uploadUrl, fileUrl, key };
  }

  async create(
    tenantId: string,
    leadId: string,
    data: { fileUrl: string; fileName: string; provider?: UtilityProvider }
  ) {
    await this.ensureLeadInTenant(tenantId, leadId);

    const bill = await this.prisma.energyBill.create({
      data: {
        tenantId,
        leadId,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        provider: data.provider ?? "COPEL",
        extractionStatus: "PENDING",
      },
    });

    void this.runBillExtractionJob(bill.id, bill.fileUrl, bill.fileName).catch((err) => {
      this.logger.error(
        `Energy bill extraction job crashed billId=${bill.id}`,
        err instanceof Error ? err.stack : String(err)
      );
    });

    return bill;
  }

  private async runOcrOnBuffer(buffer: Buffer): Promise<string> {
    try {
      const worker = await createWorker();
      await worker.loadLanguage("por");
      await worker.initialize("por");
      const {
        data: { text },
      } = await worker.recognize(buffer);
      await worker.terminate();
      return text || "";
    } catch (err) {
      this.logger.error("Erro no OCR Tesseract:", err);
      return "";
    }
  }

  private parseBillTextDeterministic(text: string): {
    distribuidora?: string;
    cidade?: string;
    uf?: string;
    tipo_conexao?: string;
    mes_referencia_atual?: string;
    consumptionKwh?: number;
    totalAmount?: number;
    consumptionHistoryLabeled: Array<{ month: string; consumptionKwh: number }>;
    isComplete: boolean;
    missingFields?: string[];
    fallbackReason?: string;
    rawData?: Record<string, unknown>;
  } {
    const t = (text || "").replace(/[\u00A0\r]/g, " ");
    const lines = t
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    let distribuidora: string | undefined;
    const providers = [
      { name: "COPEL", pattern: /\b(copel|copel\s+distribui[cç][aã]o)\b/i },
      { name: "ENEL", pattern: /\b(enel|eletropaulo|ampla|coelce)\b/i },
      { name: "CPFL", pattern: /\b(cpfl|paulista|piratininga|santa\s+cruz)\b/i },
      { name: "CEMIG", pattern: /\b(cemig|companhia\s+energ[eé]tica\s+de\s+minas)\b/i },
      { name: "EQUATORIAL", pattern: /\b(equatorial|ceal|cepisa|celpa|cemar)\b/i },
      { name: "ENERGISA", pattern: /\b(energisa)\b/i },
      { name: "NEOENERGIA", pattern: /\b(neoenergia|coelba|celpe|cosern|elektro)\b/i },
      { name: "LIGHT", pattern: /\b(light\s+servi[cç]os)\b/i },
      { name: "EDP", pattern: /\b(edp|bandeirante|escelsa)\b/i },
      { name: "RGE", pattern: /\b(rge|rio\s+grande\s+energia)\b/i },
      { name: "CELESC", pattern: /\b(celesc)\b/i },
    ];
    for (const p of providers) {
      if (p.pattern.test(t)) {
        distribuidora = p.name;
        break;
      }
    }

    let consumptionKwh: number | undefined;
    const kwhPatterns = [
      /(?:consumo\s+(?:ativo|faturado|medido|do\s+m[eê]s)?|total\s+consumo)[\s:=]*(\d{1,6}(?:[.,]\d{1,3})?)\s*(?:kwh|kw-h)/i,
      /(\d{1,6}(?:[.,]\d{1,3})?)\s*(?:kwh|kw-h)\s*(?:\/m[eê]s)?/i,
    ];
    for (const p of kwhPatterns) {
      const m = t.match(p);
      if (m && m[1]) {
        const val = parseBrazilianKwh(m[1]);
        if (val > 0 && val < 500000) {
          consumptionKwh = val;
          break;
        }
      }
    }

    let totalAmount: number | undefined;
    const brlPatterns = [
      /(?:total\s+a\s+pagar|valor\s+total|total\s+fatura|valor\s+a\s+pagar|total\s+da\s+fatura)[\s:=]*r\$\s*(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?)/i,
      /r\$\s*(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2}))/i,
    ];
    for (const p of brlPatterns) {
      const m = t.match(p);
      if (m && m[1]) {
        const clean = m[1].replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
        const n = parseFloat(clean);
        if (Number.isFinite(n) && n > 0) {
          totalAmount = Number(n.toFixed(2));
          break;
        }
      }
    }

    let referenceMonth: string | undefined;
    const refMatch = t.match(
      /(?:compet[eê]ncia|refer[eê]ncia|m[eê]s\/ano)[\s:=]*([0-1]?\d\s*\/\s*(?:20)?\d{2})/i
    );
    if (refMatch && refMatch[1]) {
      referenceMonth = refMatch[1].replace(/\s+/g, "");
    } else {
      const mmMatch = t.match(/\b(0[1-9]|1[0-2])[\/-](20\d{2}|\d{2})\b/);
      if (mmMatch) {
        referenceMonth = `${mmMatch[1]}/${mmMatch[2]}`;
      }
    }

    let tipo_conexao: string | undefined;
    if (/trif[aá]sico/i.test(t)) {
      tipo_conexao = "Trifásico";
    } else if (/bif[aá]sico/i.test(t)) {
      tipo_conexao = "Bifásico";
    } else if (/monof[aá]sico/i.test(t)) {
      tipo_conexao = "Monofásico";
    }

    const ufList = [
      "AC",
      "AL",
      "AP",
      "AM",
      "BA",
      "CE",
      "DF",
      "ES",
      "GO",
      "MA",
      "MT",
      "MS",
      "MG",
      "PA",
      "PB",
      "PR",
      "PE",
      "PI",
      "RJ",
      "RN",
      "RS",
      "RO",
      "RR",
      "SC",
      "SP",
      "SE",
      "TO",
    ];
    let cidade: string | undefined;
    let uf: string | undefined;

    // 1. Procura primeiro Cidade/UF próximo a CEP ou endereço da unidade consumidora
    // Ex: "87000-000 MARINGÁ - PR", "MARINGA / PR CEP: 87013-000", "Maringá, PR", "Maringá - PR"
    const cepCityUfMatch = t.match(
      /(?:\d{5}[-\s]?\d{3}[\s,.-]+([A-ZÁ-Ú\s]{3,35})\s*[-/]\s*([A-Z]{2})|([A-ZÁ-Ú\s]{3,35})\s*[-/]\s*([A-Z]{2})[\s,.-]+(?:CEP|\d{5}))/i
    );
    if (cepCityUfMatch) {
      const candCity = (cepCityUfMatch[1] || cepCityUfMatch[3] || "").trim();
      const candUf = (cepCityUfMatch[2] || cepCityUfMatch[4] || "").toUpperCase();
      if (ufList.includes(candUf) && candCity.length >= 3) {
        cidade = candCity;
        uf = candUf;
      }
    }

    // 2. Se não encontrou por CEP, procura em linhas de endereço (evitando a linha de sede/CNPJ da Copel "Curitiba - PR")
    if (!cidade || !uf) {
      const cityMatches = [...t.matchAll(/([A-ZÁ-Ú\s]{3,30})\s*[-/]\s*([A-Z]{2})\b/gi)];
      for (const cm of cityMatches) {
        const candUf = cm[2]?.toUpperCase() || "";
        const candCity = (cm[1] || "").trim();
        if (!ufList.includes(candUf)) continue;
        const low = candCity.toLowerCase();
        // Ignora termos de cabeçalho / emissão / sede administrativa da Copel se houver outra cidade
        if (
          low.includes("emissao") ||
          low.includes("vencimento") ||
          low.includes("distribuicao") ||
          low.includes("distribuidora")
        ) {
          continue;
        }
        // Se a fatura é da Copel e a primeira ocorrência é Curitiba (sede), guarda como fallback mas continua buscando a cidade real do cliente
        if (distribuidora === "COPEL" && low.includes("curitiba") && cityMatches.length > 1) {
          if (!cidade) {
            cidade = candCity;
            uf = candUf;
          }
          continue;
        }
        cidade = candCity;
        uf = candUf;
        break;
      }
    }

    // 6. Histórico de Consumo
    const historyCandidates: Array<{ month: string; consumptionKwh: number }> = [];

    // Formato Copel / Tabela Compacta (ex: "JUL26 201 31"):
    const historySectionMatch = t.match(
      /(?:HIST[OÓ]RICO\s+DE\s+CONSUMO|CONSUMO\s+FATURADO)[\s\S]{1,1500}?(?=(?:INFORMA[CÇ][OÕ]ES|AVISO|TRIBUTOS|TOTAL|$))/i
    );
    const historyText = historySectionMatch ? historySectionMatch[0] : t;

    const copelRowRegex =
      /\b(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)[\s\/\-_]*(20\d{2}|\d{2})?\b\s+(\d{1,5}(?:[.,]\d{1,3})?)(?:\s+(\d{1,3}))?/gi;

    for (const match of historyText.matchAll(copelRowRegex)) {
      const monStr = match[1]?.toUpperCase();
      if (!monStr) continue;
      const yr = match[2] ? (match[2].length === 2 ? `20${match[2]}` : match[2]) : "";
      const label = yr ? `${monStr}/${yr}` : monStr;
      const kwh = parseBrazilianKwh(match[3]);
      if (kwh > 0 && kwh < 500000) {
        historyCandidates.push({ month: label, consumptionKwh: kwh });
      }
    }

    // Formato 1: Padrão Energisa / CPFL / Cemig / Enel (se não encontrou via formato Copel)
    if (historyCandidates.length < 3) {
      const distributorRowRegex =
        /\b(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ|0[1-9]|1[0-2])[\s\/\-_]*(20\d{2}|\d{2})?\b[^\d\n]*(\d{1,3}(?:\.\d{3})*(?:,\d{1,3})?|\d{1,6}(?:,\d{1,3})?)(?:\s+(\d{1,3}))?/i;

      for (const line of lines) {
        const m = line.match(distributorRowRegex);
        if (m && m[1]) {
          let monStr = m[1].toUpperCase();
          const monthMap: Record<string, string> = {
            "01": "JAN",
            "02": "FEV",
            "03": "MAR",
            "04": "ABR",
            "05": "MAI",
            "06": "JUN",
            "07": "JUL",
            "08": "AGO",
            "09": "SET",
            "10": "OUT",
            "11": "NOV",
            "12": "DEZ",
          };
          if (monthMap[monStr]) monStr = monthMap[monStr]!;
          const yr = m[2] ? (m[2].length === 2 ? `20${m[2]}` : m[2]) : "";
          const label = yr ? `${monStr}/${yr}` : monStr;
          const kwh = parseBrazilianKwh(m[3]);
          if (kwh > 0 && kwh < 500000) {
            historyCandidates.push({ month: label, consumptionKwh: kwh });
          }
        }
      }
    }

    // Formato 2: Meses em linha e consumos abaixo
    if (historyCandidates.length < 3) {
      const months = [
        ...historyText.matchAll(
          /\b(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)[\s\/\-_]*(20\d{2}|\d{2})?\b/gi
        ),
      ];
      if (months.length >= 3) {
        const nums = [...historyText.matchAll(/\b(\d{1,5})\b/g)]
          .map((m) => parseInt(m[1]!, 10))
          .filter((n) => n >= 50 && n < 50000);

        if (nums.length >= 3) {
          for (let i = 0; i < Math.min(months.length, nums.length, 13); i++) {
            const m = months[i];
            const num = nums[i];
            if (!m || !num) continue;
            const mon = m[1]?.toUpperCase() || "MES";
            const yr = m[2] ? (m[2].length === 2 ? `20${m[2]}` : m[2]) : "";
            historyCandidates.push({
              month: yr ? `${mon}/${yr}` : mon,
              consumptionKwh: num,
            });
          }
        }
      }
    }

    const seenMonths = new Set<string>();
    const deduplicatedHistory: Array<{ month: string; consumptionKwh: number }> = [];
    for (const item of historyCandidates) {
      if (!seenMonths.has(item.month)) {
        seenMonths.add(item.month);
        deduplicatedHistory.push(item);
      }
    }

    const normalizedHistory =
      deduplicatedHistory.length > 12 ? deduplicatedHistory.slice(0, 12) : deduplicatedHistory;

    if (!consumptionKwh && normalizedHistory.length > 0) {
      consumptionKwh = normalizedHistory[0]?.consumptionKwh;
    }
    if (!referenceMonth && normalizedHistory.length > 0) {
      referenceMonth = normalizedHistory[0]?.month;
    }

    const missingFields: string[] = [];
    if (!distribuidora) missingFields.push("Distribuidora");
    if (!cidade) missingFields.push("Cidade");
    if (!uf) missingFields.push("UF");
    if (!consumptionKwh && normalizedHistory.length === 0) missingFields.push("Consumo do Mês");
    if (normalizedHistory.length < 3)
      missingFields.push(
        `Histórico incompleto (${normalizedHistory.length} meses encontrados, mínimo 3)`
      );

    const isComplete = missingFields.length === 0;

    return {
      distribuidora,
      cidade,
      uf,
      tipo_conexao,
      mes_referencia_atual: referenceMonth,
      consumptionKwh,
      totalAmount,
      consumptionHistoryLabeled: normalizedHistory,
      isComplete,
      missingFields,
      fallbackReason: isComplete
        ? undefined
        : `OCR determinístico acionou a IA porque faltou: ${missingFields.join(", ")}`,
      rawData: { text: t },
    };
  }

  private async runBillExtractionJob(
    billId: string,
    fileUrl: string,
    fileName: string
  ): Promise<void> {
    this.logger.log(`Energy bill extraction start billId=${billId} fileName=${fileName}`);

    await this.prisma.energyBill.update({
      where: { id: billId },
      data: { extractionStatus: "PROCESSING", extractionError: null },
    });

    try {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Falha ao baixar arquivo do S3 (Status: ${response.status})`);
      }

      const openAiApiKey = this.config.get<string>("OPENAI_API_KEY");
      let extractedData: Record<string, unknown> | null = null;
      const ext = extname(fileName).toLowerCase();

      // --- CAMADA 1: OCR DETERMINÍSTICO PRIMEIRO (Tesseract / PDF Text Layer) ---
      let rawText = "";
      let arrayBuffer: ArrayBuffer | null = null;

      if (ext === ".txt") {
        rawText = await response.text();
      } else if (ext === ".pdf") {
        try {
          arrayBuffer = await response.arrayBuffer();
          const pdfBuffer = Buffer.from(arrayBuffer);
          const pdfData = await pdfParse(pdfBuffer);
          rawText = pdfData.text || "";
          if (!rawText || rawText.trim().length < 30) {
            rawText = await this.runOcrOnBuffer(pdfBuffer);
          }
        } catch (pdfErr) {
          this.logger.warn(`Erro leitura PDF com pdfParse: ${String(pdfErr)}`);
        }
      } else if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
        try {
          arrayBuffer = await response.arrayBuffer();
          const imgBuffer = Buffer.from(arrayBuffer);
          rawText = await this.runOcrOnBuffer(imgBuffer);
        } catch (ocrErr) {
          this.logger.warn(`Erro no OCR da imagem: ${String(ocrErr)}`);
        }
      }

      let extractionEngine: "OCR" | "AI_FALLBACK" = "AI_FALLBACK";
      let fallbackReason: string | undefined;

      if (rawText && rawText.trim().length > 30) {
        const deterministic = this.parseBillTextDeterministic(rawText);
        if (deterministic.isComplete && deterministic.consumptionHistoryLabeled.length >= 3) {
          extractedData = this.processExtractedResultWithMath(
            deterministic as unknown as Record<string, unknown>
          );
          extractionEngine = "OCR";
          this.logger.log(
            `Energy bill extracted via OCR determinístico 100% (Economia total de tokens IA) billId=${billId}`
          );
        } else {
          fallbackReason = deterministic.fallbackReason;
        }
      } else {
        fallbackReason =
          "Texto insuficiente extraído da camada do documento (<30 caracteres). Acionando visão computacional/IA.";
      }

      // --- CAMADA 2: IA COMO FALLBACK (Apenas se OCR não cobriu tudo e houver chave) ---
      if (!extractedData && openAiApiKey) {
        this.logger.log(
          `OCR precisou de complemento da IA. Acionando fallback billId=${billId}. Motivo: ${fallbackReason}`
        );
        extractionEngine = "AI_FALLBACK";
        if (ext === ".txt" || (ext === ".pdf" && rawText && rawText.trim().length >= 30)) {
          extractedData = await this.extractDataWithOpenAI(rawText, openAiApiKey);
        } else if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
          const buf = arrayBuffer
            ? Buffer.from(arrayBuffer)
            : Buffer.from(await response.arrayBuffer());
          const base64Image = buf.toString("base64");
          const mimeType = ext === ".png" ? "image/png" : "image/jpeg";
          extractedData = await this.extractVisionWithOpenAI(base64Image, mimeType, openAiApiKey);
        } else if (rawText) {
          extractedData = await this.extractDataWithOpenAI(rawText, openAiApiKey);
        }
      }

      // --- CAMADA 3: FALLBACK REGEX DETERMINÍSTICO LOCAL ---
      if (!extractedData && rawText) {
        const localParsed = this.parseBillTextDeterministic(rawText);
        extractedData = this.processExtractedResultWithMath(
          localParsed as unknown as Record<string, unknown>
        );
        extractionEngine = "OCR";
      }

      if (extractedData) {
        extractedData["extractionEngine"] = extractionEngine;
        if (fallbackReason) {
          extractedData["fallbackReason"] = fallbackReason;
        }
        if (extractedData["rawData"] && typeof extractedData["rawData"] === "object") {
          (extractedData["rawData"] as Record<string, unknown>)["extractionEngine"] =
            extractionEngine;
          if (fallbackReason) {
            (extractedData["rawData"] as Record<string, unknown>)["fallbackReason"] =
              fallbackReason;
          }
        }
      }

      // Salva o resultado
      await this.setExtractionResult(billId, {
        extractedData: extractedData ?? {},
        extractionError: undefined,
      });

      this.logger.log(`Energy bill extraction completed billId=${billId}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Energy bill extraction error billId=${billId}: ${errorMsg}`);

      await this.setExtractionResult(billId, {
        extractedData: null,
        extractionError: `Erro na extração: ${errorMsg}`,
      });
    }
  }

  private processExtractedResultWithMath(parsed: Record<string, unknown>): Record<string, unknown> {
    const rawList = Array.isArray(parsed["consumptionHistoryLabeled"])
      ? (parsed["consumptionHistoryLabeled"] as Array<Record<string, unknown>>)
      : Array.isArray(parsed["historico_consumo"])
        ? (parsed["historico_consumo"] as Array<Record<string, unknown>>)
        : [];

    const candidates: Array<{ month: string; consumptionKwh: number }> = [];
    for (const item of rawList) {
      if (!item || typeof item !== "object") continue;
      const month = String(
        item["month"] || item["mes_ano"] || item["mes"] || item["label"] || ""
      ).trim();
      const rawVal =
        item["consumptionKwh"] ?? item["consumo_kwh"] ?? item["consumo"] ?? item["kwh"];
      const val = parseBrazilianKwh(rawVal);
      if (Number.isFinite(val) && val > 0 && val < 500000) {
        candidates.push({
          month: month || `Mês ${candidates.length + 1}`,
          consumptionKwh: Math.round(val),
        });
      }
    }

    // Heurística de limpeza de dias: se a lista contém uma sequência de consumos reais (>= 50 kWh)
    // seguida por números baixos que correspondem à coluna de dias (<= 35 kWh), descartamos os dias
    const validLabeled: Array<{ month: string; consumptionKwh: number }> = [];
    const highCount = candidates.filter((c) => c.consumptionKwh >= 50).length;

    for (let idx = 0; idx < candidates.length; idx++) {
      const item = candidates[idx];
      if (!item) continue;
      // Se já temos consumos reais antes e este item está no final da lista com valor típico de dias (<= 35)
      if (
        highCount >= 2 &&
        idx >= highCount &&
        item.consumptionKwh <= 35 &&
        [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35].includes(
          item.consumptionKwh
        )
      ) {
        continue;
      }
      validLabeled.push(item);
    }

    // Padronização Solar de 12 meses
    const normalizedHistory = validLabeled.length > 12 ? validLabeled.slice(0, 12) : validLabeled;

    const rawCurrentKwh = parseBrazilianKwh(
      parsed["consumptionKwh"] ?? parsed["consumo_mes_atual_kwh"]
    );

    let totalSum = 0;
    let exactAverage = 0;
    const monthCount = normalizedHistory.length;

    if (monthCount > 0) {
      totalSum = normalizedHistory.reduce((acc, curr) => acc + curr.consumptionKwh, 0);
      exactAverage = Math.round(totalSum / monthCount);
    } else if (rawCurrentKwh > 0) {
      exactAverage = rawCurrentKwh;
      totalSum = exactAverage;
    } else {
      exactAverage = 300;
      totalSum = 300;
    }

    const currentMonthKwh =
      rawCurrentKwh > 0
        ? rawCurrentKwh
        : normalizedHistory.length > 0
          ? (normalizedHistory[0]?.consumptionKwh ?? exactAverage)
          : exactAverage;

    const consumptionHistoryKwh = normalizedHistory.map((v) => v.consumptionKwh);

    const cidade = String(parsed["cidade"] || "").trim();
    const uf = String(parsed["uf"] || "")
      .trim()
      .toUpperCase();
    const location = cidade && uf ? `${cidade} - ${uf}` : cidade || uf || undefined;

    return {
      ...parsed,
      location,
      cidade: cidade || undefined,
      uf: uf || undefined,
      provider: parsed["provider"] || parsed["distribuidora"] || undefined,
      distribuidora: parsed["distribuidora"] || parsed["provider"] || undefined,
      consumptionKwh: currentMonthKwh,
      currentMonthConsumptionKwh: currentMonthKwh,
      averageConsumptionKwh: exactAverage,
      simulationMonthlyConsumptionKwh: exactAverage,
      consumptionHistoryLabeled: normalizedHistory,
      consumptionHistoryKwh,
      totalSumKwh: totalSum,
      monthCount,
      rawData: {
        ...parsed,
        location,
        cidade,
        uf,
        consumptionHistoryLabeled: normalizedHistory,
        consumptionHistoryKwh,
        currentMonthConsumptionKwh: currentMonthKwh,
        simulationMonthlyConsumptionKwh: exactAverage,
      },
    };
  }

  private async extractDataWithOpenAI(
    text: string,
    apiKey: string
  ): Promise<Record<string, unknown> | null> {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: BILL_EXTRACTION_SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: `Extraia com máxima precisão todos os dados e TODOS os meses do histórico de consumo do seguinte texto de fatura de energia:\n\n${text}`,
            },
          ],
        }),
      });

      if (!response.ok) return null;
      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;
      const parsed = JSON.parse(content) as Record<string, unknown>;
      return this.processExtractedResultWithMath(parsed);
    } catch {
      return null;
    }
  }

  private async extractVisionWithOpenAI(
    base64Image: string,
    mimeType: string,
    apiKey: string
  ): Promise<Record<string, unknown> | null> {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: BILL_EXTRACTION_SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analise minuciosamente a imagem desta conta de luz em alta resolução. Extraia todos os dados gerais e TODOS os meses da tabela de histórico de consumo/faturamento sem omitir nenhum mês:",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`,
                    detail: "high",
                  },
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) return null;
      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) return null;
      const parsed = JSON.parse(content) as Record<string, unknown>;
      return this.processExtractedResultWithMath(parsed);
    } catch {
      return null;
    }
  }

  async findByLead(tenantId: string, leadId: string) {
    return this.prisma.energyBill.findMany({
      where: { tenantId, leadId, ...soft },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(tenantId: string, id: string) {
    const bill = await this.prisma.energyBill.findFirst({
      where: { id, tenantId, ...soft },
      include: { lead: { select: { id: true, name: true, email: true } } },
    });
    if (!bill) throw new NotFoundException("Conta de energia não encontrada.");
    return bill;
  }

  async setExtractionResult(
    id: string,
    data: { extractedData: object | null; extractionError?: string }
  ) {
    return this.prisma.energyBill.update({
      where: { id },
      data: {
        extractedData: data.extractionError
          ? Prisma.DbNull
          : (data.extractedData as Prisma.InputJsonValue),
        extractionStatus: data.extractionError ? "FAILED" : "COMPLETED",
        extractionError: data.extractionError ?? null,
      },
    });
  }

  async softDelete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.energyBill.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
