import { describe, it, expect } from "vitest";
import { formatBRL, formatCurrency } from "./format";

describe("formatBRL", () => {
  it("formats positive numbers as BRL currency", () => {
    const result = formatBRL(12500.5);
    // Intl may use non-breaking space (U+00A0 or U+202F)
    expect(result.replace(/\s/g, " ")).toContain("R$ 12.500,50");
  });

  it("formats 0 as R$ 0,00", () => {
    const result = formatBRL(0);
    expect(result.replace(/\s/g, " ")).toContain("R$ 0,00");
  });

  it("handles null and undefined gracefully", () => {
    expect(formatBRL(null)).toBe("R$ 0,00");
    expect(formatBRL(undefined)).toBe("R$ 0,00");
  });

  it("handles NaN and Infinity gracefully", () => {
    expect(formatBRL(NaN)).toBe("R$ 0,00");
    expect(formatBRL(Infinity)).toBe("R$ 0,00");
  });

  it("formatCurrency also works with default BRL", () => {
    const result = formatCurrency(100);
    expect(result.replace(/\s/g, " ")).toContain("R$ 100,00");
  });
});
