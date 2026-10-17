import { describe, expect, it } from "vitest";
import { getHexRelativeLuminance, enforceHighContrastBranding } from "../pdf-contrast-utils";

describe("pdf-contrast-utils", () => {
  describe("getHexRelativeLuminance", () => {
    it("calcula corretamente a luminância de preto e branco", () => {
      expect(getHexRelativeLuminance("#000000")).toBe(0);
      expect(getHexRelativeLuminance("#ffffff")).toBeCloseTo(1, 2);
    });

    it("identifica cores escuras de fundo como baixa luminância", () => {
      expect(getHexRelativeLuminance("#060b16")).toBeLessThan(0.1);
      expect(getHexRelativeLuminance("#0b1220")).toBeLessThan(0.15);
      expect(getHexRelativeLuminance("#0f172a")).toBeLessThan(0.2);
    });

    it("lida com formatos hex sem hash e shorthand 3 dígitos", () => {
      expect(getHexRelativeLuminance("fff")).toBeCloseTo(1, 2);
      expect(getHexRelativeLuminance("000")).toBe(0);
      expect(getHexRelativeLuminance("")).toBe(0.5);
      expect(getHexRelativeLuminance(undefined)).toBe(0.5);
    });
  });

  describe("enforceHighContrastBranding", () => {
    it("promove texto escuro para #f8fafc quando o fundo for escuro", () => {
      const darkBgBranding = {
        backgroundColor: "#060b16",
        textColor: "#0f172a", // escuro
        primaryColor: "#22c55e",
      };

      const result = enforceHighContrastBranding(darkBgBranding);
      expect(result.textColor).toBe("#f8fafc");
      expect(result.backgroundColor).toBe("#060b16");
    });

    it("promove texto verde escuro / baixa luminância para #f8fafc em fundo escuro", () => {
      const darkBgBranding = {
        backgroundColor: "#0b1220",
        textColor: "#042f2e", // verde escuro quase preto
        primaryColor: "#10b981",
      };

      const result = enforceHighContrastBranding(darkBgBranding);
      expect(result.textColor).toBe("#f8fafc");
    });

    it("converte tons verdes cromáticos (#6ee7b7, #10b981) para #f8fafc no texto corrido em fundo escuro", () => {
      const darkBgBranding = {
        backgroundColor: "#0b1220",
        textColor: "#6ee7b7", // verde menta colorido
        primaryColor: "#10b981",
      };

      const result = enforceHighContrastBranding(darkBgBranding);
      expect(result.textColor).toBe("#f8fafc");
    });

    it("mantém texto claro se já for de alto contraste em fundo escuro", () => {
      const darkBgBranding = {
        backgroundColor: "#060b16",
        textColor: "#f1f5f9",
        primaryColor: "#22c55e",
      };

      const result = enforceHighContrastBranding(darkBgBranding);
      expect(result.textColor).toBe("#f1f5f9");
    });

    it("eleva primaryColor escura para #22c55e em fundo escuro", () => {
      const darkBgBranding = {
        backgroundColor: "#060b16",
        primaryColor: "#022e22", // verde escuro floresta que sumiria no fundo escuro
      };

      const result = enforceHighContrastBranding(darkBgBranding);
      expect(result.primaryColor).toBe("#22c55e");
    });

    it("normaliza fundos claros para #060b16 e texto para #f8fafc no PDF executivo", () => {
      const lightBgBranding = {
        backgroundColor: "#ffffff",
        textColor: "#0f172a",
        primaryColor: "#15803d",
      };

      const result = enforceHighContrastBranding(lightBgBranding, { isPdf: true });
      expect(result.textColor).toBe("#f8fafc");
      expect(result.backgroundColor).toBe("#060b16");
    });

    it("garante texto escuro (#0f172a) se o fundo for claro em modo web (não PDF)", () => {
      const lightBgBranding = {
        backgroundColor: "#ffffff",
        textColor: "#f8fafc", // texto claro em fundo branco sumiria no modo web
        primaryColor: "#15803d",
      };

      const result = enforceHighContrastBranding(lightBgBranding, { isPdf: false });
      expect(result.textColor).toBe("#0f172a");
    });
  });
});
