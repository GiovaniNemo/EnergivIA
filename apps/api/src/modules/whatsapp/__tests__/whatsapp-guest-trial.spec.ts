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
          content: "Qual o nome do seu cliente para a proposta comercial?",
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

  describe("Fluxo Real de Cotações de Integradores & Destravamento de PROPOSAL_COMPLETED", () => {
    it("parseIntegratorQuoteEntities deve extrair perfeitamente as entidades dos 5 exemplos reais de integradores", () => {
      // Exemplo 1 (Print 1): "Preciso de uma cotação de 70kwp com estrutura metálica"
      const ex1 = (botService as any).parseIntegratorQuoteEntities(
        "Preciso de uma cotação de 70kwp com estrutura metálica"
      );
      expect(ex1.isQuoteRequest).toBe(true);
      expect(ex1.targetKWp).toBe(70);
      expect(ex1.roofType).toBe("Metálico");

      // Exemplo 2 (Print 2):
      // 18 painéis 620w
      // Inversor 7.5k Saj
      // Telhado madeira fibrocimento
      // Cabos e string box CC
      const ex2 = (botService as any).parseIntegratorQuoteEntities(
        "18 painéis 620w\nInversor 7.5k Saj\nTelhado madeira fibrocimento\nCabos e string box CC"
      );
      expect(ex2.isQuoteRequest).toBe(true);
      expect(ex2.targetModules).toBe(18);
      expect(ex2.modPowerWUser).toBe(620);
      expect(ex2.targetKWp).toBe(11.16);
      expect(ex2.roofType).toBe("Fibrocimento");

      // Exemplo 3 (Print 3):
      // 16 módulos 610
      // 01 híbrido deye 7,5 bifásico
      // 01 bateria
      // Telhado metálico
      const ex3 = (botService as any).parseIntegratorQuoteEntities(
        "16 módulos 610\n01 híbrido deye 7,5 bifásico\n01 bateria\nTelhado metálico"
      );
      expect(ex3.isQuoteRequest).toBe(true);
      expect(ex3.targetModules).toBe(16);
      expect(ex3.modPowerWUser).toBe(610);
      expect(ex3.targetKWp).toBe(9.76);
      expect(ex3.gridVoltage).toBe("Bifásico 127V/220V");
      expect(ex3.hasBattery).toBe(true);
      expect(ex3.roofType).toBe("Metálico");

      // Exemplo 4 (Print 4):
      // Boa tarde amigo
      // Consegue orçar pra mim, 13 placas, 1 deye híbrido 5kw
      // 1 bateria
      //
      // Colonial
      //
      // Entrega em Anitápolis
      const ex4 = (botService as any).parseIntegratorQuoteEntities(
        "Boa tarde amigo\nConsegue orçar pra mim, 13 placas, 1 deye híbrido 5kw\n1 bateria\n\nColonial\n\nEntrega em Anitápolis"
      );
      expect(ex4.isQuoteRequest).toBe(true);
      expect(ex4.targetModules).toBe(13);
      expect(ex4.hasBattery).toBe(true);
      expect(ex4.roofType).toBe("Cerâmica (Colonial)");
      expect(ex4.cidade).toBe("Anitápolis");
      expect(ex4.estado).toBe("SC");

      // Exemplo 5 (Print 5):
      // Orçamento 9.22 Kwp
      // Estrutura fibro madeira
      const ex5 = (botService as any).parseIntegratorQuoteEntities(
        "Orçamento 9.22 Kwp\nEstrutura fibro madeira"
      );
      expect(ex5.isQuoteRequest).toBe(true);
      expect(ex5.targetKWp).toBe(9.22);
      expect(ex5.roofType).toBe("Fibrocimento");
    });

    it("deve destravar PROPOSAL_COMPLETED quando o usuário enviar 'Preciso de uma cotação de 70kwp com estrutura metálica' sem reenviar link antigo", async () => {
      const conversation = {
        id: "conv-completed-1",
        organizationId: "demo-tenant-id",
        metadata: {
          step: "PROPOSAL_COMPLETED",
          isGuestTrial: true,
          trialQuotesUsed: 1,
          trialMaxQuotes: 3,
          lastProposalId: "cmvfdk0cp001as101r9npemew",
        },
        messages: [
          {
            role: "assistant",
            content: "Sua proposta comercial já foi gerada com sucesso! ☀️",
          },
        ],
      };

      const reply = await (botService as any).generateBotResponse({
        conversation,
        incomingText: "Preciso de uma cotação de 70kwp com estrutura metálica",
        contactName: "Carlos",
      });

      // NÃO pode reenviar o link antigo
      expect(reply).not.toContain("Sua proposta mais recente está disponível em");
      // DEVE processar a nova cotação de 70 kWp metálico
      expect(reply).toContain("70 kWp");
      expect(reply).toContain("Metálico");
      expect(reply).toContain("Para qual cidade e estado será a instalação?");
    });

    it("deve pular pergunta de telhado quando o usuário já informou a estrutura anteriormente (fast-forward)", async () => {
      // Conversa onde a potência (70 kWp) e a estrutura (Metálico) já foram registradas
      const conversation = {
        id: "conv-fast-forward",
        organizationId: "demo-tenant-id",
        metadata: {
          step: "AWAITING_CITY",
          kwp: 70,
          roofType: "Metálico",
          billValue: 850,
          isGuestTrial: true,
        },
        messages: [
          {
            role: "user",
            content: "Preciso de uma cotação de 70kwp com estrutura metálica",
          },
          {
            role: "assistant",
            content:
              "*_Potência Solicitada:_* `70 kWp` ☀️\n> 🏠 Estrutura: *Metálico*\n\nPara qual cidade e estado será a instalação?",
          },
        ],
      };

      // Integrador responde a cidade: "Maringá/PR"
      const replyCity = await (botService as any).generateBotResponse({
        conversation,
        incomingText: "Maringá/PR",
        contactName: "Carlos",
      });

      // Reconhece a cidade, mostra que a estrutura já é Metálico, e pergunta a tensão trifásica para o porte de 70 kWp
      expect(replyCity).toContain("Maringá/PR");
      expect(replyCity).toContain("Metálico");
      expect(replyCity).toContain("Qual a tensão da rede trifásica para este sistema de 70 kWp?");

      // Atualiza estado simulado da conversa para AWAITING_GRID_TYPE com telhado Metálico
      conversation.metadata.step = "AWAITING_GRID_TYPE";
      (conversation.metadata as any).cidade = "Maringá";
      (conversation.metadata as any).uf = "PR";
      conversation.messages.push({
        role: "assistant",
        content: replyCity,
      });

      // Integrador responde o padrão elétrico: "2" (Trifásico 380V no prompt específico de grande porte)
      const replyGrid = await (botService as any).generateBotResponse({
        conversation,
        incomingText: "2",
        contactName: "Carlos",
      });

      // O bot NÃO DEVE perguntar o telhado de novo (Qual a estrutura do telhado?), mas deve perguntar a tecnologia do inversor!
      expect(replyGrid).not.toContain("Qual a estrutura do telhado?");
      expect(replyGrid).toContain("Qual tecnologia de inversor você prefere");
      expect(replyGrid).toContain("Metálico");

      conversation.messages.push({
        role: "user",
        content: "2",
      });
      conversation.messages.push({
        role: "assistant",
        content: replyGrid,
      });

      // Integrador escolhe a tecnologia: "1" (String)
      const replyTech = await (botService as any).generateBotResponse({
        conversation,
        incomingText: "1",
        contactName: "Carlos",
      });

      expect(replyTech).toContain("Standard");
      expect(replyTech).toContain("Elite");
      expect(replyTech).toContain("Metálico");
    });

    it("deve processar mensagem de integrador com saudação no início sem cair no menu de boas-vindas", async () => {
      const conversation = {
        id: "conv-greeting-with-quote",
        organizationId: "demo-tenant-id",
        metadata: {
          step: "IDLE",
          isGuestTrial: true,
        },
        messages: [],
      };

      const reply = await (botService as any).generateBotResponse({
        conversation,
        incomingText:
          "Boa tarde amigo\nConsegue orçar pra mim, 13 placas, 1 deye híbrido 5kw\n1 bateria\n\nColonial\n\nEntrega em Anitápolis",
        contactName: "Integrador",
      });

      // NÃO deve responder com o menu de boas-vindas genérico
      expect(reply).not.toContain("Como posso ajudar você a gerar orçamentos hoje?");
      // Deve identificar Anitápolis/SC, telhado Colonial e perguntar a rede
      expect(reply).toContain("Anitápolis/SC");
      expect(reply).toContain("Cerâmica (Colonial)");
    });

    it("deve perguntar se a rede é 220V ou 380V quando a fatura extraída tiver padrão trifásico", async () => {
      const conversation = {
        id: "conv-bill-trifasica",
        organizationId: "demo-tenant-id",
        metadata: {
          step: "IDLE",
          isGuestTrial: true,
        },
        messages: [],
      };

      const mockExtraction = {
        isValidForSizing: true,
        exactAverageKwh: 3450,
        monthCount: 12,
        data: {
          cidade: "Maringá",
          uf: "PR",
          tipo_conexao: "Trifásico",
        },
      };

      const reply = await (botService as any).generateBotResponse({
        conversation,
        incomingText: "[Documento enviado]",
        extractionResult: mockExtraction,
        contactName: "Integrador Solar",
      });

      // Deve identificar a fatura e perguntar se a rede trifásica é 220V ou 380V
      expect(reply).toContain("Fatura Analisada com Precisão!");
      expect(reply).toContain("Trifásico");
      expect(reply).toContain("A rede trifásica da instalação é 220V ou 380V?");
      expect(reply).toContain("Trifásico 220V");
      expect(reply).toContain("Trifásico 380V");
      expect(reply).not.toContain("Qual a estrutura do telhado?");
    });

    it("deve registrar Trifásico 220V quando usuário responder 1 ou 220 na pergunta de tensão da fatura", async () => {
      const conversation = {
        id: "conv-bill-trifasica-resp-220",
        organizationId: "demo-tenant-id",
        metadata: {
          step: "AWAITING_GRID_TYPE",
          cidade: "Maringá",
          uf: "PR",
          consumptionKwh: 3450,
          isGuestTrial: true,
        },
        messages: [
          {
            role: "assistant",
            content:
              "*_A rede trifásica da instalação é 220V ou 380V?_* ⚡\n> 1️⃣ *Trifásico 220V*\n> 2️⃣ *Trifásico 380V*",
          },
        ],
      };

      const reply = await (botService as any).generateBotResponse({
        conversation,
        incomingText: "1",
        contactName: "Integrador Solar",
      });

      // Deve registrar Trifásico 220V e avançar para o telhado
      expect(reply).toContain("Trifásico 220V");
      expect(reply).toContain("Qual a estrutura do telhado?");
    });

    it("deve registrar Trifásico 380V quando usuário responder 2 ou 380 na pergunta de tensão da fatura", async () => {
      const conversation = {
        id: "conv-bill-trifasica-resp-380",
        organizationId: "demo-tenant-id",
        metadata: {
          step: "AWAITING_GRID_TYPE",
          cidade: "Maringá",
          uf: "PR",
          consumptionKwh: 3450,
          isGuestTrial: true,
        },
        messages: [
          {
            role: "assistant",
            content:
              "*_A rede trifásica da instalação é 220V ou 380V?_* ⚡\n> 1️⃣ *Trifásico 220V*\n> 2️⃣ *Trifásico 380V*",
          },
        ],
      };

      const reply = await (botService as any).generateBotResponse({
        conversation,
        incomingText: "380",
        contactName: "Integrador Solar",
      });

      // Deve registrar Trifásico 380V e avançar para o telhado
      expect(reply).toContain("Trifásico 380V");
      expect(reply).toContain("Qual a estrutura do telhado?");
    });

    it("deve orientar entre 220V e 380V quando o usuário responder apenas 'trifasico' em AWAITING_GRID_TYPE", async () => {
      const conversation = {
        id: "conv-generic-trifasico-reply",
        organizationId: "demo-tenant-id",
        metadata: {
          step: "AWAITING_GRID_TYPE",
          cidade: "Maringá",
          uf: "PR",
          kwp: 70,
          roofType: "Metálico",
          isGuestTrial: true,
        },
        messages: [
          {
            role: "assistant",
            content: "*_Qual o padrão de entrada da instalação?_* ⚡",
          },
        ],
      };

      const reply = await (botService as any).generateBotResponse({
        conversation,
        incomingText: "trifasico",
        contactName: "Integrador",
      });

      // O bot não pode dar erro genérico, deve perguntar se é 220V ou 380V
      expect(reply).toContain("A rede trifásica é 220V ou 380V?");
      expect(reply).toContain("Trifásico 220V");
      expect(reply).toContain("Trifásico 380V");
    });
  });

  describe("isTenantPlanActive & Degustação Garantida de 3 Cotações no WhatsApp", () => {
    it("deve permitir cotações no WhatsApp para tenant em teste mesmo com 7 dias úteis expirados se proposalsCount < 3", async () => {
      const mockPrisma = {
        proposal: {
          count: vi.fn().mockResolvedValue(1),
        },
      };

      const bot = new WhatsappBotService(
        { get: vi.fn() } as any,
        mockPrisma as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any
      );

      // Tenant criado há 50 dias (trial da web expirado)
      const expiredTenant = {
        id: "tenant-expired-trial",
        createdAt: new Date("2026-09-01T12:00:00Z"),
        settings: {},
        subscription: null,
      };

      const status = await (bot as any).isTenantPlanActive(expiredTenant);

      expect(status.active).toBe(true);
      expect(mockPrisma.proposal.count).toHaveBeenCalledWith({
        where: { tenantId: "tenant-expired-trial", deletedAt: null },
      });
    });

    it("deve bloquear tenant em teste quando 7 dias úteis expiraram E já atingiu 3 ou mais cotações", async () => {
      const mockPrisma = {
        proposal: {
          count: vi.fn().mockResolvedValue(3),
        },
      };

      const bot = new WhatsappBotService(
        { get: vi.fn() } as any,
        mockPrisma as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any
      );

      const expiredTenant = {
        id: "tenant-expired-trial",
        createdAt: new Date("2026-09-01T12:00:00Z"),
        settings: {},
        subscription: null,
      };

      const status = await (bot as any).isTenantPlanActive(expiredTenant);

      expect(status.active).toBe(false);
      expect(status.reason).toBe("trial_expired");
    });

    it("deve permitir até 20 cotações para tenant em teste não expirado", async () => {
      const mockPrisma = {
        proposal: {
          count: vi.fn().mockResolvedValue(19),
        },
      };

      const bot = new WhatsappBotService(
        { get: vi.fn() } as any,
        mockPrisma as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any
      );

      // Tenant criado hoje
      const freshTenant = {
        id: "tenant-fresh-trial",
        createdAt: new Date(),
        settings: {},
        subscription: null,
      };

      const status = await (bot as any).isTenantPlanActive(freshTenant);

      expect(status.active).toBe(true);
    });

    it("deve bloquear tenant em teste não expirado se atingir 20 cotações", async () => {
      const mockPrisma = {
        proposal: {
          count: vi.fn().mockResolvedValue(20),
        },
      };

      const bot = new WhatsappBotService(
        { get: vi.fn() } as any,
        mockPrisma as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any
      );

      const freshTenant = {
        id: "tenant-fresh-trial",
        createdAt: new Date(),
        settings: {},
        subscription: null,
      };

      const status = await (bot as any).isTenantPlanActive(freshTenant);

      expect(status.active).toBe(false);
      expect(status.reason).toBe("proposal_limit_reached");
    });
  });
});
