import { describe, it, expect } from "vitest";
import {
  getDefaultPaymentOptions,
  normalizePaymentOptions,
  calculateCashFinalAmount,
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
});
