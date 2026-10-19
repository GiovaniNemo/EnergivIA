import { describe, expect, it } from "vitest";
import { easeOutExpo, interpolateValue, formatBRLCompact } from "./animated-number";

describe("animated-number engine", () => {
  it("deve calcular a curva easeOutExpo corretamente nas extremidades e meio", () => {
    expect(easeOutExpo(0)).toBe(0);
    expect(easeOutExpo(1)).toBe(1);

    const mid = easeOutExpo(0.5);
    // Na curva exponencial com desaceleração rápida, na metade do tempo já avançou mais de 90%
    expect(mid).toBeGreaterThan(0.9);
    expect(mid).toBeLessThan(1);
  });

  it("deve interpolar valores com precisão do zero até o alvo", () => {
    const target = 100;
    expect(interpolateValue(0, target, 0)).toBe(0);
    expect(interpolateValue(0, target, 1)).toBe(100);

    const quarter = interpolateValue(0, target, 0.2);
    expect(quarter).toBeGreaterThan(0);
    expect(quarter).toBeLessThan(100);
  });

  it("não deve extrapolar o target quando o progresso for maior que 1", () => {
    expect(interpolateValue(0, 50, 1.5)).toBe(50);
  });

  it("deve formatar valores monetários BRL compactos preservando zero, milhares e milhões", () => {
    expect(formatBRLCompact(0)).toBe("R$ 0");
    expect(formatBRLCompact(850)).toBe("R$ 850");
    expect(formatBRLCompact(15000)).toMatch(/R\$\s*15k/i);
    expect(formatBRLCompact(3300000)).toMatch(/R\$\s*3,3M/i);
  });
});
