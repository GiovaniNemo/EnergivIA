import { describe, it, expect } from "vitest";
import { parseNumericVariable, parseGenerationConsumptionFields } from "../parse-generation-fields";

describe("parse-generation-fields", () => {
  describe("parseNumericVariable", () => {
    it("should handle brazilian thousands dot without treating as decimal float", () => {
      // 1.050 kWh não deve virar 1.05 (e depois 1)
      expect(parseNumericVariable("1.050")).toBe(1050);
      expect(parseNumericVariable("2.400 kWh/mês")).toBe(2400);
      expect(parseNumericVariable("12.500")).toBe(12500);
    });

    it("should handle brazilian comma decimals and mixed thousands", () => {
      expect(parseNumericVariable("8,40")).toBe(8.4);
      expect(parseNumericVariable("8.40")).toBe(8.4);
      expect(parseNumericVariable("1.050,50")).toBe(1050.5);
      expect(parseNumericVariable(1050)).toBe(1050);
      expect(parseNumericVariable("95")).toBe(95);
    });
  });

  describe("parseGenerationConsumptionFields", () => {
    it("should extract month labels and series from array of objects without generating [object Object]", () => {
      const fields = {
        meses: [
          { mes: "Jan", consumo: 680, producao: 780 },
          { mes: "Fev", consumo: 670, producao: 750 },
          { mes: "Mar", consumo: 640, producao: 730 },
          { mes: "Abr", consumo: 620, producao: 690 },
          { mes: "Mai", consumo: 600, producao: 650 },
          { mes: "Jun", consumo: 590, producao: 620 },
          { mes: "Jul", consumo: 610, producao: 660 },
          { mes: "Ago", consumo: 630, producao: 710 },
          { mes: "Set", consumo: 650, producao: 740 },
          { mes: "Out", consumo: 670, producao: 770 },
          { mes: "Nov", consumo: 690, producao: 790 },
          { mes: "Dez", consumo: 710, producao: 810 },
        ],
        title: "Balanço Energético",
      };

      const theme = {
        primary: "#059669",
        secondary: "#10B981",
        text: "#0F172A",
        background: "#FFFFFF",
      };

      const vars = {
        potencia_sistema_kwp: "8.40",
        geracao_mensal_kwh: "1.050",
        cobertura_consumo_pct: "95",
        equivalente_arvores_ano: "48",
      };

      const result = parseGenerationConsumptionFields(fields, theme, vars);

      // Nunca deve conter "[object Object]"
      expect(result.meses).toEqual([
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
      ]);
      expect(result.meses.some((m) => m.includes("object"))).toBe(false);

      // Valores escalares reais
      expect(result.potencia).toBe(8.4);
      expect(result.geracaoMensal).toBe(1050);
      expect(result.geracaoMensal).not.toBe(1);
      expect(result.cobertura).toBe(0.95);
      expect(result.equivalenteAmbiental).toBe(48);

      // Séries mensais extraídas
      expect(result.consumoMensal[0]).toBe(680);
      expect(result.producaoMensal[0]).toBe(780);
      expect(result.consumoMensal[11]).toBe(710);
      expect(result.producaoMensal[11]).toBe(810);
    });

    it("should prevent 1 kWh/month anomaly when power is high", () => {
      const fields = {};
      const theme = {
        primary: "#059669",
        secondary: "#10B981",
        text: "#0F172A",
        background: "#FFFFFF",
      };
      const vars = {
        potencia_sistema_kwp: "8.40",
        geracao_mensal_kwh: "1", // anomalia simulada
      };

      const result = parseGenerationConsumptionFields(fields, theme, vars);
      expect(result.geracaoMensal).toBeGreaterThanOrEqual(500);
    });
  });
});
