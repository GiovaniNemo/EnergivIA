import { createWorker } from "tesseract.js";
import pdfParse from "pdf-parse";

export interface BillHistoryMonth {
  mes_ano: string;
  consumo_kwh: number;
  dias?: number;
  media_kwh_dia?: number;
}

export interface BillDeterministicData {
  distribuidora?: string;
  cidade?: string;
  uf?: string;
  tipo_conexao?: "Monofásico" | "Bifásico" | "Trifásico" | string;
  nome_cliente?: string;
  codigo_instalacao_ou_uc?: string;
  mes_referencia_atual?: string;
  consumo_mes_atual_kwh?: number;
  valor_total_fatura_reais?: number;
  historico_consumo: BillHistoryMonth[];
  isComplete: boolean;
  rawText: string;
}

export function parseBrazilianKwh(raw: unknown): number {
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

const BRAZILIAN_PROVIDERS: Array<{ name: string; pattern: RegExp }> = [
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

const UF_LIST = [
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

/**
 * Realiza extração puramente determinística (Regex + Análise Tabular) em cima do texto da fatura
 */
export function extractDataFromTextDeterministic(text: string): BillDeterministicData {
  const t = (text || "").replace(/[\u00A0\r]/g, " ");
  const lines = t
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let distribuidora: string | undefined;
  for (const prov of BRAZILIAN_PROVIDERS) {
    if (prov.pattern.test(t)) {
      distribuidora = prov.name;
      break;
    }
  }

  // 1. Consumo do Mês Atual
  let consumo_mes_atual_kwh: number | undefined;
  const kwhPatterns = [
    /(?:consumo\s+(?:ativo|faturado|medido|do\s+m[eê]s)?|total\s+consumo)[\s:=]*(\d{1,6}(?:[.,]\d{1,3})?)\s*(?:kwh|kw-h)/i,
    /(\d{1,6}(?:[.,]\d{1,3})?)\s*(?:kwh|kw-h)\s*(?:\/m[eê]s)?/i,
  ];
  for (const p of kwhPatterns) {
    const m = t.match(p);
    if (m && m[1]) {
      const val = parseBrazilianKwh(m[1]);
      if (val > 0 && val < 500000) {
        consumo_mes_atual_kwh = val;
        break;
      }
    }
  }

  // 2. Valor Total da Fatura (R$)
  let valor_total_fatura_reais: number | undefined;
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
        valor_total_fatura_reais = Number(n.toFixed(2));
        break;
      }
    }
  }

  // 3. Mês de Referência
  let mes_referencia_atual: string | undefined;
  const refMatch = t.match(
    /(?:compet[eê]ncia|refer[eê]ncia|m[eê]s\/ano)[\s:=]*([0-1]?\d\s*\/\s*(?:20)?\d{2})/i
  );
  if (refMatch && refMatch[1]) {
    mes_referencia_atual = refMatch[1].replace(/\s+/g, "");
  } else {
    const mmMatch = t.match(/\b(0[1-9]|1[0-2])[\/-](20\d{2}|\d{2})\b/);
    if (mmMatch) {
      mes_referencia_atual = `${mmMatch[1]}/${mmMatch[2]}`;
    }
  }

  // 4. Tipo de Conexão
  let tipo_conexao: string | undefined;
  if (/trif[aá]sico/i.test(t)) {
    tipo_conexao = "Trifásico";
  } else if (/bif[aá]sico/i.test(t)) {
    tipo_conexao = "Bifásico";
  } else if (/monof[aá]sico/i.test(t)) {
    tipo_conexao = "Monofásico";
  }

  // 5. Cidade / UF
  let cidade: string | undefined;
  let uf: string | undefined;

  const cityUfMatch = t.match(/([A-ZÁ-Ú\s]{3,30})\s*[-/]\s*([A-Z]{2})\b/i);
  if (cityUfMatch && cityUfMatch[1] && cityUfMatch[2]) {
    const possibleUf = cityUfMatch[2].toUpperCase();
    if (UF_LIST.includes(possibleUf)) {
      const candidateCity = cityUfMatch[1].trim();
      if (
        !candidateCity.toLowerCase().includes("emissao") &&
        !candidateCity.toLowerCase().includes("vencimento")
      ) {
        cidade = candidateCity;
        uf = possibleUf;
      }
    }
  }

  // 6. Histórico de Consumo
  const historyCandidates: BillHistoryMonth[] = [];
  const monthRowRegex =
    /\b(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)[\s\/\-_]*(\d{2,4})?\b[^\d\n]*(\d{1,3}(?:\.\d{3})*(?:,\d{1,3})?|\d{1,6})/i;

  for (const line of lines) {
    const m = line.match(monthRowRegex);
    if (m && m[1]) {
      const monStr = m[1].toUpperCase().substring(0, 3);
      const yr = m[2] ? (m[2].length === 2 ? `20${m[2]}` : m[2]) : "";
      const label = yr ? `${monStr}/${yr}` : monStr;
      const kwh = parseBrazilianKwh(m[3]);

      if (kwh > 0 && kwh < 500000) {
        historyCandidates.push({
          mes_ano: label,
          consumo_kwh: kwh,
        });
      }
    }
  }

  // Filtragem e normalização do histórico
  const validHistory: BillHistoryMonth[] = [];
  const highCount = historyCandidates.filter((c) => c.consumo_kwh >= 50).length;

  for (let idx = 0; idx < historyCandidates.length; idx++) {
    const item = historyCandidates[idx];
    if (!item) continue;
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

  if (!consumo_mes_atual_kwh && normalizedHistory.length > 0) {
    consumo_mes_atual_kwh = normalizedHistory[0]?.consumo_kwh;
  }

  const hasConsumption =
    (consumo_mes_atual_kwh && consumo_mes_atual_kwh > 0) || normalizedHistory.length > 0;
  const isComplete = Boolean(
    hasConsumption && normalizedHistory.length >= 3 && cidade && uf && distribuidora
  );

  return {
    distribuidora,
    cidade,
    uf,
    tipo_conexao,
    nome_cliente: undefined,
    codigo_instalacao_ou_uc: undefined,
    mes_referencia_atual,
    consumo_mes_atual_kwh,
    valor_total_fatura_reais,
    historico_consumo: normalizedHistory,
    isComplete,
    rawText: t,
  };
}

/**
 * Executa OCR Tesseract em um buffer de imagem ou URL base64
 */
export async function runOcrOnImage(imageSource: Buffer | string): Promise<string> {
  let worker: any = null;
  try {
    worker = await (createWorker as any)();
    if (typeof worker.loadLanguage === "function") {
      await worker.loadLanguage("por");
      await worker.initialize("por");
    }
    const {
      data: { text },
    } = await worker.recognize(imageSource);
    return text || "";
  } catch (err) {
    console.error("[runOcrOnImage error]", err);
    return "";
  } finally {
    if (worker && typeof worker.terminate === "function") {
      await worker.terminate();
    }
  }
}

/**
 * Executa extração de texto de PDF (via pdf-parse)
 */
export async function extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(pdfBuffer);
    return data.text || "";
  } catch (err) {
    console.error("[extractTextFromPdf error]", err);
    return "";
  }
}
