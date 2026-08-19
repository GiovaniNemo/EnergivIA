import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { WhatsappCloudService } from "./whatsapp-cloud.service";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pdfParse from "pdf-parse";

interface ExtractedBillData {
  cidade?: string;
  estado?: string;
  consumoKwh?: number;
  tipoConexao?: string;
}

interface WebhookMessage {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  document?: { id?: string; filename?: string; mime_type?: string };
  image?: { id?: string; caption?: string; mime_type?: string };
  audio?: { id?: string };
  voice?: { id?: string };
}

interface WebhookPayload {
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: Array<{ profile?: { name?: string } }>;
        messages?: WebhookMessage[];
      };
    }>;
  }>;
}

@Injectable()
export class WhatsappBotService {
  private readonly logger = new Logger(WhatsappBotService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly whatsappCloud: WhatsappCloudService
  ) {
    const geminiKey =
      this.config.get<string>("GOOGLE_GEMINI_API_KEY") ||
      this.config.get<string>("GEMINI_API_KEY") ||
      "";
    if (geminiKey) {
      this.genAI = new GoogleGenerativeAI(geminiKey);
    }
  }

  async handleWebhookPayload(payload: WebhookPayload): Promise<void> {
    if (!payload || !payload.entry || !Array.isArray(payload.entry)) {
      return;
    }

    for (const entry of payload.entry) {
      const changes = entry.changes;
      if (!changes || !Array.isArray(changes)) continue;

      for (const change of changes) {
        if (change.field !== "messages") continue;
        const val = change.value;
        if (!val || !val.messages || !Array.isArray(val.messages)) continue;

        const metadata = val.metadata;
        const phoneNumberId = metadata?.phone_number_id || "";
        const contacts = val.contacts || [];

        for (const message of val.messages) {
          await this.processSingleMessage({
            message,
            phoneNumberId,
            contactName: contacts[0]?.profile?.name || "Cliente",
          });
        }
      }
    }
  }

