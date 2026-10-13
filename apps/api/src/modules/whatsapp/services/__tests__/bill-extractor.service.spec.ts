import { describe, it, expect } from "vitest";
import {
  parseBrazilianKwh,
  processExtractedBillData,
  ExtractedBillData,
} from "../bill-extractor.service";

describe("BillExtractorService - Bill Forensic Parsing Suite", () => {
  describe("parseBrazilianKwh", () => {
    it("should parse Enel / CPFL 3-decimal thousand formats correctly", () => {
      // 1.198,000 kWh is 1198
      expect(parseBrazilianKwh("1.198,000")).toBe(1198);
      expect(parseBrazilianKwh("1.525,000")).toBe(1525);
      expect(parseBrazilianKwh("703,000")).toBe(703);
    });

    it("should parse thousand dot notation without comma", () => {
      expect(parseBrazilianKwh("1.971")).toBe(1971);
      expect(parseBrazilianKwh("2.041")).toBe(2041);
    });

    it("should parse regular comma decimal numbers", () => {
      expect(parseBrazilianKwh("350,5")).toBe(351);
      expect(parseBrazilianKwh("476,00")).toBe(476);
    });

    it("should handle direct numeric inputs", () => {
      expect(parseBrazilianKwh(500)).toBe(500);
      expect(parseBrazilianKwh(0)).toBe(0);
      expect(parseBrazilianKwh(-10)).toBe(0);
    });
  });

  describe("processExtractedBillData", () => {
    it("should calculate exact average and total sum over 12 months history", () => {
      const mockData: ExtractedBillData = {
        distribuidora: "Copel",
        cidade: "Maringá",
        uf: "PR",
        historico_consumo: [
          { mes_ano: "JAN/26", consumo_kwh: 600 },
          { mes_ano: "FEV/26", consumo_kwh: 500 },
          { mes_ano: "MAR/26", consumo_kwh: 700 },
        ],
      };

      const result = processExtractedBillData(mockData);
      expect(result.monthCount).toBe(3);
      expect(result.totalSumKwh).toBe(1800);
      expect(result.exactAverageKwh).toBe(600);
      expect(result.formattedSummary).toContain("600 kWh/mês");
      expect(result.formattedSummary).toContain("Maringá/PR");
    });

    it("should filter out billing day numbers mistakenly captured in history", () => {
      const mockDataWithDays: ExtractedBillData = {
        distribuidora: "Energisa",
        cidade: "Campo Grande",
        uf: "MS",
        historico_consumo: [
          { mes_ano: "OUT/25", consumo_kwh: 1971 },
          { mes_ano: "SET/25", consumo_kwh: 2041 },
          { mes_ano: "AGO/25", consumo_kwh: 1500 },
          // Consecutive numbers below 35 at the end represent billing days
          { mes_ano: "DIAS", consumo_kwh: 30 },
          { mes_ano: "DIAS", consumo_kwh: 31 },
        ],
      };

      const result = processExtractedBillData(mockDataWithDays);
      expect(result.data.historico_consumo).toHaveLength(3);
      expect(result.data.historico_consumo.every((m) => m.consumo_kwh > 100)).toBe(true);
    });

    it("should fallback to current month consumption when history is empty", () => {
      const mockSingleMonth: ExtractedBillData = {
        distribuidora: "Enel",
        cidade: "São Paulo",
        uf: "SP",
        consumo_mes_atual_kwh: 450,
        historico_consumo: [],
      };

      const result = processExtractedBillData(mockSingleMonth);
      expect(result.monthCount).toBe(1);
      expect(result.exactAverageKwh).toBe(450);
      expect(result.formattedSummary).toContain("450 kWh/mês");
    });

    it("should reject and not invent numbers when neither history nor current month exist (Anti-Hallucination Guardrail)", () => {
      const mockEmpty: ExtractedBillData = {
        distribuidora: "Desconhecida",
        historico_consumo: [],
      };

      const result = processExtractedBillData(mockEmpty);
      expect(result.exactAverageKwh).toBe(0);
      expect(result.totalSumKwh).toBe(0);
      expect(result.monthCount).toBe(0);
      expect(result.isValidForSizing).toBe(false);
      expect(result.isLegible).toBe(false);
      expect(result.rejectionReason).toBeDefined();
      expect(result.formattedSummary).toContain("Não foi possível identificar com clareza");
      expect(result.formattedSummary).toContain("Nenhuma informação foi inventada");
    });

    it("should reject extraction immediately when AI flags legivel as false", () => {
      const mockIllegible: ExtractedBillData = {
        legivel: false,
        confianca: "BAIXA",
        motivo_recusa: "Foto com desfoque e reflexo na tabela de consumo",
        dados_fundamentais_identificados: false,
        historico_consumo: [{ mes_ano: "JAN/26", consumo_kwh: 500 }],
      };

      const result = processExtractedBillData(mockIllegible);
      expect(result.isValidForSizing).toBe(false);
      expect(result.isLegible).toBe(false);
      expect(result.exactAverageKwh).toBe(0);
      expect(result.monthCount).toBe(0);
      expect(result.rejectionReason).toContain("Foto com desfoque e reflexo");
      expect(result.formattedSummary).toContain("Nenhuma informação foi inventada");
    });

    it("should reject extraction when AI flags dados_fundamentais_identificados as false", () => {
      const mockMissingFundamentals: ExtractedBillData = {
        legivel: true,
        confianca: "MEDIA",
        dados_fundamentais_identificados: false,
        motivo_recusa: "Tabela de histórico ausente ou cortada",
        historico_consumo: [],
      };

      const result = processExtractedBillData(mockMissingFundamentals);
      expect(result.isValidForSizing).toBe(false);
      expect(result.isLegible).toBe(false);
      expect(result.exactAverageKwh).toBe(0);
      expect(result.rejectionReason).toContain("Tabela de histórico ausente ou cortada");
    });

    it("should reject extraction when confianca is BAIXA", () => {
      const mockLowConfidence: ExtractedBillData = {
        legivel: true,
        confianca: "BAIXA",
        motivo_recusa: "Dígitos de consumo borrados e duvidosos",
        historico_consumo: [{ mes_ano: "JAN/26", consumo_kwh: 120 }],
      };

      const result = processExtractedBillData(mockLowConfidence);
      expect(result.isValidForSizing).toBe(false);
      expect(result.isLegible).toBe(false);
      expect(result.exactAverageKwh).toBe(0);
      expect(result.rejectionReason).toContain("Dígitos de consumo borrados");
    });
  });
});
