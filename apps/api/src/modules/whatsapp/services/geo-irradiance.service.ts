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

export function isLocationInput(input: string): boolean {
  if (!input) return false;
  const parsed = parseLocationString(input);
  if (!parsed.city) return false;
  const normCity = normalizeTextSimple(parsed.city);
  if (parsed.uf && BRAZIL_MUNICIPALITIES_DATA.byCityUf[`${normCity}_${parsed.uf}`]) {
    return true;
  }
  if (BRAZIL_MUNICIPALITIES_DATA.byCity[normCity]?.length) {
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
      // Se tiver UF informada, tenta filtrar
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
      // Se não informou UF, usa a cidade encontrada (ex: Cuiabá -> MT)
      const bestMatch = cityMatches[0]!;
      return {
        hsp: bestMatch.hsp,
        city: bestMatch.city,
        uf: bestMatch.uf,
        exact: cityMatches.length === 1,
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
    return {
      hsp: UF_FALLBACK[finalUf] || 5.0,
      city: searchCity || "São Paulo",
      uf: finalUf,
      exact: false,
    };
  }
}

const defaultGeoService = new GeoIrradianceService();
export function getHsp(cidade: string, estado?: string): HspLookupResult {
  return defaultGeoService.getHsp(cidade, estado);
}
