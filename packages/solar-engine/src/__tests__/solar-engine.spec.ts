import { describe, it, expect } from "vitest";
import {
  calculateBaseSystemKw,
  applyPreferenceFactor,
  roundToHalf,
  normalizeLocation,
  getCitySolarIndex,
  generationFromKw,
  moduleCountFromKw,
  generateSolarKits,
  ROOF_TYPE_FACTOR,
} from "../index";

describe("Solar Engine - Core Calculation Suite", () => {
  describe("calculateBaseSystemKw", () => {
    it("should calculate base system kW applying the 1.2 safety factor and 130 productivity factor", () => {
      // 650 kWh * 1.2 / 130 = 780 / 130 = 6.0 kW
      const kw = calculateBaseSystemKw(650);
      expect(kw).toBeCloseTo(6.0, 4);
    });

    it("should scale linearly with zero or positive consumption", () => {
      expect(calculateBaseSystemKw(0)).toBe(0);
      // 1300 kWh * 1.2 / 130 = 12.0 kW
      expect(calculateBaseSystemKw(1300)).toBeCloseTo(12.0, 4);
    });
  });

  describe("applyPreferenceFactor", () => {
    const base = 10;

    it("should return unchanged base kW when no preferences are specified", () => {
      expect(applyPreferenceFactor(base)).toBe(10);
      expect(applyPreferenceFactor(base, {})).toBe(10);
    });

    it("should apply 0.92 multiplier when cheaper preference is selected", () => {
      expect(applyPreferenceFactor(base, { cheaper: true })).toBeCloseTo(9.2, 4);
    });

    it("should apply 1.1 multiplier when moreGeneration preference is selected", () => {
      expect(applyPreferenceFactor(base, { moreGeneration: true })).toBeCloseTo(11.0, 4);
    });
  });

  describe("roundToHalf", () => {
    it("should round correctly to the nearest 0.5 step", () => {
      expect(roundToHalf(5.1)).toBe(5.0);
      expect(roundToHalf(5.24)).toBe(5.0);
      expect(roundToHalf(5.26)).toBe(5.5);
      expect(roundToHalf(5.7)).toBe(5.5);
      expect(roundToHalf(5.8)).toBe(6.0);
    });
  });

  describe("normalizeLocation and getCitySolarIndex", () => {
    it("should strip accents, lowercase and trim location", () => {
      expect(normalizeLocation("  São Paulo, SP  ")).toBe("sao paulo, sp");
      expect(normalizeLocation("Maringá, PR")).toBe("maringa, pr");
    });

    it("should return the exact solar index for registered cities", () => {
      expect(getCitySolarIndex("Maringá, PR")).toBe(5.2);
      expect(getCitySolarIndex("Fortaleza, CE")).toBe(5.7);
      expect(getCitySolarIndex("Curitiba, PR")).toBe(4.6);
    });

    it("should fallback to state index when city is unknown but state is provided", () => {
      // Cascavel is not in hardcoded city list, but PR state index is 4.9
      expect(getCitySolarIndex("Cascavel, PR")).toBe(4.9);
      expect(getCitySolarIndex("Campinas, SP")).toBe(4.8);
    });

    it("should fallback to default 4.8 when location is completely unknown or invalid", () => {
      expect(getCitySolarIndex("")).toBe(4.8);
      expect(getCitySolarIndex("Cidade Inexistente")).toBe(4.8);
    });
  });

  describe("generationFromKw & moduleCountFromKw", () => {
    it("should calculate monthly generation given kW, solar index and PR", () => {
      // 5 kW * 5.0 kWh/m2 * 30 days * 0.8 PR = 600 kWh/mês
      const gen = generationFromKw(5, 5.0, 0.8);
      expect(gen).toBe(600);
    });

    it("should determine module count assuming 550W (0.55 kW) modules with min 1", () => {
      expect(moduleCountFromKw(0)).toBe(1);
      // 5.5 kW / 0.55 = 10 modules
      expect(moduleCountFromKw(5.5)).toBe(10);
      // 6.0 kW / 0.55 = 10.9 => 11 modules
      expect(moduleCountFromKw(6.0)).toBe(11);
    });
  });

  describe("generateSolarKits - Pipeline End-to-End", () => {
    it("should generate 3 kit suggestions (Melhor Custo-Benefício, Menor Preço, Premium)", () => {
      const result = generateSolarKits({
        monthlyConsumption: 500,
        roofType: "ceramic",
        location: "Maringá, PR",
      });

      expect(result.kits).toHaveLength(3);

      const costBenefit = result.kits[0]!;
      const cheaper = result.kits[1]!;
      const premium = result.kits[2]!;
      expect(costBenefit.label).toBe("Melhor Custo-Benefício");
      expect(cheaper.label).toBe("Menor Preço");
      expect(premium.label).toBe("Premium");

      // Verify structure and required properties
      for (const kit of result.kits) {
        expect(kit.systemSize).toMatch(/^\d+(\.\d+)?kWp$/);
        expect(kit.modules).toBeGreaterThan(0);
        expect(kit.estimatedPrice).toBeGreaterThan(0);
        expect(kit.citySolarIndexKwhM2Day).toBe(5.2);
        expect(kit.performanceRatio).toBe(0.8);
      }

      // Premium should have higher price than Menor Preço
      expect(premium.estimatedPrice).toBeGreaterThan(cheaper.estimatedPrice);
    });

    it("should respect custom module and inverter brand preferences", () => {
      const result = generateSolarKits({
        monthlyConsumption: 700,
        roofType: "metal",
        location: "São Paulo, SP",
        preferences: {
          moduleBrand: "Trina Solar",
          inverterBrand: "Deye",
        },
      });

      const costBenefit = result.kits[0]!;
      expect(costBenefit.moduleBrand).toBe("Trina Solar");
      expect(costBenefit.inverter).toContain("Deye");
    });

    it("should apply roof factors correctly (ground/laje/metal)", () => {
      expect(ROOF_TYPE_FACTOR["ground"]).toBe(1.08);
      expect(ROOF_TYPE_FACTOR["metal"]).toBe(1.03);
      expect(ROOF_TYPE_FACTOR["ceramic"]).toBe(1.0);
    });
  });
});
