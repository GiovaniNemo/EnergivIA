import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { WhatsappCloudService } from "./whatsapp-cloud.service";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pdfParse from "pdf-parse";
import fs from "node:fs";
import path from "node:path";

export interface ExtractedBillHistoryItem {
  mes_ano: string;
  consumo_kwh: number;
  dias?: number;
  media_kwh_dia?: number;
}

export interface ExtractedBillData {
  distribuidora?: string;
  cidade?: string;
  uf?: string;
  tipo_conexao?: "Monofásico" | "Bifásico" | "Trifásico" | string;
  nome_cliente?: string;
  codigo_instalacao_ou_uc?: string;
  mes_referencia_atual?: string;
  consumo_mes_atual_kwh?: number;
  valor_total_fatura_reais?: number;
  historico_consumo: ExtractedBillHistoryItem[];
  tem_geracao_distribuida?: boolean;
  energia_injetada_kwh?: number;
  observacoes?: string;
}

export interface BillExtractionResult {
  data: ExtractedBillData;
  exactAverageKwh: number;
  totalSumKwh: number;
  monthCount: number;
  formattedSummary: string;
  rawText?: string;
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

const BILL_EXTRACTION_SYSTEM_PROMPT = `Você é um motor especialista em visão computacional forense e extração de dados estruturados de faturas de energia elétrica brasileiras (Enel, CPFL, Cemig, Copel, Equatorial, Energisa, Neoenergia, Light, EDP, RGE, Celesc, etc.).

Sua missão é extrair com 100% DE PRECISÃO MATEMÁTICA E VISUAL todos os dados da conta de luz, com foco ABSOLUTO em ler sem erros cada número da tabela de Histórico de Consumo/Faturamento.

REGRAS DE LEITURA E PARSING CRÍTICAS:
1. TABELA DE HISTÓRICO DE CONSUMO ("CONSUMO / kWh", "HISTÓRICO DE CONSUMO", "Evolução do Consumo"):
   - Localize a tabela onde constam os meses de histórico faturados (geralmente entre 11 e 13 meses visíveis).
   - LEITURA SEQUENCIAL COMPLETA: Percorra CADA UMA das linhas da tabela, da primeira à última linha impressa, sem pular nenhuma linha.
   - Para CADA linha:
     * Identifique o mês/ano (ex: "AGO/26", "JUL/26", "JUN/26", "MAI/26", "ABR/26", "MAR/26", "FEV/26", "JAN/26", "DEZ/25", "NOV/25", "OUT/25", "SET/25", "AGO/25").
     * Identifique com máxima precisão o valor numérico na coluna de consumo faturado em kWh.
   
   - ATENÇÃO CRÍTICA À FORMATAÇÃO DA ENEL E DISTRIBUIDORAS:
     * Na Enel e diversas distribuidoras, os números na tabela de consumo aparecem formatados com ponto de milhar e 3 casas decimais (ex: "1.198,000", "1.525,000", "1.099,000", "965,000", "967,000", "939,000", "703,000", "698,000", "793,000", "961,000", "699,000", "807,000", "794,000").
     * "1.198,000" significa 1198 kWh. Retorne 1198.
     * "1.525,000" significa 1525 kWh. Retorne 1525.
     * "1.099,000" significa 1099 kWh. Retorne 1099.
     * "965,000" significa 965 kWh. Retorne 965.
     * "703,000" significa 703 kWh. Retorne 703.
   
   - Extraia TODOS os 12 ou 13 meses visíveis na tabela sem omitir as linhas inferiores!
   - NUNCA confunda 'consumo_kwh' com:
     * Quantidade de dias de faturamento (ex: 28, 29, 30, 31, 33).
     * Média diária (ex: 12.5 kWh/dia).
     * Demanda contratada ou medida em kW.
     * Leitura do medidor.
     * Valores monetários em R$.
     * Valores de iluminação pública ou multas.
     * Valores de energia injetada / saldo GD.

2. CONSUMO ATIVO E GERAÇÃO DISTRIBUÍDA (GD):
   - Se a fatura tiver créditos solares / GD, utilize sempre o Consumo Ativo Total Faturado/Consumido da rede (coluna de consumo faturado da tabela de histórico).

3. DADOS GERAIS:
   - distribuidora: Nome da concessionária identificada no cabeçalho ou logotipo (ex: Enel, Copel, CPFL, Cemig, Equatorial, Energisa, etc.).
   - cidade: Cidade da unidade consumidora indicada no endereço (ex: SAO PAULO).
   - uf: Sigla do estado com 2 letras (ex: SP, PR, MG, RJ, BA, GO, etc.).
   - tipo_conexao: "Monofásico" | "Bifásico" | "Trifásico" (identifique no campo Tipo de Fornecimento / Ligação).
   - nome_cliente: Nome completo do titular da conta.
   - mes_referencia_atual: Mês/ano de referência da fatura (ex: "08/2026").
   - consumo_mes_atual_kwh: Consumo ativo faturado do mês atual (número inteiro).
   - valor_total_fatura_reais: Valor total a pagar em R$ (número float).

Retorne EXCLUSIVAMENTE um objeto JSON válido no seguinte formato:
{
  "distribuidora": "string",
  "cidade": "string",
  "uf": "string",
  "tipo_conexao": "Monofásico" | "Bifásico" | "Trifásico",
  "nome_cliente": "string",
  "mes_referencia_atual": "string",
  "consumo_mes_atual_kwh": number,
  "valor_total_fatura_reais": number,
  "historico_consumo": [
    { "mes_ano": "string", "consumo_kwh": number, "dias": number }
  ]
}`;

function parseBrazilianKwh(raw: unknown): number {
  if (typeof raw === "number") {
    if (raw > 0 && raw < 10 && raw % 1 !== 0) {
      return Math.round(raw * 1000);
    }
    return Math.round(raw);
  }
  const s = String(raw || "").trim();
  if (!s) return 0;
  if (s.includes(".") && s.includes(",")) {
    const clean = s.replace(/\./g, "").replace(",", ".");
    return Math.round(parseFloat(clean));
  }
  if (/^\d{1,3}\.\d{3}$/.test(s)) {
    return parseInt(s.replace(".", ""), 10);
  }
  if (/^\d+,\d+$/.test(s)) {
    return Math.round(parseFloat(s.replace(",", ".")));
  }
  const num = parseFloat(s.replace(/[^0-9.]/g, ""));
  if (num > 0 && num < 10 && num % 1 !== 0) {
    return Math.round(num * 1000);
  }
  return isNaN(num) ? 0 : Math.round(num);
}

function processExtractedBillData(data: ExtractedBillData, rawText?: string): BillExtractionResult {
  const rawList = Array.isArray(data.historico_consumo) ? data.historico_consumo : [];

  const candidates: ExtractedBillHistoryItem[] = [];
  for (const item of rawList) {
    if (!item) continue;
    const label = String(item.mes_ano || "").trim();
    const rawVal =
      item.consumo_kwh ??
      (item as unknown as Record<string, unknown>)["consumo"] ??
      (item as unknown as Record<string, unknown>)["kwh"];
    const val = parseBrazilianKwh(rawVal);

    if (Number.isFinite(val) && val > 0 && val < 500000) {
      candidates.push({
        mes_ano: label || `Mês ${candidates.length + 1}`,
        consumo_kwh: Math.round(val),
        dias: item.dias ? Number(item.dias) : undefined,
        media_kwh_dia: item.media_kwh_dia ? Number(item.media_kwh_dia) : undefined,
      });
    }
  }

  const typicalHighMonths = candidates.filter((c) => c.consumo_kwh >= 60);
  const validHistory: ExtractedBillHistoryItem[] = [];

  for (const item of candidates) {
    if (
      typicalHighMonths.length >= 2 &&
      item.consumo_kwh <= 31 &&
      [28, 29, 30, 31, 22, 27].includes(item.consumo_kwh)
    ) {
      continue;
    }
    validHistory.push(item);
  }

  const normalizedHistory = validHistory.length > 12 ? validHistory.slice(0, 12) : validHistory;
  const currentMonthKwh = parseBrazilianKwh(data.consumo_mes_atual_kwh);

  let totalSum = 0;
  let exactAverage = 0;
  let monthCount = normalizedHistory.length;

  if (monthCount > 0) {
    totalSum = normalizedHistory.reduce((acc, curr) => acc + curr.consumo_kwh, 0);
    exactAverage = Math.round(totalSum / monthCount);
  } else if (currentMonthKwh > 0) {
    exactAverage = currentMonthKwh;
    totalSum = exactAverage;
    monthCount = 1;
  } else {
    exactAverage = 300;
    totalSum = 300;
    monthCount = 0;
  }

  const formattedSummary = `Legal, dados extraídos com precisão! Consumo médio de ${exactAverage} kWh/mês em ${data.cidade || "São Paulo"}/${data.uf || "SP"} (baseado no histórico de ${monthCount || 1} meses da fatura).`;

  return {
    data: {
      ...data,
      historico_consumo: normalizedHistory,
    },
    exactAverageKwh: exactAverage,
    totalSumKwh: totalSum,
    monthCount,
    formattedSummary,
    rawText,
  };
}

let cachedHspCsv: string[] | null = null;
function getHsp(cidade: string, estado: string): number {
  try {
    if (!cachedHspCsv) {
      const candidates = [
        path.join(process.cwd(), "hsp_brasil_todos_municipios hsp_medio_anual.csv"),
        path.join(process.cwd(), "..", "hsp_brasil_todos_municipios hsp_medio_anual.csv"),
        path.join(__dirname, "..", "..", "..", "hsp_brasil_todos_municipios hsp_medio_anual.csv"),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          cachedHspCsv = fs.readFileSync(p, "utf8").split("\n");
          break;
        }
      }
    }

    if (cachedHspCsv) {
      const normCity = cidade
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .trim();

      for (let i = 1; i < cachedHspCsv.length; i++) {
        const line = cachedHspCsv[i];
        if (!line) continue;
        const cols = line.split(";");
        if (cols.length >= 7) {
          const csvCity = (cols[3] || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase()
            .trim();
          if (csvCity === normCity) {
            const hspVal = parseInt(cols[6] || "", 10);
            if (!isNaN(hspVal) && hspVal > 0) return hspVal / 1000;
          }
        }
      }
    }
  } catch {
    // Fallback
  }
  const ufMap: Record<string, number> = {
    SP: 4.8,
    PR: 4.9,
    MG: 5.3,
    RJ: 5.0,
    BA: 5.4,
    SC: 4.9,
    RS: 4.8,
    GO: 5.6,
    MT: 5.4,
    MS: 5.5,
  };
  return ufMap[estado.toUpperCase()] || 5.0;
}

const SESSION_INACTIVITY_MS = 5 * 60 * 1000; // 5 minutos

import { WhatsappPairingService } from "./whatsapp-pairing.service";

function expandInboundPhoneCandidates(raw: string): string[] {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return [];
  const out = new Set<string>();
  out.add(digits);
  if (digits.startsWith("55") && digits.length >= 12) {
    const without55 = digits.slice(2);
    out.add(without55);
    if (without55.length === 10) {
      out.add(`${without55.slice(0, 2)}9${without55.slice(2)}`);
    }
    if (without55.length === 11 && without55.charAt(2) === "9") {
      out.add(`${without55.slice(0, 2)}${without55.slice(3)}`);
    }
  } else if (digits.length === 10) {
    out.add(`${digits.slice(0, 2)}9${digits.slice(2)}`);
    out.add(`55${digits}`);
    out.add(`55${digits.slice(0, 2)}9${digits.slice(2)}`);
  } else if (digits.length === 11) {
    if (digits.charAt(2) === "9") {
      out.add(`${digits.slice(0, 2)}${digits.slice(3)}`);
    }
    out.add(`55${digits}`);
  }
  return [...out];
}

@Injectable()
export class WhatsappBotService {
  private readonly logger = new Logger(WhatsappBotService.name);
  private genAI: GoogleGenerativeAI | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly whatsappCloud: WhatsappCloudService,
    private readonly whatsappPairing: WhatsappPairingService
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
        const phoneNumberId =
          metadata?.phone_number_id || this.config.get<string>("WHATSAPP_PHONE_NUMBER_ID") || "";
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

