/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getHsp,
  isLocationInput,
  parseLocationString,
  cleanLocationInput,
  normalizeTextSimple,
  GeoIrradianceService,
} from "../services/geo-irradiance.service";
import { parseIntegratorQuoteEntities, WhatsappBotService } from "../whatsapp-bot.service";

describe("WhatsApp Bot - City and Location Flow Suite", () => {
  describe("Location String Sanitization & Parsing", () => {
    it("should clean invisible formatting and normalize text", () => {
      expect(cleanLocationInput("\u200EMaringá/PR\u200E")).toBe("Maringá/PR");
      expect(normalizeTextSimple("Maringá")).toBe("MARINGA");
    });
    it("should recognize Maringá/PR even with WhatsApp invisible LTR characters", () => {
      const input = "\u200EMaringá/PR\u200E";
      expect(isLocationInput(input)).toBe(true);
      const res = getHsp(input);
      expect(res.exact).toBe(true);
      expect(res.city).toBe("Maringá");
      expect(res.uf).toBe("PR");
    });

    it("should recognize Maringá/PR with trailing period from mobile double-space", () => {
      const input = "Maringá/PR.";
      expect(isLocationInput(input)).toBe(true);
      const res = getHsp(input);
      expect(res.exact).toBe(true);
      expect(res.city).toBe("Maringá");
      expect(res.uf).toBe("PR");
    });

    it("should recognize variations of separators: hyphen, space, comma, slash", () => {
      const variations = [
        "Maringá/PR",
        "Maringá / PR",
        "Maringá - PR",
        "Maringá, PR",
        "Maringá PR",
        "maringa/pr",
        "Maringa - PR",
        "Cuiabá/MT",
        "Presidente Prudente/SP",
        "Presidente Prudente - SP",
      ];

      for (const v of variations) {
        expect(isLocationInput(v)).toBe(true);
        const hsp = getHsp(v);
        expect(hsp.exact).toBe(true);
        expect(hsp.hsp).toBeGreaterThan(4.0);
      }
    });

    it("should recognize city with full state name", () => {
      expect(parseLocationString("Maringá - Paraná")).toEqual({ city: "Maringá", uf: "PR" });
      expect(parseLocationString("Maringá/Paraná")).toEqual({ city: "Maringá", uf: "PR" });
      expect(isLocationInput("Maringá - Paraná")).toBe(true);
      const res = getHsp("Maringá - Paraná");
      expect(res.exact).toBe(true);
      expect(res.city).toBe("Maringá");
      expect(res.uf).toBe("PR");
    });

    it("should recognize city without UF when city is unique or known in database", () => {
      expect(isLocationInput("Maringá")).toBe(true);
      const res = getHsp("Maringá");
      expect(res.exact).toBe(true);
      expect(res.city).toBe("Maringá");
      expect(res.uf).toBe("PR");
    });
  });

  describe("Context extraction regexes from bot messages", () => {
    it("should correctly extract consumption from formatted bot messages (*_Consumo Registrado:_*)", () => {
      const botMsg =
        "*_Consumo Registrado:_* `400 kWh/mês` ☀️\n\nPara qual cidade e estado será a instalação? (Ex: `Maringá/PR`, `Presidente Prudente/SP`)";
      const consM = botMsg.match(
        /(?:Consumo Registrado|Consumo m[ée]dio(?: de)?):?[_*\s]*`?(\d+[\d.,]*)`?\s*kWh/i
      );
      expect(consM).not.toBeNull();
      expect(consM![1]).toBe("400");
    });

    it("should correctly extract power from formatted bot messages (*_Potência Registrada:_*)", () => {
      const botMsg =
        "*_Potência Registrada:_* `5.2 kWp` ☀️\n\nPara qual cidade e estado será a instalação?";
      const potM = botMsg.match(
        /(?:Potência Solicitada|Potência Registrada):?[_*\s]*`?([\d.,]+)`?\s*kWp/i
      );
      expect(potM).not.toBeNull();
      expect(potM![1]).toBe("5.2");
    });

    it("should correctly extract modules from formatted bot messages (*_Módulos Registrados:_*)", () => {
      const botMsg =
        "*_Módulos Registrados:_* `12 placas` (590W) ☀️\n\nPara qual cidade e estado será a instalação?";
      const qtyM = botMsg.match(
        /(?:Quantidade Solicitada|Módulos Registrados):?[_*\s]*`?(\d+)`?\s*(?:placas|m[oó]dulos)/i
      );
      expect(qtyM).not.toBeNull();
      expect(qtyM![1]).toBe("12");
    });

    it("should correctly extract location from formatted bot messages", () => {
      const botMsg1 =
        "*_Localização Identificada!_* 📍☀️\n\n> Cidade: `Maringá/PR`\n> Irradiação Solar: `4.89 kWh/m²/dia`";
      const locM1 =
        botMsg1.match(
          /(?:Localização Identificada|Localização Corrigida|Localização Mantida|Cidade):?[_*\s!]*`?\*?([^*\/`\n]+)\/([A-Za-z]{2})\*?`?/i
        ) ||
        botMsg1.match(/(?:em|para)\s+`?\*?([^*\/`\n]{3,40})\/([A-Za-z]{2})\*?`?\s*(?:☀️|📍|\n|$)/i);
      expect(locM1).not.toBeNull();
      expect(locM1![1]?.trim()).toBe("Maringá");
      expect(locM1![2]?.trim()).toBe("PR");

      const botMsg2 = "*_Consumo Registrado:_* `400 kWh/mês` em `Maringá/PR` ☀️📍\n\n";
      const locM2 =
        botMsg2.match(
          /(?:Localização Identificada|Localização Corrigida|Localização Mantida|Cidade):?[_*\s!]*`?\*?([^*\/`\n]+)\/([A-Za-z]{2})\*?`?/i
        ) ||
        botMsg2.match(/(?:em|para)\s+`?\*?([^*\/`\n]{3,40})\/([A-Za-z]{2})\*?`?\s*(?:☀️|📍|\n|$)/i);
      expect(locM2).not.toBeNull();
      expect(locM2![1]?.trim()).toBe("Maringá");
      expect(locM2![2]?.trim()).toBe("PR");
    });
  });

  describe("State continuity after unrecognized city message", () => {
    it("should keep city state active when last bot message is error prompt", () => {
      const errorMsg =
        'Não identifiquei o município "*Maringá/PR*". 📍\n\nPor favor, informe a cidade e a sigla do estado onde será a instalação:\n> Exemplo: `Cuiabá/MT`, `Maringá/PR` ou `São Paulo/SP`\n\n_(Ou envie 0️⃣ para voltar ao menu inicial)_';

      const isAskingCity =
        errorMsg.includes("Para qual cidade e estado será a instalação") ||
        errorMsg.includes("Vamos alterar a localização") ||
        errorMsg.includes("Vamos corrigir a localização") ||
        errorMsg.includes("Não identifiquei o município") ||
        errorMsg.includes("Não identifiquei a cidade") ||
        errorMsg.includes("informe a cidade e a sigla do estado") ||
        errorMsg.includes("informe a cidade e estado") ||
        errorMsg.includes("cidade e a sigla do estado onde será a instalação") ||
        errorMsg.includes("cidade e estado da instalação solar");

      expect(isAskingCity).toBe(true);
    });
  });

  describe("State Recognition in Integrator Quotes (Alagoas, Bahia, Minas Gerais, etc.)", () => {
    it("should recognize Alagoas as state AL and not invent a fictitious Alagoas/SP city", () => {
      const quote = parseIntegratorQuoteEntities("32 kwp metálico em alagoas");
      expect(quote.isQuoteRequest).toBe(true);
      expect(quote.targetKWp).toBe(32);
      expect(quote.roofType).toBe("Metálico");
      expect(quote.estado).toBe("AL");
      expect(quote.cidade).toBeUndefined();
    });

    it("should recognize full state name Minas Gerais without inventing a fictitious city", () => {
      const quote = parseIntegratorQuoteEntities("cotação 50 kwp solo em Minas Gerais");
      expect(quote.isQuoteRequest).toBe(true);
      expect(quote.targetKWp).toBe(50);
      expect(quote.roofType).toBe("Solo");
      expect(quote.estado).toBe("MG");
      expect(quote.cidade).toBeUndefined();
    });

    it("should recognize state when expressed as UF (ex: em AL)", () => {
      const quote = parseIntegratorQuoteEntities("32 kwp metálico em AL");
      expect(quote.isQuoteRequest).toBe(true);
      expect(quote.targetKWp).toBe(32);
      expect(quote.roofType).toBe("Metálico");
      expect(quote.estado).toBe("AL");
      expect(quote.cidade).toBeUndefined();
    });
  });

  describe("End-to-End Bot Flow: State-only quote request and capital selection", () => {
    let service: any;
    let mockPrisma: any;
    let geoIrradiance: GeoIrradianceService;

    beforeEach(() => {
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
          findMany: vi
            .fn()
            .mockResolvedValue([{ id: "tpl-123", name: "Modelo Padrão", version: 1 }]),
          findFirst: vi
            .fn()
            .mockResolvedValue({ id: "tpl-123", name: "Modelo Padrão", version: 1 }),
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

      geoIrradiance = new GeoIrradianceService();

      service = new WhatsappBotService(
        { get: vi.fn().mockReturnValue("https://www.energivia.com.br") } as any,
        mockPrisma,
        { sendTextMessage: vi.fn().mockResolvedValue(undefined) } as any,
        {} as any,
        {} as any,
        geoIrradiance,
        {} as any,
        { generateDistributorTiers: vi.fn().mockResolvedValue({ tiers: [] }) } as any
      );
    });

    it("should handle '32 kwp metálico em alagoas' by setting state AL and asking for city in Alagoas", async () => {
      const conversation: any = {
        id: "conv-alagoas",
        organizationId: "org-test",
        title: "Test Alagoas State",
        metadata: {
          step: "IDLE",
          sessionData: {},
        },
        messages: [],
      };

      const reply = await service.generateBotResponse({
        conversation,
        incomingText: "32 kwp metálico em alagoas",
        extractionResult: null,
      });

      // Não pode inventar Alagoas/SP
      expect(reply).not.toContain("Alagoas/SP");
      expect(reply).toContain("32");
      expect(reply).toContain("Alagoas (AL)");
      expect(reply).toContain("Para qual cidade de Alagoas será a instalação?");
      expect(reply).toContain("Maceió/AL");

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "conv-alagoas" },
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              step: "AWAITING_CITY",
              sessionData: expect.objectContaining({
                kwp: 32,
                roofType: "Metálico",
                uf: "AL",
              }),
            }),
          }),
        })
      );
    });

    it("should accept option 1 to pick capital Maceió/AL when step is AWAITING_CITY and state is AL", async () => {
      const conversation: any = {
        id: "conv-alagoas-capital",
        organizationId: "org-test",
        title: "Test Alagoas Capital Selection",
        metadata: {
          step: "AWAITING_CITY",
          sessionData: {
            kwp: 32,
            roofType: "Metálico",
            uf: "AL",
          },
        },
        messages: [
          {
            role: "assistant",
            content:
              "Para qual cidade de Alagoas será a instalação?\n> Responda com a cidade ou 1 para Maceió/AL",
          },
        ],
      };

      const reply = await service.generateBotResponse({
        conversation,
        incomingText: "1",
        extractionResult: null,
      });

      expect(reply).toContain("Maceió/AL");
      expect(reply).toContain("Qual a tensão da rede trifásica para este sistema de 32 kWp?");

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "conv-alagoas-capital" },
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              step: "AWAITING_GRID_TYPE",
              sessionData: expect.objectContaining({
                cidade: "Maceió",
                uf: "AL",
                kwp: 32,
              }),
            }),
          }),
        })
      );
    });

    it("should self-correct active session with corrupt cidade='Alagoas' via defense-in-depth", async () => {
      const conversation: any = {
        id: "conv-corrupt-city",
        organizationId: "org-test",
        title: "Test Corrupt City Self-Correction",
        metadata: {
          step: "AWAITING_GRID_TYPE",
          sessionData: {
            cidade: "Alagoas",
            uf: "SP",
            kwp: 32,
            roofType: "Metálico",
          },
        },
        messages: [
          {
            role: "assistant",
            content: "Qual a tensão da rede trifásica para este sistema de 32 kWp?",
          },
        ],
      };

      // O usuário responde com a tensão trifásica
      const reply = await service.generateBotResponse({
        conversation,
        incomingText: "1", // Trifásico 220V
        extractionResult: null,
      });

      // A defesa em profundidade corrigiu a cidade para undefined e o estado para AL.
      // Como não tem cidade, o bot volta para pedir a cidade de Alagoas!
      expect(reply).not.toContain("Alagoas/SP");
      expect(reply).toContain("Alagoas");
    });
  });
});
