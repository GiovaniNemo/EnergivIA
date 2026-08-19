import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { WhatsappCloudService } from "./whatsapp-cloud.service";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pdfParse from "pdf-parse";

interface ExtractedBillData {
  distribuidora?: string;
  cidade?: string;
  estado?: string;
  consumoKwh?: number;
  tipoConexao?: string;
  mesesIdentificados?: number;
  nomeCliente?: string;
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

const BILL_EXTRACTION_PROMPT = `Você é um motor especialista em extração de dados estruturados de faturas de energia elétrica brasileiras (Copel, Enel, CPFL, Cemig, Equatorial, Energisa, Light, etc.).
Extraia com máxima precisão os dados da fatura:
1. "distribuidora": Nome da concessionária (ex: "Copel", "Enel", "CPFL")
2. "cidade": Nome da cidade da instalação (ex: "Maringá", "Curitiba", "São Paulo")
3. "estado": UF com 2 letras (ex: "PR", "SP", "MG")
4. "tipoConexao": "Monofásico", "Bifásico" ou "Trifásico"
5. "nomeCliente": Nome do titular da conta
6. "historicoConsumo": Array com os consumos em kWh de todos os meses visíveis na tabela de histórico (ex: [450, 520, 480, 600, ...])
7. "consumoKwh": Média aritmética exata de todos os meses do histórico (se houver histórico) ou o consumo do mês atual.

Retorne estritamente um JSON no formato:
{
  "distribuidora": string,
  "cidade": string,
  "estado": string,
  "tipoConexao": string,
  "nomeCliente": string,
  "historicoConsumo": number[],
  "consumoKwh": number
}`;

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

    this.logger.log(`Mensagem recebida do WhatsApp: tipo=${msgType}, de=${fromWaId}`);

