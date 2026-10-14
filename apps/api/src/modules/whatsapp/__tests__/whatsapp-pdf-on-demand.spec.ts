/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WhatsappBotService } from "../whatsapp-bot.service";
import { WhatsappCloudService } from "../whatsapp-cloud.service";

describe("WhatsApp Bot & Cloud - On-Demand PDF Delivery Suite", () => {
  describe("WhatsappCloudService.sendDocumentMessage", () => {
    let service: WhatsappCloudService;
    let mockConfig: any;

    beforeEach(() => {
      vi.restoreAllMocks();
      mockConfig = {
        get: vi.fn((key: string) => {
          if (key === "EVOLUTION_API_URL") return "https://evo.example.com";
          if (key === "EVOLUTION_API_KEY") return "test-secret-key";
          if (key === "EVOLUTION_INSTANCE_NAME") return "test-bot";
          return "";
        }),
      };
      service = new WhatsappCloudService(mockConfig);
    });

    it("should send document via Evolution API /message/sendMedia with Base64 payload", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(""),
      } as any);

      const success = await service.sendDocumentMessage({
        phoneNumberId: "phone_123",
        toWaId: "5544999998888",
        fileName: "Proposta_Carlos_Silva.pdf",
        documentBase64: "data:application/pdf;base64,JVBERi0xLjQK...",
        caption: "📄 Proposta Comercial - Carlos Silva",
      });

      expect(success).toBe(true);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toBe("https://evo.example.com/message/sendMedia/test-bot");
      expect(init.method).toBe("POST");

      const body = JSON.parse(init.body as string);
      expect(body.number).toBe("5544999998888");
      expect(body.mediatype).toBe("document");
      expect(body.mimetype).toBe("application/pdf");
      expect(body.fileName).toBe("Proposta_Carlos_Silva.pdf");
      expect(body.media).toBe("data:application/pdf;base64,JVBERi0xLjQK...");
      expect(body.caption).toBe("📄 Proposta Comercial - Carlos Silva");
    });

    it("should retry with altNumber (9th digit) if first attempt fails for 12-digit Brazilian number", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: vi.fn().mockResolvedValue("Number does not exist"),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: vi.fn().mockResolvedValue(""),
        } as any);

      const success = await service.sendDocumentMessage({
        phoneNumberId: "phone_123",
        toWaId: "554499998888", // 12 digits
        fileName: "Proposta_Carlos.pdf",
        documentBase64: "data:application/pdf;base64,JVBERi0xLjQK...",
      });

      expect(success).toBe(true);
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      const [, secondInit] = fetchSpy.mock.calls[1] as [string, RequestInit];
      const secondBody = JSON.parse(secondInit.body as string);
      expect(secondBody.number).toBe("5544999998888"); // Added 9th digit
    });
  });

  describe("WhatsappBotService - On-Demand PDF Request Flow", () => {
    let service: WhatsappBotService;
    let mockPrisma: any;
    let mockWhatsappCloud: any;
    let mockProposalsService: any;

    beforeEach(() => {
      vi.restoreAllMocks();
      mockPrisma = {
        conversation: {
          findFirst: vi.fn(),
          findUnique: vi.fn(),
          update: vi.fn().mockResolvedValue({}),
        },
        message: {
          create: vi.fn().mockResolvedValue({ id: "msg-123" }),
        },
        whatsappInboundMessage: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({}),
        },
        proposal: {
          findFirst: vi.fn(),
        },
      };

      mockWhatsappCloud = {
        sendTextMessage: vi.fn().mockResolvedValue(undefined),
        sendDocumentMessage: vi.fn().mockResolvedValue(true),
      };

      mockProposalsService = {
        generatePdf: vi.fn().mockResolvedValue(Buffer.from("%PDF-1.4 mock pdf content")),
      };

      service = new WhatsappBotService(
        { get: vi.fn().mockReturnValue("https://www.energivia.com.br") } as any,
        mockPrisma,
        mockWhatsappCloud,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        mockProposalsService
      );
    });

    it("should recognize 'PDF' or 'baixar pdf' and dispatch waiting message followed by document", async () => {
      vi.spyOn(service as any, "resolveAuthorizedTenant").mockResolvedValue({ id: "org-123" });
      vi.spyOn(service as any, "isTenantPlanActive").mockResolvedValue({
        active: true,
        planName: "Pro",
      });

      mockPrisma.conversation.findFirst.mockResolvedValue({
        id: "conv-123",
        organizationId: "org-123",
        channel: "whatsapp",
        title: "5544999998888",
        messages: [],
        metadata: {
          lastProposalId: "prop-456",
          lastClientName: "Carlos Silva",
        },
      });

      mockPrisma.conversation.findUnique.mockResolvedValue({
        id: "conv-123",
        organizationId: "org-123",
        channel: "whatsapp",
        title: "5544999998888",
        messages: [],
        metadata: {
          lastProposalId: "prop-456",
          lastClientName: "Carlos Silva",
        },
      });

      await (service as any).processSingleMessage({
        message: {
          id: "msg_pdf_req",
          from: "5544999998888",
          type: "text",
          text: { body: "PDF" },
        },
        phoneNumberId: "phone-123",
        contactName: "Carlos Silva",
      });

      // 1. Progress message sent
      expect(mockWhatsappCloud.sendTextMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          toWaId: "5544999998888",
          body: expect.stringContaining("Gerando o arquivo PDF da sua proposta"),
        })
      );

      // 2. Proposal PDF generated
      expect(mockProposalsService.generatePdf).toHaveBeenCalledWith("prop-456");

      // 3. Document message sent
      expect(mockWhatsappCloud.sendDocumentMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          toWaId: "5544999998888",
          fileName: "Proposta_Carlos_Silva.pdf",
          documentBase64: expect.stringContaining("data:application/pdf;base64,"),
          caption: expect.stringContaining("Carlos Silva"),
        })
      );
    });

    it("should notify politely when no recent proposal exists in conversation", async () => {
      vi.spyOn(service as any, "resolveAuthorizedTenant").mockResolvedValue({ id: "org-123" });
      vi.spyOn(service as any, "isTenantPlanActive").mockResolvedValue({
        active: true,
        planName: "Pro",
      });

      mockPrisma.conversation.findFirst.mockResolvedValue({
        id: "conv-empty",
        organizationId: "org-123",
        channel: "whatsapp",
        title: "5544999998888",
        messages: [],
        metadata: {},
      });

      mockPrisma.conversation.findUnique.mockResolvedValue({
        id: "conv-empty",
        organizationId: "org-123",
        channel: "whatsapp",
        title: "5544999998888",
        messages: [],
        metadata: {},
      });

      mockPrisma.proposal.findFirst.mockResolvedValue(null);

      await (service as any).processSingleMessage({
        message: {
          id: "msg_pdf_empty",
          from: "5544999998888",
          type: "text",
          text: { body: "baixar pdf" },
        },
        phoneNumberId: "phone-123",
        contactName: "Carlos Silva",
      });

      expect(mockWhatsappCloud.sendTextMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          toWaId: "5544999998888",
          body: expect.stringContaining("Não encontrei nenhuma proposta recente nesta conversa"),
        })
      );
      expect(mockProposalsService.generatePdf).not.toHaveBeenCalled();
      expect(mockWhatsappCloud.sendDocumentMessage).not.toHaveBeenCalled();
    });

    it("should provide web link in processWebChatMessage when user asks for PDF", async () => {
      mockPrisma.proposal.findFirst.mockResolvedValue({
        id: "prop-web-789",
        title: "Proposta Comercial - Maria Santos",
      });

      const response = await service.processWebChatMessage({
        messages: [],
        incomingText: "pdf",
        organizationId: "org-123",
      });

      expect(response).toContain("https://www.energivia.com.br/proposta/prop-web-789?pdf=true");
      expect(response).toContain("Você pode visualizar e baixar o PDF da sua proposta");
    });
  });
});
