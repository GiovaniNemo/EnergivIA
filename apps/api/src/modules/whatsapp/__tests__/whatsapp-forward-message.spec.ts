/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WhatsappBotService } from "../whatsapp-bot.service";

describe("WhatsApp Bot - Client Forward Message & Integrator Preview", () => {
  let service: WhatsappBotService;
  let mockPrisma: any;
  let mockWhatsappCloud: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockPrisma = {
      conversation: {
        findUnique: vi.fn().mockResolvedValue({ metadata: {} }),
        update: vi.fn().mockResolvedValue({}),
      },
      message: {
        create: vi.fn().mockResolvedValue({ id: "msg-123" }),
      },
    };

    mockWhatsappCloud = {
      sendTextMessage: vi.fn().mockResolvedValue(undefined),
    };

    service = new WhatsappBotService(
      { get: vi.fn().mockReturnValue("https://www.energivia.com.br") } as any,
      mockPrisma,
      mockWhatsappCloud,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
  });

  it("should send integrator preview message and client forward message as two distinct WhatsApp messages", async () => {
    const integratorMsg =
      `*_Proposta Comercial Gerada com Sucesso!_* 📋✨\n\n` +
      `Cliente: *Carlos Silva*\n\n` +
      `*_Link de conferência (exclusivo para você):_* 🔗\n` +
      `https://www.energivia.com.br/proposta/prop-123?preview=true\n\n` +
      `_💡 Abra este link acima para revisar a proposta com segurança. Ele não dispara avisos de visualização._`;

    const clientMsg =
      `Olá, *Carlos Silva*! Tudo bem?\n\n` +
      `Elaborei sua proposta de energia solar sob medida.\n` +
      `https://www.energivia.com.br/proposta/prop-123\n\n` +
      `Qualquer dúvida ou ajuste que precisar, estou à disposição!`;

    const combinedReply = `${integratorMsg}\n---CLIENT_FORWARD_MESSAGE---\n${clientMsg}`;

    // Mock generateBotResponse to return combinedReply
    vi.spyOn(service as any, "generateBotResponse").mockResolvedValue(combinedReply);
    vi.spyOn(service as any, "resolveAuthorizedTenant").mockResolvedValue({ id: "org-123" });
    vi.spyOn(service as any, "isTenantPlanActive").mockResolvedValue({
      active: true,
      planName: "Pro",
    });
    mockPrisma.whatsappInboundMessage = {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
    };
    mockPrisma.conversation.findFirst = vi.fn().mockResolvedValue({
      id: "conv-123",
      organizationId: "org-123",
      channel: "whatsapp",
      title: "5544999998888",
      messages: [],
      metadata: {},
    });

    await (service as any).processSingleMessage({
      message: {
        id: "msg_in_123",
        from: "5544999998888",
        type: "text",
        text: { body: "1" },
      },
      phoneNumberId: "phone-123",
      contactName: "Carlos Silva",
    });

    // Expect 3 messages saved in database (1 incoming user message + 2 outgoing assistant messages)
    expect(mockPrisma.message.create).toHaveBeenCalledTimes(3);
    expect(mockPrisma.message.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          role: "user",
          content: "1",
        }),
      })
    );
    expect(mockPrisma.message.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          role: "assistant",
          content: integratorMsg,
        }),
      })
    );
    expect(mockPrisma.message.create).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        data: expect.objectContaining({
          role: "assistant",
          content: clientMsg,
        }),
      })
    );

    // Expect 2 WhatsApp text messages sent
    expect(mockWhatsappCloud.sendTextMessage).toHaveBeenCalledTimes(2);

    const firstSend = mockWhatsappCloud.sendTextMessage.mock.calls[0][0];
    expect(firstSend.toWaId).toBe("5544999998888");
    expect(firstSend.body).toContain("?preview=true");
    expect(firstSend.body).toContain("não dispara avisos de visualização");

    const secondSend = mockWhatsappCloud.sendTextMessage.mock.calls[1][0];
    expect(secondSend.toWaId).toBe("5544999998888");
    expect(secondSend.body).toContain("Olá, *Carlos Silva*! Tudo bem?");
    expect(secondSend.body).toContain("https://www.energivia.com.br/proposta/prop-123");
    expect(secondSend.body).not.toContain("?preview=true");
    expect(secondSend.body).not.toContain("📲 Mensagem pronta");
  });

  it("should format combined reply with divider in processWebChatMessage", async () => {
    const integratorMsg = "*_Proposta Comercial Gerada com Sucesso!_*";
    const clientMsg = "Olá, *Carlos*! Tudo bem?";
    const combinedReply = `${integratorMsg}\n---CLIENT_FORWARD_MESSAGE---\n${clientMsg}`;

    vi.spyOn(service as any, "generateBotResponse").mockResolvedValue(combinedReply);

    const webReply = await service.processWebChatMessage({
      messages: [],
      incomingText: "1",
      organizationId: "org-1",
    });

    expect(webReply).toContain("*_Proposta Comercial Gerada com Sucesso!_*");
    expect(webReply).toContain("━━━━━━━━━━━━━━━━━━━━");
    expect(webReply).toContain("*Mensagem para encaminhar ao cliente:*");
    expect(webReply).toContain("Olá, *Carlos*! Tudo bem?");
  });
});
