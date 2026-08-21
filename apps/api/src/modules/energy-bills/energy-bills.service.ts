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
    
    - Extraia TODOS os 12 ou 13 meses visíveis na tabela sem omitir as linhas inferiores!
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
    if (raw > 0 && raw < 10 && raw % 1 !== 0) {
      return Math.round(raw * 1000);
    }
    return Math.round(raw);
  }
  const s = String(raw || "").trim();
  if (!s) return 0;
  if (s.includes(".") && s.includes(",")) {
    const clean = s.replace(/\./g, "").replace(",", ".");
    return Math.round(parseFloat(clean));
  }
  if (/^\d{1,3}\.\d{3}$/.test(s)) {
    return parseInt(s.replace(".", ""), 10);
  }
  if (/^\d+,\d+$/.test(s)) {
    return Math.round(parseFloat(s.replace(",", ".")));
  }
  const num = parseFloat(s.replace(/[^0-9.]/g, ""));
  if (num > 0 && num < 10 && num % 1 !== 0) {
    return Math.round(num * 1000);
  }
  return isNaN(num) ? 0 : Math.round(num);
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
      // 1. Baixa o conteúdo do arquivo
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Falha ao baixar arquivo do S3 (Status: ${response.status})`);
      }

      const openAiApiKey = this.config.get<string>("OPENAI_API_KEY");
      let extractedData: Record<string, unknown> | null = null;

      // 2. Se houver OPENAI_API_KEY configurada, tenta extração via OpenAI
      if (openAiApiKey) {
        const ext = extname(fileName).toLowerCase();

        if (ext === ".txt") {
          const fileText = await response.text();
          extractedData = await this.extractDataWithOpenAI(fileText, openAiApiKey);
        } else if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
          const buffer = await response.arrayBuffer();
          const base64Image = Buffer.from(buffer).toString("base64");
          const mimeType = ext === ".png" ? "image/png" : "image/jpeg";
          extractedData = await this.extractVisionWithOpenAI(base64Image, mimeType, openAiApiKey);
        } else if (ext === ".pdf") {
          try {
            const arrayBuf = await response.arrayBuffer();
            const pdfBuffer = Buffer.from(arrayBuf);
            const pdfData = await pdfParse(pdfBuffer);
            const pdfText = pdfData.text || "";
            extractedData = await this.extractDataWithOpenAI(pdfText, openAiApiKey);
          } catch (pdfErr) {
            this.logger.error(`Erro ao ler PDF com pdfParse: ${String(pdfErr)}`);
          }
        } else {
          const text = await response.text();
          extractedData = await this.extractDataWithOpenAI(text, openAiApiKey);
        }
      }

      // 3. Fallback: Se a OpenAI não retornar dados ou a chave não estiver configurada, roda regex local
      if (!extractedData) {
        try {
          const ext = extname(fileName).toLowerCase();
          let fallbackText = "";
          if (ext === ".pdf") {
            const arrayBuf = await response.arrayBuffer();
            const pdfData = await pdfParse(Buffer.from(arrayBuf));
            fallbackText = pdfData.text || "";
          } else {
            fallbackText = await response.text();
          }
          extractedData = this.parseBillText(fallbackText);
        } catch {
          extractedData = null;
        }
      }

      // 4. Salva o resultado
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

    // Heurística de limpeza de dias
    const typicalHighMonths = candidates.filter((c) => c.consumptionKwh >= 60);
    const validLabeled: Array<{ month: string; consumptionKwh: number }> = [];
    for (const item of candidates) {
      if (
        typicalHighMonths.length >= 2 &&
        item.consumptionKwh <= 31 &&
        [28, 29, 30, 31, 22, 27].includes(item.consumptionKwh)
      ) {
        continue;
      }
      validLabeled.push(item);
    }

    // Padronização Solar de 12 meses
    const normalizedHistory = validLabeled.length > 12 ? validLabeled.slice(0, 12) : validLabeled;

    const currentMonthKwh = parseBrazilianKwh(
      parsed["consumptionKwh"] ?? parsed["consumo_mes_atual_kwh"]
    );

    let totalSum = 0;
    let exactAverage = 0;
    const monthCount = normalizedHistory.length;

    if (monthCount > 0) {
      totalSum = normalizedHistory.reduce((acc, curr) => acc + curr.consumptionKwh, 0);
      exactAverage = Math.round(totalSum / monthCount);
    } else if (currentMonthKwh > 0) {
      exactAverage = currentMonthKwh;
      totalSum = exactAverage;
    } else {
      exactAverage = 300;
      totalSum = 300;
    }

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
      consumptionKwh: exactAverage > 0 ? exactAverage : currentMonthKwh || 300,
      simulationMonthlyConsumptionKwh: exactAverage > 0 ? exactAverage : currentMonthKwh || 300,
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
