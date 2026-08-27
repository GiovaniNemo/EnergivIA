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

  // 1. Procura primeiro Cidade/UF no bloco de Unidade Consumidora / Endereço / CEP
  const cepCityUfMatch = t.match(
    /(?:(?:MUNIC[IÍ]PIO|CIDADE|LOCAL(?:IDADE)?|ENDERE[CÇ]O|UNIDADE\s+CONSUMIDORA)[\s:=]+([A-ZÁ-Ú\s]{3,35})\s*[-/]\s*([A-Z]{2})|\d{5}[-\s]?\d{3}[\s,.-]+([A-ZÁ-Ú\s]{3,35})\s*[-/]\s*([A-Z]{2})|([A-ZÁ-Ú\s]{3,35})\s*[-/]\s*([A-Z]{2})[\s,.-]+(?:CEP|\d{5}))/i
  );
  if (cepCityUfMatch) {
    const candCity = (cepCityUfMatch[1] || cepCityUfMatch[2] || cepCityUfMatch[3] || "").trim();
    const candUf = (cepCityUfMatch[2] || cepCityUfMatch[4] || "").toUpperCase();
    if (UF_LIST.includes(candUf) && candCity.length >= 3) {
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
    if (!UF_LIST.includes(candUf)) continue;
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
  const historyCandidates: BillHistoryMonth[] = [];

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
  // Captura um bloco de texto logo após o cabeçalho do histórico, sem truncar por "TOTAL"
  const historySectionMatch = t.match(
    /(?:HIST[OÓ]RICO\s+DE\s+CONSUMO|CONSUMO\s+FATURADO|EVOLU[CÇ][AÃ]O\s+DO\s+CONSUMO|HIST[OÓ]RICO)[\s\S]{1,2000}/i
  );
  if (historySectionMatch) {
    historyText = historySectionMatch[0];
  }

  // Regex global para encontrar meses e, usando lookahead, capturar até 60 caracteres seguintes na mesma linha
  const rowRegex =
    /\b(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ|0[1-9]|1[0-2])[\s\/\-_]*(20\d{2}|\d{2})?\b(?=([^\n\r]{0,60}))/gi;
  const matches = [...historyText.matchAll(rowRegex)];

  for (const m of matches) {
    let monStr = m[1].toUpperCase();

    // Ignora números isolados (ex: "05") sem ano que não sejam claramente meses
    if (m[1].match(/^\d{2}$/) && !m[2]) {
      continue;
    }

    if (monthMap[monStr]) monStr = monthMap[monStr]!;
    const yr = m[2] ? (m[2].length === 2 ? `20${m[2]}` : m[2]) : "";
    const label = yr ? `${monStr}/${yr}` : monStr;

    const restOfLine = m[3] || "";
    // Extrai todos os possíveis valores numéricos após o mês
    const numberMatches = [...restOfLine.matchAll(/\b(\d{1,5}(?:[.,]\d{1,3})?)\b/g)];

    const validNumbers = numberMatches
      .map((nm) => parseBrazilianKwh(nm[1]))
      .filter((n) => n > 0 && n < 50000 && ![2022, 2023, 2024, 2025, 2026, 2027, 2028].includes(n));

    if (validNumbers.length > 0) {
      let consumption = 0;
      // Heurística: Consumo geralmente é maior que dias (máx 35). Pega o primeiro valor coerente.
      const possibleConsumptions = validNumbers.filter((n) => n > 35);
      if (possibleConsumptions.length > 0) {
        consumption = possibleConsumptions[0];
      } else {
        consumption = Math.max(...validNumbers);
      }
      historyCandidates.push({ mes_ano: label, consumo_kwh: consumption });
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

  const missingFields: string[] = [];
  if (!distribuidora) missingFields.push("Distribuidora");
  if (!cidade) missingFields.push("Cidade");
  if (!uf) missingFields.push("UF");
  if (!(consumo_mes_atual_kwh && consumo_mes_atual_kwh > 0) && normalizedHistory.length === 0)
    missingFields.push("Consumo do Mês");
  if (normalizedHistory.length < 6)
    missingFields.push(
      `Histórico parcial (${normalizedHistory.length} meses encontrados pelo OCR, acionando IA para conferência de todos os meses)`
    );

  const isComplete = missingFields.length === 0;

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
