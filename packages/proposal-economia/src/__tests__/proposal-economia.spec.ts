import { describe, it, expect } from "vitest";
import {
  parseExtractedNumber,
  parseBillLocation,
  simulateProposal,
  computeProjectCostSection,
  projectCostRuleMatchesKwp,
  getDefaultEssentialRulesForSeeding,
  mergeOrganizationRulesWithEssentialDefaults,
  PROJECT_COST_ESSENTIAL_LABOR_NAME,
  PROJECT_COST_ESSENTIAL_MARGIN_NAME,
} from "../index";

describe("Proposal Economia - Financial & Cost Suite", () => {
  describe("parseExtractedNumber", () => {
    it("should parse brazilian formatted currency and numbers correctly", () => {
      expect(parseExtractedNumber("1.250,50")).toBe(1250.5);
      expect(parseExtractedNumber("  R$ 15.420,80 ")).toBe(15420.8);
      expect(parseExtractedNumber("450,00")).toBe(450.0);
    });

    it("should parse standard decimal numbers correctly", () => {
      expect(parseExtractedNumber(1500)).toBe(1500);
      expect(parseExtractedNumber("1500.75")).toBe(1500.75);
    });

    it("should handle null, undefined, empty strings and invalid formats returning 0", () => {
      expect(parseExtractedNumber(null)).toBe(0);
      expect(parseExtractedNumber(undefined)).toBe(0);
      expect(parseExtractedNumber("")).toBe(0);
      expect(parseExtractedNumber("abc")).toBe(0);
    });
  });

  describe("parseBillLocation", () => {
    it("should parse 'cidade: X - estado: UF'", () => {
      const parsed = parseBillLocation("cidade: Maringá - estado: PR");
      expect(parsed).toEqual({ cityName: "Maringá", uf: "PR" });
    });

    it("should parse 'Cidade / UF'", () => {
      const parsed = parseBillLocation("Londrina / PR");
      expect(parsed).toEqual({ cityName: "Londrina", uf: "PR" });
    });

    it("should parse 'Cidade, UF'", () => {
      const parsed = parseBillLocation("São Paulo, SP");
      expect(parsed).toEqual({ cityName: "São Paulo", uf: "SP" });
    });

    it("should handle empty or unparseable text gracefully", () => {
      expect(parseBillLocation("")).toEqual({});
      expect(parseBillLocation("Endereço sem cidade nem UF")).toEqual({});
    });
  });

  describe("simulateProposal", () => {
    it("should calculate proposal economics with consumption and bill value", () => {
      const res = simulateProposal({
        consumo: 600,
        valorConta: 540,
        tarifa: 0.9,
        irradiacao: 140,
        roofType: "ceramic",
      });

      // safeConsumption = 600
      expect(res.monthlyConsumptionKwh).toBe(600);
      // compensavel = valorConta * 0.85 = 540 * 0.85 = 459
      expect(res.economiaMensal).toBeCloseTo(459, 2);
      // geracaoNecessaria = 600 * 1.2 = 720
      // geracaoBase = 140 * 1 = 140
      // tamanhoSistema = 720 / 140 = 5.1428... kW
      expect(res.tamanhoSistema).toBeCloseTo(5.14, 1);
      // valorSistema = tamanhoSistema * 5000
      expect(res.valorSistema).toBeCloseTo(res.tamanhoSistema * 5000, 2);
      // payback = valorSistema / (economiaMensal * 12)
      const annualSavings = res.economiaMensal * 12;
      expect(res.payback).toBeCloseTo(res.valorSistema / annualSavings, 2);
    });

    it("should fallback to 350 kWh default when neither consumo nor valorConta are provided", () => {
      const res = simulateProposal({});
      expect(res.monthlyConsumptionKwh).toBe(350);
      expect(res.valorSistema).toBeGreaterThan(0);
      expect(res.payback).toBeGreaterThan(0);
    });
  });

  describe("projectCostRuleMatchesKwp", () => {
    it("should match open-ended rules correctly", () => {
      // 0 <= kwp < 5
      expect(projectCostRuleMatchesKwp({ minKwp: 0, maxKwp: 5 }, 3.5)).toBe(true);
      expect(projectCostRuleMatchesKwp({ minKwp: 0, maxKwp: 5 }, 5.0)).toBe(false);

      // 5 <= kwp < 10
      expect(projectCostRuleMatchesKwp({ minKwp: 5, maxKwp: 10 }, 5.0)).toBe(true);
      expect(projectCostRuleMatchesKwp({ minKwp: 5, maxKwp: 10 }, 9.9)).toBe(true);
      expect(projectCostRuleMatchesKwp({ minKwp: 5, maxKwp: 10 }, 10.0)).toBe(false);

      // 10 <= kwp < infinity
      expect(projectCostRuleMatchesKwp({ minKwp: 10, maxKwp: null }, 15.0)).toBe(true);
      expect(projectCostRuleMatchesKwp({ minKwp: 10, maxKwp: null }, 9.9)).toBe(false);
    });
  });

  describe("computeProjectCostSection", () => {
    it("should apply essential default rules (Labor + Margin) when organization has no custom rules", () => {
      const equipmentSubtotal = 10000;
      const systemKwp = 4.5; // Falls into 0-5 kWp labor bracket (R$ 1500)

      const result = computeProjectCostSection(equipmentSubtotal, systemKwp, []);

      // Default labor for 4.5 kWp is R$ 1500
      const laborLine = result.projectCostLines.find(
        (l) => l.name === PROJECT_COST_ESSENTIAL_LABOR_NAME
      );
      expect(laborLine).toBeDefined();
      expect(laborLine?.appliedAmountBrl).toBe(1500);

      // Direct project cost = 10000 + 1500 = 11500
      // Margin = 20% on SALE_PRICE:
      // Sale = Cost / (1 - 0.20) = 11500 / 0.8 = 14375
      // Margin amount = 14375 - 11500 = 2875
      const marginLine = result.projectCostLines.find(
        (l) => l.name === PROJECT_COST_ESSENTIAL_MARGIN_NAME
      );
      expect(marginLine).toBeDefined();
      expect(marginLine?.appliedAmountBrl).toBeCloseTo(2875, 1);
      expect(result.computedSaleFromCostRulesBrl).toBeCloseTo(14375, 1);
    });

    it("should prioritize custom organization rules over system defaults", () => {
      const equipmentSubtotal = 20000;
      const systemKwp = 6.0;

      const customRules = [
        {
          id: "custom_labor_rule",
          name: PROJECT_COST_ESSENTIAL_LABOR_NAME,
          calculationType: "PER_KWP" as const,
          value: 300, // R$ 300 per kWp => 6 * 300 = 1800
          minKwp: null,
          maxKwp: null,
        },
        {
          id: "custom_margin_rule",
          name: PROJECT_COST_ESSENTIAL_MARGIN_NAME,
          calculationType: "PERCENTAGE" as const,
          value: 15, // 15% on SALE_PRICE
          minKwp: null,
          maxKwp: null,
          percentageBase: "SALE_PRICE" as const,
        },
      ];

      const result = computeProjectCostSection(equipmentSubtotal, systemKwp, customRules);

      const laborLine = result.projectCostLines.find(
        (l) => l.name === PROJECT_COST_ESSENTIAL_LABOR_NAME
      );
      expect(laborLine?.source).toBe("organization");
      expect(laborLine?.appliedAmountBrl).toBe(1800); // 6.0 * 300

      // Direct cost = 20000 + 1800 = 21800
      // Sale with 15% margin on SALE_PRICE: 21800 / (1 - 0.15) = 21800 / 0.85 ≈ 25647.06
      expect(result.computedSaleFromCostRulesBrl).toBeCloseTo(25647.06, 1);
    });
  });

  describe("essential rules seeding and merging", () => {
    it("should provide default labor and margin rules for seeding", () => {
      const defaults = getDefaultEssentialRulesForSeeding();
      expect(defaults.length).toBeGreaterThanOrEqual(4);
      expect(defaults.some((r) => r.name === PROJECT_COST_ESSENTIAL_LABOR_NAME)).toBe(true);
      expect(defaults.some((r) => r.name === PROJECT_COST_ESSENTIAL_MARGIN_NAME)).toBe(true);
    });

    it("should merge organization rules with essential defaults when missing", () => {
      const { merged, defaultEssentialCostNames } = mergeOrganizationRulesWithEssentialDefaults([]);
      expect(merged.length).toBeGreaterThan(0);
      expect(defaultEssentialCostNames).toContain(PROJECT_COST_ESSENTIAL_LABOR_NAME);
      expect(defaultEssentialCostNames).toContain(PROJECT_COST_ESSENTIAL_MARGIN_NAME);
    });
  });
});
