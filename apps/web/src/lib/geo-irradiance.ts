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

export function normalizeTextSimple(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

export function parseLocationString(input: string): { city: string; uf: string } {
  if (!input) return { city: "", uf: "" };
  let raw = input
    .replace(
      /^(?:mudar\s+(?:a\s+)?cidade(?:\s+para)?|trocar\s+(?:a\s+)?cidade(?:\s+para)?|alterar\s+(?:a\s+)?cidade(?:\s+para)?|cidade\s*:?)\s*/i,
      ""
    )
    .trim();
  let uf = "";

  const ufMatch = raw.match(/[\s\/\-\(,]([A-Za-z]{2})\)?$/);
  if (ufMatch && ufMatch[1] && UF_TO_STATE_NAME[ufMatch[1].toUpperCase()]) {
    uf = ufMatch[1].toUpperCase();
    raw = raw.substring(0, ufMatch.index).trim();
  }

  raw = raw.replace(/[\s\/\-\(,]+$/, "").trim();

  return { city: raw, uf };
}

export interface HspLookupResult {
  hsp: number;
  city: string;
  uf: string;
  exact: boolean;
}

export function getHsp(cidade: string, estado?: string): HspLookupResult {
  const parsed = parseLocationString(cidade);
  const searchCity = parsed.city || cidade || "São Paulo";
  const searchUf = (estado || parsed.uf || "").toUpperCase();
  const normSearchCity = normalizeTextSimple(searchCity);

  // 1. Consulta prioritária na base oficial completa embutida (5.569 municípios)
  if (searchUf) {
    const key = `${normSearchCity}_${searchUf}`;
    const entry = BRAZIL_MUNICIPALITIES_DATA.byCityUf[key];
    if (entry) {
      return {
        hsp: entry.hsp,
        city: entry.city,
        uf: entry.uf,
        exact: true,
      };
    }
  }

  // 2. Se a UF não foi informada ou não bateu exatamente, busca pelo nome da cidade no Brasil
  const cityMatches = BRAZIL_MUNICIPALITIES_DATA.byCity[normSearchCity];
  if (cityMatches && cityMatches.length > 0) {
    if (searchUf) {
      const matchWithUf = cityMatches.find((m) => m.uf === searchUf);
      if (matchWithUf) {
        return {
          hsp: matchWithUf.hsp,
          city: matchWithUf.city,
          uf: matchWithUf.uf,
          exact: true,
        };
      }
    }
    // Retorna a primeira ocorrência encontrada para a cidade
    const bestMatch = cityMatches[0];
    if (bestMatch) {
      return {
        hsp: bestMatch.hsp,
        city: bestMatch.city,
        uf: bestMatch.uf,
        exact: true,
      };
    }
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
