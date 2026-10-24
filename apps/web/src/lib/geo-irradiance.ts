import { BRAZIL_MUNICIPALITIES_DATA } from "./data/municipalities-hsp.data";

export const UF_TO_STATE_NAME: Record<string, string> = {
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

export const STATE_NAME_TO_UF: Record<string, string> = {
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

export const UF_FALLBACK: Record<string, number> = {
  SP: 4.8,
  PR: 4.9,
  MG: 5.3,
  RJ: 5.0,
  BA: 5.4,
  SC: 4.9,
  RS: 4.8,
  GO: 5.6,
  PE: 5.3,
  CE: 5.7,
  MT: 5.4,
  MS: 5.5,
  MA: 5.3,
  PA: 4.88,
  PB: 5.6,
  RN: 5.7,
  AL: 5.5,
  PI: 5.6,
  SE: 5.4,
  TO: 5.4,
  RO: 4.8,
  AM: 4.5,
  AC: 4.8,
  RR: 5.1,
  AP: 4.9,
  ES: 5.1,
  DF: 5.5,
};

export function cleanLocationInput(input: string): string {
  if (!input) return "";
  return input
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, "")
    .replace(/[\u00A0\u202F\s]+/g, " ")
    .trim();
}

export function normalizeTextSimple(str: string): string {
  if (!str) return "";
  return cleanLocationInput(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

export function parseLocationString(input: string): { city: string; uf: string } {
  if (!input) return { city: "", uf: "" };
  let raw = cleanLocationInput(input);

  // Remove prefixos conversacionais comuns ("mudar cidade para", "cidade:", etc.)
  raw = raw
    .replace(
      /^(?:mudar\s+(?:a\s+)?cidade(?:\s+para)?|trocar\s+(?:a\s+)?cidade(?:\s+para)?|alterar\s+(?:a\s+)?cidade(?:\s+para)?|cidade\s*:?)\s*/i,
      ""
    )
    .trim();

  // Remove aspas ou formatação markdown no início e no fim ("...", '...', `...`, *...*, _..._)
  raw = raw.replace(/^["'`*_~]+|["'`*_~]+$/g, "").trim();

  // Remove pontuação terminal (. , ; ! ?) adicionada pelo teclado/autocorreto (ex: "Maringá/PR." -> "Maringá/PR")
  raw = raw.replace(/[.,;!?:)]+$/, "").trim();

  let uf = "";

  // 1. Tenta identificar UF por sigla de 2 letras no final (ex: "/PR", " - PR", " PR", ", PR", "(PR)")
  const ufMatch = raw.match(/[\s\/\-\(,]([A-Za-z]{2})\)?$/);
  if (ufMatch && ufMatch[1] && UF_TO_STATE_NAME[ufMatch[1].toUpperCase()]) {
    uf = ufMatch[1].toUpperCase();
    raw = raw.substring(0, ufMatch.index).trim();
  }

  // 2. Se não encontrou sigla de 2 letras, tenta identificar nome completo de Estado no final (ex: "Maringá - Paraná", "Maringá/Parana")
  if (!uf) {
    const stateMatch = raw.match(/[\s\/\-\(,]([A-Za-zÀ-ÖØ-öø-ÿ\s]{4,25})\)?$/);
    if (stateMatch && stateMatch[1]) {
      const candStateNorm = normalizeTextSimple(stateMatch[1]);
      if (STATE_NAME_TO_UF[candStateNorm]) {
        uf = STATE_NAME_TO_UF[candStateNorm];
        raw = raw.substring(0, stateMatch.index).trim();
      }
    }
  }

  // Remove separadores e pontuações residuais que sobraram no final da cidade
  raw = raw.replace(/[\s\/\-\(,\."'`*_~]+$/, "").trim();

  return { city: raw, uf };
}

export function normalizeMunicipalNumerals(str: string): string {
  if (!str) return "";
  return str
    .replace(/\bSEGUNDO\b/gi, "II")
    .replace(/\b2\b/g, "II")
    .replace(/\bPRIMEIRO\b/gi, "I")
    .replace(/\b1\b/g, "I")
    .replace(/\bTERCEIRO\b/gi, "III")
    .replace(/\b3\b/g, "III")
    .replace(/\bQUARTO\b/gi, "IV")
    .replace(/\b4\b/g, "IV")
    .replace(/\bQUINTO\b/gi, "V")
    .replace(/\b5\b/g, "V")
    .replace(/\s+/g, " ")
    .trim();
}

export interface MunicipalityCandidate {
  city: string;
  uf: string;
  hsp: number;
  stateName?: string;
  isCapital?: boolean;
}

export interface HspLookupResult {
  hsp: number;
  city: string;
  uf: string;
  exact: boolean;
  ambiguous?: boolean;
  candidates?: MunicipalityCandidate[];
}

export function getHsp(cidade: string, estado?: string): HspLookupResult {
  const cleanedInput = cleanLocationInput(cidade);
  const parsed = parseLocationString(cleanedInput);
  const searchCity = parsed.city || cleanedInput || "São Paulo";
  const rawUfCandidate = (estado || parsed.uf || "").trim();
  const resolvedUf =
    rawUfCandidate.length === 2
      ? rawUfCandidate.toUpperCase()
      : STATE_NAME_TO_UF[normalizeTextSimple(rawUfCandidate)] || rawUfCandidate.toUpperCase();
  const searchUf = resolvedUf;
  const normSearchCity = normalizeTextSimple(searchCity);
  const normSearchCityNum = normalizeMunicipalNumerals(normSearchCity);

  // 1. Consulta prioritária na base oficial completa embutida (5.569 municípios)
  if (searchUf) {
    const key = `${normSearchCity}_${searchUf}`;
    const entry =
      BRAZIL_MUNICIPALITIES_DATA.byCityUf[key] ||
      (normSearchCityNum !== normSearchCity
        ? BRAZIL_MUNICIPALITIES_DATA.byCityUf[`${normSearchCityNum}_${searchUf}`]
        : undefined);
    if (entry) {
      return {
        hsp: entry.hsp,
        city: entry.city,
        uf: entry.uf,
        exact: true,
        ambiguous: false,
      };
    }
  }

  // 2. Se a UF não foi informada ou não bateu exatamente, busca pelo nome da cidade no Brasil
  let cityMatches = BRAZIL_MUNICIPALITIES_DATA.byCity[normSearchCity];
  if ((!cityMatches || cityMatches.length === 0) && normSearchCityNum !== normSearchCity) {
    cityMatches = BRAZIL_MUNICIPALITIES_DATA.byCity[normSearchCityNum];
  }
  if (cityMatches && cityMatches.length > 0) {
    if (searchUf) {
      const matchWithUf = cityMatches.find((m) => m.uf === searchUf);
      if (matchWithUf) {
        return {
          hsp: matchWithUf.hsp,
          city: matchWithUf.city,
          uf: matchWithUf.uf,
          exact: true,
          ambiguous: false,
        };
      }
    }

    if (cityMatches.length === 1) {
      const singleMatch = cityMatches[0]!;
      return {
        hsp: singleMatch.hsp,
        city: singleMatch.city,
        uf: singleMatch.uf,
        exact: true,
        ambiguous: false,
      };
    }

    // Ambiguidade detectada
    const sortedCandidates: MunicipalityCandidate[] = [...cityMatches]
      .map((m) => ({
        city: m.city,
        uf: m.uf,
        hsp: m.hsp,
        stateName: UF_TO_STATE_NAME[m.uf] || m.uf,
      }))
      .sort((a, b) => a.uf.localeCompare(b.uf));

    const bestMatch = sortedCandidates[0]!;
    return {
      hsp: bestMatch.hsp,
      city: bestMatch.city,
      uf: bestMatch.uf,
      exact: false,
      ambiguous: true,
      candidates: sortedCandidates,
    };
  }

  // 3. Fallback pela média estadual
  const effectiveUf = searchUf || "SP";
  const fallbackHsp = UF_FALLBACK[effectiveUf] || 4.8;
  return {
    hsp: fallbackHsp,
    city: searchCity,
    uf: effectiveUf,
    exact: false,
  };
}
