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

  // 1. Procura primeiro Cidade/UF próximo a CEP ou endereço da unidade consumidora
  const cepCityUfMatch = t.match(
    /(?:\d{5}[-\s]?\d{3}[\s,.-]+([A-ZÁ-Ú\s]{3,35})\s*[-/]\s*([A-Z]{2})|([A-ZÁ-Ú\s]{3,35})\s*[-/]\s*([A-Z]{2})[\s,.-]+(?:CEP|\d{5}))/i
  );
  if (cepCityUfMatch) {
    const candCity = (cepCityUfMatch[1] || cepCityUfMatch[3] || "").trim();
    const candUf = (cepCityUfMatch[2] || cepCityUfMatch[4] || "").toUpperCase();
    if (UF_LIST.includes(candUf) && candCity.length >= 3) {
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
      if (!UF_LIST.includes(candUf)) continue;
      const low = candCity.toLowerCase();
      if (
        low.includes("emissao") ||
        low.includes("vencimento") ||
        low.includes("distribuicao") ||
        low.includes("distribuidora")
      ) {
        continue;
      }
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
  const historyCandidates: BillHistoryMonth[] = [];

  // Formato Copel / Tabela Compacta:
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
      historyCandidates.push({ mes_ano: label, consumo_kwh: kwh });
    }
  }

  // Formato 1: Padrão Energisa / CPFL / Cemig / Enel com Mês, Consumo (com ponto de milhar/decimais) e Dias
  // Ex: "OUT/25 1.971 45", "SET/25 2.041,00 29", "AGO/26 1.198,000 30", "JUL/25 965,000", "DEZ/24 60 31"
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
        historyCandidates.push({ mes_ano: label, consumo_kwh: kwh });
      }
    }
  }

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
            mes_ano: yr ? `${mon}/${yr}` : mon,
            consumo_kwh: num,
          });
        }
      }
    }
  }

  const seenMonths = new Set<string>();
  const deduplicatedHistory: BillHistoryMonth[] = [];
  for (const item of historyCandidates) {
    if (!seenMonths.has(item.mes_ano)) {
      seenMonths.add(item.mes_ano);
      deduplicatedHistory.push(item);
    }
  }

  const normalizedHistory =
    deduplicatedHistory.length > 12 ? deduplicatedHistory.slice(0, 12) : deduplicatedHistory;

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let worker: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
