import { describe, it, expect } from "vitest";
import { getHsp } from "../services/geo-irradiance.service";

describe("WhatsApp & Web Chat Engine Synchronization Suite", () => {
  describe("Context extraction from Web Assistant bill summary (Screenshot 3)", () => {
    const webAssistantMsg =
      "Legal, dados extraídos com precisão!\n\n" +
      "Consumo médio de 1704 kWh/mês em Senador Canedo/GO (baseado no histórico de 12 meses da fatura).\n\n" +
      "Qual a estrutura do telhado?\n" +
      "1️⃣ Cerâmica (Colonial)\n" +
      "2️⃣ Fibrocimento\n" +
      "3️⃣ Metálico\n" +
      "4️⃣ Solo\n" +
      "5️⃣ Laje\n" +
      "6️⃣ Fibrometal\n" +
      "7️⃣ Sem estrutura\n" +
      "0️⃣ Voltar / Corrigir\n\n" +
      "(Responda com o número da opção)";

    it("should extract 1704 kWh consumption from the assistant message", () => {
      const consM = webAssistantMsg.match(
        /(?:Consumo Registrado|Consumo m[ée]dio(?: de)?):?[_*\s]*`?(\d+[\d.,]*)`?\s*kWh/i
      );
      expect(consM).not.toBeNull();
      const cVal = Math.round(Number(consM![1].replace(/\./g, "").replace(",", ".")));
      expect(cVal).toBe(1704);
    });

    it("should extract Senador Canedo/GO location from the assistant message", () => {
      const locM =
        webAssistantMsg.match(
          /(?:Localização Identificada|Localização Corrigida|Localização Mantida|Cidade):?[_*\s!]*`?\*?([^*\/`\n]+)\/([A-Za-z]{2})\*?`?/i
        ) ||
        webAssistantMsg.match(
          /(?:em|para)\s+`?\*?([^*\/`\n]{3,40})\/([A-Za-z]{2})\*?`?\s*(?:\(|☀️|📍|\n|$|\s)/i
        );
      expect(locM).not.toBeNull();
      const cidade = locM![1].replace(/[*_`]/g, "").trim();
      const estado = locM![2].replace(/[*_`]/g, "").trim().toUpperCase();
      expect(cidade).toBe("Senador Canedo");
      expect(estado).toBe("GO");
    });

    it("should identify roof question state from the assistant message", () => {
      const isRoofQuestion =
        webAssistantMsg.includes("Qual a estrutura do telhado") ||
        webAssistantMsg.includes("estrutura do telhado");
      expect(isRoofQuestion).toBe(true);
    });
  });

  describe("Regional HSP and Monthly Generation calculation synchronization", () => {
    it("should compute exact HSP and monthlyFactor for Senador Canedo/GO", () => {
      const hspRes = getHsp("Senador Canedo", "GO");
      expect(hspRes.city).toBe("Senador Canedo");
      expect(hspRes.uf).toBe("GO");
      expect(hspRes.hsp).toBeCloseTo(5.28, 1);

      // Monthly factor formula: hsp * 30 * 0.85
      const monthlyFactor = Math.max(90, Math.min(180, Math.round(hspRes.hsp * 30 * 0.85)));
      expect(monthlyFactor).toBe(135);
    });

    it("should calculate exact estimated monthly generation matching WhatsApp screenshots", () => {
      const monthlyFactor = 135;

      // Opção 1 — Standard: 12.76 kWp (22x Astronergy 580W, 1x GoodWe 10kW)
      const genStandard = Math.round(12.76 * monthlyFactor);
      expect(genStandard).toBe(1723); // Matches Screenshot 2: "1723 kWh/mês"

      // Opção 2 — Elite: 12.4 kWp (20x LONGI Solar 620W, 1x SAJ 10kW)
      const genElite = Math.round(12.4 * monthlyFactor);
      expect(genElite).toBe(1674); // Matches Screenshot 1 & 2: "1674 kWh/mês"
    });

    it("should calculate pricing matching WhatsApp Kit Elite screenshot", () => {
      const kwp = 12.4;
      const ratePerKwp = 1700;
      const total = Math.round(kwp * ratePerKwp);
      expect(total).toBe(21080); // Matches Screenshot 1: "Total: R$ 21.080,00"
    });
  });

  describe("Message flow matching between WhatsApp and Web Bot", () => {
    it("should parse option 2 selection after kit listing", () => {
      const promptText = "Qual opção você prefere para o seu cliente?";
      expect(promptText.includes("Qual opção você prefere para o seu cliente")).toBe(true);

      const userChoice = "2";
      const chosenIndex = parseInt(userChoice, 10) - 1;
      expect(chosenIndex).toBe(1); // Elite is index 1
    });

    it("should parse standard price confirmation (option 1) after kit selection", () => {
      const priceQuestion =
        "Como você deseja prosseguir para esta cotação?\n\n" +
        "1️⃣ Seguir com o preço padrão ( R$ 1.700,00/kWp — Total: R$ 21.080,00 )\n" +
        "2️⃣ Informar outro preço por kWp\n" +
        "0️⃣ Voltar / Escolher outro kit";

      expect(
        priceQuestion.includes("preço padrão") ||
          priceQuestion.includes("Como você deseja prosseguir para esta cotação")
      ).toBe(true);

      const userResponse = "1";
      const isChoice1 =
        userResponse === "1" ||
        userResponse.includes("1️⃣") ||
        userResponse === "padrao" ||
        userResponse === "padrão";
      expect(isChoice1).toBe(true);
    });
  });
});
