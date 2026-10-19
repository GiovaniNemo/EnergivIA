/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  WhatsappGuestTrialService,
  DEMO_TENANT_SLUG,
  DEFAULT_MAX_TRIAL_QUOTES,
} from "../services/whatsapp-guest-trial.service";
import { WhatsappBotService } from "../whatsapp-bot.service";

describe("WhatsappGuestTrialService", () => {
  let service: WhatsappGuestTrialService;
  let mockPrisma: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockPrisma = {
      tenant: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      proposalTemplate: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      conversation: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };
    service = new WhatsappGuestTrialService(mockPrisma);
  });

  describe("getOrCreateDemoTenant", () => {
    it("deve retornar o tenant existente se já existir", async () => {
      const existingTenant = {
        id: "demo-tenant-id",
        slug: DEMO_TENANT_SLUG,
        name: "EnergivIA Demonstração",
        settings: { specialAccessActive: true, defaultKwpRate: 2800 },
      };
      mockPrisma.tenant.findUnique.mockResolvedValue(existingTenant);

      const result = await service.getOrCreateDemoTenant();

      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { slug: DEMO_TENANT_SLUG },
        include: expect.any(Object),
      });
      expect(result).toEqual(existingTenant);
      expect(mockPrisma.tenant.create).not.toHaveBeenCalled();
    });

    it("deve criar o tenant de demonstração se não existir", async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      const createdTenant = {
        id: "new-demo-tenant-id",
        slug: DEMO_TENANT_SLUG,
        name: "EnergivIA Demonstração",
        settings: { specialAccessActive: true, defaultKwpRate: 2800, isDemoTenant: true },
      };
      mockPrisma.tenant.create.mockResolvedValue(createdTenant);

      const result = await service.getOrCreateDemoTenant();

      expect(mockPrisma.tenant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          slug: DEMO_TENANT_SLUG,
          name: "EnergivIA Demonstração",
          settings: expect.objectContaining({
            specialAccessActive: true,
            defaultKwpRate: 2800,
          }),
        }),
        include: expect.any(Object),
      });
      expect(result).toEqual(createdTenant);
    });
  });

  describe("getGuestTrialStatus", () => {
    it("deve retornar 3 cotações disponíveis para conversa sem cotações consumidas", () => {
      const status = service.getGuestTrialStatus({ metadata: {} });
      expect(status.allowed).toBe(true);
      expect(status.trialQuotesUsed).toBe(0);
      expect(status.trialMaxQuotes).toBe(DEFAULT_MAX_TRIAL_QUOTES);
      expect(status.remaining).toBe(3);
    });

    it("deve retornar 2 cotações restantes quando 1 foi consumida", () => {
      const status = service.getGuestTrialStatus({
        metadata: { trialQuotesUsed: 1 },
      });
      expect(status.allowed).toBe(true);
      expect(status.trialQuotesUsed).toBe(1);
      expect(status.remaining).toBe(2);
    });

    it("deve bloquear (allowed: false) quando já utilizou 3 cotações", () => {
      const status = service.getGuestTrialStatus({
        metadata: { trialQuotesUsed: 3 },
      });
      expect(status.allowed).toBe(false);
      expect(status.trialQuotesUsed).toBe(3);
      expect(status.remaining).toBe(0);
    });
  });

  describe("recordProposalCompleted", () => {
    it("deve incrementar trialQuotesUsed e adicionar id da proposta no metadata", async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue({
        id: "conv-1",
        metadata: { trialQuotesUsed: 1, trialCompletedProposalIds: ["prop-1"] },
      });
      mockPrisma.conversation.update.mockResolvedValue({});

      const updated = await service.recordProposalCompleted("conv-1", "prop-2");

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
        where: { id: "conv-1" },
        data: {
          metadata: {
            trialQuotesUsed: 2,
            trialCompletedProposalIds: ["prop-1", "prop-2"],
            isGuestTrial: true,
          },
        },
      });
      expect(updated.trialQuotesUsed).toBe(2);
      expect(updated.remaining).toBe(1);
      expect(updated.allowed).toBe(true);
    });
  });
});

