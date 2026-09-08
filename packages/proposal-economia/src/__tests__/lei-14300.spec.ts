import { describe, it, expect } from "vitest";
import {
  getLei14300WireBPercentage,
  getAvailabilityKwhByPhase,
  calculateLei14300Monthly,
  projectLei14300LongTerm,
} from "../lei-14300";

describe("Lei 14.300 Solar Engine", () => {
  describe("getLei14300WireBPercentage (Wire B Escalation Schedule)", () => {
    it("returns 0% for rights acquired in 2022 or earlier (GD I)", () => {
      expect(getLei14300WireBPercentage(2021)).toBe(0);
      expect(getLei14300WireBPercentage(2022)).toBe(0);
    });

    it("returns correct legal percentages for transitional years", () => {
      expect(getLei14300WireBPercentage(2023)).toBe(0.15);
      expect(getLei14300WireBPercentage(2024)).toBe(0.3);
      expect(getLei14300WireBPercentage(2025)).toBe(0.45);
      expect(getLei14300WireBPercentage(2026)).toBe(0.6);
      expect(getLei14300WireBPercentage(2027)).toBe(0.75);
      expect(getLei14300WireBPercentage(2028)).toBe(0.9);
      expect(getLei14300WireBPercentage(2029)).toBe(1.0);
      expect(getLei14300WireBPercentage(2030)).toBe(1.0);
    });
  });

  describe("getAvailabilityKwhByPhase (Minimum Regulatory Consumption)", () => {
    it("returns 30 kWh for monofásico", () => {
      expect(getAvailabilityKwhByPhase("monofasico")).toBe(30);
    });

    it("returns 50 kWh for bifásico", () => {
      expect(getAvailabilityKwhByPhase("bifasico")).toBe(50);
    });

    it("returns 100 kWh for trifásico", () => {
      expect(getAvailabilityKwhByPhase("trifasico")).toBe(100);
    });
  });

  describe("calculateLei14300Monthly (Monthly Balance with Simultaneity)", () => {
    it("correctly models residential profile (30% simultaneity in 2026)", () => {
      const res = calculateLei14300Monthly({
        connectionYear: 2026,
        monthlyConsumptionKwh: 600,
        monthlyGenerationKwh: 600,
        fullTariffBrlPerKwh: 0.9,
        wireBTariffBrlPerKwh: 0.25,
        simultaneityFactor: 0.3, // 30% instant self-consumption
        connectionPhase: "bifasico", // 50 kWh minimum
        publicLightingFeeBrl: 30,
      });

      expect(res.wireBPercentageApplied).toBe(0.6); // 60% in 2026
      expect(res.instantSelfConsumptionKwh).toBe(180); // 600 * 0.3
      expect(res.injectedKwh).toBe(420); // 600 - 180
      expect(res.compensatedKwh).toBe(420);

      // Wire B cost: 420 kWh * R$ 0.25 * 60% = R$ 63.00
      expect(res.wireBCostBrl).toBe(63);

      // Availability: 50 kWh * 0.9 = R$ 45.00
      // Since wire B cost (R$ 63) > availability cost (R$ 45), net availability fee is 0 (Art. 18)
      expect(res.availabilityCostBrl).toBe(45);
      expect(res.netAvailabilityFeeBrl).toBe(0);

      // New bill: R$ 63 (Fio B) + R$ 0 (disponibilidade) + R$ 30 (iluminação) = R$ 93.00
      expect(res.newMonthlyBillBrl).toBe(93);

      // Original bill: 600 * 0.9 + 30 = R$ 570.00
      // Savings: 570 - 93 = R$ 477.00/month
      expect(res.monthlySavingsBrl).toBe(477);
      expect(res.annualSavingsBrl).toBe(5724);
    });

    it("correctly models commercial daytime profile (70% simultaneity)", () => {
      const res = calculateLei14300Monthly({
        connectionYear: 2026,
        monthlyConsumptionKwh: 1000,
        monthlyGenerationKwh: 1000,
        fullTariffBrlPerKwh: 0.95,
        wireBTariffBrlPerKwh: 0.28,
        simultaneityFactor: 0.7, // 70% daytime self-consumption
        connectionPhase: "trifasico", // 100 kWh
        publicLightingFeeBrl: 50,
      });

      expect(res.instantSelfConsumptionKwh).toBe(700); // 700 kWh free of grid fees
      expect(res.injectedKwh).toBe(300);
      expect(res.compensatedKwh).toBe(300);

      // Wire B cost: 300 * 0.28 * 0.6 = R$ 50.40
      expect(res.wireBCostBrl).toBe(50.4);

      // High simultaneity yields massive savings:
      // Original bill: 1000 * 0.95 + 50 = R$ 1000.00
      // Availability gross: 100 * 0.95 = R$ 95.00. Net availability: 95 - 50.40 = R$ 44.60
      expect(res.netAvailabilityFeeBrl).toBe(44.6);
      expect(res.newMonthlyBillBrl).toBe(145); // 50.40 + 44.60 + 50
      expect(res.monthlySavingsBrl).toBe(855);
    });
  });

  describe("projectLei14300LongTerm (25-Year Financial Projection)", () => {
    it("generates 25-year projection with degradation, inflation and computes payback", () => {
      const projection = projectLei14300LongTerm(
        {
          connectionYear: 2026,
          monthlyConsumptionKwh: 500,
          monthlyGenerationKwh: 500,
          fullTariffBrlPerKwh: 0.9,
          simultaneityFactor: 0.35,
          connectionPhase: "bifasico",
        },
        20000 // R$ 20,000 investment
      );

      expect(projection.projectionYears).toHaveLength(25);
      expect(projection.projectionYears[0]?.year).toBe(2026);
      expect(projection.projectionYears[24]?.year).toBe(2050);

      // Degradation reduces generation slightly over 25 years (0.5% per year)
      const genYear1 = projection.projectionYears[0]!.generationKwh;
      const genYear25 = projection.projectionYears[24]!.generationKwh;
      expect(genYear25).toBeLessThan(genYear1);

      // Tariffs rise with inflation (6% per year)
      const tariffYear1 = projection.projectionYears[0]!.tariffBrlPerKwh;
      const tariffYear25 = projection.projectionYears[24]!.tariffBrlPerKwh;
      expect(tariffYear25).toBeGreaterThan(tariffYear1);

      // Total 25 years cumulative savings is calculated
      expect(projection.total25YearsSavingsBrl).toBeGreaterThan(100000);
      expect(projection.estimatedPaybackYears).toBeGreaterThan(2);
      expect(projection.estimatedPaybackYears).toBeLessThan(6);
    });
  });
});
