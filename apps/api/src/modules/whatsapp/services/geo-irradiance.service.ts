import { Injectable, Logger } from "@nestjs/common";
import fs from "node:fs";
import path from "node:path";

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

export const UF_TO_STATE_TITLE: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

export const STATE_CAPITALS: Record<string, string> = {
  AC: "Rio Branco",
  AL: "Maceió",
  AP: "Macapá",
  AM: "Manaus",
  BA: "Salvador",
  CE: "Fortaleza",
  DF: "Brasília",
  ES: "Vitória",
  GO: "Goiânia",
  MA: "São Luís",
  MT: "Cuiabá",
  MS: "Campo Grande",
  MG: "Belo Horizonte",
  PA: "Belém",
  PB: "João Pessoa",
  PR: "Curitiba",
  PE: "Recife",
  PI: "Teresina",
  RJ: "Rio de Janeiro",
  RN: "Natal",
  RS: "Porto Alegre",
  RO: "Porto Velho",
  RR: "Boa Vista",
  SC: "Florianópolis",
  SP: "São Paulo",
  SE: "Aracaju",
  TO: "Palmas",
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

import { BRAZIL_MUNICIPALITIES_DATA } from "../data/municipalities-hsp.data";

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

/**
 * Detecta se a entrada fornecida se refere a um Estado brasileiro (pelo nome por extenso ou UF de 2 letras).
 * Trata prefixos como "estado de", "no estado de", "em", "para", etc.
 */
export function detectStateInput(input: string): {
  isState: boolean;
  uf?: string;
  stateName?: string;
} {
  if (!input) return { isState: false };
  let raw = cleanLocationInput(input);

  // Remove prefixos como "mudar cidade para", "em", "para", "no estado de", "estado de", etc.
  raw = raw
    .replace(
      /^(?:mudar\s+(?:a\s+)?(?:cidade|localidade|estado)(?:\s+para)?|trocar\s+(?:a\s+)?(?:cidade|localidade|estado)(?:\s+para)?|alterar\s+(?:a\s+)?(?:cidade|localidade|estado)(?:\s+para)?|(?:no|na|em|para|o|a)?\s*estado\s+(?:de|do|da)?\s*|(?:cidade|localidade|estado|uf)\s*:?|(?:em|para|no|na)\s+)\s*/i,
      ""
    )
    .trim();

  // Remove aspas ou formatação markdown
  raw = raw.replace(/^["'`*_~]+|["'`*_~]+$/g, "").trim();
  raw = raw.replace(/[.,;!?:)]+$/, "").trim();

  const norm = normalizeTextSimple(raw);
  if (!norm) return { isState: false };

  // 1. Sigla de 2 letras (UF)
  if (norm.length === 2 && UF_TO_STATE_NAME[norm]) {
    return {
      isState: true,
      uf: norm,
      stateName: UF_TO_STATE_TITLE[norm] || UF_TO_STATE_NAME[norm] || norm,
    };
  }

  // 2. Nome completo do Estado
  if (STATE_NAME_TO_UF[norm]) {
    const uf = STATE_NAME_TO_UF[norm];
    return {
      isState: true,
      uf,
      stateName: UF_TO_STATE_TITLE[uf] || UF_TO_STATE_NAME[uf] || norm,
    };
  }

  return { isState: false };
}

export interface ParsedLocation {
  city: string;
  uf: string;
  isStateOnly?: boolean;
  stateName?: string;
}

export function parseLocationString(input: string): ParsedLocation {
  if (!input) return { city: "", uf: "", isStateOnly: false };
  let raw = cleanLocationInput(input);

  // Remove prefixos conversacionais comuns ("mudar cidade para", "cidade:", etc.)
  raw = raw
    .replace(
      /^(?:mudar\s+(?:a\s+)?(?:cidade|localidade|estado)(?:\s+para)?|trocar\s+(?:a\s+)?(?:cidade|localidade|estado)(?:\s+para)?|alterar\s+(?:a\s+)?(?:cidade|localidade|estado)(?:\s+para)?|(?:no|na|em|para|o|a)?\s*estado\s+(?:de|do|da)?\s*|(?:cidade|localidade|estado|uf)\s*:?|(?:em|para|no|na)\s+)\s*/i,
      ""
    )
    .trim();

  // Remove aspas ou formatação markdown no início e no fim ("...", '...', `...`, *...*, _..._)
  raw = raw.replace(/^["'`*_~]+|["'`*_~]+$/g, "").trim();

  // Remove pontuação terminal (. , ; ! ?) adicionada pelo teclado/autocorreto (ex: "Maringá/PR." -> "Maringá/PR")
  raw = raw.replace(/[.,;!?:)]+$/, "").trim();

  let uf = "";

  // 1. Tenta identificar se o final contém conector e nome completo de Estado brasileiro por extenso
  // (ex: " e Estado de São Paulo", " de São Paulo", " no estado de São Paulo", " do Paraná", " - Paraná")
  // Ordena por comprimento decrescente para priorizar estados com nomes compostos (ex: "Mato Grosso do Sul" antes de "Mato Grosso")
  const sortedStateNames = Object.keys(STATE_NAME_TO_UF).sort((a, b) => b.length - a.length);
  const normRawForState = normalizeTextSimple(raw);

  for (const stateName of sortedStateNames) {
    const escapedState = stateName.replace(/\s+/g, "\\s+");
    const pattern = new RegExp(
      `(?:[\\s\\/\\-,]+(?:(?:E\\s+|NO\\s+|NA\\s+|EM\\s+|DO\\s+|DA\\s+|DE\\s+)?ESTADO\\s+(?:DE|DO|DA)\\s+|DE\\s+|DO\\s+|DA\\s+|EM\\s+|NO\\s+|NA\\s+|E\\s+)|[\\s\\/\\-,]+)${escapedState}$`,
      "i"
    );
    const match = normRawForState.match(pattern);
    if (match && typeof match.index === "number") {
      uf = STATE_NAME_TO_UF[stateName] || "";
      raw = raw.substring(0, match.index).trim();
      break;
    }
  }

  // 2. Se não encontrou por extenso, tenta identificar UF por sigla de 2 letras no final precedida de separador/conector
  // (ex: "/PR", " - PR", " PR", ", PR", "(PR)", " de SP", " em SP")
  if (!uf) {
    const ufMatch = raw.match(/(?:[\s\/\-\(,]+(?:(?:de|do|da|em|no|na)\s+)?)([A-Za-z]{2})\)?$/i);
    if (ufMatch && ufMatch[1] && UF_TO_STATE_NAME[ufMatch[1].toUpperCase()]) {
      uf = ufMatch[1].toUpperCase();
      raw = raw.substring(0, ufMatch.index).trim();
    }
  }

  // Remove conectores e separadores residuais que sobraram no final da cidade
  raw = raw
    .replace(
      /(?:[\s\/\-\(,]+(?:e\s+|no\s+|na\s+|em\s+|do\s+|da\s+|de\s+)?(?:estado\s+(?:de|do|da)?)?)$/i,
      ""
    )
    .replace(/[\s\/\-\(,\."'`*_~]+$/, "")
    .trim();

  // 3. Se a cidade ficou vazia (ex: input continha apenas a UF ou Estado)
  if (!raw && uf) {
    return {
      city: "",
      uf,
      isStateOnly: true,
      stateName: UF_TO_STATE_TITLE[uf] || UF_TO_STATE_NAME[uf] || uf,
    };
  }

  // 4. Se não extraiu UF no final, verifica se a entrada inteira é um Estado brasileiro
  if (!uf) {
    const stateCheck = detectStateInput(raw);
    if (stateCheck.isState && stateCheck.uf) {
      // Exceção: São Paulo e Rio de Janeiro são estados E cidades capitais homônimas
      const normRaw = normalizeTextSimple(raw);
      const isExplicitStatePrefix = /(?:estado|uf)/i.test(input);
      if (!isExplicitStatePrefix && (normRaw === "SAO PAULO" || normRaw === "RIO DE JANEIRO")) {
        return {
          city: normRaw === "SAO PAULO" ? "São Paulo" : "Rio de Janeiro",
          uf: stateCheck.uf,
        };
      }
      return {
        city: "",
        uf: stateCheck.uf,
        isStateOnly: true,
        stateName: stateCheck.stateName,
      };
    }
  }

  return { city: raw, uf };
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
  isStateOnly?: boolean;
  stateName?: string;
}

export function isLocationInput(input: string): boolean {
  if (!input) return false;
  const parsed = parseLocationString(input);
  if (parsed.isStateOnly && parsed.uf) {
    return true; // Estado brasileiro reconhecido
  }
  if (!parsed.city) return false;
  const normCity = normalizeTextSimple(parsed.city);
  if (parsed.uf && BRAZIL_MUNICIPALITIES_DATA.byCityUf[`${normCity}_${parsed.uf}`]) {
    return true;
  }
  if (BRAZIL_MUNICIPALITIES_DATA.byCity[normCity]?.length) {
    return true;
  }
  const clean = cleanLocationInput(input);
  const normClean = normalizeTextSimple(clean);
  if (BRAZIL_MUNICIPALITIES_DATA.byCity[normClean]?.length) {
    return true;
  }
  return false;
}

@Injectable()
export class GeoIrradianceService {
  private readonly logger = new Logger(GeoIrradianceService.name);
  private cachedHspCsv: string[] | null = null;

  constructor() {
    this.loadHspCsv();
  }

  private loadHspCsv(): void {
    try {
      const candidates = [
        path.join(process.cwd(), "hsp_brasil_todos_municipios hsp_medio_anual.csv"),
        path.join(process.cwd(), "..", "hsp_brasil_todos_municipios hsp_medio_anual.csv"),
        path.join(process.cwd(), "..", "..", "hsp_brasil_todos_municipios hsp_medio_anual.csv"),
        path.join(__dirname, "..", "..", "..", "hsp_brasil_todos_municipios hsp_medio_anual.csv"),
      ];

      for (const p of candidates) {
        if (fs.existsSync(p)) {
          this.cachedHspCsv = fs.readFileSync(p, "utf8").split("\n");
          this.logger.log(
            `Base de irradiação municipal (CSV) carregada com sucesso (${this.cachedHspCsv.length} linhas).`
          );
          break;
        }
      }
    } catch (err) {
      this.logger.warn(
        `Aviso: Falha ao carregar CSV de HSP, usando base embutida oficial: ${String(err)}`
      );
    }
  }

  /**
   * Obtém as Horas de Sol Pleno (HSP) para uma dada cidade e estado.
   * Procura na base municipal oficial em memória (5.569 municípios) e, se não encontrar, utiliza a média oficial do estado.
   */
  getHsp(cidade: string, estado?: string): HspLookupResult {
    const cleanedInput = cleanLocationInput(cidade);
    const parsed = parseLocationString(cleanedInput);

    // 0. Se a entrada informada for exclusivamente um Estado brasileiro (ex: "Alagoas", "AL", "Bahia", "Minas Gerais")
    if (parsed.isStateOnly && parsed.uf) {
      const stateUf = parsed.uf;
      const stateName = parsed.stateName || UF_TO_STATE_TITLE[stateUf] || stateUf;
      const stateHsp = UF_FALLBACK[stateUf] || 5.0;
      return {
        hsp: stateHsp,
        city: "",
        uf: stateUf,
        exact: true,
        ambiguous: false,
        isStateOnly: true,
        stateName,
      };
    }

    const searchCity = parsed.city || cleanedInput || "São Paulo";
    const rawUfCandidate = (estado || parsed.uf || "").trim();
    const resolvedUf =
      rawUfCandidate.length === 2
        ? rawUfCandidate.toUpperCase()
        : STATE_NAME_TO_UF[normalizeTextSimple(rawUfCandidate)] || rawUfCandidate.toUpperCase();
    const searchUf = resolvedUf;
    const normSearchCity = normalizeTextSimple(searchCity);

    // Se o nome de busca for um Estado brasileiro (excluindo capitais homônimas SP/RJ)
    if (
      STATE_NAME_TO_UF[normSearchCity] &&
      normSearchCity !== "SAO PAULO" &&
      normSearchCity !== "RIO DE JANEIRO"
    ) {
      const stateUf = STATE_NAME_TO_UF[normSearchCity];
      const stateName = UF_TO_STATE_TITLE[stateUf] || UF_TO_STATE_NAME[stateUf] || stateUf;
      return {
        hsp: UF_FALLBACK[stateUf] || 5.0,
        city: "",
        uf: stateUf,
        exact: true,
        ambiguous: false,
        isStateOnly: true,
        stateName,
      };
    }

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
          ambiguous: false,
        };
      }
    }

    // 2. Se a UF não foi informada ou não bateu exatamente, busca pelo nome da cidade no Brasil
    const cityMatches = BRAZIL_MUNICIPALITIES_DATA.byCity[normSearchCity];
    if (cityMatches && cityMatches.length > 0) {
      // Se tiver UF informada, tenta filtrar
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

      // Se a cidade só existe em UM único estado no Brasil:
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

      // Se a cidade existe em MAIS DE UM estado no Brasil e a UF não foi informada (ou não bateu):
      // Ambiguidade detectada! Lista todos os estados onde o município existe, priorizando capitais
      const sortedCandidates: MunicipalityCandidate[] = [...cityMatches]
        .map((m) => {
          const isCapital =
            STATE_CAPITALS[m.uf] !== undefined &&
            normalizeTextSimple(STATE_CAPITALS[m.uf]!) === normalizeTextSimple(m.city);
          return {
            city: m.city,
            uf: m.uf,
            hsp: m.hsp,
            stateName: UF_TO_STATE_TITLE[m.uf] || UF_TO_STATE_NAME[m.uf] || m.uf,
            isCapital,
          };
        })
        .sort((a, b) => {
          // Capital vem primeiro (ex: Belém/PA antes de Belém/AL)
          if (a.isCapital && !b.isCapital) return -1;
          if (!a.isCapital && b.isCapital) return 1;
          // Em seguida, ordem alfabética de UF
          return a.uf.localeCompare(b.uf);
        });

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

    // 3. Fallback para o CSV carregado em disco se existir
    if (this.cachedHspCsv) {
      const targetStateName = UF_TO_STATE_NAME[searchUf]
        ? normalizeTextSimple(UF_TO_STATE_NAME[searchUf]!)
        : normalizeTextSimple(searchUf);

      let fallbackMatch: HspLookupResult | null = null;

      for (let i = 1; i < this.cachedHspCsv.length; i++) {
        const line = this.cachedHspCsv[i];
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

    // 4. Se a UF for conhecida, usa a média do estado
    if (searchUf && UF_FALLBACK[searchUf]) {
      return {
        hsp: UF_FALLBACK[searchUf] || 5.0,
        city: searchCity,
        uf: searchUf,
        exact: false,
      };
    }

    // 5. Fallback final padrão
    const finalUf = searchUf || "SP";
    const invalidWords = new Set([
      "NENHUMA",
      "NENHUM",
      "NADA",
      "NAO",
      "NAO SEI",
      "CANCELAR",
      "MENU",
      "VOLTAR",
      "0",
      "SIM",
      "OK",
      "TESTE",
    ]);
    const safeCity = invalidWords.has(normSearchCity) || !searchCity ? "São Paulo" : searchCity;
    return {
      hsp: UF_FALLBACK[finalUf] || 5.0,
      city: safeCity,
      uf: finalUf,
      exact: false,
    };
  }
}

const defaultGeoService = new GeoIrradianceService();
export function getHsp(cidade: string, estado?: string): HspLookupResult {
  return defaultGeoService.getHsp(cidade, estado);
}
