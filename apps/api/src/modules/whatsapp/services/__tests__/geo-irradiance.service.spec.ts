import { describe, it, expect } from "vitest";
import {
  GeoIrradianceService,
  normalizeTextSimple,
  parseLocationString,
  isLocationInput,
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

    describe("Unique vs Ambiguous City Detection", () => {
      it("should mark unique cities without UF as exact and not ambiguous", () => {
        const result = service.getHsp("Maringá");
        expect(result.exact).toBe(true);
        expect(result.ambiguous).toBeFalsy();
        expect(result.city).toBe("Maringá");
        expect(result.uf).toBe("PR");
      });

      it("should mark homonymous city without UF as ambiguous and return candidate states with capital prioritized", () => {
        const result = service.getHsp("Belém");
        expect(result.ambiguous).toBe(true);
        expect(result.candidates).toBeDefined();
        expect(result.candidates!.length).toBeGreaterThan(1);
        const ufs = result.candidates!.map((c) => c.uf);
        expect(ufs).toContain("PA");
        expect(ufs).toContain("AL");
        expect(ufs).toContain("PB");
        // Belém/PA é capital e deve ser a primeira opção listada
        expect(result.candidates![0].uf).toBe("PA");
      });

      it("should NOT be ambiguous when user explicitly provides UF for a homonymous city", () => {
        const resPa = service.getHsp("Belém/PA");
        expect(resPa.exact).toBe(true);
        expect(resPa.ambiguous).toBeFalsy();
        expect(resPa.uf).toBe("PA");

        const resAl = service.getHsp("Belém", "AL");
        expect(resAl.exact).toBe(true);
        expect(resAl.ambiguous).toBeFalsy();
        expect(resAl.uf).toBe("AL");
      });

      it("should detect ambiguity for other homonymous cities like Pilar (AL/PB)", () => {
        const result = service.getHsp("Pilar");
        expect(result.ambiguous).toBe(true);
        expect(result.candidates).toBeDefined();
        const ufs = result.candidates!.map((c) => c.uf);
        expect(ufs).toContain("AL");
        expect(ufs).toContain("PB");
      });
    });

    describe("Brazilian State Detection (Alagoas, Bahia, Minas Gerais, etc.)", () => {
      it("should parse state names and UFs without inventing a city", () => {
        expect(parseLocationString("Alagoas")).toEqual({
          city: "",
          uf: "AL",
          isStateOnly: true,
          stateName: "Alagoas",
        });
        expect(parseLocationString("AL")).toEqual({
          city: "",
          uf: "AL",
          isStateOnly: true,
          stateName: "Alagoas",
        });
        expect(parseLocationString("estado de Alagoas")).toEqual({
          city: "",
          uf: "AL",
          isStateOnly: true,
          stateName: "Alagoas",
        });
        expect(parseLocationString("no estado de Alagoas")).toEqual({
          city: "",
          uf: "AL",
          isStateOnly: true,
          stateName: "Alagoas",
        });
        expect(parseLocationString("Bahia")).toEqual({
          city: "",
          uf: "BA",
          isStateOnly: true,
          stateName: "Bahia",
        });
        expect(parseLocationString("Minas Gerais")).toEqual({
          city: "",
          uf: "MG",
          isStateOnly: true,
          stateName: "Minas Gerais",
        });
        expect(parseLocationString("Paraná")).toEqual({
          city: "",
          uf: "PR",
          isStateOnly: true,
          stateName: "Paraná",
        });
      });

      it("should preserve city when city and state are both provided", () => {
        expect(parseLocationString("Maceió/AL")).toEqual({
          city: "Maceió",
          uf: "AL",
        });
        expect(parseLocationString("Maringá - Paraná")).toEqual({
          city: "Maringá",
          uf: "PR",
        });
      });

      it("should recognize state inputs as valid location inputs", () => {
        expect(isLocationInput("Alagoas")).toBe(true);
        expect(isLocationInput("AL")).toBe(true);
        expect(isLocationInput("Bahia")).toBe(true);
        expect(isLocationInput("Minas Gerais")).toBe(true);
      });

      it("should return official state irradiation for Alagoas (AL) and NEVER fallback to Alagoas/SP", () => {
        const resAlagoas = service.getHsp("Alagoas");
        expect(resAlagoas.uf).toBe("AL");
        expect(resAlagoas.isStateOnly).toBe(true);
        expect(resAlagoas.exact).toBe(true);
        expect(resAlagoas.hsp).toBe(UF_FALLBACK["AL"]);
        expect(resAlagoas.city).not.toBe("Alagoas");

        const resAL = service.getHsp("AL");
        expect(resAL.uf).toBe("AL");
        expect(resAL.isStateOnly).toBe(true);
        expect(resAL.exact).toBe(true);
        expect(resAL.hsp).toBe(UF_FALLBACK["AL"]);

        const resBahia = service.getHsp("Bahia");
        expect(resBahia.uf).toBe("BA");
        expect(resBahia.isStateOnly).toBe(true);

        const resMG = service.getHsp("Minas Gerais");
        expect(resMG.uf).toBe("MG");
        expect(resMG.isStateOnly).toBe(true);
      });
    });

    describe("Numeral Normalization & Roman Numerals (Pedro II / PI)", () => {
      it("should match 'Pedro segundo, Piauí' to Pedro II - PI with exact match", () => {
        expect(isLocationInput("Pedro segundo, Piauí")).toBe(true);
        expect(isLocationInput("Pedro 2, PI")).toBe(true);
        expect(isLocationInput("Pedro segundo")).toBe(true);

        const res = service.getHsp("Pedro segundo, Piauí");
        expect(res.city).toBe("Pedro II");
        expect(res.uf).toBe("PI");
        expect(res.exact).toBe(true);
        expect(res.hsp).toBeGreaterThan(5.0);

        const res2 = service.getHsp("Pedro 2, PI");
        expect(res2.city).toBe("Pedro II");
        expect(res2.uf).toBe("PI");
        expect(res2.exact).toBe(true);
      });
    });

    describe("GPS Coordinates / Maps Pin Closest Municipality", () => {
      it("should find Pedro II / PI from exact or nearby GPS coordinates", () => {
        const match = service.findClosestMunicipality(-4.4285, -41.453);
        expect(match).not.toBeNull();
        expect(match?.city).toBe("Pedro II");
        expect(match?.uf).toBe("PI");
        expect(match?.distanceKm).toBe(0);
      });

      it("should find Maringá / PR from GPS coordinates", () => {
        const match = service.findClosestMunicipality(-23.42, -51.93);
        expect(match).not.toBeNull();
        expect(match?.city).toBe("Maringá");
        expect(match?.uf).toBe("PR");
        expect(match?.distanceKm).toBeLessThan(5);
      });

      it("should return null for coordinates far outside Brazil", () => {
        const match = service.findClosestMunicipality(48.8566, 2.3522); // Paris
        expect(match).toBeNull();
      });
    });
  });
});