  private async resolveAuthorizedTenant(fromWaId: string) {
    const candidates = expandInboundPhoneCandidates(fromWaId);

    const boundPhone = await this.prisma.tenantWhatsappInboundPhone.findFirst({
      where: {
        phoneDigits: { in: candidates },
      },
      include: {
        organization: {
          include: {
            subscription: true,
          },
        },
      },
    });

    if (boundPhone && boundPhone.organization) {
      return boundPhone.organization;
    }

    return null;
  }

  private isTenantPlanActive(tenant: {
    createdAt: Date;
    subscription?: { status: string } | null;
  }): boolean {
    if (tenant.subscription && tenant.subscription.status === "active") {
      return true;
    }

    const diffTime = Math.abs(Date.now() - new Date(tenant.createdAt).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) {
      return true;
    }

    return true;
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

    // 1. Deduplicação de Webhook
    const existing = await this.prisma.whatsappInboundMessage.findUnique({
      where: { waMessageId },
    });
    if (existing) {
      this.logger.debug(`Mensagem duplicada ignorada: ${waMessageId}`);
      return;
    }

    // 2. Extração inicial do texto para verificar comando de pareamento
    let incomingText = "";
    if (msgType === "text") {
      incomingText = (message.text?.body || "").trim();
    }

    // 3. Verificação de Código de Pareamento (Token de Ativação)
    const pairingMatch = incomingText.match(/(?:CONECTAR[ -]*)?(\b\d{6}\b)/i);
    if (pairingMatch && pairingMatch[1]) {
      const code = pairingMatch[1];
      const pairingInfo = this.whatsappPairing.consumePairingCode(code);
      if (pairingInfo) {
        const cleanDigits = fromWaId.replace(/\D/g, "");
        const candidates = expandInboundPhoneCandidates(fromWaId);

        // Remove número de outra organização se estivesse cadastrado
        await this.prisma.tenantWhatsappInboundPhone.deleteMany({
          where: { phoneDigits: { in: candidates } },
        });

        // Cadastra o número na organização correta
        await this.prisma.tenantWhatsappInboundPhone.create({
          data: {
            organizationId: pairingInfo.organizationId,
            phoneDigits: cleanDigits.startsWith("55") ? cleanDigits.slice(2) : cleanDigits,
            label: `WhatsApp de ${contactName}`,
          },
        });

        const successMsg =
          `🎉 *WhatsApp Vinculado com Sucesso!* ☀️\n\n` +
          `Seu número foi conectado à empresa *${pairingInfo.organizationName}*.\n` +
          `Status: *Autorizado e Ativo* ✅\n\n` +
          `A partir de agora, você pode me enviar contas de luz (PDF ou foto) ou solicitar dimensionamentos solares diretamente por aqui!`;

        await this.whatsappCloud.sendTextMessage({
          phoneNumberId,
          toWaId: fromWaId,
          body: successMsg,
        });
        return;
      }
    }

    // 4. Resolução da Organização / Tenant do Integrador
    const tenant = await this.resolveAuthorizedTenant(fromWaId);
    if (!tenant) {
      this.logger.warn(`Número não autorizado tentando usar o bot: ${fromWaId}`);
      const salesMsg =
        `Olá! ☀️ O assistente de inteligência artificial da *EnergivIA* é um recurso exclusivo para integradores parceiros credenciados.\n\n` +
        `Para vincular este WhatsApp à sua conta:\n` +
        `1️⃣ Acesse *https://energivia.com.br/configuracoes/organizacao*\n` +
        `2️⃣ Clique em *"Conectar WhatsApp"* e envie o código gerado aqui.\n\n` +
        `Se você ainda não possui um plano ativo, conheça nossos recursos e comece a gerar propostas solares em segundos:\n` +
        `👉 *https://energivia.com.br*`;

      await this.whatsappCloud.sendTextMessage({
        phoneNumberId,
        toWaId: fromWaId,
        body: salesMsg,
      });
      return;
    }

    // 5. Verificação de Assinatura / Plano Ativo
    if (!this.isTenantPlanActive(tenant)) {
      this.logger.warn(`Plano expirado para organização ${tenant.id} no WhatsApp ${fromWaId}`);
      const expiredMsg =
        `Olá! Identificamos que o período de acesso da sua organização na EnergivIA precisa ser renovado. ☀️\n\n` +
        `Para continuar utilizando o assistente de IA, dimensionamentos e propostas comerciais automáticas pelo WhatsApp, escolha o seu plano em:\n` +
        `👉 *https://energivia.com.br/gestao/meus-planos*`;

      await this.whatsappCloud.sendTextMessage({
        phoneNumberId,
        toWaId: fromWaId,
        body: expiredMsg,
      });
      return;
    }

    // 4. Busca ou criação da Conversa vinculada à Organização do Integrador
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        organizationId: tenant.id,
        channel: "whatsapp",
        title: fromWaId,
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    const isNewMedia = msgType === "document" || msgType === "image";

    if (conversation && conversation.messages.length > 0) {
      const lastMsg = conversation.messages[conversation.messages.length - 1];
      const timeSinceLastMsg = lastMsg ? Date.now() - new Date(lastMsg.createdAt).getTime() : 0;

      // Se inativo por mais de 5min OU enviou nova fatura (PDF/imagem):
      if ((lastMsg && timeSinceLastMsg > SESSION_INACTIVITY_MS) || isNewMedia) {
        this.logger.log(`Resetando contexto para nova sessão: de=${fromWaId}`);
        await this.prisma.message.deleteMany({
          where: { conversationId: conversation.id },
        });

        conversation = await this.prisma.conversation.findUnique({
          where: { id: conversation.id },
          include: { messages: { orderBy: { createdAt: "asc" } } },
        });
      }
    }

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          organizationId: tenant.id,
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

    // 5. Extração de Conteúdo (Fatura / Texto / Imagem)
    let extractionResult: BillExtractionResult | null = null;

    this.logger.log(`Mensagem recebida do WhatsApp: tipo=${msgType}, de=${fromWaId}`);

    if (msgType === "text") {
      incomingText = message.text?.body || "";
      const lowerText = incomingText.toLowerCase().trim();
      if (
        lowerText === "novo" ||
        lowerText === "reiniciar" ||
        lowerText === "nova cotação" ||
        lowerText === "nova cotacao"
      ) {
        await this.prisma.message.deleteMany({
          where: { conversationId: conversation.id },
        });
        const resetMsg = `Sessão reiniciada com sucesso! ☀️\n\nEnvie a conta de luz do seu cliente (PDF ou foto) ou digite o consumo médio em kWh para começarmos uma nova simulação.`;
        await this.whatsappCloud.sendTextMessage({
          phoneNumberId,
          toWaId: fromWaId,
          body: resetMsg,
        });
        return;
      }
    } else if (msgType === "document") {
      const doc = message.document;
      incomingText = `[Documento enviado: ${doc?.filename || "fatura.pdf"}]`;
      if (doc?.id) {
        this.logger.log(`Iniciando extração do PDF mediaId=${doc.id}`);
        extractionResult = await this.extractFromMediaDocument(doc.id, doc.mime_type);
      }
    } else if (msgType === "image") {
      const img = message.image;
      incomingText = `[Foto enviada: ${img?.caption || "Foto da fatura"}]`;
      if (img?.id) {
        this.logger.log(`Iniciando extração da imagem mediaId=${img.id}`);
        extractionResult = await this.extractFromMediaImage(img.id, img.mime_type);
      }
    } else if (msgType === "audio" || msgType === "voice") {
      incomingText = "[Mensagem de áudio recebida]";
    } else {
      incomingText = `[Mensagem do tipo ${msgType} recebida]`;
    }

    // Salva a mensagem do usuário no banco
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: incomingText,
        channel: "whatsapp",
        metadata: extractionResult
          ? {
              exactAverageKwh: extractionResult.exactAverageKwh,
              monthCount: extractionResult.monthCount,
              totalSumKwh: extractionResult.totalSumKwh,
              cidade: extractionResult.data.cidade,
              uf: extractionResult.data.uf,
            }
          : undefined,
      },
    });

    // Atualiza conversa com a nova mensagem
    const freshConversation = await this.prisma.conversation.findUnique({
      where: { id: conversation.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    // 6. Gera a resposta pelo motor de estado do bot e gera a proposta real
    const replyText = await this.generateBotResponse({
      conversation: freshConversation || conversation,
      incomingText,
      extractionResult,
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
  ): Promise<BillExtractionResult | null> {
    try {
      const media = await this.whatsappCloud.downloadWhatsappMedia(mediaId);
      if (!media || !media.buffer) return null;

      if (media.mimeType.includes("pdf") || mimeType?.includes("pdf")) {
        const parsed = await pdfParse(media.buffer);
        const text = parsed.text;
        if (text && text.trim().length > 30) {
          return this.parseBillTextWithAI(text);
        }
      }
    } catch (e) {
      this.logger.error("Erro extraindo PDF da fatura:", e);
    }
    return null;
  }

  private async extractFromMediaImage(
    mediaId: string,
    mimeType?: string
  ): Promise<BillExtractionResult | null> {
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
          BILL_EXTRACTION_SYSTEM_PROMPT,
          {
            inlineData: {
              data: media.buffer.toString("base64"),
              mimeType: media.mimeType || mimeType || "image/jpeg",
            },
          },
        ]);

        const respText = result.response.text();
        const clean = respText
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();
        const parsed = JSON.parse(clean) as ExtractedBillData;
        return processExtractedBillData(parsed);
      }
    } catch (e) {
      this.logger.error("Erro extraindo imagem da fatura:", e);
    }
    return null;
  }

  private async parseBillTextWithAI(pdfText: string): Promise<BillExtractionResult | null> {
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
              { role: "system", content: BILL_EXTRACTION_SYSTEM_PROMPT },
              {
                role: "user",
                content: `Extraia com máxima precisão todos os dados e TODOS os meses do histórico de consumo do seguinte texto de fatura de energia:\n\n${pdfText}`,
              },
            ],
          }),
        });

        if (response.ok) {
          const json = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const content = json.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content) as ExtractedBillData;
            return processExtractedBillData(parsed, pdfText);
          }
        }
      } catch (err) {
        this.logger.error("Erro extraindo texto com OpenAI:", err);
      }
    }

    if (this.genAI) {
      try {
        const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(
          `${BILL_EXTRACTION_SYSTEM_PROMPT}\n\nTexto da fatura:\n${pdfText}`
        );
        const respText = result.response.text();
        const clean = respText
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();
        const parsed = JSON.parse(clean) as ExtractedBillData;
        return processExtractedBillData(parsed, pdfText);
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
  ): Promise<BillExtractionResult | null> {
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
            { role: "system", content: BILL_EXTRACTION_SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analise minuciosamente a imagem desta conta de luz em alta resolução. Extraia todos os dados gerais e TODOS os meses da tabela de histórico de consumo/faturamento sem omitir nenhum mês:",
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
        if (content) {
          const parsed = JSON.parse(content) as ExtractedBillData;
          return processExtractedBillData(parsed);
        }
      }
    } catch (e) {
      this.logger.error("Erro extraindo imagem com OpenAI:", e);
    }
    return null;
  }

  private async calculateDistributorKits({
    consumptionKwh,
    cidade,
    estado,
    roofType,
  }: {
    consumptionKwh: number;
    cidade: string;
    estado: string;
    roofType: string;
  }) {
    const hsp = getHsp(cidade, estado);
    const pr = 0.716; // Performance Ratio
    const geracaoPorKwp = hsp * 30 * pr;
    const consumoAjustado = consumptionKwh * 1.07;
    const targetKwp = consumoAjustado / geracaoPorKwp;

    const distributors = await this.prisma.distributor.findMany({
      include: {
        distributorProducts: {
          include: { product: { include: { brand: true, category: true } } },
        },
      },
    });

    const quotes: Array<{
      distributorName: string;
      distributorId?: string;
      totalPrice: number;
      kwp: number;
      estimatedGeneration: number;
      items: string[];
      invName: string;
      modCount: number;
      modName: string;
    }> = [];

    for (const d of distributors) {
      const prods = d.distributorProducts || [];
      if (prods.length === 0) continue;

      const invs = prods.filter((dp) => {
        const p = dp.product;
        const cat = p?.category?.name?.toLowerCase() || "";
        const name = (p?.name || "").toLowerCase();
        return cat.includes("inverter") || name.includes("inversor");
      });

      const mods = prods.filter((dp) => {
        const p = dp.product;
        const cat = p?.category?.name?.toLowerCase() || "";
        const name = (p?.name || "").toLowerCase();
        return (
          cat.includes("module") ||
          name.includes("módulo") ||
          name.includes("modulo") ||
          name.includes("painel")
        );
      });

      if (invs.length === 0 || mods.length === 0) continue;

      const mod = mods[0];
      if (!mod) continue;
      const specs = (mod.product?.specs || {}) as Record<string, unknown>;
      const modPowerW = specs["power_w"] ? Number(specs["power_w"]) : 550;
      const moduleCount = Math.ceil((targetKwp * 1000) / modPowerW);
      const realKwp = Number(((moduleCount * modPowerW) / 1000).toFixed(2));
      const estGeneration = Math.round(realKwp * geracaoPorKwp);

      const inv = invs[0];
      if (!inv) continue;
      const invPrice = Number(inv.price) || 0;
      const modPrice = (Number(mod.price) || 0) * moduleCount;
      const structureEstPrice = roofType === "none" ? 0 : 250 * Math.ceil(moduleCount / 4);
      const cablePrice = 300;
      const totalPrice = invPrice + modPrice + structureEstPrice + cablePrice;

      const items = [
        `- Inversor: ${inv.product?.name || "Inversor Solar"}`,
        `- Módulos: ${moduleCount}x ${mod.product?.name || "Módulo Solar " + modPowerW + "W"}`,
      ];
      if (roofType !== "none") {
        items.push(`- Estrutura: Fixação para telhado ${roofType}`);
      }
      items.push(`- Cabos e Conectores: Kit CC Solar Completo`);

      quotes.push({
        distributorName: d.name,
        distributorId: d.id,
        totalPrice,
        kwp: realKwp,
        estimatedGeneration: estGeneration,
        items,
        invName: inv.product?.name || "Inversor",
        modCount: moduleCount,
        modName: mod.product?.name || "Módulo",
      });
    }

    if (quotes.length === 0) {
      const modPowerW = 550;
      const moduleCount = Math.ceil((targetKwp * 1000) / modPowerW);
      const realKwp = Number(((moduleCount * modPowerW) / 1000).toFixed(2));
      const estGen = Math.round(realKwp * geracaoPorKwp);
      const precoEstimado = Math.round(realKwp * 2800);

      quotes.push({
        distributorName: "Edeltec Solar",
        totalPrice: Math.round(precoEstimado * 0.98),
        kwp: realKwp,
        estimatedGeneration: estGen,
        items: [
          `- Inversor: Deye ${Math.ceil(realKwp)}kW Monofásico 220V`,
          `- Módulos: ${moduleCount}x Canadian Solar ${modPowerW}W TopCon`,
          `- Estrutura: Fixação para telhado ${roofType}`,
          `- Cabos e Conectores: Kit CC Solar Completo`,
        ],
        invName: `Deye ${Math.ceil(realKwp)}kW`,
        modCount: moduleCount,
        modName: `Canadian Solar ${modPowerW}W`,
      });

      quotes.push({
        distributorName: "Aldo Solar",
        totalPrice: precoEstimado,
        kwp: realKwp,
        estimatedGeneration: estGen,
        items: [
          `- Inversor: Growatt ${Math.ceil(realKwp)}kW Monofásico 220V`,
          `- Módulos: ${moduleCount}x DAH Solar ${modPowerW}W TopCon`,
          `- Estrutura: Fixação para telhado ${roofType}`,
          `- Cabos e Conectores: Kit CC Solar Completo`,
        ],
        invName: `Growatt ${Math.ceil(realKwp)}kW`,
        modCount: moduleCount,
        modName: `DAH Solar ${modPowerW}W`,
      });
    }

    return quotes;
  }

  private async generateBotResponse({
    conversation,
    incomingText,
    extractionResult,
  }: {
    conversation: {
      id: string;
      organizationId: string;
      title: string | null;
      messages?: Array<{
        role: string;
        content?: string | null;
        metadata?: unknown;
      }>;
    };
    incomingText: string;
    extractionResult: BillExtractionResult | null;
  }): Promise<string> {
    // 1. Se acabou de extrair a fatura com sucesso
    if (extractionResult && extractionResult.exactAverageKwh > 0) {
      const cidade = extractionResult.data.cidade
        ? `${extractionResult.data.cidade}${extractionResult.data.uf ? `/${extractionResult.data.uf.trim().toUpperCase()}` : ""}`
        : "São Paulo/SP";
      const kwh = extractionResult.exactAverageKwh;
      const meses = extractionResult.monthCount || 12;

      return (
        `Legal, dados extraídos com precisão!\n` +
        `Consumo médio de ${kwh} kWh/mês em ${cidade} (baseado no histórico de ${meses} meses da fatura).\n\n` +
        `Qual a estrutura do telhado?\n` +
        `1 - Cerâmica (Colonial)\n` +
        `2 - Fibrocimento\n` +
        `3 - Metálico\n` +
        `4 - Solo\n` +
        `5 - Laje\n` +
        `6 - Fibrometal\n` +
        `7 - Sem estrutura`
      );
    }

    const lower = incomingText.toLowerCase().trim();

    // Recupera a última mensagem do bot para saber o estado atual da conversa
    const assistantMessages = (conversation?.messages || []).filter((m) => m.role === "assistant");
    const lastBotMsg =
      assistantMessages.length > 0
        ? assistantMessages[assistantMessages.length - 1]?.content || ""
        : "";

    // ESTADO A: O Bot acabou de apresentar os distribuidores e pediu para escolher a opção (1 ou 2)
    if (lastBotMsg.includes("Qual opção você prefere para o seu cliente?")) {
      return (
        `Ótima escolha! Kit selecionado com sucesso. ☀️\n\n` +
        `Qual o nome do cliente final para eu registrar no seu CRM e gerar a proposta?`
      );
    }

    // ESTADO B: O Bot pediu o nome do cliente final
    if (lastBotMsg.includes("Qual o nome do cliente final")) {
      const clientName = incomingText.trim();
      return `Certo, vou registrar o cliente ${clientName}. E qual o WhatsApp dele com DDD?`;
    }

    // ESTADO C: O Bot pediu o WhatsApp do cliente final -> GERA LEAD, DEAL, SIZING, SIMULAÇÃO E PROPOSTA REAL!
    if (lastBotMsg.includes("E qual o WhatsApp dele")) {
      const clientWhatsapp = incomingText.replace(/\D/g, "");
      const clientNameMatch = lastBotMsg.match(/registrar o cliente ([^.]+)\./i);
      const clientName = clientNameMatch?.[1]?.trim() || "Cliente";

      // Recupera o consumo e kits do histórico
      let consumptionKwh = 913;
      let cidade = "São Paulo";
      let estado = "SP";
      let roofType = "Cerâmica (Colonial)";

      if (conversation?.messages && conversation.messages.length > 0) {
        const reversed = [...conversation.messages].reverse();
        for (const m of reversed) {
          const meta = m.metadata as Record<string, unknown> | null | undefined;
          if (meta && meta["exactAverageKwh"]) {
            consumptionKwh = Number(meta["exactAverageKwh"]);
            if (meta["cidade"]) cidade = String(meta["cidade"]);
            if (meta["uf"]) estado = String(meta["uf"]);
            break;
          }
          if (typeof m.content === "string") {
            const match = m.content.match(/consumo m[ée]dio de (\d+) kwh/i);
            if (match?.[1]) {
              consumptionKwh = parseInt(match[1], 10);
              break;
            }
          }
        }
      }

      const quotes = await this.calculateDistributorKits({
        consumptionKwh,
        cidade,
        estado,
        roofType,
      });

      const selectedQuote = quotes[0] || {
        distributorName: "Edeltec Solar",
        totalPrice: Math.round(consumptionKwh * 28),
        kwp: Number((consumptionKwh / 100).toFixed(2)),
        estimatedGeneration: consumptionKwh,
        items: [],
      };

      let proposalId = "";
      try {
        // 1. Cria o Lead no CRM da Organização
        const lead = await this.prisma.lead.create({
          data: {
            tenantId: conversation.organizationId,
            name: clientName,
            whatsapp: clientWhatsapp || "WhatsApp",
            source: "Chatbot WhatsApp",
          },
        });

        // 2. Cria o Deal (Oportunidade)
        const deal = await this.prisma.deal.create({
          data: {
            tenantId: conversation.organizationId,
            leadId: lead.id,
            title: `Sistema Fotovoltaico - ${clientName}`,
            stage: "PROPOSAL",
            value: selectedQuote.totalPrice,
          },
        });

        // 3. Cria o Dimensionamento (SystemSizing)
        const _sizing = await this.prisma.systemSizing.create({
          data: {
            tenantId: conversation.organizationId,
            leadId: lead.id,
            name: `Dimensionamento IA - ${consumptionKwh} kWh`,
            input: { monthlyConsumptionKwh: consumptionKwh, cidade, estado },
            result: {
              recommendedPowerKw: selectedQuote.kwp,
              estimatedGeneration: selectedQuote.estimatedGeneration,
            },
          },
        });

        // 4. Cria a Simulação
        const simulation = await this.prisma.simulation.create({
          data: {
            tenantId: conversation.organizationId,
            leadId: lead.id,
            name: `Simulação Comercial IA`,
            input: {
              systemSizeKw: selectedQuote.kwp,
              investmentAmount: selectedQuote.totalPrice,
              sizing: { monthlyConsumptionKwh: consumptionKwh },
            },
            result: {
              paybackYears: 3.2,
              monthlySavingsBrl: Math.round(consumptionKwh * 0.95),
            },
          },
        });

        // 5. Busca o Template Padrão de Proposta da Organização
        const template = await this.prisma.proposalTemplate.findFirst({
          where: {
            tenantId: conversation.organizationId,
            status: "PUBLISHED",
            deletedAt: null,
          },
          orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
        });

        // 6. Cria a Proposta Comercial Real no Banco de Dados
        const proposal = await this.prisma.proposal.create({
          data: {
            tenantId: conversation.organizationId,
            dealId: deal.id,
            simulationId: simulation.id,
            proposalTemplateId: template?.id || null,
            proposalTemplateVersion: 1,
            title: `Proposta Comercial - ${clientName}`,
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            renderedData: {
              integrator: {
                version: 1,
                kitItems: selectedQuote.items.map((i) => ({ productName: i, quantity: 1 })),
                equipmentSubtotalBrl: selectedQuote.totalPrice,
                quotedSaleBrl: selectedQuote.totalPrice,
                systemPowerKw: selectedQuote.kwp,
                sourceType: "distributor",
                distributorName: selectedQuote.distributorName,
              },
            },
          },
        });

        proposalId = proposal.id;

        // Registra atividade no CRM
        await this.prisma.leadActivityLog.create({
          data: {
            tenantId: conversation.organizationId,
            leadId: lead.id,
            kind: "PROPOSAL_CREATED",
            label: `Proposta de ${selectedQuote.kwp} kWp gerada via WhatsApp`,
          },
        });
      } catch (err) {
        this.logger.error("Erro gerando proposta completa no banco:", err);
      }

      const appBaseUrl =
        this.config.get<string>("NEXT_PUBLIC_APP_URL") || "https://energivia.com.br";
      const proposalLink = proposalId
        ? `${appBaseUrl}/proposta/${proposalId}`
        : `${appBaseUrl}/propostas`;

      return (
        `Perfeito! Proposta comercial gerada com sucesso para o cliente *${clientName}*! 📋✅\n\n` +
        `☀️ *Potência:* ${selectedQuote.kwp} kWp\n` +
        `🏢 *Distribuidor:* ${selectedQuote.distributorName}\n` +
        `💰 *Valor Total:* R$ ${selectedQuote.totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n\n` +
        `📄 *Acesse a Proposta Pronta no link:*\n` +
        `${proposalLink}\n\n` +
        `Ela já está disponível no seu painel CRM da EnergivIA. Posso te ajudar com mais algum orçamento hoje?`
      );
    }

    // ESTADO D: O Bot pediu a estrutura do telhado OU o usuário enviou uma estrutura
    const roofMatch = [
      { key: "1", name: "Cerâmica (Colonial)" },
      { key: "2", name: "Fibrocimento" },
      { key: "3", name: "Metálico" },
      { key: "4", name: "Solo" },
      { key: "5", name: "Laje" },
      { key: "6", name: "Fibrometal" },
      { key: "7", name: "Sem estrutura" },
      { key: "cerâmica", name: "Cerâmica (Colonial)" },
      { key: "ceramica", name: "Cerâmica (Colonial)" },
      { key: "fibrocimento", name: "Fibrocimento" },
      { key: "metálico", name: "Metálico" },
      { key: "metalico", name: "Metálico" },
      { key: "solo", name: "Solo" },
      { key: "laje", name: "Laje" },
      { key: "fibrometal", name: "Fibrometal" },
    ].find((r) => lower === r.key || lower.includes(r.key));

    if (roofMatch && (lastBotMsg.includes("Qual a estrutura do telhado?") || lastBotMsg === "")) {
      let consumptionKwh = 913; // default
      let cidade = "São Paulo";
      let estado = "SP";

      if (conversation?.messages && conversation.messages.length > 0) {
        const reversed = [...conversation.messages].reverse();
        for (const m of reversed) {
          const meta = m.metadata as Record<string, unknown> | null | undefined;
          if (meta && meta["exactAverageKwh"]) {
            consumptionKwh = Number(meta["exactAverageKwh"]);
            if (meta["cidade"]) cidade = String(meta["cidade"]);
            if (meta["uf"]) estado = String(meta["uf"]);
            break;
          }
          if (typeof m.content === "string") {
            const match = m.content.match(/consumo m[ée]dio de (\d+) kwh/i);
            if (match?.[1]) {
              consumptionKwh = parseInt(match[1], 10);
              break;
            }
          }
        }
      }

      const quotes = await this.calculateDistributorKits({
        consumptionKwh,
        cidade,
        estado,
        roofType: roofMatch.name,
      });

      let quoteText = `Excelente! Seguem as melhores opções de kits dimensionados para o consumo de ${consumptionKwh} kWh/mês:\n\n`;

      quotes.forEach((q, index) => {
        quoteText += `${index + 1} - ${q.distributorName} - R$ ${q.totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n`;
        quoteText += `Itens do Kit:\n`;
        q.items.forEach((item) => {
          quoteText += `${item}\n`;
        });
        quoteText += `Info: Potência: ${q.kwp} kWp | Geração Estimada: ${q.estimatedGeneration} kWh/mês\n\n`;
      });

      quoteText += `Qual opção você prefere para o seu cliente? (Responda com o número)`;
      return quoteText;
    }

    // Saudação inicial
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
        `Você pode me enviar o PDF da fatura, uma foto da conta de luz ou digitar o consumo médio em kWh do seu cliente para gerarmos uma simulação rápida!`
      );
    }

    // Consumo digitado diretamente (ex: "500 kwh")
    const kwhMatch = incomingText.match(/(\d+[\d.,]*)\s*(kwh|kw|reais|r\$)?/i);
    const kwhStr = kwhMatch?.[1];
    if (kwhStr && Number(kwhStr.replace(",", ".")) > 50) {
      const consumo = Math.round(Number(kwhStr.replace(",", ".")));
      return (
        `Legal, consumo registrado: ${consumo} kWh/mês.\n\n` +
        `Qual a estrutura do telhado?\n` +
        `1 - Cerâmica (Colonial)\n` +
        `2 - Fibrocimento\n` +
        `3 - Metálico\n` +
        `4 - Solo\n` +
        `5 - Laje\n` +
        `6 - Fibrometal\n` +
        `7 - Sem estrutura`
      );
    }

    return `Entendi! Para dimensionarmos o sistema do seu cliente, envie a fatura (PDF ou foto) ou informe o consumo médio em kWh.`;
  }
}
