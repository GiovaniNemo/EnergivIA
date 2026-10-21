/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WhatsappBotService } from "../whatsapp-bot.service";

describe("WhatsApp Bot - Admin Group Alerts Pipeline", () => {
  let service: WhatsappBotService;
  let mockPrisma: any;
  let mockWhatsappCloud: any;
  let mockConfig: any;
  let mockWhatsappPairing: any;

  beforeEach(() => {
    mockPrisma = {
      systemSetting: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        deleteMany: vi.fn(),
      },
      whatsappInboundMessage: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
      tenantWhatsappInboundPhone: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        deleteMany: vi.fn(),
        create: vi.fn(),
      },
      tenant: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    mockWhatsappCloud = {
      sendTextMessage: vi.fn().mockResolvedValue(true),
      fetchAllEvolutionGroups: vi.fn().mockResolvedValue([]),
      registerEvolutionRawMessage: vi.fn(),
      registerMediaBuffer: vi.fn(),
    };

    mockConfig = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === "WHATSAPP_PHONE_NUMBER_ID") return "phone-123";
        return null;
      }),
    };

    mockWhatsappPairing = {
      consumePairingCode: vi.fn().mockReturnValue(null),
    };

    service = new WhatsappBotService(
      mockConfig,
      mockPrisma,
      mockWhatsappCloud,
      mockWhatsappPairing,
      {} as any, // aiUsage
      {} as any, // geoIrradiance
      {} as any, // billExtractor
      {} as any // kitGeneration
    );
  });

  it("should activate group on #ativar-alertas and reply with confirmation message", async () => {
    mockPrisma.systemSetting.findUnique.mockResolvedValue(null);

    const payload = {
      event: "messages.upsert",
      instance: "energiv-bot",
      data: {
        key: {
          remoteJid: "1203630283921938@g.us",
          fromMe: false,
          id: "MSG_001",
        },
        pushName: "Giovani",
        message: {
          conversation: "#ativar-alertas",
        },
      },
    };

    await service.handleEvolutionWebhookPayload(payload);

    expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith({
      where: { key: "ADMIN_WHATSAPP_ALERT_GROUP_JID" },
      update: { value: "1203630283921938@g.us" },
      create: { key: "ADMIN_WHATSAPP_ALERT_GROUP_JID", value: "1203630283921938@g.us" },
    });

    expect(mockWhatsappCloud.sendTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        toWaId: "1203630283921938@g.us",
        body: expect.stringContaining("GRUPO DE ALERTAS ENERGIVIA ATIVADO COM SUCESSO!"),
      })
    );
  });

  it("should reply politely if group is ALREADY active when #ativar-alertas is sent", async () => {
    mockPrisma.systemSetting.findUnique.mockResolvedValue({
      key: "ADMIN_WHATSAPP_ALERT_GROUP_JID",
      value: "1203630283921938@g.us",
    });

    const payload = {
      event: "messages.upsert",
      instance: "energiv-bot",
      data: {
        key: {
          remoteJid: "1203630283921938@g.us",
          fromMe: true, // FromMe allowed
          id: "MSG_002",
        },
        pushName: "Admin",
        message: {
          conversation: "#ativar-alertas",
        },
      },
    };

    await service.handleEvolutionWebhookPayload(payload);

    // Should NOT re-upsert
    expect(mockPrisma.systemSetting.upsert).not.toHaveBeenCalled();

    // MUST reply to reassure the user
    expect(mockWhatsappCloud.sendTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        toWaId: "1203630283921938@g.us",
        body: expect.stringContaining("ESTE GRUPO JÁ ESTÁ ATIVO COMO O CANAL DE ALERTAS!"),
      })
    );
  });

  it("should warn about conflict if another group is already registered, suggesting force flag", async () => {
    mockPrisma.systemSetting.findUnique.mockResolvedValue({
      key: "ADMIN_WHATSAPP_ALERT_GROUP_JID",
      value: "old_group@g.us",
    });

    const payload = {
      event: "messages.upsert",
      instance: "energiv-bot",
      data: {
        key: {
          remoteJid: "new_group@g.us",
          fromMe: false,
          id: "MSG_003",
        },
        message: {
          conversation: "#ativar-alertas",
        },
      },
    };

    await service.handleEvolutionWebhookPayload(payload);

    expect(mockPrisma.systemSetting.upsert).not.toHaveBeenCalled();
    expect(mockWhatsappCloud.sendTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        toWaId: "new_group@g.us",
        body: expect.stringContaining("#ativar-alertas-force"),
      })
    );
  });

  it("should overwrite group when #ativar-alertas-force is sent", async () => {
    mockPrisma.systemSetting.findUnique.mockResolvedValue({
      key: "ADMIN_WHATSAPP_ALERT_GROUP_JID",
      value: "old_group@g.us",
    });

    const payload = {
      event: "messages.upsert",
      instance: "energiv-bot",
      data: {
        key: {
          remoteJid: "new_group@g.us",
          fromMe: false,
          id: "MSG_004",
        },
        message: {
          conversation: "#ativar-alertas-force",
        },
      },
    };

    await service.handleEvolutionWebhookPayload(payload);

    expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith({
      where: { key: "ADMIN_WHATSAPP_ALERT_GROUP_JID" },
      update: { value: "new_group@g.us" },
      create: { key: "ADMIN_WHATSAPP_ALERT_GROUP_JID", value: "new_group@g.us" },
    });

    expect(mockWhatsappCloud.sendTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        toWaId: "new_group@g.us",
        body: expect.stringContaining("GRUPO DE ALERTAS ENERGIVIA ATIVADO COM SUCESSO!"),
      })
    );
  });

  it("should send test alert on #teste-alerta in group", async () => {
    const payload = {
      event: "messages.upsert",
      instance: "energiv-bot",
      data: {
        key: {
          remoteJid: "1203630283921938@g.us",
          fromMe: false,
          id: "MSG_TEST",
        },
        message: {
          conversation: "#teste-alerta",
        },
      },
    };

    await service.handleEvolutionWebhookPayload(payload);

    expect(mockWhatsappCloud.sendTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        toWaId: "1203630283921938@g.us",
        body: expect.stringContaining("TESTE DE ALERTA OPERACIONAL ENERGIVIA"),
      })
    );
  });

  it("should send status on #status-alertas in group", async () => {
    mockPrisma.systemSetting.findUnique.mockResolvedValue({
      key: "ADMIN_WHATSAPP_ALERT_GROUP_JID",
      value: "1203630283921938@g.us",
    });

    const payload = {
      event: "messages.upsert",
      instance: "energiv-bot",
      data: {
        key: {
          remoteJid: "1203630283921938@g.us",
          fromMe: false,
          id: "MSG_STATUS",
        },
        message: {
          conversation: "#status-alertas",
        },
      },
    };

    await service.handleEvolutionWebhookPayload(payload);

    expect(mockWhatsappCloud.sendTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        toWaId: "1203630283921938@g.us",
        body: expect.stringContaining("STATUS DO CANAL DE ALERTAS"),
      })
    );
  });

  it("should deactive group on #desativar-alertas", async () => {
    const payload = {
      event: "messages.upsert",
      instance: "energiv-bot",
      data: {
        key: {
          remoteJid: "1203630283921938@g.us",
          fromMe: false,
          id: "MSG_DEACT",
        },
        message: {
          conversation: "#desativar-alertas",
        },
      },
    };

    await service.handleEvolutionWebhookPayload(payload);

    expect(mockPrisma.systemSetting.deleteMany).toHaveBeenCalledWith({
      where: { key: "ADMIN_WHATSAPP_ALERT_GROUP_JID" },
    });
    expect(mockWhatsappCloud.sendTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        toWaId: "1203630283921938@g.us",
        body: expect.stringContaining("CANAL DE ALERTAS DESATIVADO COM SUCESSO!"),
      })
    );
  });

  it("should ignore normal chatter in groups without sending messages", async () => {
    const payload = {
      event: "messages.upsert",
      instance: "energiv-bot",
      data: {
        key: {
          remoteJid: "1203630283921938@g.us",
          fromMe: false,
          id: "MSG_CHAT",
        },
        message: {
          conversation: "Bom dia equipe, como estão?",
        },
      },
    };

    await service.handleEvolutionWebhookPayload(payload);

    expect(mockWhatsappCloud.sendTextMessage).not.toHaveBeenCalled();
    expect(mockPrisma.systemSetting.upsert).not.toHaveBeenCalled();
  });

  it("should reply with group guidance if #ativar-alertas is sent in private 1:1 chat", async () => {
    const payload = {
      event: "messages.upsert",
      instance: "energiv-bot",
      data: {
        key: {
          remoteJid: "5544999998888@s.whatsapp.net",
          fromMe: false,
          id: "MSG_PRIVATE_ACT",
        },
        pushName: "Giovani",
        message: {
          conversation: "#ativar-alertas",
        },
      },
    };

    await service.handleEvolutionWebhookPayload(payload);

    expect(mockWhatsappCloud.sendTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        toWaId: "5544999998888",
        body: expect.stringContaining("Ativação de Alertas Operacionais"),
      })
    );
  });
});