    if (msgType === "text") {
      incomingText = message.text?.body || "";
    } else if (msgType === "document") {
      const doc = message.document;
      incomingText = `[Documento enviado: ${doc?.filename || "fatura.pdf"}]`;
      if (doc?.id) {
        this.logger.log(`Iniciando extração do documento PDF mediaId=${doc.id}`);
        extractedBillData = await this.extractFromMediaDocument(doc.id, doc.mime_type);
        this.logger.log(`Resultado da extração do PDF: ${JSON.stringify(extractedBillData)}`);
      }
    } else if (msgType === "image") {
      const img = message.image;
      incomingText = `[Foto enviada: ${img?.caption || "Foto da fatura"}]`;
      if (img?.id) {
        this.logger.log(`Iniciando extração da imagem mediaId=${img.id}`);
        extractedBillData = await this.extractFromMediaImage(img.id, img.mime_type);
        this.logger.log(`Resultado da extração da imagem: ${JSON.stringify(extractedBillData)}`);
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
      if (!media || !media.buffer) {
        this.logger.warn(`Falha ao baixar mídia do WhatsApp para mediaId=${mediaId}`);
        return null;
      }

      if (media.mimeType.includes("pdf") || mimeType?.includes("pdf")) {
        const parsed = await pdfParse(media.buffer);
        const text = parsed.text;
        if (!text || text.trim().length === 0) {
          this.logger.warn("PDF não contém texto legível (pode ser escaneado como imagem).");
        }
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
      if (!media || !media.buffer) return null;

      const openAiKey = this.config.get<string>("OPENAI_API_KEY");
      if (openAiKey) {
        return this.extractImageWithOpenAI(
          media.buffer,
          media.mimeType || mimeType || "image/jpeg",
          openAiKey
        );
      }

      if (this.genAI) {
        const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent([
          BILL_EXTRACTION_PROMPT,
          {
            inlineData: {
              data: media.buffer.toString("base64"),
              mimeType: media.mimeType || mimeType || "image/jpeg",
            },
          },
        ]);

        const respText = result.response.text();
        return this.cleanAndParseJson(respText);
      }
    } catch (e) {
      this.logger.error("Erro extraindo imagem da fatura:", e);
    }
    return null;
  }

  private async parseBillTextWithAI(pdfText: string): Promise<ExtractedBillData | null> {
    if (!pdfText || pdfText.trim().length === 0) return null;

    // 1. Tenta OpenAI GPT-4o
    const openAiKey = this.config.get<string>("OPENAI_API_KEY");
    if (openAiKey) {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openAiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o",
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: BILL_EXTRACTION_PROMPT },
              {
                role: "user",
                content: `Extraia os dados da seguinte fatura de energia:\n\n${pdfText.slice(0, 8000)}`,
              },
            ],
          }),
        });

        if (response.ok) {
          const json = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const content = json.choices?.[0]?.message?.content;
          if (content) return this.cleanAndParseJson(content);
        }
      } catch (err) {
        this.logger.error("Erro extraindo texto com OpenAI:", err);
      }
    }

    // 2. Tenta Google Gemini
    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(
          `${BILL_EXTRACTION_PROMPT}\n\nTexto da fatura:\n${pdfText.slice(0, 8000)}`
        );
        const respText = result.response.text();
        return this.cleanAndParseJson(respText);
      } catch (err) {
        this.logger.error("Erro extraindo texto com Gemini:", err);
      }
    }

    return null;
  }

  private async extractImageWithOpenAI(
    buffer: Buffer,
    mimeType: string,
    apiKey: string
  ): Promise<ExtractedBillData | null> {
    try {
      const base64 = buffer.toString("base64");
      const dataUrl = `data:${mimeType};base64,${base64}`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: BILL_EXTRACTION_PROMPT },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extraia com máxima precisão todos os dados e o histórico de consumo desta conta de energia.",
                },
                { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
              ],
            },
          ],
        }),
      });

      if (response.ok) {
        const json = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = json.choices?.[0]?.message?.content;
        if (content) return this.cleanAndParseJson(content);
      }
    } catch (e) {
      this.logger.error("Erro extraindo imagem com OpenAI:", e);
    }
    return null;
  }

  private cleanAndParseJson(raw: string): ExtractedBillData | null {
    try {
      const clean = raw
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(clean);

      let consumoCalculado = Number(parsed.consumoKwh) || 0;
      let meses = 0;

      if (Array.isArray(parsed.historicoConsumo) && parsed.historicoConsumo.length > 0) {
        const validValues = parsed.historicoConsumo
          .map((v: unknown) => (typeof v === "number" ? v : Number(v)))
          .filter((v: number) => !isNaN(v) && v > 0);

        if (validValues.length > 0) {
          const sum = validValues.reduce((a: number, b: number) => a + b, 0);
          consumoCalculado = Math.round(sum / validValues.length);
          meses = validValues.length;
        }
      }

      return {
        distribuidora: parsed.distribuidora || undefined,
        cidade: parsed.cidade || undefined,
        estado: parsed.estado || undefined,
        consumoKwh: consumoCalculado,
        tipoConexao: parsed.tipoConexao || undefined,
        nomeCliente: parsed.nomeCliente || undefined,
        mesesIdentificados: meses > 0 ? meses : undefined,
      };
    } catch {
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
    if (extractedBillData && extractedBillData.consumoKwh && extractedBillData.consumoKwh > 0) {
      const cidade = extractedBillData.cidade
        ? `${extractedBillData.cidade}${extractedBillData.estado ? `/${extractedBillData.estado}` : ""}`
        : "sua região";
      const kwh = extractedBillData.consumoKwh;
      const mesesTexto = extractedBillData.mesesIdentificados
        ? ` (baseado no histórico de ${extractedBillData.mesesIdentificados} meses)`
        : "";

      return (
        `Legal, dados extraídos com precisão! 📄⚡\n` +
        `Consumo médio de *${kwh} kWh/mês* em *${cidade}*${mesesTexto}.\n\n` +
        `Qual será a estrutura do telhado para os painéis?\n` +
        `1 - Cerâmica (Colonial)\n` +
        `2 - Fibrocimento\n` +
        `3 - Metálico\n` +
        `4 - Solo\n` +
        `5 - Laje\n` +
        `6 - Fibrometal\n` +
        `7 - Sem estrutura`
      );
    }

    // Se for mensagem de saudação
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

    // Se o usuário respondeu a estrutura do telhado
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
        "ceramica",
        "fibrocimento",
        "metálico",
        "metalico",
        "solo",
        "laje",
        "fibrometal",
      ].some((k) => lower.includes(k))
    ) {
      return (
        `Perfeito! Estrutura selecionada. 🛠️\n` +
        `Estamos dimensionando o kit ideal com os melhores módulos e inversores dos distribuidores parceiros.\n\n` +
        `Qual o seu nome completo para registrarmos a simulação no sistema?`
      );
    }

    // Se o usuário digitou o consumo diretamente (ex: "500 kwh" ou "consome 650")
    const kwhMatch = incomingText.match(/(\d+[\d.,]*)\s*(kwh|kw|reais|r\$)?/i);
    const kwhStr = kwhMatch?.[1];
    if (kwhStr && Number(kwhStr.replace(",", ".")) > 50) {
      const consumo = Math.round(Number(kwhStr.replace(",", ".")));
      return (
        `Ótimo! Consumo registrado: *${consumo} kWh/mês*.\n\n` +
        `Qual será a estrutura do telhado?\n` +
        `1 - Cerâmica (Colonial)\n` +
        `2 - Fibrocimento\n` +
        `3 - Metálico\n` +
        `4 - Solo\n` +
        `5 - Laje\n` +
        `6 - Fibrometal\n` +
        `7 - Sem estrutura`
      );
    }

    // Resposta contextual com IA
    const openAiKey = this.config.get<string>("OPENAI_API_KEY");
    if (openAiKey) {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openAiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o",
            temperature: 0.3,
            messages: [
              {
                role: "system",
                content:
                  "Você é o consultor de energia solar da EnergivIA no WhatsApp. Seja sempre curto, direto, cordial e comercial. Incentive o cliente a enviar a conta de luz (PDF ou foto) ou informar o consumo em kWh para gerar uma proposta.",
              },
              { role: "user", content: incomingText },
            ],
          }),
        });

        if (response.ok) {
          const json = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const reply = json.choices?.[0]?.message?.content;
          if (reply) return reply;
        }
      } catch (err) {
        this.logger.error("Erro gerando resposta com OpenAI:", err);
      }
    }

    return `Entendi! Para montarmos sua proposta solar personalizada, por favor envie a foto ou PDF da sua conta de energia, ou me diga seu consumo médio mensal em kWh.`;
  }
}
