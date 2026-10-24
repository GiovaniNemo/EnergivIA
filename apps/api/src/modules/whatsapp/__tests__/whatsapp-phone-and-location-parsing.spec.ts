import { describe, it, expect } from "vitest";
import { parseLocationString, getHsp } from "../services/geo-irradiance.service";
import {
  extractNameAndPhone,
  cleanExtractedName,
  isNameCorrectionOrErrorNotice,
  isValidClientName,
  formatPhone,
} from "../whatsapp-bot.service";

describe("WhatsApp Bot - Location and Phone Parsing Robustness", () => {
  describe("Location String & State Connectors Parsing", () => {
    it("should correctly parse city and state with 'e Estado de' connector", () => {
      const parsed = parseLocationString("para Presidente Prudente e Estado de São Paulo.");
      expect(parsed.city).toBe("Presidente Prudente");
      expect(parsed.uf).toBe("SP");

      const hsp = getHsp("para Presidente Prudente e Estado de São Paulo.");
      expect(hsp.city).toBe("Presidente Prudente");
      expect(hsp.uf).toBe("SP");
      expect(hsp.hsp).toBeCloseTo(5.11, 1);
    });

    it("should correctly parse city and state with 'de' connector", () => {
      const parsed = parseLocationString("Presidente Prudente de São Paulo");
      expect(parsed.city).toBe("Presidente Prudente");
      expect(parsed.uf).toBe("SP");

      const hsp = getHsp("Presidente Prudente de São Paulo");
      expect(hsp.city).toBe("Presidente Prudente");
      expect(hsp.uf).toBe("SP");
      expect(hsp.hsp).toBeCloseTo(5.11, 1);
    });

    it("should correctly parse city and state with 'no estado de' connector", () => {
      const parsed = parseLocationString("Presidente Prudente no estado de São Paulo");
      expect(parsed.city).toBe("Presidente Prudente");
      expect(parsed.uf).toBe("SP");
    });

    it("should correctly parse other cities with state connectors", () => {
      const sp = parseLocationString("Campinas de São Paulo");
      expect(sp.city).toBe("Campinas");
      expect(sp.uf).toBe("SP");

      const pr = parseLocationString("Londrina do Paraná");
      expect(pr.city).toBe("Londrina");
      expect(pr.uf).toBe("PR");

      const ms = parseLocationString("Campo Grande de Mato Grosso do Sul");
      expect(ms.city).toBe("Campo Grande");
      expect(ms.uf).toBe("MS");
    });
  });

  describe("Phone and Client Name Extraction from Transcribed Speech", () => {
    it("should parse Whisper phone format with hyphen after 9 (449-8821-5497) as phone, NOT as name", () => {
      const res = extractNameAndPhone("449-8821-5497");
      expect(res.phone).toBe("44988215497");
      expect(res.name).toBe("");
    });

    it("should parse Whisper phone format (449-777-7770) as phone, NOT as name", () => {
      const res = extractNameAndPhone("449-777-7770");
      expect(res.phone).toBe("4497777770");
      expect(res.name).toBe("");
    });

    it("should parse contiguous digits phone (44988215497)", () => {
      const res = extractNameAndPhone("44988215497");
      expect(res.phone).toBe("44988215497");
      expect(res.name).toBe("");
    });

    it("should extract client name and phone from conversational sentence", () => {
      const res = extractNameAndPhone("Marcelo Teste, e o é 449-8821-5497");
      expect(res.phone).toBe("44988215497");
      expect(res.name).toBe("Marcelo Teste");

      const res2 = extractNameAndPhone("Marcelo Teste, e o telefone é 449-8821-5497");
      expect(res2.phone).toBe("44988215497");
      expect(res2.name).toBe("Marcelo Teste");
    });

    it("should clean prefix 'o dela é' and extract proper name", () => {
      const res = extractNameAndPhone("o dela é Elisa Mendes.");
      expect(res.name).toBe("Elisa Mendes");
      expect(res.phone).toBeUndefined();
    });

    it("should preserve standard names", () => {
      const res = extractNameAndPhone("Elisa Nevinic");
      expect(res.name).toBe("Elisa Nevinic");
      expect(res.phone).toBeUndefined();
    });

    it("should not consider phone prefix speech as a client name", () => {
      const res = extractNameAndPhone("o número é 44 98821 5497");
      expect(res.phone).toBe("44988215497");
      expect(res.name).toBe("");

      const res2 = extractNameAndPhone("o telefone dele é 44 98821 5497");
      expect(res2.phone).toBe("44988215497");
      expect(res2.name).toBe("");
    });

    it("should clean extracted name removing stop words and noise", () => {
      expect(cleanExtractedName("Marcelo Teste, e o telefone é")).toBe("Marcelo Teste");
      expect(cleanExtractedName("o dela é Elisa Mendes.")).toBe("Elisa Mendes");
      expect(cleanExtractedName("o telefone dele é")).toBe("");
      expect(cleanExtractedName("nome do cliente é Lucas Gabriel")).toBe("Lucas Gabriel");
      expect(cleanExtractedName("o nome do cliente é Lucas Gabriel")).toBe("Lucas Gabriel");
      expect(cleanExtractedName("o nome do meu cliente é Lucas Gabriel")).toBe("Lucas Gabriel");
      expect(cleanExtractedName("meu cliente é Lucas Gabriel")).toBe("Lucas Gabriel");
      expect(cleanExtractedName("o cliente é Lucas Gabriel")).toBe("Lucas Gabriel");
      expect(cleanExtractedName("cliente: Lucas Gabriel")).toBe("Lucas Gabriel");
      expect(cleanExtractedName("nome do cliente: Lucas Gabriel")).toBe("Lucas Gabriel");
      expect(cleanExtractedName("ele se chama Lucas Gabriel")).toBe("Lucas Gabriel");
      expect(cleanExtractedName("se chama Lucas Gabriel")).toBe("Lucas Gabriel");
      expect(cleanExtractedName("o cliente se chama Lucas Gabriel")).toBe("Lucas Gabriel");
      expect(cleanExtractedName("o zap é")).toBe("");
      expect(cleanExtractedName("o número do cliente é")).toBe("");
    });

    it("should detect name correction or error notice phrases", () => {
      expect(isNameCorrectionOrErrorNotice("Não, o dela tá errado.")).toBe(true);
      expect(isNameCorrectionOrErrorNotice("o nome tá errado")).toBe(true);
      expect(isNameCorrectionOrErrorNotice("ficou errado")).toBe(true);
      expect(isNameCorrectionOrErrorNotice("Marcelo Teste")).toBe(false);
      expect(isNameCorrectionOrErrorNotice("Elisa Mendes")).toBe(false);
    });

    it("should extract client name and phone from combined sentence", () => {
      const res = extractNameAndPhone(
        "nome do cliente é Lucas Gabriel e o whatsapp é 44 98821-5497"
      );
      expect(res.name).toBe("Lucas Gabriel");
      expect(res.phone).toBe("44988215497");

      const res2 = extractNameAndPhone("Lucas Gabriel 44988215497");
      expect(res2.name).toBe("Lucas Gabriel");
      expect(res2.phone).toBe("44988215497");
    });
  });

  describe("isValidClientName Validation", () => {
    it("should validate real customer names", () => {
      expect(isValidClientName("Lucas Gabriel")).toBe(true);
      expect(isValidClientName("João da Silva")).toBe(true);
      expect(isValidClientName("Maria")).toBe(true);
    });

    it("should reject phone numbers or digits as customer names", () => {
      expect(isValidClientName("44988215497")).toBe(false);
      expect(isValidClientName("44 98821-5497")).toBe(false);
      expect(isValidClientName("(44) 99111-7531")).toBe(false);
      expect(isValidClientName("0")).toBe(false);
      expect(isValidClientName("0️⃣")).toBe(false);
    });

    it("should reject command or placeholder words", () => {
      expect(isValidClientName("voltar")).toBe(false);
      expect(isValidClientName("menu")).toBe(false);
      expect(isValidClientName("telefone")).toBe(false);
      expect(isValidClientName("whatsapp")).toBe(false);
      expect(isValidClientName("zap")).toBe(false);
    });
  });

  describe("formatPhone Country Code and Spacing Normalization", () => {
    it("should format standard 11 digits phone with DDD", () => {
      expect(formatPhone("44988215497")).toBe("(44) 98821-5497");
    });

    it("should format 13 digits with country code 55", () => {
      expect(formatPhone("5544988215497")).toBe("(44) 98821-5497");
    });

    it("should format landline with 10 digits", () => {
      expect(formatPhone("4432221122")).toBe("(44) 3222-1122");
    });
  });
});
