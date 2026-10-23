/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { WhatsappBotService } from "../whatsapp-bot.service";

describe("WhatsApp Bot - Inverter Technology Selection Flow", () => {
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
      proposalTemplate: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      proposalTemplateBlueprint: {
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
            name: "Standard",
            inverter_brand: "Growatt",
            inverter_model: "MIN 8000TL-X",
            inverter_power_kw: 8,
            inverter_qty: 1,
            module_brand: "DAH Solar",
            module_model: "585W",
            module_power_w: 585,
            module_qty: 14,
            equipment_total: 18000,
            rate_per_kwp: 3200,
            kit_result: {
              system_power_kw: 8.19,
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

  it("should prompt inverter technology selection after roof structure is chosen", async () => {
    const conversation: any = {
      id: "conv-tech-1",
      organizationId: "org-1",
      metadata: {
        step: "AWAITING_ROOF_TYPE",
        sessionData: {
          consumptionKwh: 800,
          cidade: "Maringá",
          uf: "PR",
          gridType: "Bifásico 127V/220V",
        },
      },
      messages: [
        {
          role: "assistant",
          content: "Qual a estrutura do telhado?\n1️⃣ Cerâmica...\n",
        },
      ],
    };

    const reply = await (botService as any).generateBotResponse({
      conversation,
      incomingText: "1", // Cerâmica
    });

    expect(conversation.metadata.step).toBe("AWAITING_INVERTER_TYPE");
    expect(conversation.metadata.sessionData.roofType).toBe("Cerâmica (Colonial)");
    expect(reply).toContain("Qual tecnologia de inversor você prefere");
    expect(reply).toContain("Inversor Tradicional (String)");
    expect(reply).toContain("Microinversor");
    expect(reply).toContain("Inversor Híbrido");
  });

  it("should transition to AWAITING_KIT_SELECTION with string inverter when user selects option 1 in AWAITING_INVERTER_TYPE", async () => {
    const conversation: any = {
      id: "conv-tech-2",
      organizationId: "org-1",
      metadata: {
        step: "AWAITING_INVERTER_TYPE",
        sessionData: {
          kwp: 8,
          cidade: "Maringá",
          uf: "PR",
          gridType: "Bifásico 127V/220V",
          roofType: "Metálico",
        },
      },
      messages: [
        {
          role: "assistant",
          content: "Qual tecnologia de inversor você prefere para esta cotação? ⚡",
        },
      ],
    };

    const reply = await (botService as any).generateBotResponse({
      conversation,
      incomingText: "1", // Inversor Tradicional (String)
    });

    expect(conversation.metadata.step).toBe("AWAITING_KIT_SELECTION");
    expect(conversation.metadata.sessionData.inverterType).toBe("string");
    expect(reply).toContain("Opção 1 — Standard");
  });

  it("should transition to AWAITING_KIT_SELECTION with microinverter when user selects option 2 in AWAITING_INVERTER_TYPE", async () => {
    const conversation: any = {
      id: "conv-tech-3",
      organizationId: "org-1",
      metadata: {
        step: "AWAITING_INVERTER_TYPE",
        sessionData: {
          kwp: 8,
          cidade: "Maringá",
          uf: "PR",
          gridType: "Bifásico 127V/220V",
          roofType: "Metálico",
        },
      },
      messages: [
        {
          role: "assistant",
          content: "Qual tecnologia de inversor você prefere para esta cotação? ⚡",
        },
      ],
    };

    const reply = await (botService as any).generateBotResponse({
      conversation,
      incomingText: "2", // Microinversor
    });

    expect(conversation.metadata.step).toBe("AWAITING_KIT_SELECTION");
    expect(conversation.metadata.sessionData.inverterType).toBe("microinverter");
    expect(reply).toContain("Opção 1 — Standard");
  });

  it("should transition to AWAITING_BATTERY_STORAGE when user selects option 3 (Híbrido) in AWAITING_INVERTER_TYPE", async () => {
    const conversation: any = {
      id: "conv-tech-4",
      organizationId: "org-1",
      metadata: {
        step: "AWAITING_INVERTER_TYPE",
        sessionData: {
          kwp: 8,
          cidade: "Maringá",
          uf: "PR",
          gridType: "Bifásico 127V/220V",
          roofType: "Metálico",
        },
      },
      messages: [
        {
          role: "assistant",
          content: "Qual tecnologia de inversor você prefere para esta cotação? ⚡",
        },
      ],
    };

    const reply = await (botService as any).generateBotResponse({
      conversation,
      incomingText: "3", // Híbrido
    });

    expect(conversation.metadata.step).toBe("AWAITING_BATTERY_STORAGE");
    expect(conversation.metadata.sessionData.inverterType).toBe("hybrid");
    expect(reply).toContain("armazenamento de bateria desejado");
  });

  it("should return to AWAITING_ROOF_TYPE when user sends 0 in AWAITING_INVERTER_TYPE", async () => {
    const conversation: any = {
      id: "conv-tech-5",
      organizationId: "org-1",
      metadata: {
        step: "AWAITING_INVERTER_TYPE",
        sessionData: {
          kwp: 8,
          cidade: "Maringá",
          uf: "PR",
          gridType: "Bifásico 127V/220V",
          roofType: "Metálico",
        },
      },
      messages: [
        {
          role: "assistant",
          content: "Qual tecnologia de inversor você prefere para esta cotação? ⚡",
        },
      ],
    };

    const reply = await (botService as any).generateBotResponse({
      conversation,
      incomingText: "0",
    });

    expect(conversation.metadata.step).toBe("AWAITING_ROOF_TYPE");
    expect(reply).toContain("estrutura do telhado");
  });

  it("should fast-forward past AWAITING_INVERTER_TYPE if technology was already provided in initial quote", async () => {
    const conversation: any = {
      id: "conv-tech-6",
      organizationId: "org-1",
      metadata: {
        step: "AWAITING_ROOF_TYPE",
        sessionData: {
          kwp: 8,
          cidade: "Maringá",
          uf: "PR",
          gridType: "Bifásico 127V/220V",
          inverterType: "microinverter",
        },
      },
      messages: [
        {
          role: "assistant",
          content: "Qual a estrutura do telhado?\n1️⃣ Cerâmica...\n",
        },
      ],
    };

    const reply = await (botService as any).generateBotResponse({
      conversation,
      incomingText: "3", // Metálico
    });

    expect(conversation.metadata.step).toBe("AWAITING_KIT_SELECTION");
    expect(conversation.metadata.sessionData.roofType).toBe("Metálico");
    expect(conversation.metadata.sessionData.inverterType).toBe("microinverter");
    expect(reply).toContain("Opção 1 — Standard");
  });
});