  private async processSingleMessage({
    message,
    phoneNumberId,
    contactName,
  }: {
    message: WebhookMessage;
    phoneNumberId: string;
    contactName: string;
  }): Promise<void> {
    const waMessageId = message.id;
    const fromWaId = message.from;
    const msgType = message.type;

    if (!waMessageId || !fromWaId) return;

    // 1. Dedup: verifica se a mensagem já foi processada
    const existing = await this.prisma.whatsappInboundMessage.findUnique({
      where: { waMessageId },
    });
    if (existing) {
      this.logger.debug(`Mensagem duplicada já processada: ${waMessageId}`);
      return;
    }

    // 2. Busca ou define a Organização/Tenant
    const defaultTenant = await this.prisma.tenant.findFirst();
    if (!defaultTenant) {
      this.logger.error("Nenhum Tenant/Organização encontrado no banco de dados.");
      return;
    }

    // 3. Busca ou cria a Conversation (WhatsApp)
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        organizationId: defaultTenant.id,
        channel: "whatsapp",
        title: fromWaId,
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          organizationId: defaultTenant.id,
          channel: "whatsapp",
          title: fromWaId,
          metadata: {
            customerWaId: fromWaId,
            contactName,
            phoneNumberId,
          },
        },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
    }

    // Registra o ID da mensagem para evitar duplicidade
    await this.prisma.whatsappInboundMessage.create({
      data: {
        waMessageId,
        conversationId: conversation.id,
      },
    });

    // 4. Extrai o conteúdo da mensagem (Texto, Documento/Fatura, Imagem, Áudio)
    let incomingText = "";
    let extractedBillData: ExtractedBillData | null = null;

    if (msgType === "text") {
      incomingText = message.text?.body || "";
    } else if (msgType === "document") {
      const doc = message.document;
      incomingText = `[Documento enviado: ${doc?.filename || "fatura.pdf"}]`;
      if (doc?.id) {
        extractedBillData = await this.extractFromMediaDocument(doc.id, doc.mime_type);
      }
    } else if (msgType === "image") {
      const img = message.image;
      incomingText = `[Foto enviada: ${img?.caption || "Foto da fatura"}]`;
      if (img?.id) {
        extractedBillData = await this.extractFromMediaImage(img.id, img.mime_type);
      }
    } else if (msgType === "audio" || msgType === "voice") {
      incomingText = "[Mensagem de áudio recebida]";
    } else {
      incomingText = `[Mensagem do tipo ${msgType} recebida]`;
    }

    // Registra a mensagem do usuário no banco
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: incomingText,
        channel: "whatsapp",
        metadata: extractedBillData ? { extractedBillData: { ...extractedBillData } } : undefined,
      },
    });

    // 5. Gera a resposta do Chatbot
    const replyText = await this.generateBotResponse({
      incomingText,
      extractedBillData,
    });

    if (replyText) {
      // Salva a resposta do assistente
      await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          content: replyText,
          channel: "whatsapp",
        },
      });

      // Envia via WhatsApp Cloud API
      await this.whatsappCloud.sendTextMessage({
        phoneNumberId,
        toWaId: fromWaId,
        body: replyText,
      });
    }
  }

  private async extractFromMediaDocument(
    mediaId: string,
    mimeType?: string
  ): Promise<ExtractedBillData | null> {
    try {
      const media = await this.whatsappCloud.downloadWhatsappMedia(mediaId);
      if (!media || !media.buffer) return null;

      if (media.mimeType.includes("pdf") || mimeType?.includes("pdf")) {
        const parsed = await pdfParse(media.buffer);
        const text = parsed.text;
        return this.parseBillTextWithAI(text);
      }
    } catch (e) {
      this.logger.error("Erro extraindo PDF da fatura:", e);
    }
    return null;
  }

  private async extractFromMediaImage(
    mediaId: string,
    mimeType?: string
  ): Promise<ExtractedBillData | null> {
    try {
      const media = await this.whatsappCloud.downloadWhatsappMedia(mediaId);
      if (!media || !media.buffer || !this.genAI) return null;

      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt =
        'Extraia os dados desta conta de luz de energia solar: Cidade, Estado, Consumo Médio em kWh (ou histórico de consumo em kWh), Tipo de Fornecimento (Monofásico, Bifásico, Trifásico). Retorne estritamente em formato JSON: { "cidade": string, "estado": string, "consumoKwh": number, "tipoConexao": string }';

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: media.buffer.toString("base64"),
            mimeType: media.mimeType || mimeType || "image/jpeg",
          },
        },
      ]);

      const respText = result.response.text();
      const cleanJson = respText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      return JSON.parse(cleanJson) as ExtractedBillData;
    } catch (e) {
      this.logger.error("Erro extraindo imagem da fatura:", e);
    }
    return null;
  }

  private async parseBillTextWithAI(pdfText: string): Promise<ExtractedBillData | null> {
    if (!this.genAI || !pdfText) return null;
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Analise o seguinte texto extraído de uma conta de luz e extraia:
1. Cidade e Estado (UF)
2. Média mensal real de consumo em kWh (número)
3. Tipo de fornecimento/ligação (Monofásico, Bifásico, Trifásico)
Texto da fatura:
${pdfText.slice(0, 4000)}

Retorne APENAS um JSON no formato:
{ "cidade": "Nome", "estado": "UF", "consumoKwh": 500, "tipoConexao": "Bifásico" }`;

      const result = await model.generateContent(prompt);
      const respText = result.response.text();
      const cleanJson = respText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      return JSON.parse(cleanJson) as ExtractedBillData;
    } catch (err) {
      this.logger.error("Erro analisando texto da fatura com IA:", err);
      return null;
    }
  }

  private async generateBotResponse({
    incomingText,
    extractedBillData,
  }: {
    incomingText: string;
    extractedBillData: ExtractedBillData | null;
  }): Promise<string> {
    if (extractedBillData && extractedBillData.consumoKwh) {
      const cidade = extractedBillData.cidade || "sua cidade";
      const estado = extractedBillData.estado || "seu estado";
      const kwh = extractedBillData.consumoKwh;

      return (
        `Legal, dados extraídos com precisão! 📄⚡\n` +
        `Identifiquei um consumo médio de *${kwh} kWh/mês* em *${cidade}/${estado}*.\n\n` +
        `Qual será a estrutura do telhado para instalarmos os painéis?\n` +
        `1 - Cerâmica (Colonial)\n` +
        `2 - Fibrocimento\n` +
        `3 - Metálico\n` +
        `4 - Solo\n` +
        `5 - Laje\n` +
        `6 - Fibrometal\n` +
        `7 - Sem estrutura`
      );
    }

    // Se for mensagem de saudação ou texto livre
    const lower = incomingText.toLowerCase().trim();
    if (
      lower === "oi" ||
      lower === "olá" ||
      lower === "ola" ||
      lower === "bom dia" ||
      lower === "boa tarde" ||
      lower === "boa noite"
    ) {
      return (
        `Olá! Sou o consultor especialista em energia solar da EnergivIA. ☀️\n\n` +
        `Como posso te ajudar a economizar até 95% na sua conta de luz hoje?\n\n` +
        `Você pode me enviar o *PDF da sua fatura*, uma *foto da conta de luz* ou digitar o seu *consumo médio em kWh* para gerarmos uma simulação rápida!`
      );
    }

    // Se o usuário digitou a estrutura do telhado (número ou nome)
    if (
      [
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "cerâmica",
        "fibrocimento",
        "metálico",
        "solo",
        "laje",
      ].some((k) => lower.includes(k))
    ) {
      return (
        `Perfeito! Estrutura identificada.\n` +
        `Estamos calculando o dimensionamento ideal e consultando a disponibilidade dos distribuidores...\n\n` +
        `Para registrarmos a simulação no sistema, qual é o seu nome completo?`
      );
    }

    // Fallback inteligente com IA se disponível
    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const systemInstruction =
          "Você é o consultor de energia solar da EnergivIA no WhatsApp. Seja sempre curto, direto, cordial e comercial. Incentive o cliente a enviar a conta de luz (PDF ou foto) ou informar o consumo em kWh para gerar uma proposta.";
        const result = await model.generateContent(
          `${systemInstruction}\n\nCliente disse: "${incomingText}"`
        );
        return result.response.text();
      } catch (e) {
        this.logger.error("Erro gerando resposta genAI:", e);
      }
    }

    return `Entendi! Para montarmos sua proposta solar personalizada, por favor envie a foto ou PDF da sua conta de energia, ou me diga seu consumo médio mensal em kWh.`;
  }
}
