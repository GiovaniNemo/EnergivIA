/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  WhatsappBotService,
  parsePowerInput,
  parseConsumptionInput,
  parseIntegratorQuoteEntities,
  parsePtBrNumber,
} from "../whatsapp-bot.service";
import { GeoIrradianceService } from "../services/geo-irradiance.service";

describe("Diferenciação Estrita de Consumo (kWh) vs Potência de Pico (kWp)", () => {
  describe("parsePtBrNumber", () => {
    it("deve converter números no formato brasileiro e internacional corretamente", () => {
      expect(parsePtBrNumber("1000")).toBe(1000);
      expect(parsePtBrNumber("1.000")).toBe(1000);
      expect(parsePtBrNumber("1.500.000")).toBe(1_500_000);
      expect(parsePtBrNumber("7,5")).toBe(7.5);
      expect(parsePtBrNumber("7.5")).toBe(7.5);
      expect(parsePtBrNumber("1.250,50")).toBe(1250.5);
    });
  });

  describe("parseConsumptionInput", () => {
    it("deve extrair consumo em variações brasileiras comuns com 'kw hora mês'", () => {
      expect(parseConsumptionInput("sistema solar para consumo de 1000kw hora mês")).toBe(1000);
      expect(parseConsumptionInput("consumo de 1000kw hora mês")).toBe(1000);
      expect(parseConsumptionInput("consumo de 1000 kw hora mes")).toBe(1000);
      expect(parseConsumptionInput("consumo de 1000 kw hora")).toBe(1000);
      expect(parseConsumptionInput("consumo de 1000 kw/hora")).toBe(1000);
      expect(parseConsumptionInput("consumo de 1000 kw/h")).toBe(1000);
      expect(parseConsumptionInput("consumo de 1000 kw/mês")).toBe(1000);
      expect(parseConsumptionInput("consumo de 1000 kw/mes")).toBe(1000);
      expect(parseConsumptionInput("consumo de 1000 kw mês")).toBe(1000);
      expect(parseConsumptionInput("consumo de 1000 kw")).toBe(1000);
      expect(parseConsumptionInput("consumo 1000 kw")).toBe(1000);
      expect(parseConsumptionInput("consumo de 1000kwh")).toBe(1000);
      expect(parseConsumptionInput("consumo 1000 kwh")).toBe(1000);
      expect(parseConsumptionInput("consumo de 1.000 kwh")).toBe(1000);
    });

    it("deve extrair consumo mesmo sem a palavra 'consumo' quando a unidade for expressa em kw hora ou kw/mês", () => {
      expect(parseConsumptionInput("1000 kw hora mês")).toBe(1000);
      expect(parseConsumptionInput("1000 kw hora")).toBe(1000);
      expect(parseConsumptionInput("1000 kw/h")).toBe(1000);
      expect(parseConsumptionInput("1000 kw/hora")).toBe(1000);
      expect(parseConsumptionInput("1000 kw/mês")).toBe(1000);
      expect(parseConsumptionInput("1000 kw mês")).toBe(1000);
      expect(parseConsumptionInput("1000 kwh/mês")).toBe(1000);
      expect(parseConsumptionInput("gasto de 800 kw hora")).toBe(800);
      expect(parseConsumptionInput("gasto 800 kw")).toBe(800);
      expect(parseConsumptionInput("conta de 600 kw hora")).toBe(600);
      expect(parseConsumptionInput("fatura de 500 kw")).toBe(500);
      expect(parseConsumptionInput("minha média é de 750 kw hora mês")).toBe(750);
      expect(parseConsumptionInput("1000 kw de consumo")).toBe(1000);
      expect(parseConsumptionInput("1000 kw por mês")).toBe(1000);
    });

    it("NÃO deve extrair como consumo expressões que sejam estritamente de potência de pico", () => {
      expect(parseConsumptionInput("5 kwp")).toBeNull();
      expect(parseConsumptionInput("3000 kwp")).toBeNull();
      expect(parseConsumptionInput("3 mwp")).toBeNull();
      expect(parseConsumptionInput("sistema de 5 kw")).toBeNull();
      expect(parseConsumptionInput("usina de 75 kw")).toBeNull();
    });
  });

  describe("parsePowerInput", () => {
    it("NÃO deve capturar '1000kw hora mês' ou consumo como potência em kWp", () => {
      expect(parsePowerInput("sistema solar para consumo de 1000kw hora mês")).toBeNull();
      expect(parsePowerInput("consumo de 1000kw")).toBeNull();
      expect(parsePowerInput("consumo de 1000kw hora mês")).toBeNull();
      expect(parsePowerInput("1000 kw hora mês")).toBeNull();
      expect(parsePowerInput("1000 kw/h")).toBeNull();
      expect(parsePowerInput("1000 kw/mês")).toBeNull();
      expect(parsePowerInput("1000 kw hora")).toBeNull();
      expect(parsePowerInput("gasto de 800 kw")).toBeNull();
    });

    it("deve capturar corretamente potências reais em kWp, MWp, GWp e kW puro de sistema", () => {
      expect(parsePowerInput("5 kwp")).toBe(5);
      expect(parsePowerInput("3000 kwp")).toBe(3000);
      expect(parsePowerInput("3 mwp")).toBe(3000);
      expect(parsePowerInput("3.5 MW")).toBe(3500);
      expect(parsePowerInput("1 gwp")).toBe(1_000_000);
      expect(parsePowerInput("1.2 GW")).toBe(1_200_000);
      expect(parsePowerInput("sistema de 5 kw")).toBe(5);
      expect(parsePowerInput("usina de 75 kw")).toBe(75);
    });

    it("quando a mensagem contém tanto potência quanto consumo, deve extrair a potência correta", () => {
      expect(parsePowerInput("sistema de 8 kwp para consumo de 1000 kw hora mês")).toBe(8);
      expect(parsePowerInput("consumo de 1000 kwh, quero usina de 10 kwp")).toBe(10);
    });
  });

  describe("parseIntegratorQuoteEntities", () => {
    it("deve definir consumptionKwh e NÃO targetKWp quando o cliente pedir 'consumo de 1000kw hora mês'", () => {
      const quote = parseIntegratorQuoteEntities("sistema solar para consumo de 1000kw hora mês");
      expect(quote.consumptionKwh).toBe(1000);
      expect(quote.targetKWp).toBeUndefined();
      expect(quote.isQuoteRequest).toBe(true);
    });

    it("deve extrair consumo e cidade quando enviados juntos", () => {
      const quote = parseIntegratorQuoteEntities(
        "sistema solar para consumo de 1000kw hora mês em Gurupi/TO"
      );
      expect(quote.consumptionKwh).toBe(1000);
      expect(quote.targetKWp).toBeUndefined();
      expect(quote.cidade).toBe("Gurupi");
      expect(quote.estado).toBe("TO");
      expect(quote.isQuoteRequest).toBe(true);
    });

    it("deve extrair potência kWp normalmente quando for solicitação de potência", () => {
      const quote = parseIntegratorQuoteEntities("cotação de 5 kwp metálico em Maringá/PR");
      expect(quote.targetKWp).toBe(5);
      expect(quote.consumptionKwh).toBeUndefined();
      expect(quote.roofType).toBe("Metálico");
      expect(quote.cidade).toBe("Maringá");
      expect(quote.estado).toBe("PR");
      expect(quote.isQuoteRequest).toBe(true);
    });

    it("deve extrair tanto potência quanto consumo quando ambos forem explicitamente informados", () => {
      const quote = parseIntegratorQuoteEntities(
        "sistema de 8 kwp para consumo de 1000 kw hora mês em Gurupi/TO"
      );
      expect(quote.targetKWp).toBe(8);
      expect(quote.consumptionKwh).toBe(1000);
      expect(quote.cidade).toBe("Gurupi");
      expect(quote.estado).toBe("TO");
      expect(quote.isQuoteRequest).toBe(true);
    });
  });

  describe("Simulação Completa do Diálogo WhatsApp (Reprodução do Print)", () => {
    let service: WhatsappBotService;
    let mockPrisma: any;
    let mockKitGenerationService: any;

    beforeEach(() => {
      mockPrisma = {
        conversation: {
          findUnique: vi.fn().mockResolvedValue({ metadata: {} }),
          findFirst: vi.fn().mockResolvedValue(null),
          update: vi.fn().mockResolvedValue({}),
        },
        message: {
          create: vi.fn().mockResolvedValue({ id: "msg-123" }),
        },
        companyCostRule: {
          findMany: vi.fn().mockResolvedValue([]),
        },
        lead: {
          create: vi.fn().mockResolvedValue({ id: "lead-123" }),
        },
        deal: {
          create: vi.fn().mockResolvedValue({ id: "deal-123" }),
        },
        systemSizing: {
          create: vi.fn().mockResolvedValue({ id: "sizing-123" }),
        },
        simulation: {
          create: vi.fn().mockResolvedValue({ id: "sim-123" }),
        },
        proposalTemplate: {
          findMany: vi
            .fn()
            .mockResolvedValue([{ id: "tpl-123", name: "Modelo Padrão", version: 1 }]),
          findFirst: vi
            .fn()
            .mockResolvedValue({ id: "tpl-123", name: "Modelo Padrão", version: 1 }),
        },
        proposalTemplateBlueprint: {
          findMany: vi.fn().mockResolvedValue([]),
          findFirst: vi.fn().mockResolvedValue(null),
        },
        proposal: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "prop-123", proposalNumber: 101 }),
        },
        leadActivityLog: {
          create: vi.fn().mockResolvedValue({}),
        },
        tenant: {
          findUnique: vi.fn().mockResolvedValue({ settings: {} }),
        },
      };

      mockKitGenerationService = {
        generateDistributorTiers: vi.fn().mockResolvedValue({
          tiers: [
            {
              tierName: "Standard",
              distributorName: "Edsun",
              kwp: 7.6,
              moduleCount: 13,
              estimatedGenerationKwhMonth: 980,
              items: ["13x Módulos 585W", "1x Inversor 6kW"],
              priceBrl: 18000,
            },
          ],
        }),
      };

      const geoIrradiance = new GeoIrradianceService();

      service = new WhatsappBotService(
        { get: vi.fn().mockReturnValue("https://www.energivia.com.br") } as any,
        mockPrisma,
        { sendTextMessage: vi.fn().mockResolvedValue(undefined) } as any,
        {} as any,
        {} as any,
        geoIrradiance,
        {} as any,
        mockKitGenerationService
      );
    });

    it("deve registrar Consumo Registrado e dimensionar para 1000 kWh/mês e NÃO 1000 kWp", async () => {
      const conversation: any = {
        id: "conv-kwh-print",
        organizationId: "org-test",
        title: "Test 1000kw hora mes",
        metadata: {
          step: "IDLE",
          sessionData: {},
        },
        messages: [],
      };

      // Turno 1: Cliente envia "sistema solar para consumo de 1000kw hora mês"
      const reply1 = await service.generateBotResponse({
        conversation,
        incomingText: "sistema solar para consumo de 1000kw hora mês",
        extractionResult: null,
      });

      // Asserções Turno 1:
      expect(reply1).toContain("*_Consumo Registrado:_* `1000 kWh/mês` ☀️");
      expect(reply1).toContain("Para qual cidade e estado será a instalação?");
      expect(reply1).not.toContain("Potência Solicitada");
      expect(reply1).not.toContain("1.000 kWp");
      expect(reply1).not.toContain("1 MWp");

      // Turno 2: Cliente envia "Gurupi/To"
      conversation.messages.push({
        role: "user",
        content: "sistema solar para consumo de 1000kw hora mês",
      });
      conversation.messages.push({
        role: "assistant",
        content: reply1,
      });

      const reply2 = await service.generateBotResponse({
        conversation,
        incomingText: "Gurupi/To",
        extractionResult: null,
      });

      // Asserções Turno 2:
      expect(reply2).toContain("Localização Identificada!");
      expect(reply2).toContain("Gurupi/TO");
      expect(reply2).toContain("5.28 kWh/m²/dia");
      expect(reply2).toContain("Qual o padrão de entrada da instalação?");
      expect(reply2).toContain("1️⃣ *Monofásico 220V*");
      expect(reply2).toContain("2️⃣ *Bifásico 127V/220V*");

      // Turno 3: Cliente escolhe "1" (Monofásico 220V)
      conversation.messages.push({
        role: "user",
        content: "Gurupi/To",
      });
      conversation.messages.push({
        role: "assistant",
        content: reply2,
      });

      const reply3 = await service.generateBotResponse({
        conversation,
        incomingText: "1",
        extractionResult: null,
      });

      // Asserções Turno 3:
      expect(reply3).toContain("*_Padrão Elétrico Registrado:_* `Monofásico 220V` ⚡");
      expect(reply3).toContain("Qual a estrutura do telhado?");

      // Turno 4: Cliente escolhe "1" (Cerâmica / Colonial)
      conversation.messages.push({
        role: "user",
        content: "1",
      });
      conversation.messages.push({
        role: "assistant",
        content: reply3,
      });

      const reply4 = await service.generateBotResponse({
        conversation,
        incomingText: "1",
        extractionResult: null,
      });

      // Asserções Turno 4:
      expect(reply4).toContain("dimensionados para o consumo de `1000 kWh/mês` em `Gurupi/TO`");
      expect(reply4).toContain("7.61 kWp");
      expect(reply4).not.toContain("1.000 kWp");
      expect(reply4).not.toContain("1 MWp");

      // O dimensionamento enviado para o KitGenerationService deve dimensionar ~7.4 kWp para 1000 kWh e NÃO 1000 kWp!
      expect(mockKitGenerationService.generateDistributorTiers).toHaveBeenCalledWith(
        expect.objectContaining({
          system_kw: expect.closeTo(7.4, 1),
          grid_topology: "mono_220",
          roof_type: "ceramic",
        }),
        "org-test"
      );
      const callArgs = mockKitGenerationService.generateDistributorTiers.mock.calls[0][0];
      expect(callArgs.system_kw).toBeLessThan(15);
    });
  });
});
