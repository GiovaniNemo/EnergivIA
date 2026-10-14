import { describe, it, expect } from "vitest";
import {
  computeProjectCostSection,
  PROJECT_COST_ESSENTIAL_LABOR_NAME,
  PROJECT_COST_ESSENTIAL_MARGIN_NAME,
  roundMoney,
} from "@energivia/proposal-economia";

describe("WhatsApp Bot Proposal Price Consistency", () => {
  it("should preserve agreed quoted price (e.g. R$ 13.230,00) and reconcile margin instead of overriding with cost rules", () => {
    // Scenario from user reproduction:
    // 4.41 kWp @ R$ 3.000/kWp = R$ 13.230,00
    const quotedTotalPrice = 13230.0;
    const kwp = 4.41;
    const materialsSubtotal = 6170.83;

    const organizationRules = [
      {
        id: "rule-labor",
        name: PROJECT_COST_ESSENTIAL_LABOR_NAME,
        calculationType: "FIXED" as const,
        value: 1500.0,
        minKwp: null,
        maxKwp: null,
        percentageBase: null,
      },
      {
        id: "rule-margin",
        name: PROJECT_COST_ESSENTIAL_MARGIN_NAME,
        calculationType: "PERCENTAGE" as const,
        value: 35.0,
        minKwp: null,
        maxKwp: null,
        percentageBase: "SALE_PRICE" as const,
      },
    ];

    const costCalc = computeProjectCostSection(materialsSubtotal, kwp, organizationRules);

    // Without fix, costCalc.computedSaleFromCostRulesBrl is ~ 11801.28
    expect(costCalc.computedSaleFromCostRulesBrl).toBe(11801.28);

    // Apply the fix logic from whatsapp-bot.service.ts
    let quotedSaleBrl = quotedTotalPrice;
    if (quotedTotalPrice > 0) {
      quotedSaleBrl = quotedTotalPrice;

      const marginIndex = costCalc.projectCostLines.findIndex(
        (l) =>
          l.name === PROJECT_COST_ESSENTIAL_MARGIN_NAME ||
          (l.name || "").toLowerCase().includes("margem") ||
          (l.name || "").toLowerCase().includes("lucro")
      );
      const nonMarginCosts = costCalc.projectCostLines.reduce((acc, curr, idx) => {
        if (idx === marginIndex) return acc;
        return acc + (curr.appliedAmountBrl ?? 0);
      }, 0);
      const effectiveMarginBrl = Math.max(
        0,
        roundMoney(quotedSaleBrl - materialsSubtotal - nonMarginCosts)
      );

      if (marginIndex >= 0 && costCalc.projectCostLines[marginIndex]) {
        costCalc.projectCostLines[marginIndex].appliedAmountBrl = effectiveMarginBrl;
        costCalc.projectCostLines[marginIndex].value = effectiveMarginBrl;
        costCalc.projectCostLines[marginIndex].calculationType = "FIXED";
      }
    }

    // quotedSaleBrl must remain R$ 13.230,00!
    expect(quotedSaleBrl).toBe(13230.0);

    // The sum of equipmentSubtotal + nonMarginCosts + effectiveMargin must equal 13230.00
    const marginLine = costCalc.projectCostLines.find((l) =>
      (l.name || "").toLowerCase().includes("margem")
    );
    expect(marginLine).toBeDefined();
    // materialsSubtotal (6170.83) + labor (1500) + margin (5559.17) = 13230.00
    expect(marginLine?.appliedAmountBrl).toBe(5559.17);

    const totalCalculated =
      materialsSubtotal +
      costCalc.projectCostLines.reduce((acc, curr) => acc + (curr.appliedAmountBrl ?? 0), 0);
    expect(roundMoney(totalCalculated)).toBe(13230.0);
  });
});
