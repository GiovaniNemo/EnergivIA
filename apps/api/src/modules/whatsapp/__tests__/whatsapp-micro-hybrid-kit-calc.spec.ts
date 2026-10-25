/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { WhatsappBotService } from "../whatsapp-bot.service";

describe("WhatsApp Bot - Microinverter & Hybrid Kit Calculation & Fast Switch", () => {
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
      generateDistributorTiers: vi.fn().mockImplementation((input: any) => {
        const isMicro = input.inverter_type === "microinverter";
        const isHybrid = input.inverter_type === "hybrid";

        return Promise.resolve({
          tiers: [
            {
              tier_id: "cost_benefit",
              name: isMicro ? "Elite Micro" : isHybrid ? "Elite Híbrido" : "Elite Convencional",
              inverter_brand: isMicro ? "Hoymiles" : isHybrid ? "Deye" : "Growatt",
              inverter_model: isMicro ? "HMS-2000" : isHybrid ? "SUN-8K-SG01LP1" : "MIN 8000TL-X",
              inverter_power_kw: isMicro ? 2 : 8,
              inverter_qty: isMicro ? 4 : 1,
              module_brand: "DAH Solar",
              module_model: "585W",
              module_power_w: 585,
              module_qty: 14,
              equipment_total: 22000,
              rate_per_kwp: 2800,
              kit_result: {
                system_power_kw: 8.19,
                inverter: {
                  quantity: isMicro ? 4 : 1,
                },
                kit_items: [],
              },
            },
          ],
        });
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

  it("should pass inverter_type: 'microinverter' to generateDistributorTiers and format microinverter labels", async () => {
    const quotes = await (botService as any).calculateDistributorKits({
      consumptionKwh: 1000,
      cidade: "Maringá",
      estado: "PR",
      roofType: "Cerâmica (Colonial)",
      gridVoltage: "Monofásico 220V",
      inverterType: "microinverter",
    });

    expect(mockKitGeneration.generateDistributorTiers).toHaveBeenCalledWith(
      expect.objectContaining({
        inverter_type: "microinverter",
      }),
      undefined
    );

    expect(
      quotes[0].items.some(
        (it: string) => it.includes("Microinversores") || it.includes("Microinversor")
      )
    ).toBe(true);
  });

  it("should include battery and BMS in kit items for hybrid systems", async () => {
    const quotes = await (botService as any).calculateDistributorKits({
      consumptionKwh: 1200,
      cidade: "Curitiba",
      estado: "PR",
      roofType: "Metálico",
      gridVoltage: "Trifásico 380V",
      inverterType: "hybrid",
      batteryKwh: 20.48,
      batteryQty: 4,
      hasBattery: true,
      hasBms: true,
    });

    expect(mockKitGeneration.generateDistributorTiers).toHaveBeenCalledWith(
      expect.objectContaining({
        inverter_type: "hybrid",
      }),
      undefined
    );

    const itemsStr = quotes[0].items.join(" ");
    expect(itemsStr).toContain("Bateria");
    expect(itemsStr).toContain("BMS");
  });

  it("should fast-switch to microinverter when user sends 'micro' in AWAITING_KIT_SELECTION", async () => {
    const conversation: any = {
      id: "conv-switch-1",
      organizationId: "org-1",
      metadata: {
        step: "AWAITING_KIT_SELECTION",
        sessionData: {
          consumptionKwh: 800,
          cidade: "Maringá",
          uf: "PR",
          roofType: "Cerâmica (Colonial)",
          gridType: "Monofásico 220V",
          inverterType: "string",
        },
      },
      messages: [
        {
          role: "assistant",
          content: "Qual opção você prefere para o seu cliente?",
        },
      ],
    };

    const reply = await (botService as any).generateBotResponse({
      conversation,
      incomingText: "micro",
    });

    expect(conversation.metadata.step).toBe("AWAITING_KIT_SELECTION");
    expect(conversation.metadata.sessionData.inverterType).toBe("microinverter");
    expect(reply).toContain("Microinversor");
  });

  it("should fast-switch to hybrid and prompt battery storage when user sends 'hibrido' without battery in AWAITING_KIT_SELECTION", async () => {
    const conversation: any = {
      id: "conv-switch-2",
      organizationId: "org-1",
      metadata: {
        step: "AWAITING_KIT_SELECTION",
        sessionData: {
          consumptionKwh: 800,
          cidade: "Maringá",
          uf: "PR",
          roofType: "Cerâmica (Colonial)",
          gridType: "Monofásico 220V",
          inverterType: "string",
        },
      },
      messages: [
        {
          role: "assistant",
          content: "Qual opção você prefere para o seu cliente?",
        },
      ],
    };

    const reply = await (botService as any).generateBotResponse({
      conversation,
      incomingText: "híbrido",
    });

    expect(conversation.metadata.step).toBe("AWAITING_BATTERY_STORAGE");
    expect(conversation.metadata.sessionData.inverterType).toBe("hybrid");
    expect(reply).toContain("armazenamento de bateria");
  });

  it("should fast-switch back to string when user sends 'string' in AWAITING_KIT_SELECTION", async () => {
    const conversation: any = {
      id: "conv-switch-3",
      organizationId: "org-1",
      metadata: {
        step: "AWAITING_KIT_SELECTION",
        sessionData: {
          consumptionKwh: 800,
          cidade: "Maringá",
          uf: "PR",
          roofType: "Cerâmica (Colonial)",
          gridType: "Monofásico 220V",
          inverterType: "microinverter",
        },
      },
      messages: [
        {
          role: "assistant",
          content: "Qual opção você prefere para o seu cliente?",
        },
      ],
    };

    const reply = await (botService as any).generateBotResponse({
      conversation,
      incomingText: "string",
    });

    expect(conversation.metadata.step).toBe("AWAITING_KIT_SELECTION");
    expect(conversation.metadata.sessionData.inverterType).toBe("string");
    expect(reply).toContain("Inversor Convencional (String)");
  });

  it("should use organization preferredMicroInverterBrands and microinverter labels in contingency fallback", async () => {
    (botService as any).kitGeneration = null;
    mockPrisma.tenant.findUnique.mockResolvedValue({
      id: "org-1",
      settings: {
        preferredMicroInverterBrands: ["Deye", "Hoymiles"],
      },
    });

    const quotes = await (botService as any).calculateDistributorKits({
      consumptionKwh: 600,
      cidade: "Maringá",
      estado: "PR",
      roofType: "Metálico",
      gridVoltage: "Monofásico 220V",
      inverterType: "microinverter",
      organizationId: "org-1",
    });

    expect(quotes.length).toBe(3);
    const standard = quotes.find((q: any) => q.distributorId === "kwp-standard");
    const elite = quotes.find((q: any) => q.distributorId === "kwp-elite");
    const premium = quotes.find((q: any) => q.distributorId === "kwp-premium");

    expect(standard.invName).toBe("Deye");
    expect(elite.invName).toBe("Deye");
    expect(premium.invName).toBe("GoodWe");
    expect(standard.items.some((i: string) => i.includes("Microinversor"))).toBe(true);
  });

  it("should use organization preferredHybridInverterBrands in contingency fallback", async () => {
    (botService as any).kitGeneration = null;
    mockPrisma.tenant.findUnique.mockResolvedValue({
      id: "org-1",
      settings: {
        preferredHybridInverterBrands: ["Solis"],
      },
    });

    const quotes = await (botService as any).calculateDistributorKits({
      consumptionKwh: 800,
      cidade: "Maringá",
      estado: "PR",
      roofType: "Metálico",
      gridVoltage: "Trifásico 380V",
      inverterType: "hybrid",
      organizationId: "org-1",
    });

    expect(quotes.length).toBe(3);
    const standard = quotes.find((q: any) => q.distributorId === "kwp-standard");
    const elite = quotes.find((q: any) => q.distributorId === "kwp-elite");
    const premium = quotes.find((q: any) => q.distributorId === "kwp-premium");

    expect(standard.invName).toBe("Solis");
    expect(elite.invName).toBe("Solis");
    expect(premium.invName).toBe("Huawei");
  });
});
