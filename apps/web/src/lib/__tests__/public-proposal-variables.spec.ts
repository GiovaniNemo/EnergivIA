import { describe, it, expect } from "vitest";
import { mergePublicProposalVariables } from "../public-proposal-variables";
import type { PublicProposalPayload } from "../public-proposals-api";

describe("mergePublicProposalVariables", () => {
  describe("Consistência de Investimento Total", () => {
    it("deve formatar investimento_total correspondendo a quotedSaleBrl quando sourceType for kwp_rate", () => {
      const payload = {
        id: "prop-123",
        title: "Proposta Comercial",
        status: "SENT",
        validUntil: new Date(Date.now() + 86400000).toISOString(),
        renderedData: {
          integrator: {
            version: 1,
            sourceType: "kwp_rate" as const,
            quotedSaleBrl: 13230.0,
            computedSaleFromCostRulesBrl: 13230.0,
            equipmentSubtotalBrl: 6170.83,
            systemPowerKw: 4.41,
            kitItems: [
              { productName: "Módulo Astronergy 580W", quantity: 7 },
              { productName: "Inversor SAJ 1MPPT 3KW", quantity: 1 },
            ],
            projectCostLines: [
              {
                name: "Mão de obra",
                appliedAmountBrl: 1500,
              },
              {
                name: "Margem",
                appliedAmountBrl: 5559.17,
              },
            ],
          },
        },
        deal: {
          id: "deal-1",
          lead: {
            name: "Guilherme",
          },
        },
      };

      const variables = mergePublicProposalVariables(
        {},
        payload as unknown as PublicProposalPayload
      );
      expect(variables?.["investimento_total"]).toBe("R$\u00a013.230,00");
    });
  });

  describe("Conexão 100% com Templates de Propostas (Conta de Luz e Comparações)", () => {
    it("deve preencher conta_mensal_energia, comparacao_antes e comparacao_depois quando billValue for fornecido", () => {
      const payload = {
        id: "prop-456",
        validUntil: new Date(Date.now() + 86400000).toISOString(),
        simulation: {
          input: {
            systemSizeKw: 6.5,
            investmentAmount: 18500,
            energyPriceKwh: 1.0625,
            billValue: 850,
            sizing: {
              monthlyConsumptionKwh: 800,
              energyPriceKwh: 1.0625,
              billValue: 850,
            },
          },
          result: {
            monthlySavings: 808,
            annualSavings: [9696],
            paybackYears: 2.3,
            sizing: {
              recommendedPowerKw: 6.5,
              estimatedGeneration: 830,
              estimatedProductionKwhMonth: 830,
            },
          },
        },
      };

      const variables = mergePublicProposalVariables(
        {},
        payload as unknown as PublicProposalPayload
      );

      // Deve ter exatamente a conta informada
      expect(variables?.["conta_mensal_energia"]).toBe(850);
      expect(variables?.["comparacao_antes"]).toBe("R$\u00a0850,00");
      // 850 - 808 = 42
      expect(variables?.["comparacao_depois"]).toBe("R$\u00a042,00");
      // (808 / 850) * 100 = 95%
      expect(variables?.["cobertura_consumo_pct"]).toBe(95);
    });

    it("deve calcular conta_mensal_energia usando energyPriceKwh e monthlyConsumptionKwh se billValue direto não existir", () => {
      const payload = {
        id: "prop-789",
        validUntil: new Date(Date.now() + 86400000).toISOString(),
        simulation: {
          input: {
            systemSizeKw: 5.0,
            investmentAmount: 15000,
            energyPriceKwh: 0.95,
            sizing: {
              monthlyConsumptionKwh: 600,
            },
          },
          result: {
            monthlySavings: 541,
            annualSavings: [6492],
            paybackYears: 2.8,
            sizing: {
              recommendedPowerKw: 5.0,
              estimatedProductionKwhMonth: 620,
            },
          },
        },
      };

      const variables = mergePublicProposalVariables(
        {},
        payload as unknown as PublicProposalPayload
      );

      // 600 * 0.95 = 570
      expect(variables?.["conta_mensal_energia"]).toBe(570);
      expect(variables?.["comparacao_antes"]).toBe("R$\u00a0570,00");
      // 570 - 541 = 29
      expect(variables?.["comparacao_depois"]).toBe("R$\u00a029,00");
      expect(variables?.["cobertura_consumo_pct"]).toBe(95);
    });

    it("deve ativar salvaguarda anti-mock para propostas legadas sem energyPriceKwh preenchido", () => {
      const payload = {
        id: "prop-legacy",
        validUntil: new Date(Date.now() + 86400000).toISOString(),
        simulation: {
          input: {
            systemSizeKw: 4.0,
            investmentAmount: 12000,
            sizing: {
              monthlyConsumptionKwh: 450,
            },
          },
          result: {
            monthlySavings: 400,
            annualSavings: [4800],
            paybackYears: 2.5,
          },
        },
      };

      const variables = mergePublicProposalVariables(
        {
          comparacao_antes: "R$ 850,00", // valor mock do blueprint original
          comparacao_depois: "R$ 85,00",
        },
        payload as unknown as PublicProposalPayload
      );

      // A salvaguarda NUNCA deve deixar vazar o mock "R$ 850,00" do blueprint!
      expect(variables?.["comparacao_antes"]).not.toBe("R$ 850,00");
      expect(variables?.["conta_mensal_energia"]).toBeGreaterThan(0);
      expect(variables?.["comparacao_depois"]).not.toBe("R$ 85,00");
      expect(variables?.["cobertura_consumo_pct"]).toBeGreaterThanOrEqual(90);
    });
  });

  describe("Sistemas Híbridos e Armazenamento (Baterias)", () => {
    it("deve mapear variáveis de bateria e inversor híbrido a partir dos kitItems do integrador", () => {
      const payload = {
        id: "prop-hybrid-1",
        validUntil: new Date(Date.now() + 86400000).toISOString(),
        renderedData: {
          integrator: {
            kitItems: [
              {
                productName: "Módulo Longi 620W",
                quantity: 12,
                categoryName: "module",
                brandName: "Longi",
              },
              {
                productName: "Inversor Híbrido Deye 8kW Monofásico",
                quantity: 1,
                categoryName: "hybrid_inverter",
                brandName: "Deye",
              },
              {
                productName: "Bateria Lítio LiFePO4 5.12 kWh LV",
                quantity: 2,
                categoryName: "battery",
                brandName: "Dyness",
              },
            ],
          },
        },
        simulation: {
          input: {
            systemSizeKw: 7.44,
            investmentAmount: 42000,
            batteryCapacityKwh: 10.24,
            batteryQuantity: 2,
          },
          result: {
            monthlySavings: 750,
            annualSavings: [9000],
            paybackYears: 4.6,
          },
        },
      };

      const variables = mergePublicProposalVariables(
        {},
        payload as unknown as PublicProposalPayload
      );

      expect(variables?.["bateria_sistema"]).toBe("2x Bateria Lítio LiFePO4 5.12 kWh LV (Dyness)");
      expect(variables?.["quantidade_baterias"]).toBe(2);
      expect(variables?.["capacidade_bateria_kwh"]).toBe("10.24 kWh");
      expect(variables?.["inversor_hibrido"]).toBe(
        "1x Inversor Híbrido Deye 8kW Monofásico (Deye)"
      );
      expect(variables?.["modo_backup"]).toBe("Backup Automático EPS (< 10ms)");
      expect(variables?.["tipo_sistema_solar"]).toBe("Híbrido com Armazenamento (BESS)");
    });
  });
});
