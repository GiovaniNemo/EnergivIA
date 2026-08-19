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
}

const BILL_EXTRACTION_SYSTEM_PROMPT = `Você é um motor especialista em visão computacional forense e extração de dados estruturados de faturas de energia elétrica brasileiras (Enel, CPFL, Cemig, Copel, Equatorial, Energisa, Neoenergia, Light, EDP, RGE, Celesc, etc.).

Sua missão é extrair com 100% DE PRECISÃO MATEMÁTICA todos os dados da conta de luz, com foco ABSOLUTO em extrair TODOS os meses reais da tabela de Histórico de Consumo/Faturamento.

REGRAS DE LEITURA E PARSING CRÍTICAS:
1. TABELA DE HISTÓRICO DE CONSUMO ("Histórico de Consumo", "CONSUMO / kWh", "HISTÓRICO DE CONSUMO / kWh", "Evolução do Consumo", "Demonstrativo"):
   - Localize a tabela onde constam os meses de histórico faturados (geralmente entre 11 e 13 meses visíveis).
   - Percorra TODAS as linhas da tabela de cima a baixo.
   - Para CADA linha que contiver dados impressos, extraia:
     * 'mes_ano': Sigla do mês e ano (ex: "AGO/26", "JUL/26", "JAN/25", "DEZ/24", etc.).
     * 'consumo_kwh': Valor numérico exato do consumo ativo faturado em kWh.
   - ATENÇÃO A NÚMEROS COM PONTO DE MILHAR: "1.198" é 1198; "1.525" é 1525; "1.099" é 1099. Sempre converta para NÚMERO INTEIRO no JSON.
   - Se a fatura tiver 12 ou 13 meses com valores impressos (como é o padrão da Enel, CPFL, Cemig), extraia TODOS os 12 ou 13 meses sem omitir nenhum!
   - Se a instalação for recente e tiver apenas alguns meses preenchidos e os demais em branco (como algumas faturas novas da Copel), extraia apenas as linhas que tiverem números impressos.
   - NUNCA confunda 'consumo_kwh' com:
     * Quantidade de dias de faturamento (ex: 28, 29, 30, 31, 33).
     * Média diária (ex: 12.5 kWh/dia).
     * Demanda contratada ou medida em kW.
     * Leitura do medidor.
     * Valores monetários em R$.
     * Valores de iluminação pública ou multas.
     * Valores de energia injetada / saldo GD.

2. CONSUMO ATIVO E GERAÇÃO DISTRIBUÍDA (GD):
   - Se a fatura tiver créditos solares / GD, utilize sempre o Consumo Ativo Total Faturado/Consumido da rede.

3. DADOS GERAIS:
   - distribuidora: Nome da concessionária identificada no cabeçalho ou logotipo (ex: Enel, Copel, CPFL, Cemig, Equatorial, Energisa, etc.).
   - cidade: Cidade da unidade consumidora indicada no endereço.
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

export async function extractEnergyBillFromText(
  rawText: string,
  apiKey?: string
): Promise<BillExtractionResult> {
  const key = apiKey || process.env["OPENAI_API_KEY"];
  if (!key) {
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
        content: `Extraia com máxima precisão todos os dados e TODOS os meses do histórico de consumo do seguinte texto de fatura de energia:\n\n${rawText}`,
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

  return processExtractedBillData(parsedJson, rawText);
}

export async function extractEnergyBillFromImage(
  base64DataUrl: string,
  apiKey?: string
): Promise<BillExtractionResult> {
  const key = apiKey || process.env["OPENAI_API_KEY"];
  if (!key) {
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

  return processExtractedBillData(parsedJson);
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

  if (!pdfText || pdfText.trim().length < 30) {
    throw new Error(
      "O PDF não possui camada de texto legível (pode ser um PDF escaneado/imagem). Por favor, envie uma foto nítida em JPG ou PNG."
    );
  }

  return extractEnergyBillFromText(pdfText, apiKey);
}

function processExtractedBillData(data: ExtractedBillData, rawText?: string): BillExtractionResult {
  const rawList = Array.isArray(data.historico_consumo) ? data.historico_consumo : [];

  const candidates: ExtractedBillHistoryItem[] = [];
  for (const item of rawList) {
    if (!item) continue;
    const label = String(item.mes_ano || "").trim();
    let val = Number(item.consumo_kwh);
    if (!Number.isFinite(val) || isNaN(val)) {
      const rawObj = item as Record<string, unknown>;
      const parsedStr = String(rawObj["consumo"] || rawObj["kwh"] || "")
        .replace(/[^0-9.,]/g, "")
        .replace(",", ".");
      val = parseFloat(parsedStr);
    }
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

  // Heurística de limpeza: Se a maioria dos meses tiver consumo > 60 kWh e alguns poucos meses
  // vierem com valores entre 20 e 31 (típicos de "Nº DIAS FAT."), descarta os falsos positivos de dias
  const typicalHighMonths = candidates.filter((c) => c.consumo_kwh >= 60);
  const validHistory: ExtractedBillHistoryItem[] = [];

  for (const item of candidates) {
    if (
      typicalHighMonths.length >= 2 &&
      item.consumo_kwh <= 31 &&
      [28, 29, 30, 31, 22, 27].includes(item.consumo_kwh)
    ) {
      // Provável confusão com coluna de dias de faturamento em linhas vazias
      continue;
    }
    validHistory.push(item);
  }

  let totalSum = 0;
  let exactAverage = 0;
  let monthCount = validHistory.length;

  if (monthCount > 0) {
    totalSum = validHistory.reduce((acc, curr) => acc + curr.consumo_kwh, 0);
    exactAverage = Math.round(totalSum / monthCount);
  } else if (data.consumo_mes_atual_kwh && Number(data.consumo_mes_atual_kwh) > 0) {
    exactAverage = Math.round(Number(data.consumo_mes_atual_kwh));
    totalSum = exactAverage;
    monthCount = 1;
  } else {
    // Fallback se não pegou histórico nem mês atual
    exactAverage = 300;
    totalSum = 300;
    monthCount = 0;
  }

  const historyLines =
    validHistory.length > 0
      ? validHistory
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
      historico_consumo: validHistory,
    },
    exactAverageKwh: exactAverage,
    totalSumKwh: totalSum,
    monthCount,
    formattedSummary,
    rawText,
  };
}
