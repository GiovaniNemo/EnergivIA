import { describe, it, expect } from "vitest";
import { calculatePeakCreditEquivalenceRatio, simulateGrupoASolar } from "../grupo-a";

describe("Grupo A Solar Engine (High/Medium Voltage)", () => {
  describe("calculatePeakCreditEquivalenceRatio", () => {
    it("calculates correct tariff ratio between off-peak and peak", () => {
      // Off-peak = R$ 0.50, Peak = R$ 2.00 -> 0.25 (4 kWh in off-peak = 1 kWh in peak)
      expect(calculatePeakCreditEquivalenceRatio(0.5, 2.0)).toBe(0.25);
      // Off-peak = R$ 0.60, Peak = R$ 1.80 -> 0.3333
      expect(calculatePeakCreditEquivalenceRatio(0.6, 1.8)).toBe(0.3333);
    });

    it("handles zero or edge cases gracefully", () => {
      expect(calculatePeakCreditEquivalenceRatio(0, 2.0)).toBe(1.0);
      expect(calculatePeakCreditEquivalenceRatio(0.5, 0)).toBe(1.0);
    });
  });

  describe("simulateGrupoASolar - Tarifa Verde (Industrial / Commercial)", () => {
    it("simulates Tarifa Verde with single demand and peak/off-peak consumption", () => {
      const result = simulateGrupoASolar({
        modality: "VERDE",
        subgroup: "A4",
        contractedDemandKw: 150, // 150 kW demand
        demandTariffBrlPerKw: 42.5, // R$ 42.50 / kW
        peakConsumptionKwh: 3000, // 3,000 kWh in Peak
        peakTariffBrlPerKwh: 2.1, // R$ 2.10 / kWh
        offPeakConsumptionKwh: 25000, // 25,000 kWh in Off-Peak
        offPeakTariffBrlPerKwh: 0.55, // R$ 0.55 / kWh
        solarIrradianceHsp: 5.2,
        performanceRatio: 0.8,
      });

      expect(result.modality).toBe("VERDE");

      // Demand cost = 150 * 42.50 = R$ 6,375.00
      expect(result.monthlyDemandCostBrl).toBe(6375);

      // Peak = 3000 * 2.10 = 6,300; Off-Peak = 25000 * 0.55 = 13,750
      // Original bill = 6,375 + 6,300 + 13,750 = R$ 26,425.00
      expect(result.originalMonthlyBillBrl).toBe(26425);

      // Equivalence: 0.55 / 2.10 = 0.2619
      expect(result.peakToOffPeakEquivalenceRatio).toBe(0.2619);

      // Equivalent off-peak total = 25,000 + (3,000 / 0.2619) ≈ 36,455 kWh
      expect(result.equivalentTotalOffPeakKwh).toBeGreaterThan(35000);

      // System power recommended to eliminate consumption
      expect(result.recommendedSystemPowerKw).toBeGreaterThan(200);

      // Savings eliminates the variable consumption charges, leaving only demand
      expect(result.newMonthlyBillBrl).toBeGreaterThan(6374);
      expect(result.newMonthlyBillBrl).toBeLessThan(6376);
      expect(result.monthlySavingsBrl).toBeGreaterThan(20040);
      expect(result.monthlySavingsBrl).toBeLessThan(20060);
      expect(result.annualSavingsBrl).toBeGreaterThan(240500);
      expect(result.annualSavingsBrl).toBeLessThan(240700);
      expect(result.billReductionPercentage).toBeGreaterThan(75);
      expect(result.billReductionPercentage).toBeLessThan(77);
    });
  });

  describe("simulateGrupoASolar - Tarifa Azul", () => {
    it("simulates Tarifa Azul with dual contracted demand", () => {
      const result = simulateGrupoASolar({
        modality: "AZUL",
        subgroup: "A3",
        contractedDemandPeakKw: 100,
        contractedDemandOffPeakKw: 200,
        demandTariffBrlPerKw: 48.0, // Peak demand
        demandOffPeakTariffBrlPerKw: 22.0, // Off-peak demand
        peakConsumptionKwh: 4000,
        peakTariffBrlPerKwh: 0.75,
        offPeakConsumptionKwh: 30000,
        offPeakTariffBrlPerKwh: 0.48,
        solarIrradianceHsp: 5.0,
      });

      expect(result.modality).toBe("AZUL");
      // Demand cost = 100 * 48 + 200 * 22 = 4,800 + 4,400 = R$ 9,200.00
      expect(result.monthlyDemandCostBrl).toBe(9200);
      expect(result.originalMonthlyBillBrl).toBeGreaterThan(25000);
      expect(result.monthlySavingsBrl).toBeGreaterThan(15000);
    });
  });
});
