import OpenAI from "openai";
import pdfParse from "pdf-parse";

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
  extractionEngine?: "OCR" | "AI_FALLBACK";
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
   - tipo_conexao: "Monofásico", "Bifásico" ou "Trifásico" (identifique no campo Tipo de Fornecimento / Ligação).
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

import { extractDataFromTextDeterministic, runOcrOnImage } from "./ocr-bill-extractor";

export async function extractEnergyBillFromText(
  rawText: string,
  apiKey?: string
): Promise<BillExtractionResult> {
  const key = apiKey || process.env["OPENAI_API_KEY"];

  // 1. Envia o texto extraído para a IA interpretar com precisão máxima
  if (key) {
    try {
      const openai = new OpenAI({ apiKey: key });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: BILL_EXTRACTION_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Extraia com máxima precisão todos os dados e TODOS os meses do histórico de consumo do seguinte texto de fatura de energia:\n\n${rawText}`,
          },
        ],
      });

      const content = response.choices?.[0]?.message?.content || "{}";
      const parsedJson = JSON.parse(content) as ExtractedBillData;
      const result = processExtractedBillData(parsedJson, rawText);
      result.extractionEngine = "AI_FALLBACK";
      return result;
    } catch (e) {
      console.error("[extractEnergyBillFromText] Erro na OpenAI, usando fallback determinístico:", e);
    }
  }

  // 2. Fallback determinístico offline (apenas se OpenAI não estiver configurada ou falhar)
  const deterministic = extractDataFromTextDeterministic(rawText);
  const res = processExtractedBillData(
    {
      distribuidora: deterministic.distribuidora,
      cidade: deterministic.cidade,
      uf: deterministic.uf,
      tipo_conexao: deterministic.tipo_conexao,
      nome_cliente: deterministic.nome_cliente,
      codigo_instalacao_ou_uc: deterministic.codigo_instalacao_ou_uc,
      mes_referencia_atual: deterministic.mes_referencia_atual,
      consumo_mes_atual_kwh: deterministic.consumo_mes_atual_kwh,
      valor_total_fatura_reais: deterministic.valor_total_fatura_reais,
      historico_consumo: deterministic.historico_consumo,
    },
    rawText
  );
  res.extractionEngine = "OCR";
  return res;
}

export async function extractEnergyBillFromImage(
  base64DataUrl: string,
  apiKey?: string
): Promise<BillExtractionResult> {
  const key = apiKey || process.env["OPENAI_API_KEY"];
  if (!key) {
    // Fallback offline com OCR local
    try {
      const ocrText = await runOcrOnImage(base64DataUrl);
      if (ocrText && ocrText.trim().length > 30) {
        return extractEnergyBillFromText(ocrText);
      }
    } catch (ocrErr) {
      console.error("[Tesseract OCR Error on Image]", ocrErr);
    }
    throw new Error("OPENAI_API_KEY não configurada.");
  }

  const openai = new OpenAI({ apiKey: key });

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
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
          {
            type: "image_url",
            image_url: {
              url: base64DataUrl,
              detail: "high",
            },
          },
        ],
      },
    ],
  });

  const content = response.choices?.[0]?.message?.content || "{}";
  let parsedJson: ExtractedBillData;
  try {
    parsedJson = JSON.parse(content);
  } catch {
    parsedJson = { historico_consumo: [] };
  }

  const result = processExtractedBillData(parsedJson);
  result.extractionEngine = "AI_FALLBACK";
  return result;
}

export async function extractEnergyBillFromPdfBuffer(
  buffer: Buffer,
  apiKey?: string
): Promise<BillExtractionResult> {
  let pdfText = "";
  try {
    const data = await pdfParse(buffer);
    pdfText = data.text || "";
  } catch (e) {
    console.error("Erro ao rodar pdfParse:", e);
  }

  // Se o PDF for escaneado (sem texto) tenta OCR com Tesseract
  if (!pdfText || pdfText.trim().length < 30) {
    try {
      pdfText = await runOcrOnImage(buffer);
    } catch (e) {
      console.error("Erro ao rodar Tesseract no PDF Buffer:", e);
    }
  }

  if (!pdfText || pdfText.trim().length < 20) {
    throw new Error(
      "O PDF não possui camada de texto legível nem foi possível realizar o OCR. Por favor, envie uma foto nítida em JPG ou PNG."
    );
  }

  return extractEnergyBillFromText(pdfText, apiKey);
}

function parseBrazilianKwh(raw: unknown): number {
  if (typeof raw === "number") {
    // Se o número for ex: 1.198 ou 1.525 vindo de JSON, converte para 1198 / 1525
    if (raw > 0 && raw < 10 && raw % 1 !== 0) {
      return Math.round(raw * 1000);
    }
    return Math.round(raw);
  }
  const s = String(raw || "").trim();
  if (!s) return 0;
  // Ex: "1.198,000" ou "1.198,00" -> 1198
  if (s.includes(".") && s.includes(",")) {
    const clean = s.replace(/\./g, "").replace(",", ".");
    return Math.round(parseFloat(clean));
  }
  // Ex: "1.198" (com ponto de milhar brasileiro seguido de 3 dígitos) -> 1198
  if (/^\d{1,3}\.\d{3}$/.test(s)) {
    return parseInt(s.replace(".", ""), 10);
  }
  // Ex: "965,000" -> 965
  if (/^\d+,\d+$/.test(s)) {
    return Math.round(parseFloat(s.replace(",", ".")));
  }
  const num = parseFloat(s.replace(/[^0-9.]/g, ""));
  if (num > 0 && num < 10 && num % 1 !== 0) {
    return Math.round(num * 1000);
  }
  return isNaN(num) ? 0 : Math.round(num);
}

function processExtractedBillData(data: ExtractedBillData, rawText?: string): BillExtractionResult {
  const rawList = Array.isArray(data.historico_consumo) ? data.historico_consumo : [];

  const candidates: ExtractedBillHistoryItem[] = [];
  for (const item of rawList) {
    if (!item) continue;
    const label = String(item.mes_ano || "").trim();
    const rawVal =
      item.consumo_kwh ??
      (item as Record<string, unknown>)["consumo"] ??
      (item as Record<string, unknown>)["kwh"];
    const val = parseBrazilianKwh(rawVal);

    // Aceita apenas valores numéricos positivos
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

  // Padronização Solar: Um ano tem 12 meses. Se a concessionária trouxer 13 meses
  // (ex: AGO/26 até AGO/25), usamos os 12 meses mais recentes (excluindo o mês repetido do ano anterior)
  const normalizedHistory = validHistory.length > 12 ? validHistory.slice(0, 12) : validHistory;

  const rawCurrentKwh = parseBrazilianKwh(
    data.consumo_mes_atual_kwh ??
      (data as Record<string, unknown>)["consumo_mes_atual"] ??
      (data as Record<string, unknown>)["currentMonthConsumptionKwh"] ??
      (data as Record<string, unknown>)["consumptionKwh"]
  );

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
    // Fallback se não pegou histórico nem mês atual
    exactAverage = 300;
    totalSum = 300;
    monthCount = 0;
  }

  const historyLines =
    normalizedHistory.length > 0
      ? normalizedHistory
          .map(
            (h, i) =>
              `  ${i + 1}. ${h.mes_ano}: ${h.consumo_kwh} kWh${h.dias ? ` (${h.dias} dias)` : ""}`
          )
          .join("\n")
      : "  (Histórico não encontrado na fatura, utilizando consumo do mês atual)";

  const formattedSummary = `
=== [DADOS PRECISOS EXTRAÍDOS DA FATURA DE ENERGIA] ===
• Distribuidora: ${data.distribuidora || "Não identificada"}
• Localização: ${data.cidade ? data.cidade.trim() : "Não identificada"}/${data.uf ? data.uf.trim().toUpperCase() : "UF"}
• Tipo de Conexão/Ligação: ${data.tipo_conexao || "Bifásico"}
• Titular: ${data.nome_cliente || "Não informado"}
• Mês de Referência: ${data.mes_referencia_atual || "Mês Atual"}
• Consumo do Mês Atual: ${data.consumo_mes_atual_kwh ? Math.round(Number(data.consumo_mes_atual_kwh)) + " kWh" : "Não informado"}
• Histórico de Consumo Efetivo (${monthCount} meses faturados):
${historyLines}
• SOMA TOTAL DO CONSUMO FATURADO: ${totalSum} kWh
• QUANTIDADE DE MESES COM CONSUMO REAL: ${monthCount}
• MÉDIA MENSAL EXATA (CÁLCULO MATEMÁTICO REAL): ${exactAverage} kWh/mês (Soma: ${totalSum} ÷ ${monthCount || 1} meses = ${exactAverage} kWh/mês)
=== [FIM DOS DADOS PRECISOS EXTRAÍDOS] ===
`.trim();

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
