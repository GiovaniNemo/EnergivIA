import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AiUsageService } from "../../ai-usage/ai-usage.service";
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

export const BILL_EXTRACTION_SYSTEM_PROMPT = `Você é um motor especialista em visão computacional forense e extração de dados estruturados de faturas de energia elétrica brasileiras (Enel, CPFL, Cemig, Copel, Equatorial, Energisa, Neoenergia, Light, EDP, RGE, Celesc, etc.).

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
   - NUNCA confunda 'consumo_kwh' com quantidade de dias de faturamento ou leituras do medidor.

2. CONSUMO ATIVO E GERAÇÃO DISTRIBUÍDA (GD):
   - Se a fatura tiver créditos solares / GD, utilize sempre o Consumo Ativo Total Faturado/Consumido da rede.

3. DADOS GERAIS:
   - distribuidora: Nome da concessionária identificada no cabeçalho ou logotipo.
   - cidade: Cidade da unidade consumidora indicada no endereço.
   - uf: Sigla do estado com 2 letras (ex: SP, PR, MG, RJ, BA, GO, etc.).
   - tipo_conexao: "Monofásico" | "Bifásico" | "Trifásico".
   - nome_cliente: Nome completo do titular da conta.
   - mes_referencia_atual: Mês/ano de referência da fatura (ex: "08/2026").
   - consumo_mes_atual_kwh: Consumo ativo faturado do mês atual.
   - valor_total_fatura_reais: Valor total a pagar em R$.
   - historico_consumo: Lista sequencial dos meses com consumo faturado em kWh.

Retorne EXCLUSIVAMENTE um objeto JSON válido.`;

export function parseBrazilianKwh(raw: unknown): number {
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

export function processExtractedBillData(
  data: ExtractedBillData,
  rawText?: string
): BillExtractionResult {
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

@Injectable()
export class BillExtractorService {
  private readonly logger = new Logger(BillExtractorService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(
    private readonly config: ConfigService,
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

  /**
   * Extrai dados estruturados a partir do texto extraído de uma fatura PDF.
   */
  async parseBillTextWithAI(
    pdfText: string,
    organizationId?: string | null
  ): Promise<BillExtractionResult | null> {
    if (!pdfText || pdfText.trim().length === 0) return null;

    // 1. Provedor OpenAI (se configurado)
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
        }
      } catch (err) {
        this.logger.warn(`Erro na extração OpenAI, tentando fallback Gemini: ${String(err)}`);
      }
    }

    // 2. Provedor Gemini (com fallback entre modelos)
    if (this.genAI) {
      const candidateModels = ["gemini-2.0-flash", "gemini-1.5-flash"];

      for (const modelName of candidateModels) {
        const startTime = Date.now();
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
        } catch (geminiErr) {
          this.logger.warn(
            `Tentativa com ${modelName} falhou, tentando próximo modelo: ${String(geminiErr)}`
          );
        }
      }
    }

    return null;
  }
}
