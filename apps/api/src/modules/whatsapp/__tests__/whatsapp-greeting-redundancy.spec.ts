/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WhatsappBotService } from "../whatsapp-bot.service";

describe("WhatsApp Bot - Greeting Redundancy and Menu Debounce", () => {
  let service: WhatsappBotService;
  let mockPrisma: any;
  let mockWhatsappCloud: any;
  let mockGeoIrradiance: any;
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
      proposalTemplate: {
        findMany: vi.fn().mockResolvedValue([{ id: "tpl-1", name: "Modelo Padrão", version: 1 }]),
        findFirst: vi.fn().mockResolvedValue({ id: "tpl-1", name: "Modelo Padrão", version: 1 }),
      },
      proposalTemplateBlueprint: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    mockWhatsappCloud = {
      sendTextMessage: vi.fn().mockResolvedValue(true),
    };

    mockGeoIrradiance = {
      getHspForCity: vi.fn().mockReturnValue({ hsp: 4.8, city: "Curitiba", uf: "PR", exact: true }),
    };

    mockKitGeneration = {
      generateKitsForSizing: vi.fn().mockResolvedValue([]),
    };

    service = new WhatsappBotService(
      { get: vi.fn() } as any,
      mockPrisma,
      mockWhatsappCloud,
      {} as any,
      {} as any,
      mockGeoIrradiance,
      {} as any,
      mockKitGeneration,
      undefined,
      undefined
    );
  });

  it("deve enviar o Menu Inicial completo no primeiro 'Oi'", async () => {
    const conversation: any = {
      id: "conv-1",
      organizationId: "org-1",
      title: "559885654211",
      messages: [],
      metadata: { contactName: "Newton" },
    };

    const reply = await (service as any).generateBotResponse({
      conversation,
      incomingText: "Oi",
      extractionResult: null,
      contactName: "Newton",
    });

    expect(reply).toContain("Como posso ajudar você a gerar orçamentos hoje?");
    expect(reply).toContain("1️⃣ *Enviar fatura de energia*");
    expect(reply).toContain("2️⃣ *Simular por consumo mensal*");
    expect(reply).toContain("Newton");
  });

  it("NÃO deve repetir o Menu Inicial quando o usuário enviar 'Boa tarde' logo após o menu ter sido exibido", async () => {
    const menuMsg = (service as any).buildGreetingMenu("Newton");

    const conversation: any = {
      id: "conv-1",
      organizationId: "org-1",
      title: "559885654211",
      messages: [
        { role: "user", content: "Oi" },
        { role: "assistant", content: menuMsg },
      ],
      metadata: { contactName: "Newton" },
    };

    const reply = await (service as any).generateBotResponse({
      conversation,
      incomingText: "Boa tarde",
      extractionResult: null,
      contactName: "Newton",
    });

    // Não deve conter a lista inteira de opções duplicadas
    expect(reply).not.toContain("1️⃣ *Enviar fatura de energia*");
    expect(reply).not.toContain("2️⃣ *Simular por consumo mensal*");
    // Deve conter resposta curta e amigável orientando a escolher uma das opções acima
    expect(reply).toContain("Olá, *Newton*! ☀️");
    expect(reply).toContain("Pode responder com o número da opção desejada acima *(1 a 4)*");
  });

  it("deve reexibir o Menu Inicial completo se o usuário pedir explicitamente 'menu' ou 'novo'", async () => {
    const menuMsg = (service as any).buildGreetingMenu("Newton");

    const conversation: any = {
      id: "conv-1",
      organizationId: "org-1",
      title: "559885654211",
      messages: [
        { role: "user", content: "Oi" },
        { role: "assistant", content: menuMsg },
      ],
      metadata: { contactName: "Newton" },
    };

    const reply = await (service as any).generateBotResponse({
      conversation,
      incomingText: "menu",
      extractionResult: null,
      contactName: "Newton",
    });

    expect(reply).toContain("Como posso ajudar você a gerar orçamentos hoje?");
    expect(reply).toContain("1️⃣ *Enviar fatura de energia*");
  });
});
