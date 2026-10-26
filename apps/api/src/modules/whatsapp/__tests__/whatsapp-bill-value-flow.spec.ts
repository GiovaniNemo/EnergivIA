/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from "vitest";
import { STEP_PREVIOUS_MAP } from "../whatsapp-state.types";
import {
  getRegionalAverageTariff,
  calculateEffectiveTariff,
  DEFAULT_NATIONAL_AVERAGE_TARIFF,
  WhatsappBotService,
} from "../whatsapp-bot.service";

function createBotService(): WhatsappBotService {
  const mockConfig: any = { get: vi.fn().mockReturnValue(undefined) };
  return new WhatsappBotService(
    mockConfig,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any
  );
}

describe("FSM - Fluxo de Pergunta do Valor da Conta de Luz (AWAITING_BILL_VALUE)", () => {
  describe("STEP_PREVIOUS_MAP", () => {
    it("deve mapear retrocesso de AWAITING_GRID_TYPE para AWAITING_BILL_VALUE", () => {
      expect(STEP_PREVIOUS_MAP["AWAITING_GRID_TYPE"]).toBe("AWAITING_BILL_VALUE");
    });

    it("deve mapear retrocesso de AWAITING_BILL_VALUE para AWAITING_CITY", () => {
      expect(STEP_PREVIOUS_MAP["AWAITING_BILL_VALUE"]).toBe("AWAITING_CITY");
    });
  });

  describe("Tarifas Regionais e Efetivas", () => {
    it("deve retornar a tarifa da UF cadastrada ou a média nacional", () => {
      expect(getRegionalAverageTariff("SP")).toBe(0.89);
      expect(getRegionalAverageTariff("PR")).toBe(0.87);
      expect(getRegionalAverageTariff("RJ")).toBe(1.02);
      expect(getRegionalAverageTariff("MG")).toBe(0.96);
      expect(getRegionalAverageTariff(null)).toBe(DEFAULT_NATIONAL_AVERAGE_TARIFF);
      expect(getRegionalAverageTariff("XX")).toBe(DEFAULT_NATIONAL_AVERAGE_TARIFF);
    });

    it("deve calcular a tarifa efetiva baseada no valor da conta e consumo informado", () => {
      // 850 reais / 800 kWh = 1.0625 R$/kWh
      expect(calculateEffectiveTariff(850, 800, "SP")).toBe(1.0625);
      // 600 reais / 600 kWh = 1.0000 R$/kWh
      expect(calculateEffectiveTariff(600, 600, "PR")).toBe(1);
    });

    it("deve aplicar fallback regional se conta não for informada ou for valor irreal", () => {
      expect(calculateEffectiveTariff(undefined, 800, "PR")).toBe(0.87);
      expect(calculateEffectiveTariff(null, 500, "SP")).toBe(0.89);
      // Valor absurdo (5 reais / 1000 kWh = 0.005 R$/kWh < 0.35) -> fallback regional
      expect(calculateEffectiveTariff(5, 1000, "MG")).toBe(0.96);
    });
  });

  describe("finalizeLocationSelection com Fast-Forward e Pergunta da Conta", () => {
    const mockHsp = {
      city: "Maringá",
      uf: "PR",
      hsp: 4.85,
      exact: true,
      score: 1,
    };

    it("deve transicionar para AWAITING_BILL_VALUE e perguntar o valor da conta se billValue for undefined", async () => {
      const botService = createBotService();

      const sessionCtx: any = {
        consumptionKwh: 650,
        billValue: undefined,
      };

      let assignedStep = "";
      let assignedPatch: any = null;
      const setStep = vi.fn().mockImplementation(async (step, patch) => {
        assignedStep = step;
        assignedPatch = patch;
      });
      const kitsFor = vi.fn().mockResolvedValue([]);

      const response = await botService.finalizeLocationSelection(
        mockHsp as any,
        sessionCtx,
        setStep,
        kitsFor
      );

      expect(assignedStep).toBe("AWAITING_BILL_VALUE");
      expect(assignedPatch).toMatchObject({
        cidade: "Maringá",
        uf: "PR",
        hsp: 4.85,
      });
      expect(response).toContain("Qual é o valor médio da conta de luz atual em R$?");
      expect(response).toContain("Maringá/PR");
    });

    it("deve pular a pergunta da conta (fast-forward) se billValue já tiver sido extraído da fatura", async () => {
      const botService = createBotService();

      const sessionCtx: any = {
        consumptionKwh: 800,
        billValue: 850, // já extraído da fatura
      };

      let assignedStep = "";
      let assignedPatch: any = null;
      const setStep = vi.fn().mockImplementation(async (step, patch) => {
        assignedStep = step;
        assignedPatch = patch;
      });
      const kitsFor = vi.fn().mockResolvedValue([]);

      const response = await botService.finalizeLocationSelection(
        mockHsp as any,
        sessionCtx,
        setStep,
        kitsFor
      );

      // Não deve parar em AWAITING_BILL_VALUE! Pula direto para AWAITING_GRID_TYPE
      expect(assignedStep).toBe("AWAITING_GRID_TYPE");
      expect(assignedPatch.billValue).toBe(850);
      expect(response).not.toContain("Qual é o valor médio da conta de luz atual em R$?");
      expect(response).toContain("Qual o padrão de entrada da instalação?");
    });
  });
});
