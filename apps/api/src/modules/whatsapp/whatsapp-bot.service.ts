/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { WhatsappCloudService } from "./whatsapp-cloud.service";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { computeProjectCostSection } from "@energivia/proposal-economia";
import pdfParse from "pdf-parse";
import { createWorker } from "tesseract.js";
import fs from "node:fs";
import path from "node:path";
import { AiUsageService } from "../ai-usage/ai-usage.service";
import { AiFeature } from "@prisma/client";

export interface ExtractedBillHistoryItem {
  mes_ano: string;
  consumo_kwh: number;
  dias?: number;
  media_kwh_dia?: number;
}

export interface ExtractedBillData {
  distribuidora?: string;
  cidade?: string;
  uf?: string;
  tipo_conexao?: "Monofásico" | "Bifásico" | "Trifásico" | string;
  nome_cliente?: string;
  codigo_instalacao_ou_uc?: string;
  mes_referencia_atual?: string;
  consumo_mes_atual_kwh?: number;
  valor_total_fatura_reais?: number;
  historico_consumo: ExtractedBillHistoryItem[];
  tem_geracao_distribuida?: boolean;
  energia_injetada_kwh?: number;
  observacoes?: string;
}

export interface BillExtractionResult {
  data: ExtractedBillData;
  exactAverageKwh: number;
  totalSumKwh: number;
  monthCount: number;
  formattedSummary: string;
  rawText?: string;
}

interface WebhookMessage {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  document?: { id?: string; filename?: string; mime_type?: string };
  image?: { id?: string; caption?: string; mime_type?: string };
  audio?: { id?: string };
  voice?: { id?: string };
}

interface WebhookPayload {
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: Array<{ profile?: { name?: string } }>;
        messages?: WebhookMessage[];
      };
    }>;
  }>;
}

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
      * Extraia ESTRITAMENTE os meses que possuem consumo medido real (ex: exatamente 5 meses). Meses vazios NÃO DEVEM entrar na lista 'historico_consumo'.

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
   - NUNCA confunda 'consumo_kwh' com:
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
   - distribuidora: Nome da concessionária identificada no cabeçalho ou logotipo (ex: Enel, Copel, CPFL, Cemig, Equatorial, Energisa, etc.).
   - cidade: Cidade da unidade consumidora indicada no endereço (ex: SAO PAULO).
   - uf: Sigla do estado com 2 letras (ex: SP, PR, MG, RJ, BA, GO, etc.).
   - tipo_conexao: "Monofásico" | "Bifásico" | "Trifásico" (identifique no campo Tipo de Fornecimento / Ligação).
   - nome_cliente: Nome completo do titular da conta.
   - mes_referencia_atual: Mês/ano de referência da fatura (ex: "08/2026").
   - consumo_mes_atual_kwh: Consumo ativo faturado do mês atual (número inteiro).
   - valor_total_fatura_reais: Valor total a pagar em R$ (número float).