describe("WhatsApp Bot - Formatação de Mensagens e Degustação Trial", () => {
  let botService: WhatsappBotService;
  let mockPrisma: any;
  let mockWhatsappCloud: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockPrisma = {
      tenant: {
        findUnique: vi.fn().mockResolvedValue({
          id: "demo-tenant-id",
          name: "EnergivIA Demonstração",
          slug: "degustacao-whatsapp",
          settings: { specialAccessActive: true, defaultKwpRate: 2800 },
        }),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
      },
      tenantWhatsappInboundPhone: {
        findFirst: vi.fn(),
      },
      conversation: {
        findUnique: vi.fn().mockResolvedValue({ metadata: {} }),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
      },
      message: {
        create: vi.fn().mockResolvedValue({ id: "msg-123" }),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      whatsappInboundMessage: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
      },
      companyCostRule: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      lead: {
        create: vi.fn().mockResolvedValue({ id: "lead-trial-1" }),
      },
      deal: {
        create: vi.fn().mockResolvedValue({ id: "deal-trial-1" }),
      },
      systemSizing: {
        create: vi.fn().mockResolvedValue({ id: "sizing-trial-1" }),
      },
      simulation: {
        create: vi.fn().mockResolvedValue({ id: "sim-trial-1" }),
      },
      proposalTemplate: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ id: "tpl-trial-1", name: "Modelo Oficial EnergivIA", version: 1 }]),
        findFirst: vi
          .fn()
          .mockResolvedValue({ id: "tpl-trial-1", name: "Modelo Oficial EnergivIA", version: 1 }),
      },
      proposalTemplateBlueprint: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      proposal: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "prop-trial-1", proposalNumber: 1 }),
      },
      leadActivityLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    };
    mockWhatsappCloud = {
      sendTextMessage: vi.fn().mockResolvedValue({}),
    };

    botService = new WhatsappBotService(
      { get: vi.fn().mockReturnValue("https://www.energivia.com.br") } as any,
      mockPrisma,
      mockWhatsappCloud,
      { consumePairingCode: vi.fn() } as any,
      {} as any,
      {
        getHsp: vi.fn().mockReturnValue({ city: "Maringá", uf: "PR", hsp: 4.85, exact: true }),
      } as any,
      {} as any,
      {
        generateDistributorTiers: vi.fn().mockResolvedValue({
          tiers: [
            {
              tier_id: "cost_benefit",
              name: "Standard",
              module_qty: 10,
              module_brand: "Canadian Solar",
              module_power_w: 585,
              inverter_brand: "Growatt",
              inverter_power_kw: 5,
              equipment_total: 12500,
              kit_result: {
                system_power_kw: 5.85,
                kit_items: [],
              },
            },
          ],
        }),
      } as any
    );
  });

  it("buildGuestGreetingMenu deve exibir opções verticais, saldo de 3 cotações e EnergivIA sem Solar", () => {
    const menu = botService.buildGuestGreetingMenu("João", 3);

    expect(menu).toMatch(/(?:Olá|Bom dia|Boa tarde|Boa noite) João! Tudo bem\? ☀️/);
    expect(menu).toContain("assistente de vendas e dimensionamento da *_EnergivIA._*");
    expect(menu).not.toContain("EnergivIA Solar");
    expect(menu).toContain("🎁 *Você ganhou 3 cotações completas gratuitas de teste!*");
    expect(menu).toContain("_(Restam 3 cotações no seu teste gratuito)_");

    // Valida opções verticais formatadas em cards
    expect(menu).toContain("> 1️⃣ *Enviar fatura de energia* (PDF ou foto)");
    expect(menu).toContain("> 2️⃣ *Simular por consumo mensal* (ex: `450 kWh`)");
    expect(menu).toContain("> 3️⃣ *Simular por potência de pico* (ex: `5 kWp`)");
    expect(menu).toContain("> 4️⃣ *Simular por quantidade de placas* (ex: `10 módulos`)");
    expect(menu).toContain("Equipe *_EnergivIA._*");
  });

  it("buildGuestGreetingMenu deve atualizar saldo de cotações restantes", () => {
    const menu = botService.buildGuestGreetingMenu("Carlos", 1);
    expect(menu).toContain("_(Restam 1 cotações no seu teste gratuito)_");
  });

  it("buildGreetingMenu padrão não deve conter 'Solar' após 'EnergivIA'", () => {
    const menu = (botService as any).buildGreetingMenu("Maria");
    expect(menu).toContain("assistente de vendas e dimensionamento da *_EnergivIA._*");
    expect(menu).not.toContain("EnergivIA Solar");
    expect(menu).toContain("Equipe *_EnergivIA._*");
  });

  it("buildGuestTrialExceededMessage deve orientar o usuário sobre o fim das 3 cotações e convidar para os planos", () => {
    const exceededMsg = botService.buildGuestTrialExceededMessage();
    expect(exceededMsg).toContain("3 cotações gratuitas de degustação");
    expect(exceededMsg).toContain("https://www.energivia.com.br/gestao/meus-planos");
  });

  it("deve pular seleção de modelo e gerar proposta diretamente em modo degustação quando nome e telefone são informados", async () => {
    const conversation = {
      id: "conv-trial-1",
      organizationId: "demo-tenant-id",
      channel: "whatsapp",
      title: "5544999998888",
      metadata: {
        isGuestTrial: true,
        trialQuotesUsed: 0,
        trialMaxQuotes: 3,
        step: "AWAITING_CLIENT_NAME",
        sessionData: {
          consumptionKwh: 500,
          cidade: "Maringá",
          uf: "PR",
          roofType: "Cerâmica (Colonial)",
        },
      },
      messages: [
        {
          role: "assistant",
          content: "Qual o nome do cliente final para registrarmos no seu CRM?",
        },
      ],
    };

    const reply = await (botService as any).generateBotResponse({
      conversation,
      incomingText: "Ana Clara 44999998888",
      contactName: "Integrador",
    });

    // Não deve perguntar qual modelo de proposta comercial usar (pulou seleção de template)
    expect(reply).not.toContain("Qual modelo de proposta comercial você deseja usar");
    // Deve gerar proposta comercial completa diretamente
    expect(reply).toContain("Proposta Comercial Gerada com Sucesso!");
    expect(reply).toContain("Cliente: *Ana Clara*");
    // Deve incluir contador de degustação [1 de 3]
    expect(reply).toContain("📊 *Cotação [1 de 3] gerada com sucesso!*");
    expect(reply).toContain("_(Você ainda possui 2 cotações gratuitas de teste)_");
    // Assinatura EnergivIA sem Solar
    expect(reply).toContain("Equipe *_EnergivIA._*");
    expect(reply).not.toContain("EnergivIA Solar");
  });

  it("deve pular seleção de modelo e gerar proposta diretamente em modo degustação quando telefone é informado após o nome", async () => {
    const conversation = {
      id: "conv-trial-2",
      organizationId: "demo-tenant-id",
      channel: "whatsapp",
      title: "5544999998888",
      metadata: {
        isGuestTrial: true,
        trialQuotesUsed: 1,
        trialMaxQuotes: 3,
        step: "AWAITING_CLIENT_PHONE",
        sessionData: {
          clientName: "Carlos Pereira",
          consumptionKwh: 400,
          cidade: "Curitiba",
          uf: "PR",
        },
      },
      messages: [
        {
          role: "assistant",
          content:
            "Certo, vou registrar o cliente *Carlos Pereira*. E qual o WhatsApp dele com DDD?",
        },
      ],
    };

    mockPrisma.conversation.findUnique.mockResolvedValueOnce({
      id: "conv-trial-2",
      metadata: conversation.metadata,
    });

    const reply = await (botService as any).generateBotResponse({
      conversation,
      incomingText: "41 98765-4321",
      contactName: "Carlos",
    });

    expect(reply).not.toContain("Qual modelo de proposta comercial você deseja usar");
    expect(reply).toContain("Proposta Comercial Gerada com Sucesso!");
    expect(reply).toContain("Cliente: *Carlos Pereira*");
    expect(reply).toContain("📊 *Cotação [2 de 3] gerada com sucesso!*");
    expect(reply).toContain("_(Você ainda possui 1 cotação gratuita de teste)_");
    expect(reply).toContain("Equipe *_EnergivIA._*");
  });

  it("deve exibir saldo de cotações restantes ao reiniciar a sessão com o comando 'novo'", async () => {
    const conversation = {
      id: "conv-trial-3",
      organizationId: "demo-tenant-id",
      channel: "whatsapp",
      title: "5544999998888",
      metadata: {
        isGuestTrial: true,
        trialQuotesUsed: 1,
        trialMaxQuotes: 3,
        step: "PROPOSAL_COMPLETED",
      },
      messages: [
        {
          role: "assistant",
          content: "Proposta Comercial Gerada com Sucesso!",
        },
      ],
    };

    const reply = await (botService as any).generateBotResponse({
      conversation,
      incomingText: "novo",
      contactName: "Integrador",
    });

    expect(reply).toContain("Vamos iniciar uma nova cotação solar! ☀️");
    expect(reply).toContain("_(Restam 2 cotações no seu teste gratuito)_");
  });

  it("processSingleMessage deve desviar número desconhecido e barrar amigavelmente quando as 3 cotações foram esgotadas", async () => {
    // Simula conversa existente com 3 cotações já utilizadas
    mockPrisma.conversation.findFirst = vi.fn().mockResolvedValue({
      id: "conv-trial-exhausted",
      metadata: {
        isGuestTrial: true,
        trialQuotesUsed: 3,
        trialMaxQuotes: 3,
      },
    });

    await botService.processSingleMessage({
      phoneNumberId: "phone-123",
      fromWaId: "5544888889999",
      message: {
        id: "wa-msg-1",
        from: "5544888889999",
        timestamp: "123456789",
        type: "text",
        text: { body: "Olá" },
      },
    });

    expect(mockWhatsappCloud.sendTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        toWaId: "5544888889999",
        body: expect.stringContaining("3 cotações gratuitas de degustação"),
      })
    );
  });
});
