/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WhatsappBotService } from "../whatsapp-bot.service";
import { AiFeature } from "@prisma/client";

describe("WhatsappBotService - Gemini Audio & AI Priority Suite", () => {
  let service: WhatsappBotService;
  let mockConfig: any;
  let mockPrisma: any;
  let mockWhatsappCloud: any;
  let mockAiUsage: any;
  let mockBillExtractor: any;
  let mockGenAI: any;

  beforeEach(() => {
    vi.restoreAllMocks();

    mockConfig = {
      get: vi.fn((key: string) => {
        if (key === "GEMINI_API_KEY" || key === "GOOGLE_GEMINI_API_KEY") return "fake-gemini-key";
        if (key === "OPENAI_API_KEY") return "fake-openai-key";
        return "";
      }),
    };

    mockPrisma = {
      conversation: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      message: {
        create: vi.fn().mockResolvedValue({ id: "msg-1" }),
      },
      product: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    mockWhatsappCloud = {
      downloadWhatsappMedia: vi.fn(),
      registerMediaBuffer: vi.fn(),
      sendTextMessage: vi.fn().mockResolvedValue(true),
    };

    mockAiUsage = {
      logUsage: vi.fn().mockResolvedValue(undefined),
    };

    mockBillExtractor = {
      parseBillTextWithAI: vi.fn(),
    };

    service = new WhatsappBotService(
      mockConfig,
      mockPrisma,
      mockWhatsappCloud,
      {} as any,
      mockAiUsage,
      {} as any,
      mockBillExtractor,
      {} as any
    );

    // Mock do Gemini genAI
    mockGenAI = {
      getGenerativeModel: vi.fn(),
    };
    (service as any).genAI = mockGenAI;
  });

  describe("transcribeAudioWithGemini", () => {
    it("deve transcrever áudio com Gemini 2.0/1.5 Flash limpando parâmetros de codec do mimeType", async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue({
        response: {
          text: () => "Quero cotar 15 kWp telhado metálico trifásico 380V em Florianópolis",
          usageMetadata: {
            promptTokenCount: 150,
            candidatesTokenCount: 25,
            totalTokenCount: 175,
          },
        },
      });

      mockGenAI.getGenerativeModel.mockReturnValue({
        generateContent: mockGenerateContent,
      });

      const audioBuffer = Buffer.from("fake-ogg-audio-data");
      const result = await service.transcribeAudioWithGemini(
        audioBuffer,
        "audio/ogg; codecs=opus",
        "tenant-123"
      );

      expect(result).toBe("Quero cotar 15 kWp telhado metálico trifásico 380V em Florianópolis");
      expect(mockGenAI.getGenerativeModel).toHaveBeenCalledWith({ model: "gemini-2.0-flash" });
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);

      // Confirma que o mimeType enviado foi limpo sem "; codecs=opus"
      const callArgs = mockGenerateContent.mock.calls[0][0];
      expect(callArgs[0].inlineData.mimeType).toBe("audio/ogg");
      expect(callArgs[0].inlineData.data).toBe(audioBuffer.toString("base64"));

      // Confirma registro de uso com AiFeature.AUDIO_TRANSCRIPTION
      expect(mockAiUsage.logUsage).toHaveBeenCalledWith({
        organizationId: "tenant-123",
        provider: "google",
        feature: AiFeature.AUDIO_TRANSCRIPTION,
        model: "gemini-2.0-flash",
        promptTokens: 150,
        completionTokens: 25,
        totalTokens: 175,
        latencyMs: expect.any(Number),
        status: "SUCCESS",
      });
    });

    it("deve retornar null quando o Gemini indicar que o áudio foi inaudível", async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue({
        response: {
          text: () => "[inaudível]",
          usageMetadata: {},
        },
      });

      mockGenAI.getGenerativeModel.mockReturnValue({
        generateContent: mockGenerateContent,
      });

      const audioBuffer = Buffer.from("silent-audio");
      const result = await service.transcribeAudioWithGemini(audioBuffer, "audio/mp4");

      expect(result).toBeNull();
    });

    it("deve tentar modelo de fallback (gemini-1.5-flash) se o primeiro modelo falhar", async () => {
      const mockFail = vi.fn().mockRejectedValue(new Error("503 Service Unavailable"));
      const mockSuccess = vi.fn().mockResolvedValue({
        response: {
          text: () => "Telhado colonial em Maringá PR",
          usageMetadata: {},
        },
      });

      mockGenAI.getGenerativeModel
        .mockReturnValueOnce({ generateContent: mockFail })
        .mockReturnValueOnce({ generateContent: mockSuccess });

      const audioBuffer = Buffer.from("audio-bytes");
      const result = await service.transcribeAudioWithGemini(audioBuffer);

      expect(result).toBe("Telhado colonial em Maringá PR");
      expect(mockGenAI.getGenerativeModel).toHaveBeenCalledWith({ model: "gemini-2.0-flash" });
      expect(mockGenAI.getGenerativeModel).toHaveBeenCalledWith({ model: "gemini-1.5-flash" });
    });
  });

  describe("handleEvolutionWebhookPayload com áudio / PTT", () => {
    it("deve registrar buffer e encaminhar áudio push-to-talk (pttMessage) para processamento", async () => {
      const spyProcessSingle = vi
        .spyOn(service as any, "processSingleMessage")
        .mockResolvedValue(undefined);

      const payload = {
        event: "messages.upsert",
        instance: "energiv-bot",
        data: {
          key: { id: "audio_msg_999", remoteJid: "5544999998888@s.whatsapp.net" },
          pushName: "Gabriel Integrador",
          message: {
            pttMessage: {
              mimetype: "audio/ogg; codecs=opus",
              base64: Buffer.from("meu-audio-base64").toString("base64"),
            },
          },
        },
      };

      await service.handleEvolutionWebhookPayload(payload);

      expect(mockWhatsappCloud.registerMediaBuffer).toHaveBeenCalledWith(
        "audio_msg_999",
        expect.any(Buffer),
        "audio/ogg; codecs=opus"
      );
      expect(spyProcessSingle).toHaveBeenCalledTimes(1);
      const callArg = spyProcessSingle.mock.calls[0][0];
      expect(callArg.message.type).toBe("audio");
      expect(callArg.message.audio.id).toBe("audio_msg_999");
    });

    it("processSingleMessage deve baixar áudio, transcrever via Gemini e salvar mensagem com metadados de áudio", async () => {
      vi.spyOn(service as any, "resolveAuthorizedTenant").mockResolvedValue({
        id: "org-demo",
        name: "Solar Demo",
      });

      vi.spyOn(service as any, "isTenantPlanActive").mockResolvedValue({
        active: true,
        planName: "Pro",
      });

      mockPrisma.whatsappInboundMessage = {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "inbound-1" }),
      };

      mockWhatsappCloud.downloadWhatsappMedia.mockResolvedValue({
        buffer: Buffer.from("audio-gravado-do-integrador"),
        mimeType: "audio/ogg",
      });

      const spyTranscribe = vi
        .spyOn(service, "transcribeAudioWithGemini")
        .mockResolvedValue("Quero cotar 10 kWp em Londrina telhado colonial");

      const spyGenerateBotResponse = vi
        .spyOn(service as any, "generateBotResponse")
        .mockResolvedValue("Cotação gerada com sucesso");

      const conversation = {
        id: "conv-audio-1",
        organizationId: "org-demo",
        title: "5544999998888",
        messages: [],
      };

      mockPrisma.conversation.findFirst.mockResolvedValue(conversation);
      mockPrisma.conversation.findUnique.mockResolvedValue(conversation);

      await (service as any).processSingleMessage({
        message: {
          id: "wamid.audio123",
          from: "5544999998888",
          type: "audio",
          audio: { id: "media_audio_777", mime_type: "audio/ogg" },
        },
        phoneNumberId: "phone_1",
        contactName: "Felipe",
      });

      expect(mockWhatsappCloud.downloadWhatsappMedia).toHaveBeenCalledWith("media_audio_777");
      expect(spyTranscribe).toHaveBeenCalledWith(expect.any(Buffer), "audio/ogg", "org-demo");

      // Deve ter salvo a mensagem do usuário no banco com o texto falado e metadados de áudio
      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          conversationId: "conv-audio-1",
          role: "user",
          content: "Quero cotar 10 kWp em Londrina telhado colonial",
          channel: "whatsapp",
          metadata: {
            isAudio: true,
            originalAudioId: "media_audio_777",
            transcription: "Quero cotar 10 kWp em Londrina telhado colonial",
          },
        }),
      });

      // O bot deve responder ao texto transcrito
      expect(spyGenerateBotResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          incomingText: "Quero cotar 10 kWp em Londrina telhado colonial",
        })
      );
    });
  });

  describe("generateBotResponse para áudio inaudível", () => {
    it("deve retornar mensagem amigável e instrutiva se o áudio não pôde ser compreendido", async () => {
      const conv = {
        id: "conv-1",
        organizationId: "org-1",
        title: "5544999998888",
        messages: [],
      };

      const reply = await (service as any).generateBotResponse({
        conversation: conv,
        incomingText: "[Mensagem de áudio recebida]",
        contactName: "Lucas",
      });

      expect(reply).toContain("Não consegui compreender o áudio com clareza. 🎙️");
      expect(reply).toContain("Pode me enviar outro áudio com a sua solicitação");
      expect(reply).toContain("digitar os dados da cotação");
    });
  });

  describe("Priorização de IA em answerFreeformQuestion", () => {
    it("deve priorizar Google Gemini para responder dúvidas técnicas e de catálogo sem gastar créditos OpenAI", async () => {
      const mockGenerateContent = vi.fn().mockResolvedValue({
        response: {
          text: () => "Temos inversores Growatt e Deye monofásicos e trifásicos à pronta entrega.",
          usageMetadata: {
            promptTokenCount: 100,
            candidatesTokenCount: 20,
            totalTokenCount: 120,
          },
        },
      });

      mockGenAI.getGenerativeModel.mockReturnValue({
        generateContent: mockGenerateContent,
      });

      const reply = await (service as any).answerFreeformQuestion({
        userQuestion: "Vocês têm inversor de 5kW em estoque?",
        organizationId: "tenant-1",
      });

      expect(reply).toBe(
        "Temos inversores Growatt e Deye monofásicos e trifásicos à pronta entrega."
      );
      expect(mockGenAI.getGenerativeModel).toHaveBeenCalledWith({ model: "gemini-2.0-flash" });
      expect(mockAiUsage.logUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "google",
          model: "gemini-2.0-flash",
        })
      );
    });
  });

  describe("Priorização de IA em extractFromMediaImage", () => {
    it("deve utilizar Gemini Vision em primeiro lugar para fotos de faturas", async () => {
      mockWhatsappCloud.downloadWhatsappMedia.mockResolvedValue({
        buffer: Buffer.from("imagem-fatura-teste"),
        mimeType: "image/jpeg",
      });

      const mockGenerateContent = vi.fn().mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              nome_cliente: "Carlos Silva",
              distribuidora: "Copel",
              cidade: "Curitiba",
              uf: "PR",
              consumo_mes_atual_kwh: 650,
              tipo_conexao: "Bifásico",
              historico_consumo: [{ mes_ano: "Jan/26", consumo_kwh: 650 }],
            }),
        },
      });

      mockGenAI.getGenerativeModel.mockReturnValue({
        generateContent: mockGenerateContent,
      });

      const result = await (service as any).extractFromMediaImage("img-media-1");

      expect(result).toBeDefined();
      expect(result.isValidForSizing).toBe(true);
      expect(result.exactAverageKwh).toBe(650);
      expect(mockGenAI.getGenerativeModel).toHaveBeenCalledWith({ model: "gemini-2.0-flash" });
    });
  });
});
