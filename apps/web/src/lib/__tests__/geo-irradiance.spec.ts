import { describe, it, expect } from "vitest";
import {
  getHsp,
  normalizeMunicipalNumerals,
  cleanLocationInput,
  parseLocationString,
} from "../geo-irradiance";

describe("Web GeoIrradiance - Numeral Normalization and HSP Lookup", () => {
  it("should normalize municipal numerals", () => {
    expect(normalizeMunicipalNumerals("PEDRO SEGUNDO")).toBe("PEDRO II");
    expect(normalizeMunicipalNumerals("PEDRO 2")).toBe("PEDRO II");
    expect(normalizeMunicipalNumerals("CORONEL 1")).toBe("CORONEL I");
  });

  it("should resolve Pedro II in PI with 'Pedro segundo, Piauí'", () => {
    const res = getHsp("Pedro segundo, Piauí");
    expect(res.city).toBe("Pedro II");
    expect(res.uf).toBe("PI");
    expect(res.hsp).toBeGreaterThan(4.5);
  });

  it("should resolve Pedro 2, PI", () => {
    const res = getHsp("Pedro 2, PI");
    expect(res.city).toBe("Pedro II");
    expect(res.uf).toBe("PI");
  });

  it("should sanitize and clean location inputs", () => {
    const cleaned = cleanLocationInput("  \u200ePedro segundo, Piauí.  ");
    expect(cleaned).toBe("Pedro segundo, Piauí.");

    const parsed = parseLocationString("  \u200ePedro segundo, Piauí.  ");
    expect(parsed.city).toBe("Pedro segundo");
    expect(parsed.uf).toBe("PI");
  });
});
