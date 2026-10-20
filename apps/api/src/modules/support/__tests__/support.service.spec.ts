/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { SupportService } from "../support.service";
import { CreateSupportTicketDto } from "../dto/create-support-ticket.dto";

describe("SupportService", () => {
  let service: SupportService;
  let mockPrisma: any;
  let mockEmailService: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findFirst: vi.fn(),
      },
      platformFeedback: {
        create: vi.fn().mockResolvedValue({ id: "fb-123" }),
      },
    };

    mockEmailService = {
      sendEmail: vi.fn().mockResolvedValue(true),
    };

    service = new SupportService(mockPrisma, mockEmailService);
  });

  it("should generate a valid protocol with TKT prefix", () => {
    const protocol = service.generateProtocol();
    expect(protocol).toMatch(/^TKT-[A-Z0-9]+-\d{4}$/);
  });

  it("should send team email to contato@energivia.com.br and confirmation to client", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({
      id: "user-1",
      name: "João da Silva",
      email: "joao@solar.com.br",
      tenantId: "tenant-1",
      tenant: {
        id: "tenant-1",
        name: "Solar Prime",
        subscription: {
          plan: { name: "Pro" },
        },
      },
    });

    const dto: CreateSupportTicketDto = {
      category: "dificuldade",
      severity: "alta",
      subject: "Erro ao gerar PDF da proposta",
      message: "Quando clico em gerar PDF, a página fica carregando infinitamente.",
      name: "João da Silva",
      email: "joao@solar.com.br",
      phone: "(11) 98765-4321",
      companyName: "Solar Prime",
      attachments: [{ filename: "print_erro.png", url: "https://s3.aws/print.png" }],
      metadata: { page: "/propostas/123", browser: "Chrome 122" },
    };

    const result = await service.createTicket(
      dto,
      { sub: "auth0|123", email: "joao@solar.com.br" } as any,
      "tenant-1"
    );

    expect(result.success).toBe(true);
    expect(result.protocol).toMatch(/^TKT-/);

    // Deve ter chamado sendEmail 2 vezes: equipe e cliente
    expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(2);

    // 1. Chamada para a equipe
    expect(mockEmailService.sendEmail).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        to: "contato@energivia.com.br",
        subject: expect.stringContaining(result.protocol),
        html: expect.stringContaining("Dificuldade Técnica / Bug"),
      })
    );

    // 2. Chamada para o cliente
    expect(mockEmailService.sendEmail).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        to: "joao@solar.com.br",
        subject: expect.stringContaining(result.protocol),
        html: expect.stringContaining(result.protocol),
      })
    );

    // Deve ter persistido na tabela platformFeedback
    expect(mockPrisma.platformFeedback.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          channel: "support_ticket",
          userEmail: "joao@solar.com.br",
          rating: 5,
        }),
      })
    );
  });

  it("should succeed and not throw even if database lookup or feedback saving fails", async () => {
    mockPrisma.user.findFirst.mockRejectedValue(new Error("DB offline"));
    mockPrisma.platformFeedback.create.mockRejectedValue(new Error("Table error"));

    const dto: CreateSupportTicketDto = {
      category: "melhoria",
      subject: "Adicionar filtro por data no radar",
      message: "Gostaria de filtrar usinas homologadas no último mês.",
      name: "Maria Integrador",
      email: "maria@sol.com",
    };

    const result = await service.createTicket(dto);

    expect(result.success).toBe(true);
    expect(result.protocol).toBeDefined();
    // E-mails ainda devem ser disparados
    expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(2);
  });
});
