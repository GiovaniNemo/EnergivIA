/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationsService } from "../notifications.service";

describe("NotificationsService - handlePublicProposalView limits", () => {
  let service: NotificationsService;
  let mockPrisma: any;
  let mockConfig: any;
  let mockLeadActivityLog: any;
  let mockEmailService: any;
  let mockWhatsappCloud: any;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
      proposal: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      organizationMember: {
        findMany: vi.fn().mockResolvedValue([{ userId: "user-commercial-1" }]),
      },
      userNotification: {
        create: vi.fn().mockResolvedValue({ id: "notif-1" }),
      },
      tenant: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    mockConfig = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === "PUBLIC_WEB_APP_BASE_URL") return "https://app.energivia.com.br";
        return null;
      }),
    };

    mockLeadActivityLog = {
      append: vi.fn().mockResolvedValue(undefined),
    };

    mockEmailService = {
      send: vi.fn().mockResolvedValue(undefined),
    };

    mockWhatsappCloud = {
      sendTextMessage: vi.fn().mockResolvedValue(undefined),
    };

    service = new NotificationsService(
      mockPrisma,
      mockConfig,
      mockLeadActivityLog,
      mockEmailService,
      mockWhatsappCloud
    );
  });

  const baseProposal = {
    id: "prop-123",
    tenantId: "tenant-abc",
    dealId: "deal-1",
    title: "Proposta Solar Residencial",
    status: "SENT",
    deal: {
      id: "deal-1",
      deletedAt: null,
      lead: { id: "lead-1", name: "João Silva" },
    },
    tenant: { name: "Solar Express" },
  };

  it("deve disparar notificação na 1ª visualização (clientViewCount = 1)", async () => {
    mockPrisma.proposal.findFirst.mockResolvedValue({
      ...baseProposal,
      clientViewCount: 0,
      clientLastViewedAt: null,
    });
    mockPrisma.proposal.update.mockResolvedValue({
      ...baseProposal,
      clientViewCount: 1,
      status: "VIEWED",
    });

    await service.handlePublicProposalView("prop-123");

    expect(mockPrisma.userNotification.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.userNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "PROPOSAL_VIEWED",
          title: expect.stringContaining("João Silva está visualizando a proposta!"),
        }),
      })
    );
    expect(mockLeadActivityLog.append).toHaveBeenCalledTimes(1);
  });

  it("deve disparar notificação na 2ª visualização (clientViewCount = 2)", async () => {
    mockPrisma.proposal.findFirst.mockResolvedValue({
      ...baseProposal,
      clientViewCount: 1,
      clientLastViewedAt: new Date(Date.now() - 60_000), // 1 minuto atrás
    });
    mockPrisma.proposal.update.mockResolvedValue({
      ...baseProposal,
      clientViewCount: 2,
      status: "VIEWED",
    });

    await service.handlePublicProposalView("prop-123");

    expect(mockPrisma.userNotification.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.userNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "PROPOSAL_REVISITED",
          title: expect.stringContaining("João Silva está visualizando a proposta novamente!"),
          message: expect.stringContaining("(2ª visualização)"),
        }),
      })
    );
    expect(mockLeadActivityLog.append).toHaveBeenCalledTimes(1);
  });

  it("NÃO deve disparar notificação na 3ª visualização (clientViewCount = 3)", async () => {
    mockPrisma.proposal.findFirst.mockResolvedValue({
      ...baseProposal,
      clientViewCount: 2,
      clientLastViewedAt: new Date(Date.now() - 60_000),
    });
    mockPrisma.proposal.update.mockResolvedValue({
      ...baseProposal,
      clientViewCount: 3,
      status: "VIEWED",
    });

    await service.handlePublicProposalView("prop-123");

    expect(mockPrisma.userNotification.create).not.toHaveBeenCalled();
    expect(mockLeadActivityLog.append).not.toHaveBeenCalled();
  });

  it("NÃO deve disparar notificação na 4ª visualização (clientViewCount = 4)", async () => {
    mockPrisma.proposal.findFirst.mockResolvedValue({
      ...baseProposal,
      clientViewCount: 3,
      clientLastViewedAt: new Date(Date.now() - 60_000),
    });
    mockPrisma.proposal.update.mockResolvedValue({
      ...baseProposal,
      clientViewCount: 4,
      status: "VIEWED",
    });

    await service.handlePublicProposalView("prop-123");

    expect(mockPrisma.userNotification.create).not.toHaveBeenCalled();
    expect(mockLeadActivityLog.append).not.toHaveBeenCalled();
  });

  it("deve disparar notificação na 5ª visualização (clientViewCount = 5)", async () => {
    mockPrisma.proposal.findFirst.mockResolvedValue({
      ...baseProposal,
      clientViewCount: 4,
      clientLastViewedAt: new Date(Date.now() - 60_000),
    });
    mockPrisma.proposal.update.mockResolvedValue({
      ...baseProposal,
      clientViewCount: 5,
      status: "VIEWED",
    });

    await service.handlePublicProposalView("prop-123");

    expect(mockPrisma.userNotification.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.userNotification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "PROPOSAL_REVISITED",
          title: expect.stringContaining("João Silva está visualizando a proposta novamente!"),
          message: expect.stringContaining("(5ª visualização)"),
        }),
      })
    );
    expect(mockLeadActivityLog.append).toHaveBeenCalledTimes(1);
  });

  it("NÃO deve disparar notificação na 6ª visualização em diante (clientViewCount = 6)", async () => {
    mockPrisma.proposal.findFirst.mockResolvedValue({
      ...baseProposal,
      clientViewCount: 5,
      clientLastViewedAt: new Date(Date.now() - 60_000),
    });
    mockPrisma.proposal.update.mockResolvedValue({
      ...baseProposal,
      clientViewCount: 6,
      status: "VIEWED",
    });

    await service.handlePublicProposalView("prop-123");

    expect(mockPrisma.userNotification.create).not.toHaveBeenCalled();
    expect(mockLeadActivityLog.append).not.toHaveBeenCalled();
  });

  it("deve ignorar requisições duplicadas/rápidas (< 15 segundos) sem incrementar contagem", async () => {
    mockPrisma.proposal.findFirst.mockResolvedValue({
      ...baseProposal,
      clientViewCount: 1,
      clientLastViewedAt: new Date(Date.now() - 3_000), // apenas 3 segundos atrás
    });

    await service.handlePublicProposalView("prop-123");

    expect(mockPrisma.proposal.update).not.toHaveBeenCalled();
    expect(mockPrisma.userNotification.create).not.toHaveBeenCalled();
  });
});