Retorne EXCLUSIVAMENTE um objeto JSON válido no seguinte formato:
{
  "distribuidora": "string",
  "cidade": "string",
  "uf": "string",
  "tipo_conexao": "Monofásico" | "Bifásico" | "Trifásico",
  "nome_cliente": "string",
  "mes_referencia_atual": "string",
  "consumo_mes_atual_kwh": number,
  "valor_total_fatura_reais": number,
  "historico_consumo": [
    { "mes_ano": "string", "consumo_kwh": number, "dias": number }
  ]
}`;

function parseBrazilianKwh(raw: unknown): number {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw <= 0) return 0;
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

function processExtractedBillData(data: ExtractedBillData, rawText?: string): BillExtractionResult {
  const rawList = Array.isArray(data.historico_consumo) ? data.historico_consumo : [];

  const candidates: ExtractedBillHistoryItem[] = [];
  for (const item of rawList) {
    if (!item) continue;
    const label = String(item.mes_ano || "").trim();
    const rawVal =
      item.consumo_kwh ??
      (item as unknown as Record<string, unknown>)["consumo"] ??
      (item as unknown as Record<string, unknown>)["kwh"];
    const val = parseBrazilianKwh(rawVal);

    if (Number.isFinite(val) && val > 0 && val < 500000) {
      candidates.push({
        mes_ano: label || `Mês ${candidates.length + 1}`,
        consumo_kwh: Math.round(val),
        dias: item.dias ? Number(item.dias) : undefined,
        media_kwh_dia: item.media_kwh_dia ? Number(item.media_kwh_dia) : undefined,
      });
    }
  }

  // Heurística de limpeza de dias: se a lista contém uma sequência de consumos reais (>= 50 kWh)
  // seguida por números baixos que correspondem à coluna de dias (<= 35 kWh), descartamos os dias
  const validHistory: ExtractedBillHistoryItem[] = [];
  const highCount = candidates.filter((c) => c.consumo_kwh >= 50).length;

  for (let idx = 0; idx < candidates.length; idx++) {
    const item = candidates[idx];
    if (!item) continue;
    // Se já temos consumos reais antes e este item está no final da lista com valor típico de dias (<= 35)
    if (
      highCount >= 2 &&
      idx >= highCount &&
      item.consumo_kwh <= 35 &&
      [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35].includes(item.consumo_kwh)
    ) {
      continue;
    }
    validHistory.push(item);
  }

  const normalizedHistory = validHistory.length > 12 ? validHistory.slice(0, 12) : validHistory;
  const rawCurrentKwh = parseBrazilianKwh(data.consumo_mes_atual_kwh);
  const currentMonthKwh =
    rawCurrentKwh > 0
      ? rawCurrentKwh
      : normalizedHistory.length > 0
        ? (normalizedHistory[0]?.consumo_kwh ?? 0)
        : 0;

  let totalSum = 0;
  let exactAverage = 0;
  let monthCount = normalizedHistory.length;

  if (monthCount > 0) {
    totalSum = normalizedHistory.reduce((acc, curr) => acc + curr.consumo_kwh, 0);
    exactAverage = Math.round(totalSum / monthCount);
  } else if (currentMonthKwh > 0) {
    exactAverage = currentMonthKwh;
    totalSum = exactAverage;
    monthCount = 1;
  } else {
    exactAverage = 300;
    totalSum = 300;
    monthCount = 0;
  }

  const baseTexto =
    monthCount > 1
      ? `baseado no histórico de ${monthCount} meses da fatura`
      : `baseado no consumo do mês atual da fatura`;
  const formattedSummary = `Legal, dados extraídos com precisão! Consumo médio de ${exactAverage} kWh/mês em ${data.cidade || "São Paulo"}/${data.uf || "SP"} (${baseTexto}).`;

  return {
    data: {
      ...data,
      historico_consumo: normalizedHistory,
    },
    exactAverageKwh: exactAverage,
    totalSumKwh: totalSum,
    monthCount,
    formattedSummary,
    rawText,
  };
}

const UF_TO_STATE_NAME: Record<string, string> = {
  AC: "ACRE",
  AL: "ALAGOAS",
  AP: "AMAPA",
  AM: "AMAZONAS",
  BA: "BAHIA",
  CE: "CEARA",
  DF: "DISTRITO FEDERAL",
  ES: "ESPIRITO SANTO",
  GO: "GOIAS",
  MA: "MARANHAO",
  MT: "MATO GROSSO",
  MS: "MATO GROSSO DO SUL",
  MG: "MINAS GERAIS",
  PA: "PARA",
  PB: "PARAIBA",
  PR: "PARANA",
  PE: "PERNAMBUCO",
  PI: "PIAUI",
  RJ: "RIO DE JANEIRO",
  RN: "RIO GRANDE DO NORTE",
  RS: "RIO GRANDE DO SUL",
  RO: "RONDONIA",
  RR: "RORAIMA",
  SC: "SANTA CATARINA",
  SP: "SAO PAULO",
  SE: "SERGIPE",
  TO: "TOCANTINS",
};

const STATE_NAME_TO_UF: Record<string, string> = {
  ACRE: "AC",
  ALAGOAS: "AL",
  AMAPA: "AP",
  AMAZONAS: "AM",
  BAHIA: "BA",
  CEARA: "CE",
  "DISTRITO FEDERAL": "DF",
  "ESPIRITO SANTO": "ES",
  GOIAS: "GO",
  MARANHAO: "MA",
  "MATO GROSSO": "MT",
  "MATO GROSSO DO SUL": "MS",
  "MINAS GERAIS": "MG",
  PARA: "PA",
  PARAIBA: "PB",
  PARANA: "PR",
  PERNAMBUCO: "PE",
  PIAUI: "PI",
  "RIO DE JANEIRO": "RJ",
  "RIO GRANDE DO NORTE": "RN",
  "RIO GRANDE DO SUL": "RS",
  RONDONIA: "RO",
  RORAIMA: "RR",
  "SANTA CATARINA": "SC",
  "SAO PAULO": "SP",
  SERGIPE: "SE",
  TOCANTINS: "TO",
};

function normalizeTextSimple(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function parseLocationString(input: string): { city: string; uf: string } {
  if (!input) return { city: "", uf: "" };
  let raw = input.trim();
  let uf = "";

  // Procura padrão de UF no fim (ex: "/SP", "- SP", " SP", ", SP", "(SP)")
  const ufMatch = raw.match(/[\s\/\-\(,]([A-Za-z]{2})\)?$/);
  if (ufMatch && ufMatch[1] && UF_TO_STATE_NAME[ufMatch[1].toUpperCase()]) {
    uf = ufMatch[1].toUpperCase();
    raw = raw.substring(0, ufMatch.index).trim();
  }

  // Remove caracteres residuais no fim
  raw = raw.replace(/[\s\/\-\(,]+$/, "").trim();

  return { city: raw, uf };
}

let cachedHspCsv: string[] | null = null;
function getHsp(
  cidade: string,
  estado?: string
): { hsp: number; city: string; uf: string; exact: boolean } {
  const parsed = parseLocationString(cidade);
  const searchCity = parsed.city || cidade || "São Paulo";
  const searchUf = (estado || parsed.uf || "").toUpperCase();

  try {
    if (!cachedHspCsv) {
      const candidates = [
        path.join(process.cwd(), "hsp_brasil_todos_municipios hsp_medio_anual.csv"),
        path.join(process.cwd(), "..", "hsp_brasil_todos_municipios hsp_medio_anual.csv"),
        path.join(process.cwd(), "..", "..", "hsp_brasil_todos_municipios hsp_medio_anual.csv"),
        path.join(__dirname, "..", "..", "..", "hsp_brasil_todos_municipios hsp_medio_anual.csv"),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          cachedHspCsv = fs.readFileSync(p, "utf8").split("\n");
          break;
        }
      }
    }

    if (cachedHspCsv) {
      const normSearchCity = normalizeTextSimple(searchCity);
      const targetStateName = UF_TO_STATE_NAME[searchUf]
        ? normalizeTextSimple(UF_TO_STATE_NAME[searchUf])
        : normalizeTextSimple(searchUf);

      let fallbackMatch: { hsp: number; city: string; uf: string; exact: boolean } | null = null;

      for (let i = 1; i < cachedHspCsv.length; i++) {
        const line = cachedHspCsv[i];
        if (!line) continue;
        const cols = line.split(";");
        if (cols.length >= 7) {
          const csvCityNorm = normalizeTextSimple(cols[3] || "");
          const csvStateNorm = normalizeTextSimple(cols[5] || "");
          const hspVal = parseInt(cols[6] || "", 10);
          if (isNaN(hspVal) || hspVal <= 0) continue;

          if (csvCityNorm === normSearchCity) {
            const foundUf = STATE_NAME_TO_UF[csvStateNorm] || searchUf || "SP";
            if (targetStateName && csvStateNorm === targetStateName) {
              return {
                hsp: hspVal / 1000,
                city: cols[3] || searchCity,
                uf: foundUf,
                exact: true,
              };
            }
            if (!fallbackMatch) {
              fallbackMatch = {
                hsp: hspVal / 1000,
                city: cols[3] || searchCity,
                uf: foundUf,
                exact: false,
              };
            }
          }
        }
      }

      if (fallbackMatch) return fallbackMatch;
    }
  } catch {
    // Fallback gracioso
  }

  const UF_FALLBACK: Record<string, number> = {
    SP: 4.8,
    PR: 4.9,
    MG: 5.3,
    RJ: 5.0,
    BA: 5.4,
    SC: 4.9,
    RS: 4.8,
    GO: 5.6,
    MT: 5.4,
    MS: 5.5,
    CE: 5.7,
    PE: 5.3,
    RN: 5.7,
    PB: 5.6,
    AL: 5.5,
    SE: 5.4,
    PI: 5.6,
    MA: 5.3,
    PA: 4.8,
    AM: 4.5,
    TO: 5.4,
    RO: 4.8,
    AC: 4.8,
    RR: 5.1,
    AP: 4.9,
    ES: 5.1,
    DF: 5.5,
  };

  const finalUf = searchUf || "SP";
  return {
    hsp: UF_FALLBACK[finalUf] || 5.0,
    city: searchCity || "São Paulo",
    uf: finalUf,
    exact: false,
  };
}

const SESSION_INACTIVITY_MS = 5 * 60 * 1000; // 5 minutos

import { WhatsappPairingService } from "./whatsapp-pairing.service";

function expandInboundPhoneCandidates(raw: string): string[] {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return [];
  const out = new Set<string>();
  out.add(digits);
  if (digits.startsWith("55") && digits.length >= 12) {
    const without55 = digits.slice(2);
    out.add(without55);
    if (without55.length === 10) {
      out.add(`${without55.slice(0, 2)}9${without55.slice(2)}`);
    }
    if (without55.length === 11 && without55.charAt(2) === "9") {
      out.add(`${without55.slice(0, 2)}${without55.slice(3)}`);
    }
  } else if (digits.length === 10) {
    out.add(`${digits.slice(0, 2)}9${digits.slice(2)}`);
    out.add(`55${digits}`);
    out.add(`55${digits.slice(0, 2)}9${digits.slice(2)}`);
  } else if (digits.length === 11) {
    if (digits.charAt(2) === "9") {
      out.add(`${digits.slice(0, 2)}${digits.slice(3)}`);
    }
    out.add(`55${digits}`);
  }
  return [...out];
}

@Injectable()
export class WhatsappBotService {
  private readonly logger = new Logger(WhatsappBotService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly whatsappCloud: WhatsappCloudService,
    private readonly whatsappPairing: WhatsappPairingService,
    private readonly aiUsage: AiUsageService
  ) {
    const geminiKey =
      this.config.get<string>("GOOGLE_GEMINI_API_KEY") ||
      this.config.get<string>("GEMINI_API_KEY") ||
      "";
    if (geminiKey) {
      this.genAI = new GoogleGenerativeAI(geminiKey);
    }
  }

  async handleWebhookPayload(payload: WebhookPayload): Promise<void> {
    if (!payload || !payload.entry || !Array.isArray(payload.entry)) {
      return;
    }

    for (const entry of payload.entry) {
      const changes = entry.changes;
      if (!changes || !Array.isArray(changes)) continue;

      for (const change of changes) {
        if (change.field !== "messages") continue;
        const val = change.value;
        if (!val || !val.messages || !Array.isArray(val.messages)) continue;

        const metadata = val.metadata;
        const phoneNumberId =
          metadata?.phone_number_id || this.config.get<string>("WHATSAPP_PHONE_NUMBER_ID") || "";
        const contacts = val.contacts || [];

        for (const message of val.messages) {
          await this.processSingleMessage({
            message,
            phoneNumberId,
            contactName: contacts[0]?.profile?.name || "Integrador",
          });
        }
      }
    }
  }

  private async resolveAuthorizedTenant(fromWaId: string) {
    const candidates = expandInboundPhoneCandidates(fromWaId);

    const boundPhone = await this.prisma.tenantWhatsappInboundPhone.findFirst({
      where: {
        phoneDigits: { in: candidates },
      },
      include: {
        organization: {
          include: {
            subscription: true,
          },
        },
      },
    });

    if (boundPhone && boundPhone.organization) {
      return boundPhone.organization;
    }

    return null;
  }

  private isTenantPlanActive(tenant: {
    createdAt: Date;
    subscription?: { status: string } | null;
  }): boolean {
    if (tenant.subscription && tenant.subscription.status === "active") {
      return true;
    }

    const diffTime = Math.abs(Date.now() - new Date(tenant.createdAt).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) {
      return true;
    }

    return true;
  }

  private async processSingleMessage({
    message,
    phoneNumberId,
    contactName,
  }: {
    message: WebhookMessage;
    phoneNumberId: string;
    contactName: string;
  }): Promise<void> {
    const waMessageId = message.id;
    const fromWaId = message.from;
    const msgType = message.type;

    if (!waMessageId || !fromWaId) return;

    // 1. Deduplicação de Webhook
    const existing = await this.prisma.whatsappInboundMessage.findUnique({
      where: { waMessageId },
    });
    if (existing) {
      this.logger.debug(`Mensagem duplicada ignorada: ${waMessageId}`);
      return;
    }

    // 2. Extração inicial do texto para verificar comando de pareamento
    let incomingText = "";
    if (msgType === "text") {
      incomingText = (message.text?.body || "").trim();
    }

    // 3. Verificação de Código de Pareamento (Token de Ativação)
    const pairingMatch = incomingText.match(/(?:CONECTAR[ -]*)?(\b\d{6}\b)/i);
    if (pairingMatch && pairingMatch[1]) {
      const code = pairingMatch[1];
      const pairingInfo = this.whatsappPairing.consumePairingCode(code);
      if (pairingInfo) {
        const cleanDigits = fromWaId.replace(/\D/g, "");
        const candidates = expandInboundPhoneCandidates(fromWaId);

        // Remove número de outra organização se estivesse cadastrado
        await this.prisma.tenantWhatsappInboundPhone.deleteMany({
          where: { phoneDigits: { in: candidates } },
        });

        // Cadastra o número na organização correta
        await this.prisma.tenantWhatsappInboundPhone.create({
          data: {
            organizationId: pairingInfo.organizationId,
            phoneDigits: cleanDigits.startsWith("55") ? cleanDigits.slice(2) : cleanDigits,
            label: `WhatsApp de ${contactName}`,
          },
        });

        const successMsg =
          `🎉 *WhatsApp Vinculado com Sucesso!* ☀️\n\n` +
          `Seu número foi conectado à empresa *${pairingInfo.organizationName}*.\n` +
          `Status: *Autorizado e Ativo* ✅\n\n` +
          `A partir de agora, você pode me enviar contas de luz (PDF ou foto) ou solicitar dimensionamentos solares diretamente por aqui!`;

        await this.whatsappCloud.sendTextMessage({
          phoneNumberId,
          toWaId: fromWaId,
          body: successMsg,
        });
        return;
      }
    }

    // 4. Resolução da Organização / Tenant do Integrador
    const tenant = await this.resolveAuthorizedTenant(fromWaId);
    if (!tenant) {
      this.logger.warn(`Número não autorizado tentando usar o bot: ${fromWaId}`);
      const salesMsg =
        `Olá! ☀️ O assistente de inteligência artificial da *EnergivIA* é um recurso exclusivo para integradores parceiros credenciados.\n\n` +
        `Para vincular este WhatsApp à sua conta:\n` +
        `1️⃣ Acesse a plataforma: *https://www.energivia.com.br*\n` +
        `2️⃣ Clique no botão *"IA no WhatsApp"* no topo da tela e envie o código gerado aqui.\n\n` +
        `Se você ainda não possui um plano ativo, conheça nossos recursos e comece a gerar propostas solares em segundos:\n` +
        `👉 *https://www.energivia.com.br*`;

      await this.whatsappCloud.sendTextMessage({
        phoneNumberId,
        toWaId: fromWaId,
        body: salesMsg,
      });
      return;
    }

    // 5. Verificação de Assinatura / Plano Ativo
    if (!this.isTenantPlanActive(tenant)) {
      this.logger.warn(`Plano expirado para organização ${tenant.id} no WhatsApp ${fromWaId}`);
      const expiredMsg =
        `Olá! Identificamos que o período de acesso da sua organização na EnergivIA precisa ser renovado. ☀️\n\n` +
        `Para continuar utilizando o assistente de IA, dimensionamentos e propostas comerciais automáticas pelo WhatsApp, escolha o seu plano em:\n` +
        `👉 *https://www.energivia.com.br/gestao/meus-planos*`;

      await this.whatsappCloud.sendTextMessage({
        phoneNumberId,
        toWaId: fromWaId,
        body: expiredMsg,
      });
      return;
    }

    // 4. Busca ou criação da Conversa vinculada à Organização do Integrador
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        organizationId: tenant.id,
        channel: "whatsapp",
        title: fromWaId,
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    const isNewMedia = msgType === "document" || msgType === "image";

    if (conversation && conversation.messages.length > 0) {
      const lastMsg = conversation.messages[conversation.messages.length - 1];
      const timeSinceLastMsg = lastMsg ? Date.now() - new Date(lastMsg.createdAt).getTime() : 0;

      // Se inativo por mais de 5min OU enviou nova fatura (PDF/imagem):
      if ((lastMsg && timeSinceLastMsg > SESSION_INACTIVITY_MS) || isNewMedia) {
        this.logger.log(`Resetando contexto para nova sessão: de=${fromWaId}`);
        await this.prisma.message.deleteMany({
          where: { conversationId: conversation.id },
        });

        conversation = await this.prisma.conversation.findUnique({
          where: { id: conversation.id },
          include: { messages: { orderBy: { createdAt: "asc" } } },
        });
      }
    }

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          organizationId: tenant.id,
          channel: "whatsapp",
          title: fromWaId,
          metadata: {
            customerWaId: fromWaId,
            contactName,
            phoneNumberId,
          },
        },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
    }

    await this.prisma.whatsappInboundMessage.create({
      data: {
        waMessageId,
        conversationId: conversation.id,
      },
    });

    // 5. Extração de Conteúdo (Fatura / Texto / Imagem)
    let extractionResult: BillExtractionResult | null = null;

    this.logger.log(`Mensagem recebida do WhatsApp: tipo=${msgType}, de=${fromWaId}`);

    if (msgType === "text") {
      incomingText = message.text?.body || "";
      const lowerText = incomingText.toLowerCase().trim();
      if (
        lowerText === "novo" ||
        lowerText === "reiniciar" ||
        lowerText === "nova cotação" ||
        lowerText === "nova cotacao"
      ) {
        await this.prisma.message.deleteMany({
          where: { conversationId: conversation.id },
        });
        const resetMsg = `Sessão reiniciada com sucesso! ☀️\n\nEnvie a conta de luz do seu cliente (PDF ou foto) ou digite o consumo médio em kWh para começarmos uma nova simulação.`;
        await this.whatsappCloud.sendTextMessage({
          phoneNumberId,
          toWaId: fromWaId,
          body: resetMsg,
        });
        return;
      }
    } else if (msgType === "document") {
      const doc = message.document;
      incomingText = `[Documento enviado: ${doc?.filename || "fatura.pdf"}]`;
      if (doc?.id) {
        this.logger.log(`Iniciando extração do PDF mediaId=${doc.id}`);
        extractionResult = await this.extractFromMediaDocument(doc.id, doc.mime_type);
      }
    } else if (msgType === "image") {
      const img = message.image;
      incomingText = `[Foto enviada: ${img?.caption || "Foto da fatura"}]`;
      if (img?.id) {
        this.logger.log(`Iniciando extração da imagem mediaId=${img.id}`);
        extractionResult = await this.extractFromMediaImage(img.id, img.mime_type);
      }
    } else if (msgType === "audio" || msgType === "voice") {
      incomingText = "[Mensagem de áudio recebida]";
    } else {
      incomingText = `[Mensagem do tipo ${msgType} recebida]`;
    }

    // Salva a mensagem do usuário no banco
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: incomingText,
        channel: "whatsapp",
        metadata: extractionResult
          ? {
              exactAverageKwh: extractionResult.exactAverageKwh,
              monthCount: extractionResult.monthCount,
              totalSumKwh: extractionResult.totalSumKwh,
              cidade: extractionResult.data.cidade,
              uf: extractionResult.data.uf,
            }
          : undefined,
      },
    });

    // Atualiza conversa com a nova mensagem
    const freshConversation = await this.prisma.conversation.findUnique({
      where: { id: conversation.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    // 6. Gera a resposta pelo motor de estado do bot e gera a proposta real
    const replyText = await this.generateBotResponse({
      conversation: freshConversation || conversation,
      incomingText,
      extractionResult,
    });

    if (replyText) {
      await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          content: replyText,
          channel: "whatsapp",
        },
      });

      await this.whatsappCloud.sendTextMessage({
        phoneNumberId,
        toWaId: fromWaId,
        body: replyText,
      });
    }
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
      this.logger.error("Erro no OCR Tesseract WhatsApp:", err);
      return "";
    }
  }

  private parseBillTextDeterministic(text: string): {
    data: ExtractedBillData;
    isComplete: boolean;
  } {
    const t = (text || "").replace(/[\u00A0\r]/g, " ");

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

    // 5. Cidade / UF
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

    // 1. Procura primeiro Cidade/UF no bloco de Unidade Consumidora / Endereço / CEP
    const cepCityUfMatch = t.match(
      /(?:(?:MUNIC[IÍ]PIO|CIDADE|LOCAL(?:IDADE)?|ENDERE[CÇ]O|UNIDADE\s+CONSUMIDORA)[\s:=]+([A-ZÁ-Ú\s]{3,35})\s*[-/]\s*([A-Z]{2})|\d{5}[-\s]?\d{3}[\s,.-]+([A-ZÁ-Ú\s]{3,35})\s*[-/]\s*([A-Z]{2})|([A-ZÁ-Ú\s]{3,35})\s*[-/]\s*([A-Z]{2})[\s,.-]+(?:CEP|\d{5}))/i
    );
    if (cepCityUfMatch) {
      const candCity = (cepCityUfMatch[1] || cepCityUfMatch[2] || cepCityUfMatch[3] || "").trim();
      const candUf = (cepCityUfMatch[2] || cepCityUfMatch[4] || "").toUpperCase();
      if (ufList.includes(candUf) && candCity.length >= 3) {
        cidade = candCity;
        uf = candUf;
      }
    }

    // 2. Se não encontrou ou capturou Curitiba da Copel, faz busca em todas as ocorrências de CIDADE - UF
    const cityMatches = [...t.matchAll(/([A-ZÁ-Ú\s]{3,30})\s*[-/]\s*([A-Z]{2})\b/gi)];
    const validMatches: Array<{ city: string; uf: string }> = [];

    for (const cm of cityMatches) {
      const candUf = cm[2]?.toUpperCase() || "";
      const candCity = (cm[1] || "").trim();
      if (!ufList.includes(candUf)) continue;
      const low = candCity.toLowerCase();
      if (
        low.includes("emissao") ||
        low.includes("vencimento") ||
        low.includes("distribuicao") ||
        low.includes("distribuidora") ||
        low.includes("biazetto") ||
        low.includes("sede") ||
        low.includes("protocolo") ||
        low.includes("cnpj")
      ) {
        continue;
      }
      validMatches.push({ city: candCity, uf: candUf });
    }

    if (distribuidora === "COPEL") {
      const nonCuritiba = validMatches.find((m) => !m.city.toLowerCase().includes("curitiba"));
      if (nonCuritiba) {
        cidade = nonCuritiba.city;
        uf = nonCuritiba.uf;
      } else if (!cidade && validMatches.length > 0) {
        cidade = validMatches[0]?.city;
        uf = validMatches[0]?.uf;
      }
    } else if (validMatches.length > 0 && !cidade) {
      cidade = validMatches[0]?.city;
      uf = validMatches[0]?.uf;
    }

    // 6. Histórico de Consumo
    const historyCandidates: ExtractedBillHistoryItem[] = [];

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

    let historyText = t;
    const historySectionMatch = t.match(
      /(?:HIST[OÓ]RICO\s+DE\s+CONSUMO|CONSUMO\s+FATURADO|EVOLU[CÇ][AÃ]O\s+DO\s+CONSUMO|HIST[OÓ]RICO)[\s\S]{1,2000}/i
    );
    if (historySectionMatch) {
      historyText = historySectionMatch[0];
    }

    const rowRegex =
      /\b(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ|0[1-9]|1[0-2])[\s\/\-_]*(20\d{2}|\d{2})?\b(?=([^\n\r]{0,60}))/gi;
    const matches = [...historyText.matchAll(rowRegex)];

    for (const m of matches) {
      if (!m[1]) continue;
      let monStr = m[1].toUpperCase();

      if (m[1].match(/^\d{2}$/) && !m[2]) {
        continue;
      }

      if (monthMap[monStr]) monStr = monthMap[monStr]!;
      const yr = m[2] ? (m[2].length === 2 ? `20${m[2]}` : m[2]) : "";
      const label = yr ? `${monStr}/${yr}` : monStr;

      const restOfLine = m[3] || "";
      const numberMatches = [...restOfLine.matchAll(/\b(\d{1,5}(?:[.,]\d{1,3})?)\b/g)];

      const validNumbers = numberMatches
        .map((nm) => parseBrazilianKwh(nm[1]))
        .filter(
          (n) => n > 0 && n < 50000 && ![2022, 2023, 2024, 2025, 2026, 2027, 2028].includes(n)
        );

      if (validNumbers.length > 0) {
        let consumption = 0;
        const possibleConsumptions = validNumbers.filter((n) => n > 35);
        if (possibleConsumptions.length > 0 && typeof possibleConsumptions[0] === "number") {
          consumption = possibleConsumptions[0];
        } else {
          consumption = Math.max(...validNumbers);
        }
        historyCandidates.push({ mes_ano: label, consumo_kwh: consumption });
      }
    }

    const seenMonths = new Set<string>();
    const deduplicatedHistory: ExtractedBillHistoryItem[] = [];
    for (const item of historyCandidates) {
      if (!seenMonths.has(item.mes_ano)) {
        seenMonths.add(item.mes_ano);
        deduplicatedHistory.push(item);
      }
    }

    const normalizedHistory =
      deduplicatedHistory.length > 12 ? deduplicatedHistory.slice(0, 12) : deduplicatedHistory;

    if (!consumptionKwh && normalizedHistory.length > 0) {
      consumptionKwh = normalizedHistory[0]?.consumo_kwh;
    }
    if (!referenceMonth && normalizedHistory.length > 0) {
      referenceMonth = normalizedHistory[0]?.mes_ano;
    }

    const missingFields: string[] = [];
    if (!distribuidora) missingFields.push("Distribuidora");
    if (!cidade) missingFields.push("Cidade");
    if (!uf) missingFields.push("UF");
    if (!consumptionKwh && normalizedHistory.length === 0) missingFields.push("Consumo do Mês");
    if (normalizedHistory.length < 6)
      missingFields.push(
        `Histórico parcial (${normalizedHistory.length} meses encontrados pelo OCR, acionando IA para conferência de todos os meses)`
      );

    const isComplete = missingFields.length === 0;

    return {
      data: {
        distribuidora,
        cidade,
        uf,
        tipo_conexao,
        mes_referencia_atual: referenceMonth,
        consumo_mes_atual_kwh: consumptionKwh,
        valor_total_fatura_reais: totalAmount,
        historico_consumo: normalizedHistory,
      },
      isComplete,
    };
  }

  private async extractFromMediaDocument(
    mediaId: string,
    mimeType?: string
  ): Promise<BillExtractionResult | null> {
    try {
      const media = await this.whatsappCloud.downloadWhatsappMedia(mediaId);
      if (!media || !media.buffer) return null;

      let text = "";
      if (media.mimeType.includes("pdf") || mimeType?.includes("pdf")) {
        try {
          const parsed = await pdfParse(media.buffer);
          text = parsed.text || "";
        } catch {
          // ignora erro pdfParse
        }
        if (!text || text.trim().length < 30) {
          text = await this.runOcrOnBuffer(media.buffer);
        }
      } else {
        text = await this.runOcrOnBuffer(media.buffer);
      }

      if (text && text.trim().length > 30) {
        // Envia o texto extraído pelo OCR/PDF diretamente para a IA interpretar com precisão
        const aiParsed = await this.parseBillTextWithAI(text);
        if (aiParsed) {
          this.logger.log(
            "Fatura WhatsApp interpretada com sucesso pela IA a partir do texto OCR/PDF."
          );
          return aiParsed;
        }

        // Fallback determinístico offline se a IA falhar
        const deterministic = this.parseBillTextDeterministic(text);
        return processExtractedBillData(deterministic.data, text);
      }
    } catch (e) {
      this.logger.error("Erro extraindo PDF da fatura:", e);
    }
    return null;
  }

  private async extractFromMediaImage(
    mediaId: string,
    mimeType?: string
  ): Promise<BillExtractionResult | null> {
    try {
      const media = await this.whatsappCloud.downloadWhatsappMedia(mediaId);
      if (!media || !media.buffer) return null;

      // 1. Visão Computacional Direta da IA (enxerga com 100% de nitidez toda a tabela de 12 meses)
      const openAiKey = this.config.get<string>("OPENAI_API_KEY");
      if (openAiKey) {
        const fromVision = await this.extractImageWithOpenAI(
          media.buffer,
          media.mimeType || mimeType || "image/jpeg",
          openAiKey
        );
        if (fromVision) return fromVision;
      }

      if (this.genAI) {
        try {
          const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          const result = await model.generateContent([
            BILL_EXTRACTION_SYSTEM_PROMPT,
            {
              inlineData: {
                data: media.buffer.toString("base64"),
                mimeType: media.mimeType || mimeType || "image/jpeg",
              },
            },
          ]);

          const respText = result.response.text();
          const clean = respText
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
          const parsed = JSON.parse(clean) as ExtractedBillData;
          return processExtractedBillData(parsed);
        } catch (geminiErr) {
          this.logger.error("Erro extraindo imagem com Gemini no WhatsApp:", geminiErr);
        }
      }

      // 2. Fallback OCR Tesseract local se nenhuma API de IA de visão estiver disponível
      const ocrText = await this.runOcrOnBuffer(media.buffer);
      if (ocrText && ocrText.trim().length > 30) {
        const deterministic = this.parseBillTextDeterministic(ocrText);
        return processExtractedBillData(deterministic.data, ocrText);
      }
    } catch (e) {
      this.logger.error("Erro extraindo imagem da fatura:", e);
    }
    return null;
  }

  private async parseBillTextWithAI(
    pdfText: string,
    organizationId?: string | null
  ): Promise<BillExtractionResult | null> {
    if (!pdfText || pdfText.trim().length === 0) return null;

    const openAiKey = this.config.get<string>("OPENAI_API_KEY");
    if (openAiKey) {
      const startTime = Date.now();
      const model = "gpt-4o";
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openAiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: BILL_EXTRACTION_SYSTEM_PROMPT },
              {
                role: "user",
                content: `Extraia com máxima precisão todos os dados e TODOS os meses do histórico de consumo do seguinte texto de fatura de energia:\n\n${pdfText}`,
              },
            ],
          }),
        });

        const latencyMs = Date.now() - startTime;
        if (response.ok) {
          const json = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
            usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
          };

          if (json.usage) {
            void this.aiUsage.logUsage({
              organizationId,
              feature: AiFeature.WHATSAPP_BOT,
              model,
              promptTokens: json.usage.prompt_tokens || 0,
              completionTokens: json.usage.completion_tokens || 0,
              totalTokens: json.usage.total_tokens || 0,
              latencyMs,
              status: "SUCCESS",
            });
          }

          const content = json.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content) as ExtractedBillData;
            return processExtractedBillData(parsed, pdfText);
          }
        } else {
          void this.aiUsage.logUsage({
            organizationId,
            feature: AiFeature.WHATSAPP_BOT,
            model,
            latencyMs,
            status: "ERROR",
            errorMessage: `OpenAI HTTP ${response.status}`,
          });
        }
      } catch (err) {
        this.logger.error("Erro extraindo texto com OpenAI:", err);
      }
    }

    if (this.genAI) {
      const startTime = Date.now();
      const modelName = "gemini-1.5-flash";
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(
          `${BILL_EXTRACTION_SYSTEM_PROMPT}\n\nTexto da fatura:\n${pdfText}`
        );
        const latencyMs = Date.now() - startTime;
        const usage = result.response.usageMetadata;
        if (usage) {
          void this.aiUsage.logUsage({
            organizationId,
            provider: "google",
            feature: AiFeature.WHATSAPP_BOT,
            model: modelName,
            promptTokens: usage.promptTokenCount || 0,
            completionTokens: usage.candidatesTokenCount || 0,
            totalTokens: usage.totalTokenCount || 0,
            latencyMs,
            status: "SUCCESS",
          });
        }

        const respText = result.response.text();
        const clean = respText
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();
        const parsed = JSON.parse(clean) as ExtractedBillData;
        return processExtractedBillData(parsed, pdfText);
      } catch (err) {
        this.logger.error("Erro extraindo texto com Gemini:", err);
      }
    }

    return null;
  }

  private async extractImageWithOpenAI(
    buffer: Buffer,
    mimeType: string,
    apiKey: string,
    organizationId?: string | null
  ): Promise<BillExtractionResult | null> {
    const startTime = Date.now();
    const model = "gpt-4o";
    try {
      const base64 = buffer.toString("base64");
      const dataUrl = `data:${mimeType};base64,${base64}`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: BILL_EXTRACTION_SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analise minuciosamente a imagem desta conta de luz em alta resolução. Extraia todos os dados gerais e TODOS os meses da tabela de histórico de consumo/faturamento sem omitir nenhum mês:",
                },
                { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
              ],
            },
          ],
        }),
      });

      const latencyMs = Date.now() - startTime;
      if (response.ok) {
        const json = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
        };

        if (json.usage) {
          void this.aiUsage.logUsage({
            organizationId,
            feature: AiFeature.OCR_BILL_VISION,
            model,
            promptTokens: json.usage.prompt_tokens || 0,
            completionTokens: json.usage.completion_tokens || 0,
            totalTokens: json.usage.total_tokens || 0,
            latencyMs,
            status: "SUCCESS",
          });
        }

        const content = json.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content) as ExtractedBillData;
          return processExtractedBillData(parsed);
        }
      } else {
        void this.aiUsage.logUsage({
          organizationId,
          feature: AiFeature.OCR_BILL_VISION,
          model,
          latencyMs,
          status: "ERROR",
          errorMessage: `OpenAI HTTP ${response.status}`,
        });
      }
    } catch (e) {
      this.logger.error("Erro extraindo imagem com OpenAI:", e);
    }
    return null;
  }

  private async calculateDistributorKits({
    consumptionKwh,
    targetKWp,
    targetModules,
    modPowerWUser,
    cidade,
    estado,
    roofType,
    gridVoltage,
  }: {
    consumptionKwh?: number;
    targetKWp?: number;
    targetModules?: number;
    modPowerWUser?: number;
    cidade?: string;
    estado?: string;
    roofType?: string;
    gridVoltage?: string;
  }) {
    let mappedRoof = "ceramic";
    const s = (roofType || "").toLowerCase().trim();
    if (s === "1" || s.includes("ceramic") || s.includes("cerâmica") || s.includes("colonial")) {
      mappedRoof = "ceramic";
    } else if (
      s === "2" ||
      s.includes("fibrocimento") ||
      s.includes("fibro") ||
      s.includes("fibromadeira")
    ) {
      mappedRoof = "fibromadeira";
    } else if (s === "6" || s.includes("fibrometal")) {
      mappedRoof = "fibrometal";
    } else if (s === "3" || s.includes("metal") || s.includes("metálic")) {
      mappedRoof = "metal";
    } else if (s === "4" || s.includes("solo") || s.includes("ground")) {
      mappedRoof = "ground";
    } else if (s === "5" || s.includes("laje")) {
      mappedRoof = "laje";
    } else if (s === "7" || s.includes("sem") || s.includes("nenhum") || s === "none") {
      mappedRoof = "none";
    }

    const forcedIncludeStructure = mappedRoof !== "none";
    const roofFactor = 1.0;
    const hspResult = getHsp(cidade || "São Paulo", estado || "SP");
    const hsp = hspResult.hsp;
    const perdas = 0.284;
    const pr = 1 - perdas; // 0.716
    const geracaoPorKwp = hsp * 30 * pr;

    let finalTargetKWp: number | null = null;
    if (typeof targetKWp === "number" && targetKWp > 0) {
      finalTargetKWp = targetKWp;
    } else if (
      typeof targetModules === "number" &&
      targetModules > 0 &&
      typeof modPowerWUser === "number" &&
      modPowerWUser > 0
    ) {
      finalTargetKWp = (targetModules * modPowerWUser) / 1000;
    } else if (typeof consumptionKwh === "number" && consumptionKwh > 0) {
      const consumoAjustado = consumptionKwh * 1.07;
      finalTargetKWp = consumoAjustado / (geracaoPorKwp * roofFactor);
    } else {
      finalTargetKWp = 3.0; // fallback padrão seguro
    }

    const distributors = await this.prisma.distributor.findMany({
      include: {
        distributorProducts: {
          include: { product: { include: { brand: true, category: true } } },
        },
      },
    });

    const quotes: Array<{
      distributorName: string;
      distributorId?: string;
      totalPrice: number;
      kwp: number;
      estimatedGeneration: number;
      items: string[];
      invName: string;
      modCount: number;
      modName: string;
      structuredItems?: Array<{
        productId: string;
        productName: string;
        brandName: string;
        categoryName: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
        imageUrl?: string;
        specs?: Record<string, unknown>;
      }>;
    }> = [];

    for (const d of distributors) {
      const prods = d.distributorProducts || [];
      if (prods.length === 0) continue;

      const allProds = prods.map((dp) => ({
        ...dp,
        price: Number(dp.price) || 0,
      }));

      const invs = allProds.filter(
        (p: any) => p.price > 0 && JSON.stringify(p).toLowerCase().includes("inversor")
      );
      const mods = allProds.filter(
        (p: any) =>
          p.price > 0 &&
          (JSON.stringify(p).toLowerCase().includes("módulo") ||
            JSON.stringify(p).toLowerCase().includes("modulo") ||
            JSON.stringify(p).toLowerCase().includes("painel"))
      );
      const cabs = allProds.filter(
        (p: any) => p.price > 0 && JSON.stringify(p).toLowerCase().includes("cabo")
      );
      const cons = allProds.filter(
        (p: any) => p.price > 0 && JSON.stringify(p).toLowerCase().includes("conector")
      );
      const ests = allProds.filter(
        (p: any) =>
          p.price > 0 &&
          (JSON.stringify(p).toLowerCase().includes("estrutura") ||
            JSON.stringify(p).toLowerCase().includes("perfil"))
      );

      // Escolhe o melhor módulo (preferência pelo de potência pedida se houver, ou primeiro módulo válido)
      let mod = mods.find((m) => {
        const sp = m.product?.specs as Record<string, any> | undefined;
        const pw = Number(sp?.["power_w"]);
        return modPowerWUser && pw === modPowerWUser;
      });
      if (!mod) {
        const validMods = mods.filter((m) => {
          const sp = m.product?.specs as Record<string, any> | undefined;
          return !!sp?.["power_w"];
        });
        mod = validMods.length > 0 ? validMods[0] : mods[0];
      }
      if (!mod) continue;

      const modSpecs = mod.product?.specs as Record<string, any> | undefined;
      let modPowerW = Number(modSpecs?.["power_w"]);
      if (!modPowerW) {
        const modName = (mod.product?.name || "").toUpperCase();
        const modMatch = modName.match(/(\d{3,4})\s*W/);
        if (modMatch && modMatch[1]) modPowerW = parseInt(modMatch[1], 10);
        else modPowerW = modPowerWUser || 550;
      }

      let moduleQ = targetModules ? targetModules : Math.ceil((finalTargetKWp * 1000) / modPowerW);
      let realKWp = (moduleQ * modPowerW) / 1000;
      const estGeneration = Math.round(realKWp * geracaoPorKwp * roofFactor);

      // Inversores compatíveis com a tensão/padrão de rede
      const validInvs = [];
      for (const invObj of invs) {
        const specs = invObj.product?.specs as Record<string, any> | undefined;
        const name = (invObj.product?.name || "").toUpperCase();
        const voltSpec = String(
          specs?.["output_voltage_v"] || specs?.["ac_output_voltage"] || ""
        ).toUpperCase();

        // Checa compatibilidade com gridVoltage
        if (gridVoltage) {
          const g = gridVoltage.toLowerCase();
          const isTri380 =
            g.includes("380") ||
            g === "4" ||
            g.includes("tri 380") ||
            g.includes("tri_380") ||
            g.includes("trifasico 380") ||
            g.includes("trifásico 380");
          const isTri220 =
            (g.includes("tri") && g.includes("220")) ||
            g === "3" ||
            g.includes("tri 220") ||
            g.includes("tri_220") ||
            g.includes("trifasico 220") ||
            g.includes("trifásico 220");
          const isMono220 =
            g.includes("mono") || g === "1" || g.includes("monofasico") || g.includes("monofásico");
          const isBi220 =
            g.includes("bi") || g === "2" || g.includes("bifasico") || g.includes("bifásico");

          if (isTri380) {
            const isMatch380 =
              name.includes("380V") ||
              name.includes("380") ||
              voltSpec.includes("380") ||
              ((name.includes("TRIFASICO") || name.includes("TRIFÁSICO")) &&
                !name.includes("220V") &&
                !name.includes("-LV"));
            if (!isMatch380) continue;
          } else if (isTri220) {
            const isMatch220 =
              (name.includes("TRIFASICO") || name.includes("TRIFÁSICO")) &&
              (name.includes("220V") ||
                name.includes("220") ||
                name.includes("-LV") ||
                voltSpec.includes("220"));
            if (!isMatch220) continue;
          } else if (isMono220 || isBi220) {
            if (
              name.includes("380V") ||
              name.includes("380") ||
              name.includes("TRIFASICO") ||
              name.includes("TRIFÁSICO")
            ) {
              continue;
            }
          }
        }

        let testModuleQ = moduleQ;
        if (
          (name.includes("MONOF") || name.includes("MONO")) &&
          testModuleQ < 4 &&
          !targetModules
        ) {
          testModuleQ = 4;
        }
        const testRealKWp = (testModuleQ * modPowerW) / 1000;

        const match = name.match(/(\d+(?:[.,]\d+)?)\s*(K?W)/);
        let invKWp = null;

        if (match && match[1]) {
          invKWp = parseFloat(match[1].replace(",", "."));
          if (match[2] === "W") invKWp = invKWp / 1000;
        } else if (specs && specs["max_dc_power"]) {
          invKWp = Number(specs["max_dc_power"]) / 1000;
        } else {
          invKWp = finalTargetKWp;
        }

        const ratio = testRealKWp / invKWp;
        if (ratio < 0.45 || ratio > 1.55) continue;

        validInvs.push({
          ...invObj,
          _testModuleQ: testModuleQ,
          _testRealKWp: testRealKWp,
        });
      }

      if (validInvs.length === 0) continue;

      validInvs.sort((a, b) => Number(a.price) - Number(b.price));
      const inv = validInvs[0];
      if (!inv) continue;

      moduleQ = inv._testModuleQ;
      realKWp = inv._testRealKWp;

      const cabPreto =
        cabs.find((c: any) => JSON.stringify(c).toLowerCase().includes("preto")) || cabs[0];
      const cabVermelho =
        cabs.find((c: any) => JSON.stringify(c).toLowerCase().includes("vermelho")) ||
        (cabs.length > 1 && cabs[1] !== cabPreto ? cabs[1] : null);
      const con = cons[0];

      const matchedEsts = ests.filter((p: any) => {
        const n = (p.product?.name || "").toLowerCase();
        const d = (p.product?.description || "").toLowerCase();
        const s = n + " " + d;

        if (mappedRoof === "fibrometal") return s.includes("fibrometal");
        if (mappedRoof === "fibromadeira") {
          if (n.includes("fibromadeira") || n.includes("fibrocimento")) return true;
          if (
            (d.includes("fibromadeira") || d.includes("fibrocimento")) &&
            !n.includes("metal") &&
            !n.includes("ceramica") &&
            !n.includes("colonial")
          )
            return true;
          return false;
        }
        if (mappedRoof === "metal") return s.includes("metal") && !s.includes("fibrometal");
        return s.includes(mappedRoof);
      });

      const parsedEsts = matchedEsts
        .map((p: any) => {
          const n = (p.product?.name || "").toUpperCase();
          const m = n.match(/(\d+)\s*(MOD|PAIN|PLAC)/);
          let cap = m ? parseInt(m[1], 10) : 0;
          if (cap > 4 && mappedRoof !== "ground") {
            cap = 0;
          }
          return { ...p, cap };
        })
        .filter((p) => p.cap > 0);

      const selectedStructures: any[] = [];
      if (parsedEsts.length > 0) {
        let remaining = moduleQ;
        const bestByCap: Record<number, any> = {};
        for (const p of parsedEsts) {
          if (!bestByCap[p.cap] || Number(p.price) < Number(bestByCap[p.cap].price)) {
            bestByCap[p.cap] = p;
          }
        }
        const uniqueCaps = Object.values(bestByCap).sort((a: any, b: any) => b.cap - a.cap);

        while (remaining > 0) {
          let best = uniqueCaps.find((p: any) => p.cap <= remaining);
          if (!best) {
            const larger = [...uniqueCaps].sort((a: any, b: any) => a.cap - b.cap);
            best = larger.find((p: any) => p.cap >= remaining);
          }
          if (!best) break;
          selectedStructures.push(best);
          remaining -= best.cap;
        }
      } else if (matchedEsts.length > 0) {
        selectedStructures.push(matchedEsts[0]);
      }

      // Se o usuário selecionou uma estrutura e o distribuidor NÃO tem estrutura cadastrada, pula
      if (forcedIncludeStructure && selectedStructures.length === 0) {
        continue;
      }

      let profileQty = 0;
      let profileProd: any = null;

      if (forcedIncludeStructure) {
        const perfis = ests.filter((p: any) => {
          const n = (p.product?.name || "").toLowerCase();
          return n.includes("perfil") && !n.includes("s/ perfil") && !n.includes("sem perfil");
        });

        if (perfis.length > 0) {
          if (mappedRoof === "metal") {
            profileProd =
              perfis.find((p: any) => {
                const n = (p.product?.name || "").toLowerCase();
                return n.includes("baixo") || n.includes("mini trilho");
              }) || perfis[0];
          } else {
            profileProd =
              perfis.find((p: any) => {
                const n = (p.product?.name || "").toLowerCase();
                return (
                  !n.includes("baixo") && !n.includes("mini trilho") && !n.includes("fechamento")
                );
              }) || perfis[0];
          }

          if (mappedRoof === "metal") {
            for (const est of selectedStructures) {
              if (est.cap === 4) profileQty += 10;
              else if (est.cap === 2) profileQty += 5;
              else profileQty += Math.ceil((est.cap || 1) * 2.5);
            }
            if (moduleQ % 2 !== 0) profileQty += 1;
          } else if (mappedRoof === "ground") {
            profileQty = 1;
          } else {
            profileQty = moduleQ % 2 === 0 ? moduleQ : moduleQ + 1;
          }
        }
      }

      let precoEst = 0;
      const estLines: string[] = [];
      if (forcedIncludeStructure && selectedStructures.length > 0) {
        const counts = new Map<string, number>();
        for (const est of selectedStructures) {
          precoEst += Number(est.price) || 0;
          const name = est.product?.name || "Estrutura de Fixação";
          counts.set(name, (counts.get(name) || 0) + 1);
        }
        for (const [name, count] of counts.entries()) {
          estLines.push(`- Estrutura: ${count}x ${name}`);
        }
      }

      const precoInv = Number(inv.price) || 0;
      const precoMod = (Number(mod.price) || 0) * moduleQ;
      const precoCabPreto = cabPreto ? Number(cabPreto.price) || 0 : 0;
      const precoCabVermelho = cabVermelho ? Number(cabVermelho.price) || 0 : 0;
      const precoCon = con ? (Number(con.price) || 0) * 2 : 0;
      const precoPerfil =
        profileProd && profileQty > 0 ? (Number(profileProd.price) || 0) * profileQty : 0;

      const somaTotal =
        precoInv + precoMod + precoCabPreto + precoCabVermelho + precoCon + precoEst + precoPerfil;

      const structuredItems: Array<{
        productId: string;
        productName: string;
        brandName: string;
        categoryName: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
        imageUrl?: string;
        specs?: Record<string, unknown>;
      }> = [];

      // 1. Inversor
      const invProdName = inv.product?.name || "Inversor Solar";
      const invBrand = inv.product?.brand?.name || "";
      structuredItems.push({
        productId: inv.product?.id || inv.productId || inv.id || "",
        productName: invProdName,
        brandName: invBrand,
        categoryName: "inverter",
        quantity: 1,
        unitPrice: precoInv,
        lineTotal: precoInv,
        imageUrl: inv.product?.imageUrl || undefined,
        specs: (inv.product?.specs as Record<string, unknown>) || undefined,
      });

      // 2. Módulos
      const modProdName = mod.product?.name || `Módulo Solar ${modPowerW}W`;
      const modBrand = mod.product?.brand?.name || "";
      structuredItems.push({
        productId: mod.product?.id || mod.productId || mod.id || "",
        productName: modProdName,
        brandName: modBrand,
        categoryName: "module",
        quantity: moduleQ,
        unitPrice: Number(mod.price) || 0,
        lineTotal: precoMod,
        imageUrl: mod.product?.imageUrl || undefined,
        specs: (mod.product?.specs as Record<string, unknown>) || undefined,
      });

      // 3. Estruturas
      if (forcedIncludeStructure && selectedStructures.length > 0) {
        const estMap = new Map<string, { item: any; count: number }>();
        for (const est of selectedStructures) {
          const key = est.product?.id || est.id || est.product?.name || "est";
          const existing = estMap.get(key);
          if (existing) {
            existing.count += 1;
          } else {
            estMap.set(key, { item: est, count: 1 });
          }
        }
        for (const { item: est, count } of estMap.values()) {
          const uPrice = Number(est.price) || 0;
          structuredItems.push({
            productId: est.product?.id || est.productId || est.id || "",
            productName: est.product?.name || "Estrutura de Fixação",
            brandName: est.product?.brand?.name || "",
            categoryName: "structure_kit",
            quantity: count,
            unitPrice: uPrice,
            lineTotal: uPrice * count,
            imageUrl: est.product?.imageUrl || undefined,
            specs: (est.product?.specs as Record<string, unknown>) || undefined,
          });
        }
      }

      // 4. Perfil / Trilho
      if (profileProd && profileQty > 0) {
        const uPrice = Number(profileProd.price) || 0;
        structuredItems.push({
          productId: profileProd.product?.id || profileProd.productId || profileProd.id || "",
          productName: profileProd.product?.name || "Perfil / Trilho",
          brandName: profileProd.product?.brand?.name || "",
          categoryName: "profile",
          quantity: profileQty,
          unitPrice: uPrice,
          lineTotal: precoPerfil,
          imageUrl: profileProd.product?.imageUrl || undefined,
          specs: (profileProd.product?.specs as Record<string, unknown>) || undefined,
        });
      }

      // 5. Cabos
      if (cabPreto) {
        const uPrice = Number(cabPreto.price) || 0;
        structuredItems.push({
          productId: cabPreto.product?.id || cabPreto.productId || cabPreto.id || "",
          productName: cabPreto.product?.name || "Cabo Solar 6mm Preto",
          brandName: cabPreto.product?.brand?.name || "",
          categoryName: "dc_cable",
          quantity: 1,
          unitPrice: uPrice,
          lineTotal: precoCabPreto,
          imageUrl: cabPreto.product?.imageUrl || undefined,
          specs: (cabPreto.product?.specs as Record<string, unknown>) || undefined,
        });
      }
      if (cabVermelho) {
        const uPrice = Number(cabVermelho.price) || 0;
        structuredItems.push({
          productId: cabVermelho.product?.id || cabVermelho.productId || cabVermelho.id || "",
          productName: cabVermelho.product?.name || "Cabo Solar 6mm Vermelho",
          brandName: cabVermelho.product?.brand?.name || "",
          categoryName: "dc_cable",
          quantity: 1,
          unitPrice: uPrice,
          lineTotal: precoCabVermelho,
          imageUrl: cabVermelho.product?.imageUrl || undefined,
          specs: (cabVermelho.product?.specs as Record<string, unknown>) || undefined,
        });
      }

      // 6. Conectores
      if (con) {
        const uPrice = Number(con.price) || 0;
        structuredItems.push({
          productId: con.product?.id || con.productId || con.id || "",
          productName: con.product?.name || "Conectores MC4",
          brandName: con.product?.brand?.name || "",
          categoryName: "connector",
          quantity: 2,
          unitPrice: uPrice,
          lineTotal: precoCon,
          imageUrl: con.product?.imageUrl || undefined,
          specs: (con.product?.specs as Record<string, unknown>) || undefined,
        });
      }

      const items = [
        `- Inversor: ${inv.product?.name || "Inversor Solar"}`,
        `- Módulos: ${moduleQ}x ${mod.product?.name || `Módulo Solar ${modPowerW}W`}`,
        ...estLines,
        profileProd && profileQty > 0
          ? `- Perfil: ${profileQty}x ${profileProd.product?.name}`
          : null,
        cabPreto ? `- Cabo Preto: ${cabPreto.product?.name}` : null,
        cabVermelho ? `- Cabo Vermelho: ${cabVermelho.product?.name}` : null,
        con ? `- Conectores: 2x ${con.product?.name}` : null,
      ].filter(Boolean) as string[];

      quotes.push({
        distributorName: d.name,
        distributorId: d.id,
        totalPrice: somaTotal,
        kwp: Number(realKWp.toFixed(2)),
        estimatedGeneration: Math.round(estGeneration),
        items,
        invName: inv.product?.name || "Inversor",
        modCount: moduleQ,
        modName: mod.product?.name || "Módulo",
        structuredItems,
      });
    }

    return quotes;
  }

  private async getAvailableTemplates(
    tenantId: string
  ): Promise<Array<{ id: string; name: string }>> {
    const orgTemplates = await this.prisma.proposalTemplate.findMany({
      where: { tenantId, status: "PUBLISHED", deletedAt: null },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      take: 5,
    });

    if (orgTemplates.length > 0) {
      return orgTemplates.map((t) => ({ id: t.id, name: t.name }));
    }

    const blueprints = await this.prisma.proposalTemplateBlueprint.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
      take: 5,
    });

    if (blueprints.length > 0) {
      return blueprints.map((b) => ({ id: b.id, name: b.name }));
    }

    return [
      { id: "default-moderno", name: "Modelo Comercial Moderno (Padrão)" },
      { id: "default-executivo", name: "Modelo Executivo Solar" },
      { id: "default-minimalista", name: "Modelo Minimalista" },
    ];
  }

  private async generateBotResponse({
    conversation,
    incomingText,
    extractionResult,
  }: {
    conversation: {
      id: string;
      organizationId: string;
      title: string | null;
      messages?: Array<{
        role: string;
        content?: string | null;
        metadata?: unknown;
      }>;
    };
    incomingText: string;
    extractionResult: BillExtractionResult | null;
  }): Promise<string> {
    const lower = incomingText.toLowerCase().trim();
    const messages = conversation?.messages || [];

    // Helper interno para decodificar o estado acumulado da conversa
    const extractContextFromSession = () => {
      let consumptionKwh: number | undefined;
      let targetKWp: number | undefined;
      let targetModules: number | undefined;
      let modPowerWUser: number | undefined;
      let cidade = "";
      let estado = "";
      let gridVoltage = "";
      let roofType = "";
      let clientName = "Cliente";
      let clientWhatsapp = "WhatsApp";
      let chosenQuoteIndex = 0;

      for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        if (!m) continue;
        const meta = m.metadata as Record<string, unknown> | null | undefined;
        if (meta) {
          if (meta["exactAverageKwh"]) consumptionKwh = Number(meta["exactAverageKwh"]);
          if (meta["consumptionKwh"]) consumptionKwh = Number(meta["consumptionKwh"]);
          if (meta["targetKWp"]) targetKWp = Number(meta["targetKWp"]);
          if (meta["targetModules"]) targetModules = Number(meta["targetModules"]);
          if (meta["cidade"]) cidade = String(meta["cidade"]);
          if (meta["uf"]) estado = String(meta["uf"]);
          if (meta["gridVoltage"]) gridVoltage = String(meta["gridVoltage"]);
          if (meta["roofType"]) roofType = String(meta["roofType"]);
        }

        const content = typeof m.content === "string" ? m.content : "";
        const lowerC = content.toLowerCase().trim();

        // 1. Extração de kWp
        const kwpM = content.match(/(\d+(?:[.,]\d+)?)\s*kwp/i);
        if (kwpM && kwpM[1]) {
          targetKWp = parseFloat(kwpM[1].replace(",", "."));
        }

        // 2. Extração de Módulos
        const modM = content.match(/(\d+)\s*(?:placas?|m[oó]dulos?|paineis?|pain[eé]is)/i);
        if (modM && modM[1]) {
          targetModules = parseInt(modM[1], 10);
          const pM = content.match(/(\d{3,4})\s*w/i);
          if (pM && pM[1]) {
            modPowerWUser = parseInt(pM[1], 10);
          }
        }

        // 3. Extração de Consumo kWh
        const kwhM = content.match(
          /(?:consumo registrado:\s*|consumo m[ée]dio de\s*|consumo\s+(?:de\s+)?|gasto\s+(?:de\s+)?)?(\d+[\d.,]*)\s*(?:kwh|kw)(?:\/m[eê]s)?/i
        );
        if (kwhM && kwhM[1] && !kwpM) {
          const val = Math.round(Number(kwhM[1].replace(",", ".")));
          if (val >= 30 && val <= 500000) {
            consumptionKwh = val;
          }
        }

        // 4. Extração de Cidade e Estado
        const cityM = content.match(
          /(?:em|para|na cidade de|no munic[íi]pio de)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s'-]{3,35}?)(?:\s*[\/\-]\s*([A-Za-z]{2})|\s+([A-Za-z]{2}))?(?:\s*\(|$|\.|\n|,)/i
        );
        if (cityM && cityM[1]) {
          const candidate = (
            cityM[1] + (cityM[2] ? `/${cityM[2]}` : cityM[3] ? `/${cityM[3]}` : "")
          ).trim();
          const candLower = candidate.toLowerCase();
          if (
            !candLower.includes("monof") &&
            !candLower.includes("bifas") &&
            !candLower.includes("trifas") &&
            !candLower.includes("ceram") &&
            !candLower.includes("fibro") &&
            !candLower.includes("metal")
          ) {
            const hspRes = getHsp(candidate);
            cidade = hspRes.city;
            estado = hspRes.uf;
          }
        }

        // 5. Extração de Padrão Elétrico
        if (
          lowerC === "1" ||
          lowerC.includes("monofásico") ||
          lowerC.includes("monofasico") ||
          lowerC.includes("mono 220") ||
          lowerC.includes("mono")
        ) {
          if (messages[i - 1]?.content?.includes("Qual o padrão de entrada da instalação?")) {
            gridVoltage = "Monofásico 220V";
          }
        } else if (
          lowerC === "2" ||
          lowerC.includes("bifásico") ||
          lowerC.includes("bifasico") ||
          lowerC.includes("127/220") ||
          lowerC.includes("bi 220")
        ) {
          if (messages[i - 1]?.content?.includes("Qual o padrão de entrada da instalação?")) {
            gridVoltage = "Bifásico 127V/220V";
          }
        } else if (
          lowerC === "3" ||
          lowerC.includes("trifasico 220") ||
          lowerC.includes("trifásico 220") ||
          lowerC.includes("tri 220") ||
          lowerC.includes("tri_220")
        ) {
          if (messages[i - 1]?.content?.includes("Qual o padrão de entrada da instalação?")) {
            gridVoltage = "Trifásico 220V";
          }
        } else if (
          lowerC === "4" ||
          lowerC.includes("trifasico 380") ||
          lowerC.includes("trifásico 380") ||
          lowerC.includes("tri 380") ||
          lowerC.includes("tri_380") ||
          lowerC.includes("380v")
        ) {
          if (messages[i - 1]?.content?.includes("Qual o padrão de entrada da instalação?")) {
            gridVoltage = "Trifásico 380V";
          }
        }

        // 6. Extração de Tipo de Telhado
        if (
          lowerC === "1" ||
          lowerC.includes("cerâmica") ||
          lowerC.includes("ceramica") ||
          lowerC.includes("colonial")
        ) {
          if (messages[i - 1]?.content?.includes("Qual a estrutura do telhado?")) {
            roofType = "Cerâmica (Colonial)";
          }
        } else if (
          lowerC === "2" ||
          lowerC.includes("fibrocimento") ||
          lowerC.includes("fibromadeira")
        ) {
          if (messages[i - 1]?.content?.includes("Qual a estrutura do telhado?")) {
            roofType = "Fibrocimento";
          }
        } else if (lowerC === "3" || lowerC.includes("metálico") || lowerC.includes("metalico")) {
          if (messages[i - 1]?.content?.includes("Qual a estrutura do telhado?")) {
            roofType = "Metálico";
          }
        } else if (lowerC === "4" || lowerC.includes("solo")) {
          if (messages[i - 1]?.content?.includes("Qual a estrutura do telhado?")) {
            roofType = "Solo";
          }
        } else if (lowerC === "5" || lowerC.includes("laje")) {
          if (messages[i - 1]?.content?.includes("Qual a estrutura do telhado?")) {
            roofType = "Laje";
          }
        } else if (lowerC === "6" || lowerC.includes("fibrometal")) {
          if (messages[i - 1]?.content?.includes("Qual a estrutura do telhado?")) {
            roofType = "Fibrometal";
          }
        } else if (
          lowerC === "7" ||
          lowerC.includes("sem estrutura") ||
          lowerC.includes("nenhuma")
        ) {
          if (messages[i - 1]?.content?.includes("Qual a estrutura do telhado?")) {
            roofType = "Sem estrutura";
          }
        }

        // 7. Nome e WhatsApp do Cliente
        if (m.role === "assistant") {
          const nameM1 = content.match(/registrar o cliente ([^.]+)\./i);
          const nameM2 = content.match(/Cliente \*([^*]+)\* anotado/i);
          if (nameM1?.[1]) clientName = nameM1[1].trim();
          else if (nameM2?.[1]) clientName = nameM2[1].trim();
        }
      }

      return {
        consumptionKwh,
        targetKWp,
        targetModules,
        modPowerWUser,
        cidade,
        estado,
        gridVoltage,
        roofType,
        clientName,
        clientWhatsapp,
        chosenQuoteIndex,
      };
    };

    const sessionCtx = extractContextFromSession();

    // 1. Se acabou de extrair a fatura com sucesso
    if (extractionResult && extractionResult.exactAverageKwh > 0) {
      const cidade = extractionResult.data.cidade
        ? `${extractionResult.data.cidade}${extractionResult.data.uf ? `/${extractionResult.data.uf.trim().toUpperCase()}` : ""}`
        : "São Paulo/SP";
      const kwh = extractionResult.exactAverageKwh;
      const meses = extractionResult.monthCount || 1;
      const tipoConexao = extractionResult.data.tipo_conexao || "";
      const baseTexto =
        meses > 1
          ? `baseado no histórico de ${meses} meses da fatura`
          : `baseado no consumo do mês atual da fatura`;

      const conexaoInfo = tipoConexao ? `\nPadrão de rede identificado: *${tipoConexao}*` : "";

      return (
        `Legal, dados extraídos com precisão!\n` +
        `Consumo médio de *${kwh} kWh/mês* em *${cidade}* (${baseTexto}).${conexaoInfo}\n\n` +
        `Qual a estrutura do telhado?\n` +
        `1 - Cerâmica (Colonial)\n` +
        `2 - Fibrocimento\n` +
        `3 - Metálico\n` +
        `4 - Solo\n` +
        `5 - Laje\n` +
        `6 - Fibrometal\n` +
        `7 - Sem estrutura`
      );
    }

    // Recupera a última mensagem do bot para saber o estado atual da conversa
    const assistantMessages = messages.filter((m) => m.role === "assistant");
    const lastBotMsg =
      assistantMessages.length > 0
        ? assistantMessages[assistantMessages.length - 1]?.content || ""
        : "";

    // ESTADO A: O Bot acabou de apresentar os distribuidores e pediu para escolher a opção (1 ou 2)
    if (lastBotMsg.includes("Qual opção você prefere para o seu cliente?")) {
      return (
        `Ótima escolha! Kit selecionado com sucesso. ☀️\n\n` +
        `Qual o nome do cliente final para registrarmos no seu CRM?`
      );
    }

    // ESTADO B: O Bot pediu o nome do cliente final
    if (lastBotMsg.includes("Qual o nome do cliente final")) {
      const clientName = incomingText.trim();
      return `Certo, vou registrar o cliente ${clientName}. E qual o WhatsApp dele com DDD?`;
    }

    // ESTADO C: O Bot pediu o WhatsApp do cliente final -> Apresenta os modelos de proposta
    if (lastBotMsg.includes("E qual o WhatsApp dele")) {
      const clientNameMatch = lastBotMsg.match(/registrar o cliente ([^.]+)\./i);
      const clientName = clientNameMatch?.[1]?.trim() || "Cliente";

      const templates = await this.getAvailableTemplates(conversation.organizationId);
      let templateListText = "";
      templates.forEach((t, i) => {
        templateListText += `${i + 1} - ${t.name}\n`;
      });

      return (
        `Cliente *${clientName}* anotado com sucesso! 👤✨\n\n` +
        `Qual modelo de proposta comercial você deseja usar para o seu cliente?\n` +
        `${templateListText}\n` +
        `(Responda com o número do modelo desejado)`
      );
    }

    // ESTADO D: O Bot pediu para escolher o modelo de proposta -> GERA PROPOSTA COMPLETA!
    if (lastBotMsg.includes("Qual modelo de proposta comercial você deseja usar")) {
      const templateChoiceStr = incomingText.replace(/\D/g, "");
      const chosenTemplateIndex = templateChoiceStr ? parseInt(templateChoiceStr, 10) - 1 : 0;

      const availableTemplates = await this.getAvailableTemplates(conversation.organizationId);
      const chosenTemplate = availableTemplates[chosenTemplateIndex] || availableTemplates[0];

      let clientName = sessionCtx.clientName || "Cliente";
      let clientWhatsapp = "WhatsApp";
      let chosenQuoteIndex = 0;

      // Recupera escolhas das mensagens
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (!m) continue;
        const content = typeof m.content === "string" ? m.content.trim() : "";

        if (m.role === "assistant" && content.includes("E qual o WhatsApp dele")) {
          for (let j = i + 1; j < messages.length; j++) {
            const nextUserMsg = messages[j];
            if (
              nextUserMsg &&
              nextUserMsg.role === "user" &&
              typeof nextUserMsg.content === "string"
            ) {
              const digits = nextUserMsg.content.replace(/\D/g, "");
              if (digits.length >= 8) {
                clientWhatsapp = digits;
              }
              break;
            }
          }
        }

        if (
          m.role === "assistant" &&
          content.includes("Qual opção você prefere para o seu cliente?")
        ) {
          for (let j = i + 1; j < messages.length; j++) {
            const nextUserMsg = messages[j];
            if (
              nextUserMsg &&
              nextUserMsg.role === "user" &&
              typeof nextUserMsg.content === "string"
            ) {
              const numMatch = nextUserMsg.content.match(/\b([1-9])\b/);
              if (numMatch && numMatch[1]) {
                const idx = parseInt(numMatch[1], 10) - 1;
                if (idx >= 0) chosenQuoteIndex = idx;
              }
              break;
            }
          }
        }
      }

      const quotes = await this.calculateDistributorKits({
        consumptionKwh: sessionCtx.consumptionKwh,
        targetKWp: sessionCtx.targetKWp,
        targetModules: sessionCtx.targetModules,
        modPowerWUser: sessionCtx.modPowerWUser,
        cidade: sessionCtx.cidade || "São Paulo",
        estado: sessionCtx.estado || "SP",
        roofType: sessionCtx.roofType || "Cerâmica (Colonial)",
        gridVoltage: sessionCtx.gridVoltage,
      });

      const effectiveConsumption =
        sessionCtx.consumptionKwh ||
        (sessionCtx.targetKWp ? Math.round(sessionCtx.targetKWp * 130) : 300);

      const selectedQuote = quotes[chosenQuoteIndex] ||
        quotes[0] || {
          distributorName: "Edeltec Solar",
          distributorId: undefined,
          totalPrice: Math.round(effectiveConsumption * 28),
          kwp: sessionCtx.targetKWp || Number((effectiveConsumption / 100).toFixed(2)),
          estimatedGeneration: effectiveConsumption,
          items: [],
          structuredItems: [],
        };

      let proposalId = "";
      let quotedSaleBrl = selectedQuote.totalPrice;
      try {
        // 1. Cria o Lead no CRM da Organização
        const lead = await this.prisma.lead.create({
          data: {
            tenantId: conversation.organizationId,
            name: clientName,
            whatsapp: clientWhatsapp || "WhatsApp",
            source: "Chatbot WhatsApp",
          },
        });

        // 2. Custos do Projeto e Margem
        const orgRuleRows = await this.prisma.companyCostRule.findMany({
          where: { organizationId: conversation.organizationId },
          orderBy: [{ name: "asc" }, { minKwp: "asc" }],
        });
        const organizationRules = orgRuleRows.map((r) => ({
          id: r.id,
          name: r.name,
          calculationType: r.calculationType as "FIXED" | "PERCENTAGE" | "PER_KWP",
          value: r.value.toNumber(),
          minKwp: r.minKwp?.toNumber() ?? null,
          maxKwp: r.maxKwp?.toNumber() ?? null,
          percentageBase: r.percentageBase ?? null,
        }));
        const costCalc = computeProjectCostSection(
          selectedQuote.totalPrice,
          selectedQuote.kwp,
          organizationRules
        );
        quotedSaleBrl =
          costCalc.computedSaleFromCostRulesBrl > 0
            ? Math.round(costCalc.computedSaleFromCostRulesBrl * 100) / 100
            : selectedQuote.totalPrice;

        // 3. Cria Deal
        const deal = await this.prisma.deal.create({
          data: {
            tenantId: conversation.organizationId,
            leadId: lead.id,
            title: `Sistema Fotovoltaico - ${clientName}`,
            stage: "PROPOSAL",
            value: quotedSaleBrl,
          },
        });

        // 4. Cria Dimensionamento
        await this.prisma.systemSizing.create({
          data: {
            tenantId: conversation.organizationId,
            leadId: lead.id,
            name: `Dimensionamento IA - ${selectedQuote.kwp} kWp`,
            input: {
              monthlyConsumptionKwh: effectiveConsumption,
              cidade: sessionCtx.cidade || "São Paulo",
              estado: sessionCtx.estado || "SP",
            },
            result: {
              recommendedPowerKw: selectedQuote.kwp,
              estimatedGeneration: selectedQuote.estimatedGeneration,
            },
          },
        });

        const monthlySavingsVal = Math.round(effectiveConsumption * 0.95);
        const calculatedPayback =
          monthlySavingsVal > 0
            ? Math.max(1, Math.round((quotedSaleBrl / (monthlySavingsVal * 12)) * 10) / 10)
            : 3.2;

        // 5. Cria Simulação
        const simulation = await this.prisma.simulation.create({
          data: {
            tenantId: conversation.organizationId,
            leadId: lead.id,
            name: `Simulação Comercial IA`,
            input: {
              systemSizeKw: selectedQuote.kwp,
              investmentAmount: quotedSaleBrl,
              financingType: "CASH",
              sizing: {
                monthlyConsumptionKwh: effectiveConsumption,
                cidade: sessionCtx.cidade || "São Paulo",
                estado: sessionCtx.estado || "SP",
                recommendedPowerKw: selectedQuote.kwp,
                estimatedGeneration: selectedQuote.estimatedGeneration,
              },
            },
            result: {
              paybackYears: calculatedPayback,
              monthlySavings: monthlySavingsVal,
              monthlySavingsBrl: monthlySavingsVal,
              annualSavings: [monthlySavingsVal * 12],
              sizing: {
                recommendedPowerKw: selectedQuote.kwp,
                estimatedGeneration: selectedQuote.estimatedGeneration,
                estimatedProductionKwhMonth: selectedQuote.estimatedGeneration,
              },
            },
          },
        });

        // 6. Template
        let template = chosenTemplate?.id
          ? await this.prisma.proposalTemplate.findFirst({
              where: {
                id: chosenTemplate.id,
                tenantId: conversation.organizationId,
                deletedAt: null,
              },
            })
          : null;

        if (!template && chosenTemplate?.id) {
          const blueprint = await this.prisma.proposalTemplateBlueprint.findFirst({
            where: { id: chosenTemplate.id, published: true },
          });
          if (blueprint) {
            template = await this.prisma.proposalTemplate.create({
              data: {
                tenantId: conversation.organizationId,
                name: blueprint.name,
                status: "PUBLISHED",
                config: blueprint.document as any,
                version: 1,
              },
            });
          }
        }

        const defaultTemplate =
          template ||
          (await this.prisma.proposalTemplate.findFirst({
            where: {
              tenantId: conversation.organizationId,
              status: "PUBLISHED",
              deletedAt: null,
            },
            orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
          }));

        const rawKitItems = (selectedQuote as any).structuredItems?.length
          ? (selectedQuote as any).structuredItems
          : selectedQuote.items.map((i) => ({
              productId: "",
              productName: i.replace(/^-\s*[^:]+:\s*(?:\d+x\s*)?/, "").trim() || i,
              brandName: "",
              categoryName: "equipment",
              quantity: 1,
              unitPrice: 0,
              lineTotal: 0,
            }));

        // 7. Proposta Comercial
        const proposal = await this.prisma.proposal.create({
          data: {
            tenantId: conversation.organizationId,
            dealId: deal.id,
            simulationId: simulation.id,
            proposalTemplateId: template?.id || defaultTemplate?.id || null,
            proposalTemplateVersion: template?.version || defaultTemplate?.version || 1,
            title: `Proposta Comercial - ${clientName}`,
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            renderedData: {
              integrator: {
                version: 1,
                kitItems: rawKitItems,
                equipmentSubtotalBrl: selectedQuote.totalPrice,
                quotedSaleBrl: quotedSaleBrl,
                systemPowerKw: selectedQuote.kwp,
                sourceType: "distributor",
                distributorId: selectedQuote.distributorId,
                distributorName: selectedQuote.distributorName,
                projectCostLines: costCalc.projectCostLines,
                defaultEssentialCostNames: costCalc.defaultEssentialCostNames,
                computedSaleFromCostRulesBrl: quotedSaleBrl,
                templateName:
                  template?.name ||
                  chosenTemplate?.name ||
                  defaultTemplate?.name ||
                  "Modelo Comercial Padrão",
              },
            } as any,
          },
        });

        proposalId = proposal.id;

        await this.prisma.leadActivityLog.create({
          data: {
            tenantId: conversation.organizationId,
            leadId: lead.id,
            kind: "PROPOSAL_CREATED",
            label: `Proposta de ${selectedQuote.kwp} kWp gerada via WhatsApp`,
          },
        });
      } catch (err) {
        this.logger.error("Erro gerando proposta completa no banco:", err);
      }

      const appBaseUrl =
        process.env["APP_BASE_URL"] ||
        process.env["PUBLIC_WEB_APP_BASE_URL"] ||
        process.env["NEXT_PUBLIC_APP_URL"] ||
        this.config.get<string>("APP_BASE_URL") ||
        this.config.get<string>("NEXT_PUBLIC_APP_URL") ||
        "https://www.energivia.com.br";

      const proposalLink = proposalId
        ? `${appBaseUrl}/proposta/${proposalId}`
        : `${appBaseUrl}/propostas`;

      return (
        `Perfeito! Proposta comercial gerada com sucesso para o cliente *${clientName}*! 📋✅\n\n` +
        `☀️ *Potência:* ${selectedQuote.kwp} kWp\n` +
        `🏢 *Distribuidor:* ${selectedQuote.distributorName}\n` +
        `🎨 *Modelo:* ${chosenTemplate?.name || "Comercial Moderno"}\n` +
        `💰 *Valor Total:* R$ ${quotedSaleBrl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n\n` +
        `📄 *Acesse a Proposta Pronta no link:*\n` +
        `${proposalLink}\n\n` +
        `Ela já está disponível no seu painel CRM da EnergivIA. Posso te ajudar com mais algum orçamento hoje?`
      );
    }

    // ESTADO E: O Bot perguntou a estrutura do telhado OU o usuário respondeu a estrutura
    const roofMatch = [
      { key: "1", name: "Cerâmica (Colonial)" },
      { key: "2", name: "Fibrocimento" },
      { key: "3", name: "Metálico" },
      { key: "4", name: "Solo" },
      { key: "5", name: "Laje" },
      { key: "6", name: "Fibrometal" },
      { key: "7", name: "Sem estrutura" },
      { key: "cerâmica", name: "Cerâmica (Colonial)" },
      { key: "ceramica", name: "Cerâmica (Colonial)" },
      { key: "colonial", name: "Cerâmica (Colonial)" },
      { key: "fibrocimento", name: "Fibrocimento" },
      { key: "fibromadeira", name: "Fibrocimento" },
      { key: "metálico", name: "Metálico" },
      { key: "metalico", name: "Metálico" },
      { key: "metal", name: "Metálico" },
      { key: "solo", name: "Solo" },
      { key: "laje", name: "Laje" },
      { key: "fibrometal", name: "Fibrometal" },
      { key: "sem estrutura", name: "Sem estrutura" },
      { key: "sem", name: "Sem estrutura" },
      { key: "nenhuma", name: "Sem estrutura" },
    ].find((r) => lower === r.key || lower.includes(r.key));

    if (roofMatch && lastBotMsg.includes("Qual a estrutura do telhado?")) {
      const selectedRoof = roofMatch.name;

      const quotes = await this.calculateDistributorKits({
        consumptionKwh: sessionCtx.consumptionKwh,
        targetKWp: sessionCtx.targetKWp,
        targetModules: sessionCtx.targetModules,
        modPowerWUser: sessionCtx.modPowerWUser,
        cidade: sessionCtx.cidade || "São Paulo",
        estado: sessionCtx.estado || "SP",
        roofType: selectedRoof,
        gridVoltage: sessionCtx.gridVoltage,
      });

      if (quotes.length === 0) {
        return (
          `No momento não encontramos kits com todos os componentes e estrutura (${selectedRoof}) disponíveis nos distribuidores cadastrados com estoque compatível.\n\n` +
          `Você pode selecionar a opção "7 - Sem estrutura" para cotar apenas os equipamentos elétricos ou escolher outro tipo de telhado.`
        );
      }

      const infoCabecalho = sessionCtx.targetKWp
        ? `para a potência de *${sessionCtx.targetKWp} kWp*`
        : sessionCtx.targetModules
          ? `para *${sessionCtx.targetModules} módulos*`
          : `para o consumo de *${sessionCtx.consumptionKwh || 300} kWh/mês*`;

      let quoteText = `Excelente! Seguem as melhores opções de kits dimensionados ${infoCabecalho}:\n\n`;

      quotes.forEach((q, index) => {
        quoteText += `${index + 1} - ${q.distributorName} - R$ ${q.totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
        quoteText += `Itens do Kit:\n`;
        q.items.forEach((item) => {
          quoteText += `${item}\n`;
        });
        quoteText += `Info: Potência: ${q.kwp} kWp | Geração Estimada: ${q.estimatedGeneration} kWh/mês (em condições ideais)*\n`;
        quoteText += `*Obs: A estimativa de geração considera condições ideais de irradiação solar. A geração real pode variar conforme as caídas e inclinação do telhado, orientação solar (azimute) e eventuais sombreamentos.\n\n`;
      });

      quoteText += `Qual opção você prefere para o seu cliente? (Responda com o número)`;
      return quoteText;
    }

    // ESTADO F: O Bot perguntou o padrão de entrada da rede elétrica
    if (lastBotMsg.includes("Qual o padrão de entrada da instalação?")) {
      let chosenGrid = "Monofásico 220V";
      if (lower === "1" || lower.includes("mono")) {
        chosenGrid = "Monofásico 220V";
      } else if (lower === "2" || lower.includes("bi") || lower.includes("127/220")) {
        chosenGrid = "Bifásico 127V/220V";
      } else if (lower === "3" || lower.includes("tri 220") || lower.includes("tri_220")) {
        chosenGrid = "Trifásico 220V";
      } else if (
        lower === "4" ||
        lower.includes("tri 380") ||
        lower.includes("tri_380") ||
        lower.includes("380")
      ) {
        chosenGrid = "Trifásico 380V";
      }

      return (
        `Legal! Padrão registrado: *${chosenGrid}*. ⚡\n\n` +
        `Qual a estrutura do telhado?\n` +
        `1 - Cerâmica (Colonial)\n` +
        `2 - Fibrocimento\n` +
        `3 - Metálico\n` +
        `4 - Solo\n` +
        `5 - Laje\n` +
        `6 - Fibrometal\n` +
        `7 - Sem estrutura`
      );
    }

    // ESTADO G: O Bot perguntou a cidade da instalação
    if (lastBotMsg.includes("Para qual cidade e estado será a instalação?")) {
      const hspRes = getHsp(incomingText);
      return (
        `Perfeito! Localização identificada: *${hspRes.city}/${hspRes.uf}* (Irradiação solar de ${hspRes.hsp.toFixed(2)} kWh/m²/dia calculada com precisão). 📍☀️\n\n` +
        `Qual o padrão de entrada da instalação?\n` +
        `1 - Monofásico 220V\n` +
        `2 - Bifásico 127V/220V\n` +
        `3 - Trifásico 220V\n` +
        `4 - Trifásico 380V\n\n` +
        `(Responda com o número da opção)`
      );
    }

    // ESTADO H: Saudação inicial
    if (
      lower === "oi" ||
      lower === "olá" ||
      lower === "ola" ||
      lower === "bom dia" ||
      lower === "boa tarde" ||
      lower === "boa noite" ||
      lower === "start" ||
      lower === "ajuda"
    ) {
      return (
        `Olá! Sou seu assistente de vendas e dimensionamento da EnergivIA. ☀️\n\n` +
        `Como posso ajudar você a gerar orçamentos e propostas para seus clientes hoje?\n\n` +
        `Você pode me enviar a fatura de energia (PDF ou foto) ou informar:\n` +
        `• O consumo médio (ex: "300 kWh")\n` +
        `• A potência do sistema (ex: "5 kWp")\n` +
        `• Ou a quantidade de placas (ex: "12 placas de 590W")`
      );
    }

    // ESTADO I: Entrada por kWp direto (ex: "5 kwp", "kit 7.5kwp", "15 kwp")
    const kwpDirectMatch = incomingText.match(/(\d+(?:[.,]\d+)?)\s*kwp/i);
    if (kwpDirectMatch && kwpDirectMatch[1]) {
      const targetKWp = parseFloat(kwpDirectMatch[1].replace(",", "."));
      if (targetKWp > 0) {
        return (
          `Legal! Potência solicitada: *${targetKWp} kWp*. ☀️\n\n` +
          `Qual o padrão de entrada da instalação?\n` +
          `1 - Monofásico 220V\n` +
          `2 - Bifásico 127V/220V\n` +
          `3 - Trifásico 220V\n` +
          `4 - Trifásico 380V\n\n` +
          `(Responda com o número da opção)`
        );
      }
    }

    // ESTADO J: Entrada por Quantidade de Módulos (ex: "12 placas de 590W", "10 módulos")
    const modDirectMatch = incomingText.match(
      /(\d+)\s*(?:placas?|m[oó]dulos?|paineis?|pain[eé]is)/i
    );
    if (modDirectMatch && modDirectMatch[1]) {
      const modCount = parseInt(modDirectMatch[1], 10);
      const modPowerMatch = incomingText.match(/(\d{3,4})\s*w/i);
      const modPower =
        modPowerMatch && modPowerMatch[1] ? parseInt(modPowerMatch[1], 10) : undefined;
      const kwpCalculado = modPower ? ((modCount * modPower) / 1000).toFixed(2) : undefined;
      const extraInfo = modPower ? ` de ${modPower}W (${kwpCalculado} kWp)` : "";

      return (
        `Legal! Quantidade solicitada: *${modCount} placas${extraInfo}*. ☀️\n\n` +
        `Qual o padrão de entrada da instalação?\n` +
        `1 - Monofásico 220V\n` +
        `2 - Bifásico 127V/220V\n` +
        `3 - Trifásico 220V\n` +
        `4 - Trifásico 380V\n\n` +
        `(Responda com o número da opção)`
      );
    }

    // ESTADO K: Entrada por Consumo em kWh (ex: "300 kwh", "300kw", "500 kwh/mes")
    const kwhDirectMatch = incomingText.match(/(\d+[\d.,]*)\s*(?:kwh|kw)(?:\/m[eê]s)?/i);
    if (kwhDirectMatch && kwhDirectMatch[1]) {
      const rawKwh = Number(kwhDirectMatch[1].replace(",", "."));
      if (rawKwh >= 30) {
        const consumo = Math.round(rawKwh);

        // Verifica se a cidade já foi informada na mesma mensagem
        const cityInSameMsg = incomingText.match(
          /(?:em|para|na cidade de)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s'-]{3,30}?)(?:\s*[\/\-]\s*([A-Za-z]{2})|\s+([A-Za-z]{2}))?(?:\s*\(|$|\.|\n|,)/i
        );

        if (cityInSameMsg && cityInSameMsg[1]) {
          const cand = (
            cityInSameMsg[1] +
            (cityInSameMsg[2]
              ? `/${cityInSameMsg[2]}`
              : cityInSameMsg[3]
                ? `/${cityInSameMsg[3]}`
                : "")
          ).trim();
          const hspRes = getHsp(cand);
          return (
            `Legal, consumo registrado: *${consumo} kWh/mês* em *${hspRes.city}/${hspRes.uf}*! ☀️📍\n\n` +
            `Qual o padrão de entrada da instalação?\n` +
            `1 - Monofásico 220V\n` +
            `2 - Bifásico 127V/220V\n` +
            `3 - Trifásico 220V\n` +
            `4 - Trifásico 380V\n\n` +
            `(Responda com o número da opção)`
          );
        }

        return (
          `Legal, consumo registrado: *${consumo} kWh/mês*. ☀️\n\n` +
          `Para qual cidade e estado será a instalação? (Ex: Maringá/PR, Presidente Prudente/SP)`
        );
      }
    }

    return (
      `Entendi! Para dimensionarmos o kit ideal para o seu cliente, você pode:\n\n` +
      `1. Enviar o arquivo ou foto da fatura de energia\n` +
      `2. Digitar o consumo médio (ex: *300 kWh*)\n` +
      `3. Informar a potência do sistema (ex: *5 kWp*)\n` +
      `4. Ou a quantidade de placas (ex: *12 placas de 590W*)`
    );
  }
}
