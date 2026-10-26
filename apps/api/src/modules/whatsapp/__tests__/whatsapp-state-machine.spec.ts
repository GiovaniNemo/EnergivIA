/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WhatsappBotService } from "../whatsapp-bot.service";
import { isResetCommand, isBackCommand, STEP_PREVIOUS_MAP } from "../whatsapp-state.types";

describe("WhatsApp Bot - Deterministic Finite State Machine (FSM)", () => {
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
        findMany: vi.fn().mockResolvedValue([{ id: "tpl-123", name: "Modelo Padrão", version: 1 }]),
        findFirst: vi.fn().mockResolvedValue({ id: "tpl-123", name: "Modelo Padrão", version: 1 }),
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

    mockWhatsappCloud = {
      sendTextMessage: vi.fn().mockResolvedValue(undefined),
    };

    mockGeoIrradiance = {
      getHsp: vi.fn().mockReturnValue({ city: "Maringá", uf: "PR", hsp: 4.85, exact: true }),
    };

    mockKitGeneration = {
      generateDistributorTiers: vi.fn().mockResolvedValue({
        tiers: [
          {
            tier_id: "cost_benefit",
            name: "Elite",
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
    };

    service = new WhatsappBotService(
      { get: vi.fn().mockReturnValue("https://www.energivia.com.br") } as any,
      mockPrisma,
      mockWhatsappCloud,
      {} as any,
      {} as any,
      mockGeoIrradiance,
      {} as any,
      mockKitGeneration
    );
  });

  describe("FSM State Helper Utilities", () => {
    it("should accurately identify reset commands regardless of casing and punctuation", () => {
      expect(isResetCommand("novo")).toBe(true);
      expect(isResetCommand("Novo!")).toBe(true);
      expect(isResetCommand("reiniciar")).toBe(true);
      expect(isResetCommand("nova cotação")).toBe(true);
      expect(isResetCommand("inicio")).toBe(true);
      expect(isResetCommand("menu")).toBe(true);
      expect(isResetCommand("outro texto qualquer")).toBe(false);
    });

    it("should accurately identify back commands", () => {
      expect(isBackCommand("0")).toBe(true);
      expect(isBackCommand("0️⃣")).toBe(true);
      expect(isBackCommand("voltar")).toBe(true);
      expect(isBackCommand("retornar")).toBe(true);
      expect(isBackCommand("1")).toBe(false);
    });

    it("should map transitions for backward navigation deterministically", () => {
      expect(STEP_PREVIOUS_MAP.AWAITING_TEMPLATE_SELECTION).toBe("AWAITING_CLIENT_PHONE");
      expect(STEP_PREVIOUS_MAP.AWAITING_CLIENT_PHONE).toBe("AWAITING_CLIENT_NAME");
      expect(STEP_PREVIOUS_MAP.AWAITING_CLIENT_NAME).toBe("AWAITING_PRICE_CONFIRMATION");
      expect(STEP_PREVIOUS_MAP.AWAITING_PRICE_CONFIRMATION).toBe("AWAITING_KIT_SELECTION");
      expect(STEP_PREVIOUS_MAP.AWAITING_KIT_SELECTION).toBe("AWAITING_INVERTER_TYPE");
      expect(STEP_PREVIOUS_MAP.AWAITING_BATTERY_STORAGE).toBe("AWAITING_INVERTER_TYPE");
      expect(STEP_PREVIOUS_MAP.AWAITING_INVERTER_TYPE).toBe("AWAITING_ROOF_TYPE");
      expect(STEP_PREVIOUS_MAP.AWAITING_ROOF_TYPE).toBe("AWAITING_GRID_TYPE");
      expect(STEP_PREVIOUS_MAP.AWAITING_GRID_TYPE).toBe("AWAITING_BILL_VALUE");
      expect(STEP_PREVIOUS_MAP.AWAITING_BILL_VALUE).toBe("AWAITING_CITY");
    });
  });

  describe("FSM Transitions with Explicit metadata.step", () => {
    it("should transition from IDLE to AWAITING_CITY when user enters consumption without city", async () => {
      const conversation: any = {
        id: "conv-001",
        organizationId: "org-test",
        title: "Test Session",
        metadata: { step: "IDLE" },
        messages: [],
      };

      const reply = await (service as any).generateBotResponse({
        conversation,
        incomingText: "450 kWh",
        extractionResult: null,
      });

      expect(reply).toContain("Consumo Registrado");
      expect(reply).toContain("Para qual cidade e estado será a instalação");

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "conv-001" },
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              step: "AWAITING_CITY",
              sessionData: expect.objectContaining({
                consumptionKwh: 450,
              }),
            }),
          }),
        })
      );
    });

    it("should transition from AWAITING_CITY to AWAITING_BILL_VALUE when valid city is provided", async () => {
      const conversation: any = {
        id: "conv-002",
        organizationId: "org-test",
        title: "Test Session",
        metadata: {
          step: "AWAITING_CITY",
          sessionData: { consumptionKwh: 450 },
        },
        messages: [{ role: "assistant", content: "Para qual cidade e estado será a instalação?" }],
      };

      const reply = await (service as any).generateBotResponse({
        conversation,
        incomingText: "Maringá/PR",
        extractionResult: null,
      });

      expect(reply).toContain("Localização Identificada");
      expect(reply).toContain("Qual é o valor médio da conta de luz");

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "conv-002" },
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              step: "AWAITING_BILL_VALUE",
              sessionData: expect.objectContaining({
                cidade: "Maringá",
                uf: "PR",
              }),
            }),
          }),
        })
      );
    });

    it("should transition from AWAITING_BILL_VALUE to AWAITING_GRID_TYPE when bill value is provided", async () => {
      const conversation: any = {
        id: "conv-002b",
        organizationId: "org-test",
        title: "Test Session",
        metadata: {
          step: "AWAITING_BILL_VALUE",
          sessionData: { consumptionKwh: 450, cidade: "Maringá", uf: "PR" },
        },
        messages: [
          { role: "assistant", content: "Qual é o valor médio da conta de luz atual em R$?" },
        ],
      };

      const reply = await (service as any).generateBotResponse({
        conversation,
        incomingText: "850",
        extractionResult: null,
      });

      expect(reply).toContain("Qual o padrão de entrada da instalação");

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "conv-002b" },
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              step: "AWAITING_GRID_TYPE",
              sessionData: expect.objectContaining({
                billValue: 850,
              }),
            }),
          }),
        })
      );
    });

    it("should transition from AWAITING_GRID_TYPE to AWAITING_ROOF_TYPE when electrical grid is chosen", async () => {
      const conversation: any = {
        id: "conv-003",
        organizationId: "org-test",
        title: "Test Session",
        metadata: {
          step: "AWAITING_GRID_TYPE",
          sessionData: { consumptionKwh: 450, cidade: "Maringá", uf: "PR" },
        },
        messages: [{ role: "assistant", content: "Qual o padrão de entrada da instalação?" }],
      };

      const reply = await (service as any).generateBotResponse({
        conversation,
        incomingText: "1", // Monofásico 220V
        extractionResult: null,
      });

      expect(reply).toContain("Padrão Elétrico Registrado");
      expect(reply).toContain("Qual a estrutura do telhado");

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "conv-003" },
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              step: "AWAITING_ROOF_TYPE",
              sessionData: expect.objectContaining({
                gridType: "Monofásico 220V",
              }),
            }),
          }),
        })
      );
    });

    it("should transition from AWAITING_ROOF_TYPE to AWAITING_INVERTER_TYPE when roof structure is selected", async () => {
      const conversation: any = {
        id: "conv-004",
        organizationId: "org-test",
        title: "Test Session",
        metadata: {
          step: "AWAITING_ROOF_TYPE",
          sessionData: {
            consumptionKwh: 450,
            cidade: "Maringá",
            uf: "PR",
            gridType: "Monofásico 220V",
          },
        },
        messages: [{ role: "assistant", content: "Qual a estrutura do telhado?" }],
      };

      const reply = await (service as any).generateBotResponse({
        conversation,
        incomingText: "1", // Cerâmica
        extractionResult: null,
      });

      expect(reply).toContain("Estrutura Selecionada");
      expect(reply).toContain("Qual tecnologia de inversor você prefere");

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "conv-004" },
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              step: "AWAITING_INVERTER_TYPE",
              sessionData: expect.objectContaining({
                roofType: "Cerâmica (Colonial)",
              }),
            }),
          }),
        })
      );
    });

    it("should transition from AWAITING_INVERTER_TYPE to AWAITING_KIT_SELECTION when technology is chosen", async () => {
      const conversation: any = {
        id: "conv-004-tech",
        organizationId: "org-test",
        title: "Test Session",
        metadata: {
          step: "AWAITING_INVERTER_TYPE",
          sessionData: {
            consumptionKwh: 450,
            cidade: "Maringá",
            uf: "PR",
            gridType: "Monofásico 220V",
            roofType: "Cerâmica (Colonial)",
          },
        },
        messages: [
          {
            role: "assistant",
            content: "Qual tecnologia de inversor você prefere para esta cotação? ⚡",
          },
        ],
      };

      const reply = await (service as any).generateBotResponse({
        conversation,
        incomingText: "1", // String
        extractionResult: null,
      });

      expect(reply).toContain("Tecnologia Selecionada");
      expect(reply).toContain("Qual opção você prefere para o seu cliente");

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "conv-004-tech" },
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              step: "AWAITING_KIT_SELECTION",
              sessionData: expect.objectContaining({
                inverterType: "string",
              }),
            }),
          }),
        })
      );
    });

    it("should transition from AWAITING_KIT_SELECTION to AWAITING_PRICE_CONFIRMATION when kit is chosen", async () => {
      const conversation: any = {
        id: "conv-005",
        organizationId: "org-test",
        title: "Test Session",
        metadata: {
          step: "AWAITING_KIT_SELECTION",
          sessionData: {
            consumptionKwh: 450,
            cidade: "Maringá",
            uf: "PR",
            gridType: "Monofásico 220V",
            roofType: "Cerâmica (Colonial)",
          },
        },
        messages: [{ role: "assistant", content: "Qual opção você prefere para o seu cliente?" }],
      };

      const reply = await (service as any).generateBotResponse({
        conversation,
        incomingText: "1", // Standard/Elite
        extractionResult: null,
      });

      expect(reply).toContain("Como você deseja prosseguir para esta cotação");

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "conv-005" },
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              step: "AWAITING_PRICE_CONFIRMATION",
              sessionData: expect.objectContaining({
                selectedQuoteIndex: 0,
              }),
            }),
          }),
        })
      );
    });

    it("should transition from AWAITING_KIT_SELECTION to AWAITING_PRICE_CONFIRMATION when audio transcribed 'standar' without number 1", async () => {
      const conversation: any = {
        id: "conv-005b",
        organizationId: "org-test",
        title: "Test Session Audio",
        metadata: {
          step: "AWAITING_KIT_SELECTION",
          sessionData: {
            consumptionKwh: 450,
            cidade: "Maringá",
            uf: "PR",
            gridType: "Monofásico 220V",
            roofType: "Cerâmica (Colonial)",
          },
        },
        messages: [{ role: "assistant", content: "Qual opção você prefere para o seu cliente?" }],
      };

      const reply = await (service as any).generateBotResponse({
        conversation,
        incomingText: "standar", // falado no áudio sem o dígito 1
        extractionResult: null,
      });

      expect(reply).toContain("Como você deseja prosseguir para esta cotação");

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "conv-005b" },
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              step: "AWAITING_PRICE_CONFIRMATION",
              sessionData: expect.objectContaining({
                selectedQuoteIndex: 0,
              }),
            }),
          }),
        })
      );
    });

    it("should transition from AWAITING_PRICE_CONFIRMATION to AWAITING_CLIENT_NAME when price is confirmed", async () => {
      const conversation: any = {
        id: "conv-006",
        organizationId: "org-test",
        title: "Test Session",
        metadata: {
          step: "AWAITING_PRICE_CONFIRMATION",
          sessionData: {
            consumptionKwh: 450,
            cidade: "Maringá",
            uf: "PR",
            selectedQuoteIndex: 0,
          },
        },
        messages: [{ role: "assistant", content: "Como deseja prosseguir para esta cotação?" }],
      };

      const reply = await (service as any).generateBotResponse({
        conversation,
        incomingText: "1", // Seguir com o preço padrão
        extractionResult: null,
      });

      expect(reply).toContain("Preço aplicado");
      expect(reply).toContain("cliente final");

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "conv-006" },
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              step: "AWAITING_CLIENT_NAME",
            }),
          }),
        })
      );
    });

    it("should transition from AWAITING_CLIENT_NAME to AWAITING_CLIENT_PHONE when name is sent", async () => {
      const conversation: any = {
        id: "conv-007",
        organizationId: "org-test",
        title: "Test Session",
        metadata: {
          step: "AWAITING_CLIENT_NAME",
          sessionData: {
            consumptionKwh: 450,
            cidade: "Maringá",
            uf: "PR",
          },
        },
        messages: [{ role: "assistant", content: "Qual o nome do cliente final?" }],
      };

      const reply = await (service as any).generateBotResponse({
        conversation,
        incomingText: "Roberto Alcantara",
        extractionResult: null,
      });

      expect(reply).toContain("Roberto Alcantara");
      expect(reply).toContain("qual o WhatsApp dele com DDD");

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "conv-007" },
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              step: "AWAITING_CLIENT_PHONE",
              sessionData: expect.objectContaining({
                clientName: "Roberto Alcantara",
              }),
            }),
          }),
        })
      );
    });

    it("should transition from AWAITING_CLIENT_PHONE to AWAITING_TEMPLATE_SELECTION when phone is sent", async () => {
      const conversation: any = {
        id: "conv-008",
        organizationId: "org-test",
        title: "Test Session",
        metadata: {
          step: "AWAITING_CLIENT_PHONE",
          sessionData: {
            consumptionKwh: 450,
            cidade: "Maringá",
            uf: "PR",
            clientName: "Roberto Alcantara",
          },
        },
        messages: [{ role: "assistant", content: "E qual o WhatsApp dele com DDD?" }],
      };

      const reply = await (service as any).generateBotResponse({
        conversation,
        incomingText: "44988776655",
        extractionResult: null,
      });

      expect(reply).toContain("Qual modelo de proposta comercial você deseja usar");

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "conv-008" },
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              step: "AWAITING_TEMPLATE_SELECTION",
              sessionData: expect.objectContaining({
                clientPhone: "44988776655",
              }),
            }),
          }),
        })
      );
    });

    it("should transition to PROPOSAL_COMPLETED after template is chosen and proposal is created", async () => {
      const conversation: any = {
        id: "conv-009",
        organizationId: "org-test",
        title: "Test Session",
        metadata: {
          step: "AWAITING_TEMPLATE_SELECTION",
          sessionData: {
            consumptionKwh: 450,
            cidade: "Maringá",
            uf: "PR",
            clientName: "Roberto Alcantara",
            clientPhone: "44988776655",
            selectedQuoteIndex: 0,
          },
        },
        messages: [
          { role: "assistant", content: "Qual modelo de proposta comercial você deseja usar?" },
        ],
      };

      const reply = await (service as any).generateBotResponse({
        conversation,
        incomingText: "1",
        extractionResult: null,
      });

      expect(reply).toContain("Proposta Comercial Gerada com Sucesso");
      expect(mockPrisma.proposal.create).toHaveBeenCalled();

      expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "conv-009" },
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              step: "PROPOSAL_COMPLETED",
              lastProposalId: "prop-123",
            }),
          }),
        })
      );
    });
  });

  describe("Deterministic Back Navigation ('0')", () => {
    it("should roll back from AWAITING_TEMPLATE_SELECTION to AWAITING_CLIENT_PHONE on '0'", async () => {
      const conversation: any = {
        id: "conv-back-1",
        organizationId: "org-test",
        metadata: { step: "AWAITING_TEMPLATE_SELECTION" },
        messages: [{ role: "assistant", content: "Qual modelo de proposta comercial?" }],
      };

      const reply = await (service as any).generateBotResponse({
        conversation,
        incomingText: "0",
        extractionResult: null,
      });

      expect(reply).toContain("WhatsApp correto do cliente");
      expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "conv-back-1" },
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              step: "AWAITING_CLIENT_PHONE",
            }),
          }),
        })
      );
    });

    it("should roll back from AWAITING_CLIENT_PHONE to AWAITING_CLIENT_NAME on '0'", async () => {
      const conversation: any = {
        id: "conv-back-2",
        organizationId: "org-test",
        metadata: { step: "AWAITING_CLIENT_PHONE" },
        messages: [{ role: "assistant", content: "E qual o WhatsApp dele?" }],
      };

      const reply = await (service as any).generateBotResponse({
        conversation,
        incomingText: "0",
        extractionResult: null,
      });

      expect(reply).toContain("Qual o nome do cliente final");
      expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "conv-back-2" },
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              step: "AWAITING_CLIENT_NAME",
            }),
          }),
        })
      );
    });

    it("should reset conversation to IDLE when user sends 'novo'", async () => {
      const conversation: any = {
        id: "conv-reset-1",
        organizationId: "org-test",
        metadata: {
          step: "AWAITING_KIT_SELECTION",
          sessionData: { consumptionKwh: 500, cidade: "Curitiba", uf: "PR" },
        },
        messages: [{ role: "assistant", content: "Qual opção você prefere?" }],
      };

      const reply = await (service as any).generateBotResponse({
        conversation,
        incomingText: "novo",
        extractionResult: null,
      });

      expect(reply).toContain("Como posso ajudar você a gerar orçamentos hoje");
      expect(mockPrisma.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "conv-reset-1" },
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              step: "IDLE",
            }),
          }),
        })
      );
    });
  });
});
