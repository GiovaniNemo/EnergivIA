/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WhatsappBotService } from "../whatsapp-bot.service";
import { GeoIrradianceService } from "../services/geo-irradiance.service";

describe("WhatsApp Bot - Ambiguous vs Unique City Flow", () => {
  let service: WhatsappBotService;
  let mockPrisma: any;
  let mockWhatsappCloud: any;
  let geoIrradiance: GeoIrradianceService;
  let mockKitGeneration: any;

  beforeEach(() => {
    vi.restoreAllMocks();

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
        findMany: vi.fn().mockResolvedValue([{ id: "tpl-123", name: "Modelo Padrão", version: 1 }]),
        findFirst: vi.fn().mockResolvedValue({ id: "tpl-123", name: "Modelo Padrão", version: 1 }),
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

    mockWhatsappCloud = {
      sendTextMessage: vi.fn().mockResolvedValue(undefined),
    };

    geoIrradiance = new GeoIrradianceService();

    mockKitGeneration = {
      generateDistributorTiers: vi.fn().mockResolvedValue({
        tiers: [],
      }),
    };

    service = new WhatsappBotService(
      { get: vi.fn().mockReturnValue("https://www.energivia.com.br") } as any,
      mockPrisma,
      mockWhatsappCloud,
      {} as any,
      {} as any,
      geoIrradiance,
      {} as any,
      mockKitGeneration
    );
  });

  it("should NOT ask for state if city is unique in Brazil (e.g. Maringá -> PR)", async () => {
    const conversation: any = {
      id: "conv-unique",
      organizationId: "org-test",
      title: "Test Unique City",
      metadata: {
        step: "AWAITING_CITY",
        sessionData: { consumptionKwh: 700 },
      },
      messages: [
        {
          role: "assistant",
          content: "Para qual cidade e estado será a instalação? (Ex: Maringá/PR)",
        },
      ],
    };

    const reply = await (service as any).generateBotResponse({
      conversation,
      incomingText: "Maringá",
      extractionResult: null,
    });

    // Cidades de estado único não devem apresentar opções de estado
    expect(reply).toContain("Localização Identificada!");
    expect(reply).toContain("Maringá/PR");
    expect(reply).toContain("Qual o padrão de entrada da instalação?");

    expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "conv-unique" },
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            step: "AWAITING_GRID_TYPE",
            sessionData: expect.objectContaining({
              cidade: "Maringá",
              uf: "PR",
            }),
          }),
        }),
      })
    );
  });

  it("should ask which state when city exists in multiple states and user sends only city name (e.g. Belém)", async () => {
    const conversation: any = {
      id: "conv-ambiguous",
      organizationId: "org-test",
      title: "Test Ambiguous City",
      metadata: {
        step: "AWAITING_CITY",
        sessionData: { consumptionKwh: 700 },
      },
      messages: [
        {
          role: "assistant",
          content: "Para qual cidade e estado será a instalação? (Ex: Maringá/PR)",
        },
      ],
    };

    const reply = await (service as any).generateBotResponse({
      conversation,
      incomingText: "Belém",
      extractionResult: null,
    });

    // Deve detectar ambiguidade e listar as opções de estados (PA, AL, PB), com PA priorizado
    expect(reply).toContain("Belém");
    expect(reply).toContain("1️⃣");
    expect(reply).toContain("PA");
    expect(reply).toContain("AL");
    expect(reply).toContain("PB");
    expect(reply).not.toContain("Qual o padrão de entrada da instalação?");

    expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "conv-ambiguous" },
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            step: "AWAITING_CITY_STATE",
            sessionData: expect.objectContaining({
              consumptionKwh: 700,
              pendingCityCandidates: expect.any(Array),
            }),
          }),
        }),
      })
    );
  });

  it("should select the state when user answers option number in AWAITING_CITY_STATE", async () => {
    const conversation: any = {
      id: "conv-ambiguous-reply",
      organizationId: "org-test",
      title: "Test Ambiguous City Reply",
      metadata: {
        step: "AWAITING_CITY_STATE",
        sessionData: {
          consumptionKwh: 700,
          pendingCityName: "Belém",
          pendingCityCandidates: [
            { city: "Belém", uf: "PA", hsp: 4.86, stateName: "Pará" },
            { city: "Belém", uf: "AL", hsp: 5.25, stateName: "Alagoas" },
            { city: "Belém", uf: "PB", hsp: 5.32, stateName: "Paraíba" },
          ],
        },
      },
      messages: [
        {
          role: "assistant",
          content: "Para qual estado será a instalação? 1️⃣ Belém/PA, 2️⃣ Belém/AL...",
        },
      ],
    };

    const reply = await (service as any).generateBotResponse({
      conversation,
      incomingText: "1",
      extractionResult: null,
    });

    expect(reply).toContain("Localização Identificada!");
    expect(reply).toContain("Belém/PA");
    expect(reply).toContain("Qual o padrão de entrada da instalação?");

    expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "conv-ambiguous-reply" },
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            step: "AWAITING_GRID_TYPE",
            sessionData: expect.objectContaining({
              cidade: "Belém",
              uf: "PA",
            }),
          }),
        }),
      })
    );
  });

  it("should select the state when user answers state acronym (e.g. 'PA') in AWAITING_CITY_STATE", async () => {
    const conversation: any = {
      id: "conv-ambiguous-uf",
      organizationId: "org-test",
      title: "Test Ambiguous City UF Reply",
      metadata: {
        step: "AWAITING_CITY_STATE",
        sessionData: {
          consumptionKwh: 700,
          pendingCityName: "Belém",
          pendingCityCandidates: [
            { city: "Belém", uf: "PA", hsp: 4.86, stateName: "Pará" },
            { city: "Belém", uf: "AL", hsp: 5.25, stateName: "Alagoas" },
            { city: "Belém", uf: "PB", hsp: 5.32, stateName: "Paraíba" },
          ],
        },
      },
      messages: [
        {
          role: "assistant",
          content: "Para qual estado será a instalação? 1️⃣ Belém/PA, 2️⃣ Belém/AL...",
        },
      ],
    };

    const reply = await (service as any).generateBotResponse({
      conversation,
      incomingText: "PA",
      extractionResult: null,
    });

    expect(reply).toContain("Localização Identificada!");
    expect(reply).toContain("Belém/PA");
    expect(reply).toContain("Qual o padrão de entrada da instalação?");
  });

  it("should NOT ask for state if user specifies city with UF initially (e.g. Belém/PA)", async () => {
    const conversation: any = {
      id: "conv-direct-uf",
      organizationId: "org-test",
      title: "Test Direct UF",
      metadata: {
        step: "AWAITING_CITY",
        sessionData: { consumptionKwh: 700 },
      },
      messages: [{ role: "assistant", content: "Para qual cidade e estado será a instalação?" }],
    };

    const reply = await (service as any).generateBotResponse({
      conversation,
      incomingText: "Belém/PA",
      extractionResult: null,
    });

    expect(reply).toContain("Localização Identificada!");
    expect(reply).toContain("Belém/PA");
    expect(reply).toContain("Qual o padrão de entrada da instalação?");
    expect(reply).not.toContain("Para qual estado será a instalação?");
  });

  it("should return to AWAITING_CITY when user types 0 or voltar during state selection", async () => {
    const conversation: any = {
      id: "conv-back-state",
      organizationId: "org-test",
      title: "Test Back from State",
      metadata: {
        step: "AWAITING_CITY_STATE",
        sessionData: {
          consumptionKwh: 700,
          pendingCityName: "Belém",
          pendingCityCandidates: [
            { city: "Belém", uf: "PA", hsp: 4.86, stateName: "Pará" },
            { city: "Belém", uf: "AL", hsp: 5.25, stateName: "Alagoas" },
          ],
        },
      },
      messages: [{ role: "assistant", content: "Para qual estado será a instalação?" }],
    };

    const reply = await (service as any).generateBotResponse({
      conversation,
      incomingText: "0",
      extractionResult: null,
    });

    expect(reply).toContain("Vamos alterar a localização");
    expect(reply).toContain("Para qual cidade e estado será a instalação?");

    expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "conv-back-state" },
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            step: "AWAITING_CITY",
          }),
        }),
      })
    );
  });

  it("should allow user to type a completely new city while in AWAITING_CITY_STATE", async () => {
    const conversation: any = {
      id: "conv-new-city",
      organizationId: "org-test",
      title: "Test New City during State",
      metadata: {
        step: "AWAITING_CITY_STATE",
        sessionData: {
          consumptionKwh: 700,
          pendingCityName: "Belém",
          pendingCityCandidates: [{ city: "Belém", uf: "PA", hsp: 4.86, stateName: "Pará" }],
        },
      },
      messages: [{ role: "assistant", content: "Para qual estado será a instalação?" }],
    };

    const reply = await (service as any).generateBotResponse({
      conversation,
      incomingText: "Maringá",
      extractionResult: null,
    });

    expect(reply).toContain("Localização Identificada!");
    expect(reply).toContain("Maringá/PR");
    expect(reply).toContain("Qual o padrão de entrada da instalação?");
  });

  it("should prompt for state if user specifies consumption with ambiguous city (e.g. 700 kWh em Belém)", async () => {
    const conversation: any = {
      id: "conv-inline-consumption",
      organizationId: "org-test",
      title: "Test Inline Consumption",
      metadata: {
        step: "IDLE",
        sessionData: {},
      },
      messages: [
        { role: "assistant", content: "Qual o consumo médio mensal do seu cliente em kWh?" },
      ],
    };

    const reply = await (service as any).generateBotResponse({
      conversation,
      incomingText: "700 kWh em Belém",
      extractionResult: null,
    });

    expect(reply).toContain("Consumo Registrado");
    expect(reply).toContain("700 kWh/mês");
    expect(reply).toContain("Encontrei mais de um município chamado *Belém*");
    expect(reply).toContain("PA");
    expect(reply).toContain("AL");
    expect(reply).toContain("PB");

    expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "conv-inline-consumption" },
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            step: "AWAITING_CITY_STATE",
            sessionData: expect.objectContaining({
              consumptionKwh: 700,
              pendingCityCandidates: expect.any(Array),
            }),
          }),
        }),
      })
    );
  });

  it("should re-prompt options if user sends unrecognized response in AWAITING_CITY_STATE", async () => {
    const conversation: any = {
      id: "conv-invalid-opt",
      organizationId: "org-test",
      title: "Test Invalid Option",
      metadata: {
        step: "AWAITING_CITY_STATE",
        sessionData: {
          consumptionKwh: 700,
          pendingCityName: "Belém",
          pendingCityCandidates: [
            { city: "Belém", uf: "PA", hsp: 4.86, stateName: "Pará" },
            { city: "Belém", uf: "AL", hsp: 5.25, stateName: "Alagoas" },
          ],
        },
      },
      messages: [{ role: "assistant", content: "Para qual estado será a instalação?" }],
    };

    const reply = await (service as any).generateBotResponse({
      conversation,
      incomingText: "99",
      extractionResult: null,
    });

    expect(reply).toContain("Não identifiquei a opção para *Belém*");
    expect(reply).toContain("Por favor, escolha o estado da instalação");
    expect(reply).toContain("Belém/PA");
    expect(reply).toContain("Belém/AL");
  });
});
