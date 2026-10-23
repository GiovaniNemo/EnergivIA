/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WhatsappBotService, parseIntegratorQuoteEntities } from "../whatsapp-bot.service";

describe("WhatsApp Bot - Cotação Completa e Avanço Direto (Texto e Áudio)", () => {
  let service: WhatsappBotService;
  let mockConfig: any;
  let mockPrisma: any;
  let mockWhatsappCloud: any;
  let mockAiUsage: any;
  let mockBillExtractor: any;
  let mockGeoIrradiance: any;

  beforeEach(() => {
    vi.restoreAllMocks();

    mockConfig = {
      get: vi.fn((key: string) => {
        if (key === "GEMINI_API_KEY") return "fake-gemini-key";
        return "";
      }),
    };

    mockPrisma = {
      conversation: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
      },
      message: {
        create: vi.fn().mockResolvedValue({ id: "msg-1" }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      proposal: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    mockWhatsappCloud = {
      sendTextMessage: vi.fn().mockResolvedValue(true),
    };

    mockAiUsage = {
      logUsage: vi.fn().mockResolvedValue(undefined),
    };

    mockBillExtractor = {
      parseBillTextWithAI: vi.fn(),
    };

    mockGeoIrradiance = {
      getHsp: vi.fn((cidade: string, estado?: string) => {
        return {
          hsp: 4.88,
          city: cidade || "Maringá",
          uf: estado || "PR",
          exact: true,
          ambiguous: false,
        };
      }),
    };

    service = new WhatsappBotService(
      mockConfig,
      mockPrisma,
      mockWhatsappCloud,
      mockGeoIrradiance,
      mockAiUsage,
      {} as any,
      mockBillExtractor,
      {} as any
    );

    // Mock de kits de distribuidores
    vi.spyOn(service as any, "calculateDistributorKits").mockResolvedValue([
      {
        distributor: "Edsun",
        tier: "Standard",
        tierLabel: "Standard (Mais Recomendado)",
        systemPowerKwp: 12.0,
        estimatedMonthlyKwh: 1400,
        modules: [{ quantity: 20, model: "DAH Solar 600W", powerW: 600 }],
        inverters: [{ quantity: 1, model: "Growatt 12kW Tri 220V", powerKw: 12 }],
        totalPrice: 28000,
      },
      {
        distributor: "Edsun",
        tier: "Elite",
        tierLabel: "Elite",
        systemPowerKwp: 12.0,
        estimatedMonthlyKwh: 1400,
        modules: [{ quantity: 20, model: "Canadian Solar 600W", powerW: 600 }],
        inverters: [{ quantity: 1, model: "Deye 12kW Tri 220V", powerKw: 12 }],
        totalPrice: 31000,
      },
    ]);
  });

  describe("1. Parser de Entidades - parseIntegratorQuoteEntities", () => {
    it("deve extrair potência, estrutura, tensão e cidade/UF da mensagem do print: 'Faz orçamento 12kwp fibromadeira 220v maringa pr'", () => {
      const input = "Faz orçamento 12kwp fibromadeira 220v maringa pr";
      const result = parseIntegratorQuoteEntities(input);

      expect(result.isQuoteRequest).toBe(true);
      expect(result.targetKWp).toBe(12);
      expect(result.roofType).toBe("Fibrocimento");
      expect(result.cidade).toBe("Maringá");
      expect(result.estado).toBe("PR");
      // 12 kWp em 220V é trifásico 220V
      expect(result.gridVoltage).toBe("Trifásico 220V");
    });

    it("deve extrair cotação completa falada em áudio (transcrita com estado por extenso): 'Faz um orçamento de 12 kwp estrutura fibromadeira rede 220 volts maringá paraná'", () => {
      const input =
        "Faz um orçamento de 12 kwp estrutura fibromadeira rede 220 volts maringá paraná";
      const result = parseIntegratorQuoteEntities(input);

      expect(result.isQuoteRequest).toBe(true);
      expect(result.targetKWp).toBe(12);
      expect(result.roofType).toBe("Fibrocimento");
      expect(result.cidade).toBe("Maringá");
      expect(result.estado).toBe("PR");
      expect(result.gridVoltage).toBe("Trifásico 220V");
    });

    it("deve extrair cotação completa 380V metálico: 'cotação 15kwp telhado metálico 380v em londrina pr'", () => {
      const input = "cotação 15kwp telhado metálico 380v em londrina pr";
      const result = parseIntegratorQuoteEntities(input);

      expect(result.isQuoteRequest).toBe(true);
      expect(result.targetKWp).toBe(15);
      expect(result.roofType).toBe("Metálico");
      expect(result.cidade).toBe("Londrina");
      expect(result.estado).toBe("PR");
      expect(result.gridVoltage).toBe("Trifásico 380V");
    });

    it("deve extrair cotação por consumo kWh e cerâmica: 'orçamento 800 kwh telhado cerâmico 220v campinas sp'", () => {
      const input = "orçamento 800 kwh telhado cerâmico 220v campinas sp";
      const result = parseIntegratorQuoteEntities(input);

      expect(result.isQuoteRequest).toBe(true);
      expect(result.consumptionKwh).toBe(800);
      expect(result.roofType).toBe("Cerâmica (Colonial)");
      expect(result.cidade).toBe("Campinas");
      expect(result.estado).toBe("SP");
      expect(result.gridVoltage).toBeDefined();
    });
    it("deve extrair cotação por módulos/placas: 'cotação 20 placas 585w fibromadeira 220v maringa pr'", () => {
      const input = "cotação 20 placas 585w fibromadeira 220v maringa pr";
      const result = parseIntegratorQuoteEntities(input);

      expect(result.isQuoteRequest).toBe(true);
      expect(result.targetModules).toBe(20);
      expect(result.modPowerWUser).toBe(585);
      expect(result.targetKWp).toBe(11.7);
      expect(result.roofType).toBe("Fibrocimento");
      expect(result.cidade).toBe("Maringá");
      expect(result.estado).toBe("PR");
      expect(result.gridVoltage).toBe("Trifásico 220V");
    });
  });

  describe("2. Fluxo do Bot - Avanço Imediato para Escolha de Kit", () => {
    it("ao receber 'Faz orçamento 12kwp fibromadeira 220v maringa pr', NÃO deve pedir cidade nem padrão, mas sim ir DIRETO para os kits", async () => {
      const conversation: any = {
        id: "conv-test-1",
        organizationId: "org-demo",
        metadata: {},
        messages: [],
      };

      const reply = await (service as any).generateBotResponse({
        conversation,
        incomingText: "Faz orçamento 12kwp fibromadeira 220v maringa pr",
        contactName: "Integrador Solar",
      });

      // NÃO deve perguntar a cidade
      expect(reply).not.toContain("Para qual cidade e estado será a instalação?");
      // NÃO deve perguntar padrão elétrico
      expect(reply).not.toContain("Qual o padrão de entrada da instalação?");
      // NÃO deve perguntar telhado
      expect(reply).not.toContain("Qual o tipo de estrutura/telhado?");

      // DEVE mostrar o cabeçalho e ir direto para os kits
      expect(reply).toContain("Potência Solicitada:_* `12 kWp`");
      expect(reply).toContain("Localidade: `Maringá/PR`");
      expect(reply).toContain("Estrutura: *Fibrocimento*");
      expect(reply).toContain("Qual opção você prefere para o seu cliente?");
    });

    it("ao receber transcrição de áudio 'Faz um orçamento de 12 kwp estrutura fibromadeira rede 220 volts maringá paraná', deve ir direto para os kits", async () => {
      const conversation: any = {
        id: "conv-audio-test",
        organizationId: "org-demo",
        metadata: {},
        messages: [],
      };

      const reply = await (service as any).generateBotResponse({
        conversation,
        incomingText:
          "Faz um orçamento de 12 kwp estrutura fibromadeira rede 220 volts maringá paraná",
        contactName: "Integrador Falando por Áudio",
      });

      expect(reply).not.toContain("Para qual cidade e estado será a instalação?");
      expect(reply).not.toContain("Qual o padrão de entrada da instalação?");
      expect(reply).not.toContain("Qual o tipo de estrutura/telhado?");

      expect(reply).toContain("Potência Solicitada:_* `12 kWp`");
      expect(reply).toContain("Localidade: `Maringá/PR`");
      expect(reply).toContain("Estrutura: *Fibrocimento*");
      expect(reply).toContain("Qual opção você prefere para o seu cliente?");
    });

    it("ao receber cotação residencial 'cotação 5kwp solo 220v cuiaba mt', deve ir direto para os kits com Monofásico 220V", async () => {
      const conversation: any = {
        id: "conv-cuiaba-test",
        organizationId: "org-demo",
        metadata: {},
        messages: [],
      };

      const reply = await (service as any).generateBotResponse({
        conversation,
        incomingText: "cotação 5kwp solo 220v cuiaba mt",
        contactName: "Integrador MT",
      });

      expect(reply).not.toContain("Para qual cidade e estado será a instalação?");
      expect(reply).not.toContain("Qual o padrão de entrada da instalação?");
      expect(reply).not.toContain("Qual o tipo de estrutura/telhado?");

      expect(reply).toContain("Potência Solicitada:_* `5 kWp`");
      expect(reply).toContain("Localidade: `Cuiabá/MT`");
      expect(reply).toContain("Estrutura: *Solo*");
      expect(reply).toContain("Padrão Elétrico: *Monofásico 220V*");
      expect(reply).toContain("Qual opção você prefere para o seu cliente?");
    });

    it("ao gerar proposta no modo degustação, deve exibir dica com 'gerenciar clientes' e nunca 'gerenciar integradores'", () => {
      // Verifica o copy diretamente do trialCounterText
      const isGuestTrial = true;
      const trialQuotesRemaining = 2;
      const trialQuotesCount = 1;

      const trialCounterText = isGuestTrial
        ? `📊 *Cotação [${trialQuotesCount || 1} de 3] gerada com sucesso!*\n` +
          (trialQuotesRemaining > 0
            ? `_(Você ainda possui ${trialQuotesRemaining} cotações gratuitas de teste)_\n\n`
            : `_(Você utilizou suas 3 cotações de teste gratuito)_\n\n`) +
          `💡 *Dica:* Na plataforma oficial da EnergivIA você pode personalizar sua logo, criar seus próprios modelos de proposta, gerenciar clientes e definir suas margens de lucro: *https://www.energivia.com.br*\n\n`
        : "";

      expect(trialCounterText).toContain("gerenciar clientes");
      expect(trialCounterText).not.toContain("gerenciar integradores");
    });
  });
});
