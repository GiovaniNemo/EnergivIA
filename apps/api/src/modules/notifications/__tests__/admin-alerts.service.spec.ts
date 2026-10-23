/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { AdminAlertsService } from "../admin-alerts.service";

describe("AdminAlertsService", () => {
  let service: AdminAlertsService;
  let mockPrisma: any;
  let mockConfig: any;
  let mockWhatsappCloud: any;

  beforeEach(() => {
    mockPrisma = {
      systemSetting: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
    };

    mockConfig = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === "WHATSAPP_PHONE_NUMBER_ID") return "phone-123";
        return null;
      }),
    };

    mockWhatsappCloud = {
      sendTextMessage: vi.fn().mockResolvedValue(true),
    };

    service = new AdminAlertsService(mockPrisma, mockConfig, mockWhatsappCloud);
  });

  it("should get alert group JID from database first", async () => {
    mockPrisma.systemSetting.findUnique.mockResolvedValue({
      key: AdminAlertsService.GROUP_SETTING_KEY,
      value: "1203630283921938@g.us",
    });

    const jid = await service.getAlertGroupJid();
    expect(jid).toBe("1203630283921938@g.us");
    expect(mockPrisma.systemSetting.findUnique).toHaveBeenCalledWith({
      where: { key: AdminAlertsService.GROUP_SETTING_KEY },
    });
  });

  it("should fallback to env variable if not in database", async () => {
    mockPrisma.systemSetting.findUnique.mockResolvedValue(null);
    mockConfig.get.mockImplementation((key: string) => {
      if (key === "ADMIN_WHATSAPP_ALERT_GROUP_JID") return "env-group@g.us";
      return null;
    });

    const jid = await service.getAlertGroupJid();
    expect(jid).toBe("env-group@g.us");
  });

  it("should save alert group JID in system settings", async () => {
    await service.setAlertGroupJid("1203630283921938@g.us");
    expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith({
      where: { key: AdminAlertsService.GROUP_SETTING_KEY },
      update: { value: "1203630283921938@g.us" },
      create: { key: AdminAlertsService.GROUP_SETTING_KEY, value: "1203630283921938@g.us" },
    });
  });

  it("should lock alert group once configured and reject changing to another group without force", async () => {
    mockPrisma.systemSetting.findUnique.mockResolvedValue({
      key: AdminAlertsService.GROUP_SETTING_KEY,
      value: "1203630283921938@g.us",
    });

    const success = await service.setAlertGroupJid("999999999999@g.us");
    expect(success).toBe(false);
    expect(mockPrisma.systemSetting.upsert).not.toHaveBeenCalled();

    const isLocked = await service.isAlertGroupLocked();
    expect(isLocked).toBe(true);
  });

  it("should send support ticket notification to group", async () => {
    mockPrisma.systemSetting.findUnique.mockResolvedValue({
      key: AdminAlertsService.GROUP_SETTING_KEY,
      value: "1203630283921938@g.us",
    });

    const result = await service.notifySupportTicket({
      protocol: "TKT-123",
      category: "dificuldade",
      severity: "alta",
      subject: "Erro ao exportar PDF",
      message: "O botão de exportar não responde.",
      name: "João Silva",
      email: "joao@solar.com",
      phone: "(44) 99999-8888",
      companyName: "Solar Prime",
      userPlan: "PRO",
    });

    expect(result).toBe(true);
    expect(mockWhatsappCloud.sendTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        toWaId: "1203630283921938@g.us",
        body: expect.stringContaining("#TKT-123"),
      })
    );
    expect(mockWhatsappCloud.sendTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("Dificuldade Técnica / Bug"),
      })
    );
  });

  it("should send new user registration notification to group", async () => {
    mockPrisma.systemSetting.findUnique.mockResolvedValue({
      key: AdminAlertsService.GROUP_SETTING_KEY,
      value: "1203630283921938@g.us",
    });

    const result = await service.notifyNewUserRegistration({
      name: "Carlos Integrador",
      email: "carlos@solar.com",
      phone: "(11) 98888-7777",
      companyName: "Carlos Solar",
    });

    expect(result).toBe(true);
    expect(mockWhatsappCloud.sendTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        toWaId: "1203630283921938@g.us",
        body: expect.stringContaining("Carlos Integrador"),
      })
    );
    expect(mockWhatsappCloud.sendTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("wa.me/5511988887777"),
      })
    );
  });

  it("should send onboarding abandoned notification with wa.me link to group", async () => {
    mockPrisma.systemSetting.findUnique.mockResolvedValue({
      key: AdminAlertsService.GROUP_SETTING_KEY,
      value: "1203630283921938@g.us",
    });

    const result = await service.notifyOnboardingAbandoned({
      name: "Mariana Solar",
      email: "mariana@solar.com",
      phone: "(44) 99999-1234",
      step: 1,
    });

    expect(result).toBe(true);
    expect(mockWhatsappCloud.sendTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        toWaId: "1203630283921938@g.us",
        body: expect.stringContaining("CADASTRO NÃO FINALIZADO (ABANDONO)"),
      })
    );
    expect(mockWhatsappCloud.sendTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("wa.me/5544999991234"),
      })
    );
    expect(mockWhatsappCloud.sendTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("Um novo integrador acabou de criar conta na EnergivIA:"),
      })
    );
    expect(mockWhatsappCloud.sendTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.not.stringContaining("no EnergivIA"),
      })
    );
  });

  it("should send checkout initiated notification to group", async () => {
    mockPrisma.systemSetting.findUnique.mockResolvedValue({
      key: AdminAlertsService.GROUP_SETTING_KEY,
      value: "1203630283921938@g.us",
    });

    const result = await service.notifyCheckoutInitiated({
      tenantName: "Solartech",
      customerName: "Ana Santos",
      customerEmail: "ana@solartech.com",
      planName: "Profissional",
      planPrice: 199.9,
    });

    expect(result).toBe(true);
    expect(mockWhatsappCloud.sendTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        toWaId: "1203630283921938@g.us",
        body: expect.stringContaining("TENTATIVA DE PAGAMENTO (CHECKOUT INICIADO)"),
      })
    );
  });

  it("should send payment completed notification to group", async () => {
    mockPrisma.systemSetting.findUnique.mockResolvedValue({
      key: AdminAlertsService.GROUP_SETTING_KEY,
      value: "1203630283921938@g.us",
    });

    const result = await service.notifyPaymentCompleted({
      tenantName: "Solartech",
      customerName: "Ana Santos",
      customerEmail: "ana@solartech.com",
      planName: "Profissional",
      amount: 19990,
    });

    expect(result).toBe(true);
    expect(mockWhatsappCloud.sendTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        toWaId: "1203630283921938@g.us",
        body: expect.stringContaining("PAGAMENTO CONFIRMADO!"),
      })
    );
  });

  it("should allow updating alert group when force=true even if already locked", async () => {
    mockPrisma.systemSetting.findUnique.mockResolvedValue({
      key: AdminAlertsService.GROUP_SETTING_KEY,
      value: "1203630283921938@g.us",
    });

    const success = await service.setAlertGroupJid("999999999999@g.us", true);
    expect(success).toBe(true);
    expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith({
      where: { key: AdminAlertsService.GROUP_SETTING_KEY },
      update: { value: "999999999999@g.us" },
      create: { key: AdminAlertsService.GROUP_SETTING_KEY, value: "999999999999@g.us" },
    });
  });

  it("should format location in new registration notification when city/state are provided", async () => {
    mockPrisma.systemSetting.findUnique.mockResolvedValue({
      key: AdminAlertsService.GROUP_SETTING_KEY,
      value: "1203630283921938@g.us",
    });

    const result = await service.notifyNewUserRegistration({
      name: "Carlos Ferreira",
      email: "carlos@sol.com",
      companyName: "Sol Forte",
      city: "Maringá",
      state: "PR",
    });

    expect(result).toBe(true);
    expect(mockWhatsappCloud.sendTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        toWaId: "1203630283921938@g.us",
        body: expect.stringContaining("• *Localização:* Maringá/PR"),
      })
    );
  });

  it("should suppress duplicate registration alerts for the same email within 10 minutes", async () => {
    mockPrisma.systemSetting.findUnique.mockResolvedValue({
      key: AdminAlertsService.GROUP_SETTING_KEY,
      value: "1203630283921938@g.us",
    });

    const firstResult = await service.notifyNewUserRegistration({
      name: "Vinicius Santos",
      email: "vinicius@teste.com",
    });
    expect(firstResult).toBe(true);
    expect(mockWhatsappCloud.sendTextMessage).toHaveBeenCalledTimes(1);

    const secondResult = await service.notifyNewUserRegistration({
      name: "Vinicius Santos",
      email: "vinicius@teste.com",
      companyName: "Vinicius Solar",
    });
    expect(secondResult).toBe(true);
    expect(mockWhatsappCloud.sendTextMessage).toHaveBeenCalledTimes(1);
  });
});
