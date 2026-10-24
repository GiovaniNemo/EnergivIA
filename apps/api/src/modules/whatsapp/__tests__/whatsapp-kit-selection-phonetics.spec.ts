import { describe, it, expect } from "vitest";
import { resolveQuoteIndexFromText } from "../whatsapp-bot.service";

describe("WhatsApp Bot - Kit Selection Phonetic & Spoken Audio Recognition", () => {
  const defaultQuotes = [
    { distributorName: "Standard", kwp: 5.5, estimatedGeneration: 650 },
    { distributorName: "Elite", kwp: 6.0, estimatedGeneration: 720 },
    { distributorName: "Premium", kwp: 6.5, estimatedGeneration: 800 },
  ];

  describe("Tier 0 (Standard) - Phonetics and Audio Transcriptions", () => {
    it("should recognize spoken 'standar' without final 'd'", () => {
      expect(resolveQuoteIndexFromText("standar", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("standar", defaultQuotes)).toBe(0);
      expect(resolveQuoteIndexFromText("quero o kit standar", defaultQuotes)).toBe(0);
      expect(resolveQuoteIndexFromText("o standar por favor", defaultQuotes)).toBe(0);
      expect(resolveQuoteIndexFromText("vai de standar", defaultQuotes)).toBe(0);
    });

    it("should recognize 'standard' with various casings, accents and markdown", () => {
      expect(resolveQuoteIndexFromText("standard", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("*Standard*", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("_kit standard_", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("manda o kit standard", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("opção standard", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("opcao standard", 3)).toBe(0);
    });

    it("should recognize phonetics like 'standart', 'estandar', 'estandard', 'estande'", () => {
      expect(resolveQuoteIndexFromText("standart", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("estandar", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("estandard", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("kit estandar", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("estande", 3)).toBe(0);
    });

    it("should recognize Portuguese synonyms 'padrão', 'padrao', 'mais recomendado'", () => {
      expect(resolveQuoteIndexFromText("padrão", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("padrao", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("kit padrão", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("mais recomendado", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("o recomendado", 3)).toBe(0);
    });

    it("should recognize ordinals and cardinais for kit 1: 'primeiro', 'opção 1', 'opção um', '1', 'um'", () => {
      expect(resolveQuoteIndexFromText("primeiro", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("primeira", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("o primeiro kit", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("1º", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("1ª", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("opção 1", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("opcao 1", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("opção um", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("opcao um", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("kit 1", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("kit um", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("número 1", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("numero um", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("1", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("1️⃣", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("um", 3)).toBe(0);
    });
  });

  describe("Tier 1 (Elite) - Phonetics and Audio Transcriptions", () => {
    it("should recognize 'elite', 'eliter', 'kit elite'", () => {
      expect(resolveQuoteIndexFromText("elite", 3)).toBe(1);
      expect(resolveQuoteIndexFromText("eliter", 3)).toBe(1);
      expect(resolveQuoteIndexFromText("kit elite", 3)).toBe(1);
      expect(resolveQuoteIndexFromText("quero o kit elite", 3)).toBe(1);
      expect(resolveQuoteIndexFromText("vamos de elite", 3)).toBe(1);
      expect(resolveQuoteIndexFromText("*Elite*", 3)).toBe(1);
    });

    it("should recognize ordinais and cardinais for kit 2: 'segundo', 'opção 2', 'opção dois', '2', 'dois', 'intermediário'", () => {
      expect(resolveQuoteIndexFromText("segundo", 3)).toBe(1);
      expect(resolveQuoteIndexFromText("segunda", 3)).toBe(1);
      expect(resolveQuoteIndexFromText("o segundo kit", 3)).toBe(1);
      expect(resolveQuoteIndexFromText("2º", 3)).toBe(1);
      expect(resolveQuoteIndexFromText("2ª", 3)).toBe(1);
      expect(resolveQuoteIndexFromText("opção 2", 3)).toBe(1);
      expect(resolveQuoteIndexFromText("opcao 2", 3)).toBe(1);
      expect(resolveQuoteIndexFromText("opção dois", 3)).toBe(1);
      expect(resolveQuoteIndexFromText("opcao dois", 3)).toBe(1);
      expect(resolveQuoteIndexFromText("kit 2", 3)).toBe(1);
      expect(resolveQuoteIndexFromText("kit dois", 3)).toBe(1);
      expect(resolveQuoteIndexFromText("número 2", 3)).toBe(1);
      expect(resolveQuoteIndexFromText("intermediário", 3)).toBe(1);
      expect(resolveQuoteIndexFromText("intermediario", 3)).toBe(1);
      expect(resolveQuoteIndexFromText("o do meio", 3)).toBe(1);
      expect(resolveQuoteIndexFromText("2", 3)).toBe(1);
      expect(resolveQuoteIndexFromText("2️⃣", 3)).toBe(1);
      expect(resolveQuoteIndexFromText("dois", 3)).toBe(1);
    });
  });

  describe("Tier 2 (Premium) - Phonetics and Audio Transcriptions", () => {
    it("should recognize 'premium', 'premio', 'prêmio', 'premiun', 'premyun'", () => {
      expect(resolveQuoteIndexFromText("premium", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("prêmio", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("premio", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("premiun", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("premyun", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("kit premium", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("quero o premium", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("*Premium*", 3)).toBe(2);
    });

    it("should recognize ordinais and cardinais for kit 3: 'terceiro', 'opção 3', 'opção três', '3', 'três', 'o melhor', 'top'", () => {
      expect(resolveQuoteIndexFromText("terceiro", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("terceira", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("o terceiro kit", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("3º", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("3ª", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("opção 3", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("opcao 3", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("opção três", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("opcao tres", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("kit 3", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("kit três", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("número 3", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("o melhor", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("mais completo", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("top", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("mais top", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("3", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("3️⃣", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("três", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("tres", 3)).toBe(2);
    });
  });

  describe("Disambiguation and Negation Handling", () => {
    it("should correctly handle negation when user compares tiers", () => {
      expect(resolveQuoteIndexFromText("não quero o standard, prefiro o elite", 3)).toBe(1);
      expect(resolveQuoteIndexFromText("ao invés do standard manda o premium", 3)).toBe(2);
      expect(resolveQuoteIndexFromText("em vez do elite vamos de standard", 3)).toBe(0);
      expect(resolveQuoteIndexFromText("não quero o standar quero o premium", 3)).toBe(2);
    });
  });

  describe("Custom Distributor Names Matching", () => {
    const customQuotes = [
      { distributorName: "Solis", kwp: 5.0 },
      { distributorName: "Deye", kwp: 5.5 },
      { distributorName: "Canadian", kwp: 6.0 },
    ];

    it("should match custom distributor name when mentioned", () => {
      expect(resolveQuoteIndexFromText("quero o kit deye", customQuotes)).toBe(1);
      expect(resolveQuoteIndexFromText("vamos com solis", customQuotes)).toBe(0);
      expect(resolveQuoteIndexFromText("canadian solar", customQuotes)).toBe(2);
    });
  });

  describe("Safety / False Positive Guards (Should return null)", () => {
    it("should return null for dimensioning adjustments without kit intent", () => {
      expect(resolveQuoteIndexFromText("quero 10 placas", 3)).toBeNull();
      expect(resolveQuoteIndexFromText("500 kwh", 3)).toBeNull();
      expect(resolveQuoteIndexFromText("1 placa", 3)).toBeNull();
      expect(resolveQuoteIndexFromText("2 placas", 3)).toBeNull();
      expect(resolveQuoteIndexFromText("muda para 5 kwp", 3)).toBeNull();
    });

    it("should return null for electrical grid type mentions", () => {
      expect(resolveQuoteIndexFromText("padrão bifásico", 3)).toBeNull();
      expect(resolveQuoteIndexFromText("padrão trifásico 380v", 3)).toBeNull();
      expect(resolveQuoteIndexFromText("monofásico 220v", 3)).toBeNull();
      expect(resolveQuoteIndexFromText("rede bifásica", 3)).toBeNull();
    });

    it("should return null for navigation commands and invalid values", () => {
      expect(resolveQuoteIndexFromText("0", 3)).toBeNull();
      expect(resolveQuoteIndexFromText("voltar", 3)).toBeNull();
      expect(resolveQuoteIndexFromText("olá", 3)).toBeNull();
      expect(resolveQuoteIndexFromText("", 3)).toBeNull();
      expect(resolveQuoteIndexFromText(null as unknown as string, 3)).toBeNull();
      expect(resolveQuoteIndexFromText(undefined as unknown as string, 3)).toBeNull();
      expect(resolveQuoteIndexFromText("4", 3)).toBeNull(); // Index 3 is out of bounds for max=3
    });
  });
});
