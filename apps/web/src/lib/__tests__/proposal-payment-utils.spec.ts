import { describe, it, expect } from "vitest";
import {
  getDefaultPaymentOptions,
  normalizePaymentOptions,
  calculateCashFinalAmount,
  calculateCardInstallments,
} from "../proposal-payment-utils";

describe("proposal-payment-utils", () => {
  it("calculates cash final amount with BRL discount", () => {
    const finalAmount = calculateCashFinalAmount(20000, 1000, null);
    expect(finalAmount).toBe(19000);
  });

  it("calculates cash final amount with percentage discount", () => {
    const finalAmount = calculateCashFinalAmount(20000, null, 5);
    expect(finalAmount).toBe(19000);
  });

  it("returns default payment options populated from investment", () => {
    const defaults = getDefaultPaymentOptions(24000);
    expect(defaults.cash.enabled).toBe(true);
    expect(defaults.cash.finalAmount).toBe(24000);
    expect(defaults.cash.methods).toContain("Pix");

    expect(defaults.creditCard.enabled).toBe(true);
    expect(defaults.creditCard.maxInstallments).toBe(12);
    expect(defaults.creditCard.installmentAmount).toBeGreaterThan(0);

    expect(defaults.financing.enabled).toBe(true);
    expect(defaults.financing.installments).toBe(84);
    expect(defaults.financing.installmentAmount).toBeGreaterThan(0);
  });

  it("normalizes incomplete or invalid payment options safely", () => {
    const normalized = normalizePaymentOptions(null, 30000);
    expect(normalized.cash.enabled).toBe(true);
    expect(normalized.cash.finalAmount).toBe(30000);

    const partial = {
      cash: { enabled: true, discountBrl: 2000, finalAmount: 28000 },
      creditCard: { enabled: false },
    };
    const result = normalizePaymentOptions(partial, 30000);
    expect(result.cash.finalAmount).toBe(28000);
    expect(result.creditCard.enabled).toBe(false);
    expect(result.creditCard.maxInstallments).toBe(12);
    expect(result.financing.enabled).toBe(true);
  });

  describe("calculateCardInstallments", () => {
    it("calculates gross-up total_pct correctly so net amount equals totalInvestment", () => {
      // R$ 20.493,00 with 10% gross-up in 12x
      // Total = 20493 / (1 - 0.10) = 22770.00
      // Parcela = 22770.00 / 12 = 1897.50
      const res = calculateCardInstallments({
        totalInvestment: 20493,
        installments: 12,
        rateMode: "total_pct",
        rateValue: 10,
      });

      expect(res.totalAmount).toBe(22770);
      expect(res.installmentAmount).toBe(1897.5);
      expect(res.totalInterestAmount).toBe(2277);
    });

    it("calculates monthly_pct using standard Price amortization", () => {
      // R$ 10.000,00 with 1.5% a.m. in 10x
      // PMT = 10000 * [0.015 / (1 - (1.015)^-10)] = 1084.34
      const res = calculateCardInstallments({
        totalInvestment: 10000,
        installments: 10,
        rateMode: "monthly_pct",
        rateValue: 1.5,
      });

      expect(res.installmentAmount).toBeCloseTo(1084.34, 1);
      expect(res.totalAmount).toBe(Math.round(res.installmentAmount * 10 * 100) / 100);
      expect(res.totalInterestAmount).toBeGreaterThan(0);
    });

    it("handles 0% fee without error", () => {
      const res = calculateCardInstallments({
        totalInvestment: 12000,
        installments: 12,
        rateMode: "total_pct",
        rateValue: 0,
      });

      expect(res.totalAmount).toBe(12000);
      expect(res.installmentAmount).toBe(1000);
      expect(res.totalInterestAmount).toBe(0);
    });

    it("uses manual installment amount when rateMode is manual", () => {
      const res = calculateCardInstallments({
        totalInvestment: 20000,
        installments: 12,
        rateMode: "manual",
        manualInstallmentAmount: 1878.53,
      });

      expect(res.installmentAmount).toBe(1878.53);
      expect(res.totalAmount).toBe(22542.36);
    });
  });
});
