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
    it("adota fundo branco (#ffffff), texto #022C22 e primária #059669 quando o fundo não for informado", () => {
      const emptyBranding = {};
      const result = enforceHighContrastBranding(emptyBranding);
      expect(result.backgroundColor).toBe("#ffffff");
      expect(result.textColor).toBe("#022C22");
      expect(result.primaryColor).toBe("#059669");
    });

    it("normaliza fundos azuis escuros legados (#060b16, #0b1220, #0b1b2b) para branco (#ffffff)", () => {
      const legacy1 = enforceHighContrastBranding({ backgroundColor: "#060b16" });
      expect(legacy1.backgroundColor).toBe("#ffffff");
      expect(legacy1.textColor).toBe("#022C22");
      expect(legacy1.primaryColor).toBe("#059669");

      const legacy2 = enforceHighContrastBranding({ backgroundColor: "#0b1220" });
      expect(legacy2.backgroundColor).toBe("#ffffff");
      expect(legacy2.textColor).toBe("#022C22");

      const legacy3 = enforceHighContrastBranding({ backgroundColor: "#0b1b2b" });
      expect(legacy3.backgroundColor).toBe("#ffffff");
      expect(legacy3.textColor).toBe("#022C22");
    });

    it("promove texto escuro para #f8fafc quando o fundo for escuro customizado (#18181b)", () => {
      const darkBgBranding = {
        backgroundColor: "#18181b",
        textColor: "#0f172a", // escuro
        primaryColor: "#22c55e",
      };

      const result = enforceHighContrastBranding(darkBgBranding);
      expect(result.textColor).toBe("#f8fafc");
      expect(result.backgroundColor).toBe("#18181b");
    });

    it("promove texto verde escuro / baixa luminância para #f8fafc em fundo escuro customizado", () => {
      const darkBgBranding = {
        backgroundColor: "#18181b",
        textColor: "#042f2e", // verde escuro quase preto
        primaryColor: "#10b981",
      };

      const result = enforceHighContrastBranding(darkBgBranding);
      expect(result.textColor).toBe("#f8fafc");
    });

    it("converte tons verdes cromáticos (#6ee7b7, #10b981) para #f8fafc no texto corrido em fundo escuro customizado", () => {
      const darkBgBranding = {
        backgroundColor: "#18181b",
        textColor: "#6ee7b7", // verde menta colorido
        primaryColor: "#10b981",
      };

      const result = enforceHighContrastBranding(darkBgBranding);
      expect(result.textColor).toBe("#f8fafc");
    });

    it("mantém texto claro se já for de alto contraste em fundo escuro customizado", () => {
      const darkBgBranding = {
        backgroundColor: "#18181b",
        textColor: "#f1f5f9",
        primaryColor: "#22c55e",
      };

      const result = enforceHighContrastBranding(darkBgBranding);
      expect(result.textColor).toBe("#f1f5f9");
    });

    it("eleva primaryColor escura para #22c55e em fundo escuro customizado", () => {
      const darkBgBranding = {
        backgroundColor: "#18181b",
        primaryColor: "#022e22", // verde escuro floresta que sumiria no fundo escuro
      };

      const result = enforceHighContrastBranding(darkBgBranding);
      expect(result.primaryColor).toBe("#22c55e");
    });

    it("preserva fundos claros (ex: #FAFFFC, #ffffff) e texto escuro (#022C22) respeitando a paleta do usuário", () => {
      const lightBgBranding = {
        backgroundColor: "#FAFFFC",
        textColor: "#022C22",
        primaryColor: "#059669",
        secondaryColor: "#34D399",
      };

      const result = enforceHighContrastBranding(lightBgBranding, { isPdf: true });
      expect(result.backgroundColor).toBe("#FAFFFC");
      expect(result.textColor).toBe("#022C22");
      expect(result.primaryColor).toBe("#059669");
      expect(result.secondaryColor).toBe("#34D399");
    });

    it("ajusta texto claro para escuro se o usuário colocou texto branco em fundo branco", () => {
      const lightBgBranding = {
        backgroundColor: "#ffffff",
        textColor: "#ffffff", // texto branco em fundo branco sumiria
        primaryColor: "#059669",
      };

      const result = enforceHighContrastBranding(lightBgBranding);
      expect(result.backgroundColor).toBe("#ffffff");
      expect(result.textColor).toBe("#022C22");
    });
  });
});
