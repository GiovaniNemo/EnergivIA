import { describe, it, expect } from "vitest";
import {
  extractReferralCodeFromText,
  cleanPhoneDigits,
  buildPhoneMatchingVariants,
} from "../services/whatsapp-referral-parser";

describe("whatsapp-referral-parser", () => {
  describe("extractReferralCodeFromText", () => {
    it("deve extrair código no formato (ref: codigo)", () => {
      const text = "Olá! Quero testar o assistente de IA da EnergivIA (ref: giovani)";
      expect(extractReferralCodeFromText(text)).toBe("giovani");
    });

    it("deve extrair código com hífen e números", () => {
      const text = "Olá! Vim indicado pelo parceiro (ref: solar-tech-2026)";
      expect(extractReferralCodeFromText(text)).toBe("solar-tech-2026");
    });

    it("deve extrair código no formato #codigo", () => {
      const text = "Quero fazer um dimensionamento #giovani";
      expect(extractReferralCodeFromText(text)).toBe("giovani");
    });

    it("deve extrair código no formato ref=codigo", () => {
      const text = "Olá, ref=marcelo-vendas";
      expect(extractReferralCodeFromText(text)).toBe("marcelo-vendas");
    });

    it("deve extrair código no formato indicação: codigo ou parceiro: codigo", () => {
      expect(extractReferralCodeFromText("Indicação: joao-solar")).toBe("joao-solar");
      expect(extractReferralCodeFromText("indicacao: joao_solar")).toBe("joao_solar");
      expect(extractReferralCodeFromText("Parceiro: carlos")).toBe("carlos");
    });

    it("deve retornar em lowercase e sem espaços", () => {
      const text = "Olá, REF: Giovani-Nemo ";
      expect(extractReferralCodeFromText(text)).toBe("giovani-nemo");
    });

    it("deve retornar null se não houver código", () => {
      expect(extractReferralCodeFromText("Olá, gostaria de fazer uma simulação")).toBeNull();
      expect(extractReferralCodeFromText("")).toBeNull();
      expect(extractReferralCodeFromText(null)).toBeNull();
      expect(extractReferralCodeFromText(undefined)).toBeNull();
    });
  });

  describe("cleanPhoneDigits e buildPhoneMatchingVariants", () => {
    it("deve limpar caracteres não numéricos", () => {
      expect(cleanPhoneDigits("+55 (34) 99685-1400")).toBe("5534996851400");
      expect(cleanPhoneDigits("34 9685-1400")).toBe("3496851400");
    });

    it("deve gerar variantes com e sem 55 para cruzamento", () => {
      const variants = buildPhoneMatchingVariants("+55 (34) 99685-1400");
      expect(variants).toContain("5534996851400");
      expect(variants).toContain("34996851400");
    });

    it("deve gerar variantes considerando o 9º dígito móvel", () => {
      // Entrada com 9 dígitos após DDD (34 + 9 + 8 dígitos)
      const variantsWith9 = buildPhoneMatchingVariants("34996851400");
      expect(variantsWith9).toContain("34996851400");
      expect(variantsWith9).toContain("5534996851400");
      expect(variantsWith9).toContain("3496851400");
      expect(variantsWith9).toContain("553496851400");

      // Entrada com 8 dígitos após DDD (34 + 8 dígitos)
      const variantsWithout9 = buildPhoneMatchingVariants("3496851400");
      expect(variantsWithout9).toContain("3496851400");
      expect(variantsWithout9).toContain("553496851400");
      expect(variantsWithout9).toContain("34996851400");
      expect(variantsWithout9).toContain("5534996851400");
    });

    it("deve retornar array vazio para telefone inválido", () => {
      expect(buildPhoneMatchingVariants("")).toEqual([]);
      expect(buildPhoneMatchingVariants(null)).toEqual([]);
      expect(buildPhoneMatchingVariants("123")).toEqual([]);
    });
  });
});
