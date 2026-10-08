import { describe, it, expect } from "vitest";
import { generateKwpRateTiers, getStandardInverterPower } from "../kwp-rate-kit-engine";

describe("KwpRateKitEngine - Utility Scale & Inverter Scaling", () => {
  it("sizes single inverters for standard residential systems <= 100 kWp", () => {
    expect(getStandardInverterPower(3.5)).toBe(3);
    expect(getStandardInverterPower(5)).toBe(4); // 4 * 1.3 = 5.2 >= 5.0
    expect(getStandardInverterPower(75)).toBe(60); // 60 * 1.3 = 78 >= 75
    expect(getStandardInverterPower(100)).toBe(100);

    const tiers = generateKwpRateTiers({
      kwp: 5,
      ratePerKwp: 2800,
    });

    const standard = tiers[0];
    expect(standard.inverterQty).toBe(1);
    expect(standard.inverterPowerKw).toBe(5);
    expect(standard.kitSummaryLines).toContain("• 1x Inversor GoodWe 5kW");
  });

  it("sizes multiple commercial inverters in parallel for 3000 kWp (3 MWp) utility-scale plant", () => {
    const tiers = generateKwpRateTiers({
      kwp: 3000,
      ratePerKwp: 2200,
      cidade: "Maringá",
      estado: "PR",
    });

    expect(tiers).toHaveLength(3);

    for (const tier of tiers) {
      expect(tier.systemKwp).toBeCloseTo(3000, -1);
      expect(tier.inverterPowerKw).toBe(100);
      expect(tier.inverterQty).toBeGreaterThanOrEqual(20);
      expect(tier.inverterQty).toBeLessThanOrEqual(30);

      // Verify structured items
      const inverterItem = tier.structuredItems.find((it) => it.categoryName === "inverter");
      expect(inverterItem).toBeDefined();
      expect(inverterItem?.quantity).toBe(tier.inverterQty);
      expect(inverterItem?.productName).toContain("100kW");

      // Verify summary line indicates Nx inverters
      const invLine = tier.kitSummaryLines.find((l) => l.includes("Inversores"));
      expect(invLine).toBeDefined();
      expect(invLine).toContain(`${tier.inverterQty}x Inversores`);
    }
  });

  it("calculates realistic generation and pricing for utility-scale systems", () => {
    const tiers = generateKwpRateTiers({
      kwp: 3000,
      ratePerKwp: 2000,
    });

    const elite = tiers.find((t) => t.id === "cost_benefit");
    expect(elite).toBeDefined();
    expect(elite?.totalPrice).toBeGreaterThan(5_000_000);
    expect(elite?.estimatedMonthlyGenerationKwh).toBeGreaterThan(300_000);
  });
});
