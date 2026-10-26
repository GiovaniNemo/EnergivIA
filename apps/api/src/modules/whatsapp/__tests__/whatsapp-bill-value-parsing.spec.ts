import { describe, it, expect } from "vitest";
import { parseBillValueInput, isSkipBillValueInput } from "../whatsapp-bot.service";

describe("Parser de Valor da Conta de Luz em Reais (parseBillValueInput)", () => {
  describe("parseBillValueInput com valores numéricos diretos", () => {
    it("deve converter valores numéricos puros no contexto de resposta à pergunta da conta", () => {
      expect(parseBillValueInput("850")).toBe(850);
      expect(parseBillValueInput("850,00")).toBe(850);
      expect(parseBillValueInput("850.00")).toBe(850);
      expect(parseBillValueInput("1250")).toBe(1250);
      expect(parseBillValueInput("1.250,50")).toBe(1250.5);
      expect(parseBillValueInput("1250,50")).toBe(1250.5);
      expect(parseBillValueInput("2.500")).toBe(2500);
    });

    it("deve converter valores com símbolo de moeda R$ ou palavras 'reais'", () => {
      expect(parseBillValueInput("R$ 850")).toBe(850);
      expect(parseBillValueInput("r$ 850,00")).toBe(850);
      expect(parseBillValueInput("R$1250")).toBe(1250);
      expect(parseBillValueInput("850 reais")).toBe(850);
      expect(parseBillValueInput("R$ 1.500,00 reais")).toBe(1500);
      expect(parseBillValueInput("450 conto")).toBe(450);
    });

    it("deve extrair valores inseridos em frases naturais", () => {
      expect(parseBillValueInput("minha conta é de 850 reais")).toBe(850);
      expect(parseBillValueInput("minha conta de luz vem uns 920 reais")).toBe(920);
      expect(parseBillValueInput("fatura de R$ 1.100 por mês")).toBe(1100);
      expect(parseBillValueInput("gasto cerca de 750 reais de luz")).toBe(750);
      expect(parseBillValueInput("pago 680 por mes")).toBe(680);
      expect(parseBillValueInput("conta atual de 1200")).toBe(1200);
      expect(parseBillValueInput("valor da fatura 950")).toBe(950);
      expect(parseBillValueInput("dá mais ou menos uns 800 reais")).toBe(800);
    });

    it("NÃO deve confundir consumo (kWh) ou potência (kWp) com valor monetário", () => {
      expect(parseBillValueInput("1000 kwh")).toBeNull();
      expect(parseBillValueInput("consumo de 850 kwh")).toBeNull();
      expect(parseBillValueInput("10 kwp")).toBeNull();
      expect(parseBillValueInput("5.5 kw")).toBeNull();
    });

    it("deve extrair o valor monetário mesmo se houver menção conjunta de kWh na mesma mensagem", () => {
      expect(parseBillValueInput("consumo de 1000 kwh e conta de 950 reais")).toBe(950);
      expect(parseBillValueInput("gasto 800 kwh, fatura de R$ 780,00")).toBe(780);
      expect(parseBillValueInput("conta de R$ 1200 com 1100 kwh")).toBe(1200);
    });

    it("deve rejeitar valores fora da faixa plausível de conta de energia (< R$ 25 ou > R$ 1.000.000)", () => {
      expect(parseBillValueInput("5")).toBeNull();
      expect(parseBillValueInput("15")).toBeNull();
      expect(parseBillValueInput("15000000")).toBeNull();
    });
  });

  describe("isSkipBillValueInput (Comandos para pular ou estimar automaticamente)", () => {
    it("deve reconhecer comandos de estimativa ou pulo", () => {
      expect(isSkipBillValueInput("0")).toBe(true);
      expect(isSkipBillValueInput("0️⃣")).toBe(true);
      expect(isSkipBillValueInput("pular")).toBe(true);
      expect(isSkipBillValueInput("estimar")).toBe(true);
      expect(isSkipBillValueInput("estima")).toBe(true);
      expect(isSkipBillValueInput("nao sei")).toBe(true);
      expect(isSkipBillValueInput("não sei")).toBe(true);
      expect(isSkipBillValueInput("ignorar")).toBe(true);
      expect(isSkipBillValueInput("deixa")).toBe(true);
    });

    it("não deve considerar valores reais como comando de pulo", () => {
      expect(isSkipBillValueInput("850")).toBe(false);
      expect(isSkipBillValueInput("R$ 500")).toBe(false);
      expect(isSkipBillValueInput("voltar")).toBe(false);
    });
  });
});
