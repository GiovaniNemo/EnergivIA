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

const BILL_EXTRACTION_PROMPT = `Você é um motor especialista em visão computacional e extração forense de dados estruturados de faturas de energia elétrica brasileiras (Copel, Enel, CPFL, Cemig, Equatorial, Energisa, Neoenergia, Light, EDP, RGE, Celesc, etc.).
Sua missão é extrair com máxima precisão os dados da fatura para o integrador de energia solar:
1. "distribuidora": Nome da concessionária (ex: "Copel", "Enel", "CPFL", "Cemig")
2. "cidade": Nome da cidade da unidade consumidora
3. "estado": UF com 2 letras (ex: "PR", "SP", "MG")
4. "tipoConexao": "Monofásico", "Bifásico" ou "Trifásico"
5. "nomeCliente": Nome completo do titular da conta
6. "historicoConsumo": Array numérico com o consumo em kWh de CADA UM dos meses da tabela de histórico (ex: [520, 610, 480, 550, ...])
7. "consumoKwh": Média aritmética real de todos os meses do histórico (se houver) ou o consumo do mês atual.

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

const WHATSAPP_INTEGRATOR_SYSTEM_PROMPT = `Você é o Assistente Especialista de Engenharia e Vendas Solares da EnergivIA. 
Seu interlocutor é o INTEGRADOR SOLAR (e NÃO o cliente final). Você existe para ajudar o integrador a dimensionar kits solares, orçar com distribuidores, cadastrar clientes no CRM e gerar propostas comerciais completas em segundos.

TOM E ESTILO:
- Curto, direto, comercial e profissional para WhatsApp.
- Trate o usuário sempre como parceiro integrador solar (ex: "o seu cliente", "para a instalação do seu cliente").
- NUNCA assuma que o usuário é quem vai pagar a conta ou quem quer economizar; ele é a empresa/profissional de energia solar vendendo para o cliente final dele.

FLUXO PRINCIPAL:
1. INÍCIO DA CONVERSA:
   Se apresente como assistente do integrador:
   "Olá! Sou seu assistente de vendas e dimensionamento da EnergivIA. Como posso ajudar você a gerar orçamentos e propostas para seus clientes hoje?"
   Peça a fatura (PDF ou foto) ou o consumo médio do cliente.

2. AO RECEBER A CONTA DE LUZ (PDF OU FOTO):
   Diga: "Legal, dados extraídos com precisão! Consumo médio de [X] kWh/mês em [Cidade/UF] (baseado no histórico de [N] meses da fatura)."
   Em seguida pergunte a estrutura:
   "Qual será a estrutura do telhado do cliente?
   1 - Cerâmica (Colonial)
   2 - Fibrocimento
   3 - Metálico
   4 - Solo
   5 - Laje
   6 - Fibrometal
   7 - Sem estrutura"

3. AO ESCOLHER A ESTRUTURA:
   Pergunte: "Qual o nome do cliente final para eu registrar no seu CRM?"

4. AO RECEBER O NOME:
   Pergunte: "Certo, vou registrar o cliente [Nome]. E qual o WhatsApp dele?"

