import { describe, it, expect } from "vitest";
import {
  GeoIrradianceService,
  normalizeTextSimple,
  parseLocationString,
  UF_FALLBACK,
} from "../geo-irradiance.service";

describe("GeoIrradianceService - Municipal Solar Irradiation Suite", () => {
  const service = new GeoIrradianceService();

  describe("normalizeTextSimple", () => {
    it("should strip accents, lowercase, and trim", () => {
      expect(normalizeTextSimple("  São Paulo  ")).toBe("SAO PAULO");
      expect(normalizeTextSimple("Maringá")).toBe("MARINGA");
      expect(normalizeTextSimple("Florianópolis")).toBe("FLORIANOPOLIS");
    });

    it("should handle empty or null strings safely", () => {
      expect(normalizeTextSimple("")).toBe("");
    });
  });

  describe("parseLocationString", () => {
    it("should extract city and UF from slash notation", () => {
      expect(parseLocationString("Maringá / PR")).toEqual({ city: "Maringá", uf: "PR" });
      expect(parseLocationString("Campinas/SP")).toEqual({ city: "Campinas", uf: "SP" });
    });

    it("should extract city and UF from hyphen or comma notation", () => {
      expect(parseLocationString("Belo Horizonte - MG")).toEqual({
        city: "Belo Horizonte",
        uf: "MG",
      });
      expect(parseLocationString("Curitiba, PR")).toEqual({ city: "Curitiba", uf: "PR" });
      expect(parseLocationString("Salvador (BA)")).toEqual({ city: "Salvador", uf: "BA" });
    });

    it("should handle cities without UF returning empty UF", () => {
      expect(parseLocationString("Goiânia")).toEqual({ city: "Goiânia", uf: "" });
    });

    it("should sanitize invisible Unicode characters (LTR/RTL/ZWSP)", () => {
      expect(parseLocationString("\u200EMaringá/PR\u200E")).toEqual({ city: "Maringá", uf: "PR" });
      expect(parseLocationString("Maringá/\u200EPR")).toEqual({ city: "Maringá", uf: "PR" });
      expect(parseLocationString("\u200BCuiabá\u200B/\u200BMT\u200B")).toEqual({
        city: "Cuiabá",
        uf: "MT",
      });
    });

    it("should handle trailing periods, commas and enclosing quotes", () => {
      expect(parseLocationString("Maringá/PR.")).toEqual({ city: "Maringá", uf: "PR" });
      expect(parseLocationString('"Maringá/PR"')).toEqual({ city: "Maringá", uf: "PR" });
      expect(parseLocationString("'Maringá/PR'")).toEqual({ city: "Maringá", uf: "PR" });
      expect(parseLocationString("`Maringá/PR`")).toEqual({ city: "Maringá", uf: "PR" });
      expect(parseLocationString("Maringá/PR,")).toEqual({ city: "Maringá", uf: "PR" });
    });

    it("should handle space-separated UF and full state names", () => {
      expect(parseLocationString("Maringá PR")).toEqual({ city: "Maringá", uf: "PR" });
      expect(parseLocationString("Maringá - Paraná")).toEqual({ city: "Maringá", uf: "PR" });
      expect(parseLocationString("Maringá/Parana")).toEqual({ city: "Maringá", uf: "PR" });
    });
  });

  describe("getHsp", () => {
    it("should return valid positive HSP for known Brazilian cities", () => {
      const result = service.getHsp("Maringá", "PR");
      expect(result.hsp).toBeGreaterThan(4.0);
      expect(result.hsp).toBeLessThan(7.0);
      expect(result.uf).toBe("PR");
    });

    it("should recognize combined single-string inputs with slash and invisible characters", () => {
      const result = service.getHsp("\u200EMaringá/PR\u200E");
      expect(result.exact).toBe(true);
      expect(result.city).toBe("Maringá");
      expect(result.uf).toBe("PR");
      expect(result.hsp).toBe(4.89);
    });

    it("should recognize city with trailing dot", () => {
      const result = service.getHsp("Maringá/PR.");
      expect(result.exact).toBe(true);
      expect(result.city).toBe("Maringá");
      expect(result.uf).toBe("PR");
      expect(result.hsp).toBe(4.89);
    });

    it("should return official state fallback when city is not found in municipal database", () => {
      const result = service.getHsp("MunicipioFicticioSolar", "MG");
      expect(result.hsp).toBe(UF_FALLBACK["MG"]);
      expect(result.exact).toBe(false);
      expect(result.uf).toBe("MG");
    });

    it("should default gracefully to São Paulo/SP when no location is given", () => {
      const result = service.getHsp("");
      expect(result.hsp).toBe(4.45);
      expect(result.city).toBe("São Paulo");
      expect(result.uf).toBe("SP");
    });
  });
});
