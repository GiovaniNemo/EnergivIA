/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { WhatsappBotService } from "../whatsapp-bot.service";

describe("WhatsApp Bot - Hybrid Inverter & Battery Storage Flow", () => {
  let botService: WhatsappBotService;
  let mockPrisma: any;
  let mockGeoIrradiance: any;
  let mockKitGeneration: any;

  beforeEach(() => {
    mockPrisma = {
      tenant: {
        findUnique: vi.fn().mockResolvedValue({ id: "org-1", settings: {} }),
      },
      conversation: {
        update: vi.fn().mockResolvedValue({}),
      },
      product: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    mockGeoIrradiance = {
      getHsp: vi.fn().mockReturnValue({ hsp: 5.2, city: "Maringá", uf: "PR" }),
    };

    mockKitGeneration = {
      generateDistributorTiers: vi.fn().mockResolvedValue({
        tiers: [
          {
            tier_id: "cost_benefit",
            name: "Elite Híbrido",
            inverter_brand: "Deye",
            inverter_model: "SUN-8K-SG01LP1",
            inverter_power_kw: 8,
            inverter_qty: 1,
            module_brand: "DAH Solar",
            module_model: "585W",
            module_power_w: 585,
            module_qty: 12,
            equipment_total: 25000,
            rate_per_kwp: 3500,
            kit_result: {
              system_power_kw: 7.02,
              kit_items: [],
            },
          },
        ],
      }),
    };

    const mockConfig = {
      get: vi.fn().mockReturnValue("test-key"),
    };

    botService = new WhatsappBotService(
      mockConfig as any,
      mockPrisma as any,
      { sendTextMessage: vi.fn() } as any,
      {} as any,
      {} as any,
      mockGeoIrradiance as any,
      {} as any,
      mockKitGeneration as any
    );
  });

  it("should prompt open battery storage question when user initiates hybrid quote without battery", async () => {
    const conversation: any = {
      id: "conv-hyb-1",
      organizationId: "org-1",
      metadata: {
        step: "IDLE",
      },
      messages: [],
    };

    const reply = await (botService as any).generateBotResponse({
      conversation,
      incomingText: "Cotação 800 kwh com inversor híbrido em Maringá/PR bifásico 127/220",
    });

    expect(conversation.metadata.step).toBe("AWAITING_BATTERY_STORAGE");
    expect(conversation.metadata.sessionData.inverterType).toBe("hybrid");
    expect(conversation.metadata.sessionData.gridType).toBe("Bifásico 127V/220V");
    expect(reply).toContain("armazenamento de bateria");
    expect(reply).toContain("kWh");
    expect(reply).toContain("baterias");
  });

  it("should accept battery capacity in kWh in AWAITING_BATTERY_STORAGE and advance to roof step", async () => {
    const conversation: any = {
      id: "conv-hyb-2",
      organizationId: "org-1",
      metadata: {
        step: "AWAITING_BATTERY_STORAGE",
        sessionData: {
          consumptionKwh: 800,
          cidade: "Maringá",
          uf: "PR",
          gridType: "Monofásico 220V",
          inverterType: "hybrid",
        },
      },
      messages: [
        {
          role: "assistant",
          content: "Qual o armazenamento de bateria desejado para este sistema híbrido? 🔋",
        },
      ],
    };

    const reply = await (botService as any).generateBotResponse({
      conversation,
      incomingText: "10.24 kWh",
    });

    expect(conversation.metadata.step).toBe("AWAITING_ROOF_TYPE");
    expect(conversation.metadata.sessionData.batteryKwh).toBe(10.24);
    expect(conversation.metadata.sessionData.hasBattery).toBe(true);
    expect(reply).toContain("estrutura do telhado");
  });

  it("should accept battery count in units (ex: '2 baterias') in AWAITING_BATTERY_STORAGE", async () => {
    const conversation: any = {
      id: "conv-hyb-3",
      organizationId: "org-1",
      metadata: {
        step: "AWAITING_BATTERY_STORAGE",
        sessionData: {
          consumptionKwh: 800,
          cidade: "Maringá",
          uf: "PR",
          gridType: "Monofásico 220V",
          inverterType: "hybrid",
        },
      },
      messages: [
        {
          role: "assistant",
          content: "Qual o armazenamento de bateria desejado para este sistema híbrido? 🔋",
        },
      ],
    };

    const _reply = await (botService as any).generateBotResponse({
      conversation,
      incomingText: "2 baterias",
    });

    expect(conversation.metadata.step).toBe("AWAITING_ROOF_TYPE");
    expect(conversation.metadata.sessionData.batteryQty).toBe(2);
    expect(conversation.metadata.sessionData.hasBattery).toBe(true);
  });

  it("should accept 'sem bateria' or '0' in AWAITING_BATTERY_STORAGE", async () => {
    const conversation: any = {
      id: "conv-hyb-4",
      organizationId: "org-1",
      metadata: {
        step: "AWAITING_BATTERY_STORAGE",
        sessionData: {
          consumptionKwh: 800,
          cidade: "Maringá",
          uf: "PR",
          gridType: "Monofásico 220V",
          inverterType: "hybrid",
        },
      },
      messages: [
        {
          role: "assistant",
          content: "Qual o armazenamento de bateria desejado para este sistema híbrido? 🔋",
        },
      ],
    };

    const _reply = await (botService as any).generateBotResponse({
      conversation,
      incomingText: "sem bateria",
    });

    expect(conversation.metadata.step).toBe("AWAITING_ROOF_TYPE");
    expect(conversation.metadata.sessionData.batteryQty).toBe(0);
    expect(conversation.metadata.sessionData.hasBattery).toBe(false);
  });

  it("should apply Deye HV safety check: minimum 4 battery modules and BMS included", async () => {
    const conversation: any = {
      id: "conv-hyb-5",
      organizationId: "org-1",
      metadata: {
        step: "AWAITING_BATTERY_STORAGE",
        sessionData: {
          kwp: 20,
          cidade: "Curitiba",
          uf: "PR",
          gridType: "Trifásico 380V",
          inverterType: "hybrid",
          inverterDescription: "Deye HV 20kW",
        },
      },
      messages: [
        {
          role: "assistant",
          content: "Qual o armazenamento de bateria desejado para este sistema híbrido? 🔋",
        },
      ],
    };

    const reply = await (botService as any).generateBotResponse({
      conversation,
      incomingText: "2 baterias",
    });

    expect(conversation.metadata.sessionData.batteryQty).toBe(4);
    expect(conversation.metadata.sessionData.hasBms).toBe(true);
    expect(reply).toContain("mínimo técnico");
    expect(reply).toContain("BMS");
  });
});