5. AO RECEBER O WHATSAPP:
   Confirme o cadastro do lead e pergunte qual modelo de proposta deseja gerar.`;

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
            contactName: contacts[0]?.profile?.name || "Integrador",
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

    // 1. Dedup
    const existing = await this.prisma.whatsappInboundMessage.findUnique({
      where: { waMessageId },
    });
    if (existing) {
      this.logger.debug(`Mensagem duplicada já processada: ${waMessageId}`);
      return;
    }

    // 2. Tenant
    const defaultTenant = await this.prisma.tenant.findFirst();
    if (!defaultTenant) {
      this.logger.error("Nenhum Tenant encontrado no banco de dados.");
      return;
    }

    // 3. Conversation
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

    await this.prisma.whatsappInboundMessage.create({
      data: {
        waMessageId,
        conversationId: conversation.id,
      },
    });

    // 4. Extração de Conteúdo
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
        this.logger.log(`Resultado extração PDF: ${JSON.stringify(extractedBillData)}`);
      }
    } else if (msgType === "image") {
      const img = message.image;
      incomingText = `[Foto enviada: ${img?.caption || "Foto da fatura"}]`;
      if (img?.id) {
        this.logger.log(`Iniciando extração da imagem mediaId=${img.id}`);
        extractedBillData = await this.extractFromMediaImage(img.id, img.mime_type);
        this.logger.log(`Resultado extração imagem: ${JSON.stringify(extractedBillData)}`);
      }
    } else if (msgType === "audio" || msgType === "voice") {
      incomingText = "[Mensagem de áudio recebida]";
    } else {
      incomingText = `[Mensagem do tipo ${msgType} recebida]`;
    }

    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: incomingText,
        channel: "whatsapp",
        metadata: extractedBillData ? { extractedBillData: { ...extractedBillData } } : undefined,
      },
    });

    // 5. Gera resposta com a persona do Integrador
    const replyText = await this.generateBotResponse({
      incomingText,
      extractedBillData,
    });

    if (replyText) {
      await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          content: replyText,
          channel: "whatsapp",
        },
      });

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
                content: `Extraia com máxima precisão todos os dados e histórico de consumo do seguinte texto de fatura de energia:\n\n${pdfText.slice(0, 8000)}`,
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
                  text: "Extraia com máxima precisão os dados e histórico de consumo da conta de luz.",
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
    // 1. Se extraiu fatura com sucesso
    if (extractedBillData && extractedBillData.consumoKwh && extractedBillData.consumoKwh > 0) {
      const cidade = extractedBillData.cidade
        ? `${extractedBillData.cidade}${extractedBillData.estado ? `/${extractedBillData.estado}` : ""}`
        : "a região informada";
      const kwh = extractedBillData.consumoKwh;
      const mesesTexto = extractedBillData.mesesIdentificados
        ? ` (baseado no histórico de ${extractedBillData.mesesIdentificados} meses da fatura)`
        : "";

      return (
        `Legal, dados extraídos com precisão! 📄⚡\n` +
        `Consumo médio de *${kwh} kWh/mês* em *${cidade}*${mesesTexto}.\n\n` +
        `Qual será a estrutura do telhado para a instalação do seu cliente?\n` +
        `1 - Cerâmica (Colonial)\n` +
        `2 - Fibrocimento\n` +
        `3 - Metálico\n` +
        `4 - Solo\n` +
        `5 - Laje\n` +
        `6 - Fibrometal\n` +
        `7 - Sem estrutura`
      );
    }

    // 2. Saudação para o Integrador
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
        `Olá! Sou seu assistente de vendas e dimensionamento da EnergivIA. ☀️\n\n` +
        `Como posso ajudar você a gerar orçamentos e propostas para seus clientes hoje?\n\n` +
        `Você pode me enviar o *PDF da fatura*, uma *foto da conta de luz* ou digitar o *consumo médio em kWh* do seu cliente para gerarmos uma simulação rápida!`
      );
    }

    // 3. Estrutura do Telhado informada
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
        `Qual o nome do cliente final para eu registrar no seu CRM?`
      );
    }

    // 4. Consumo digitado pelo Integrador
    const kwhMatch = incomingText.match(/(\d+[\d.,]*)\s*(kwh|kw|reais|r\$)?/i);
    const kwhStr = kwhMatch?.[1];
    if (kwhStr && Number(kwhStr.replace(",", ".")) > 50) {
      const consumo = Math.round(Number(kwhStr.replace(",", ".")));
      return (
        `Ótimo! Consumo do cliente registrado: *${consumo} kWh/mês*.\n\n` +
        `Qual será a estrutura do telhado para a instalação?\n` +
        `1 - Cerâmica (Colonial)\n` +
        `2 - Fibrocimento\n` +
        `3 - Metálico\n` +
        `4 - Solo\n` +
        `5 - Laje\n` +
        `6 - Fibrometal\n` +
        `7 - Sem estrutura`
      );
    }

    // 5. Fallback com OpenAI mantendo estritamente a persona do Integrador
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
            temperature: 0.2,
            messages: [
              {
                role: "system",
                content: WHATSAPP_INTEGRATOR_SYSTEM_PROMPT,
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

    return `Entendi! Para montarmos o orçamento do seu cliente, envie a fatura (PDF ou foto) ou me informe o consumo médio em kWh.`;
  }
}
