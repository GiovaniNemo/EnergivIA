/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { WhatsappCloudService } from "./whatsapp-cloud.service";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { computeProjectCostSection } from "@energivia/proposal-economia";
import pdfParse from "pdf-parse";
import { createWorker } from "tesseract.js";
import { AiUsageService } from "../ai-usage/ai-usage.service";
import { AiFeature } from "@prisma/client";
import { getTenantPlanDetails } from "../../common/utils/plan-limits";
import { getNextProposalNumber } from "../proposals/proposals.service";

import type {
  ExtractedBillHistoryItem,
  ExtractedBillData,
  BillExtractionResult,
} from "./services/bill-extractor.service";
export type { ExtractedBillHistoryItem, ExtractedBillData, BillExtractionResult };
import {
  BILL_EXTRACTION_SYSTEM_PROMPT,
  parseBrazilianKwh,
  processExtractedBillData,
  BillExtractorService,
} from "./services/bill-extractor.service";
import { getHsp, isLocationInput, GeoIrradianceService } from "./services/geo-irradiance.service";

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

const SESSION_INACTIVITY_MS =
  Number(process.env["WHATSAPP_SESSION_INACTIVITY_MS"]) || 24 * 60 * 60 * 1000; // 24 horas (janela padrão da Meta/WhatsApp)

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

function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return phone;
}

function extractNameAndPhone(text: string): { name: string; phone?: string } {
  const cleanText = text.trim();

  // Procura padrão de telefone brasileiro: DDD (2 dígitos) seguido de 8 ou 9 dígitos
  // Ex: 44099117969, 44988117969, (44) 98811-7969, 44 98811-7969, 44-988117969, +5544988117969
  const contiguousDigitsRegex = /\b(?:\+?55)?([1-9]{2}\d{8,9})\b/;
  const formattedPhoneRegex =
    /(?:\+?55\s*)?(?:\(?\s*([1-9]{2})\s*\)?\s*)?(?:(9\s*\d{4}|\d{4})[-.\s]?(\d{4}))\b/;

  let foundPhone: string | undefined;
  let matchStr = "";

  const matchContiguous = cleanText.match(contiguousDigitsRegex);
  if (matchContiguous && matchContiguous[1]) {
    foundPhone = matchContiguous[1];
    matchStr = matchContiguous[0];
  } else {
    const matchFormatted = cleanText.match(formattedPhoneRegex);
    if (matchFormatted && matchFormatted[0]) {
      const d = matchFormatted[0].replace(/\D/g, "");
      const cleaned = d.startsWith("55") && (d.length === 12 || d.length === 13) ? d.slice(2) : d;
      if (cleaned.length === 10 || cleaned.length === 11) {
        foundPhone = cleaned;
        matchStr = matchFormatted[0];
      }
    }
  }

  // Remove o telefone encontrado do texto para extrair o nome
  let rawName = cleanText;
  if (matchStr) {
    rawName = rawName.replace(matchStr, "");
  }

  // Remove pontuações e termos comuns entre nome e telefone (ex: vírgulas, hífens, "whats:", etc.)
  rawName = rawName
    .replace(/\b(?:whats(?:app)?|cel(?:ular)?|tel(?:efone)?|fone|nome)\b:?/gi, "")
    .replace(/^[,;\-/:|()=*~_\s]+|[,;\-/:|()=*~_\s]+$/g, "")
    .trim();

  // Capitaliza o nome se tiver letras
  const formattedName = rawName
    ? rawName
        .split(/\s+/)
        .map((w) =>
          w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()
        )
        .join(" ")
    : "";

  return {
    name: formattedName,
    phone: foundPhone,
  };
}

function parseKwpRate(
  input: string,
  systemKwp?: number
): { rate: number; isDerivedFromTotal?: boolean } | null {
  const clean = input.trim().toLowerCase();

  // Opções de menu ou confirmação
  if (
    clean === "1" ||
    clean === "1." ||
    clean === "1️⃣" ||
    clean === "opcao 1" ||
    clean === "opção 1" ||
    clean === "padrao" ||
    clean === "padrão" ||
    clean === "seguir" ||
    clean === "sim" ||
    clean === "manter" ||
    clean === "continuar" ||
    clean === "2" ||
    clean === "2." ||
    clean === "2️⃣" ||
    clean === "opcao 2" ||
    clean === "opção 2" ||
    clean === "0" ||
    clean === "0." ||
    clean === "0️⃣" ||
    clean === "voltar"
  ) {
    return null;
  }

  // Padrão com 'k', ex: "3k", "2.8k", "2,5k"
  const kMatch = clean.match(/(?:r\$\s*)?(\d+(?:[.,]\d+)?)\s*k\b/i);
  if (kMatch && kMatch[1]) {
    const kVal = parseFloat(kMatch[1].replace(",", "."));
    if (!isNaN(kVal) && kVal >= 0.5 && kVal <= 25) {
      return { rate: Math.round(kVal * 1000) };
    }
  }

  // Se explicitamente informou valor total: ex "total 8500", "8500 total", "valor total: R$ 8.500"
  const isExplicitTotal =
    clean.includes("total") || clean.includes("valor final") || clean.includes("preço final");

  // Padrão monetário / numérico geral
  // Ex: "4000", "4000,00", "4.000", "4.000,00", "R$ 3.200,00", "2500", "2800,50", "3200/kwp", "r$3.000", "3.200 por kwp"
  const match = clean.match(
    /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?:\s*(?:reais)?(?:\s*(?:\/|\s*por\s*|\s*o\s*)?\s*kwp)?)?/i
  );
  if (!match || !match[1]) return null;

  let raw = match[1];
  if (raw.includes(".") && raw.includes(",")) {
    raw = raw.replace(/\./g, "").replace(",", ".");
  } else if (raw.includes(".")) {
    const parts = raw.split(".");
    const p0 = parts[0];
    const p1 = parts[1];
    if (parts.length === 2 && p0 !== undefined && p1 !== undefined) {
      if (p1.length === 3) {
        raw = p0 + p1;
      } else if (p1.length <= 2) {
        raw = p0 + "." + p1;
      } else {
        raw = raw.replace(/\./g, "");
      }
    } else {
      raw = raw.replace(/\./g, "");
    }
  } else if (raw.includes(",")) {
    const parts = raw.split(",");
    const p0 = parts[0];
    const p1 = parts[1];
    if (parts.length === 2 && p0 !== undefined && p1 !== undefined && p1.length <= 2) {
      raw = p0 + "." + p1;
    } else {
      raw = raw.replace(/,/g, "");
    }
  }

  const val = parseFloat(raw);
  if (isNaN(val)) return null;

  // Se o integrador digitou algo como "2.8" ou "3.2" (abreviação comum para 2800 ou 3200)
  if (val > 0 && val < 20) {
    return { rate: Math.round(val * 1000) };
  }

  // Se explicitamente informou como valor total OU se for um valor total acima de R$ 6.800 e não especificou /kwp
  if (
    (isExplicitTotal ||
      (val > 6800 &&
        !clean.includes("/kwp") &&
        !clean.includes("por kwp") &&
        !clean.includes("o kwp") &&
        !clean.includes("kwp"))) &&
    systemKwp &&
    systemKwp > 0
  ) {
    const derivedRate = Math.round((val / systemKwp) * 100) / 100;
    if (derivedRate >= 500 && derivedRate <= 25000) {
      return { rate: derivedRate, isDerivedFromTotal: true };
    }
  }

  // Faixa de R$/kWp aceitável no mercado solar brasileiro (R$ 500 a R$ 25.000)
  if (val >= 500 && val <= 25000) {
    return { rate: Math.round(val * 100) / 100 };
  }

  return null;
}

@Injectable()
export class WhatsappBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappBotService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private inactivityCheckTimer?: NodeJS.Timeout;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly whatsappCloud: WhatsappCloudService,
    private readonly whatsappPairing: WhatsappPairingService,
    private readonly aiUsage: AiUsageService,
    private readonly geoIrradiance: GeoIrradianceService,
    private readonly billExtractor: BillExtractorService
  ) {
    const geminiKey =
      this.config.get<string>("GOOGLE_GEMINI_API_KEY") ||
      this.config.get<string>("GEMINI_API_KEY") ||
      "";
    if (geminiKey) {
      this.genAI = new GoogleGenerativeAI(geminiKey);
    }
  }

  onModuleInit() {
    this.inactivityCheckTimer = setInterval(() => {
      this.checkInactiveConversations().catch((err) => {
        this.logger.error("Erro ao verificar inatividade de conversas do WhatsApp:", err);
      });
    }, 30_000); // Executa verificação a cada 30 segundos
  }

  onModuleDestroy() {
    if (this.inactivityCheckTimer) {
      clearInterval(this.inactivityCheckTimer);
    }
  }

  private isFlowActive(lastBotContent: string): boolean {
    if (!lastBotContent) return false;
    const lowerContent = lastBotContent.toLowerCase();
    // Se a proposta já foi concluída, não há lembretes nem encerramento
    if (
      lowerContent.includes("proposta comercial gerada com sucesso") ||
      lowerContent.includes("acesse a proposta") ||
      lowerContent.includes("painel crm")
    ) {
      return false;
    }
    // Se já foi encerrado por inatividade ou reiniciado
    if (
      lowerContent.includes("encerramos este atendimento") ||
      lowerContent.includes("estou encerrando este atendimento") ||
      lowerContent.includes("sessão reiniciada com sucesso")
    ) {
      return false;
    }
    // Se está apenas no menu inicial (antes de qualquer fluxo ser iniciado)
    if (
      (lowerContent.includes("como posso ajudar você a gerar orçamentos") ||
        lowerContent.includes("escolha uma opção digitando o número:")) &&
      !lowerContent.includes("qual opção você prefere para o seu cliente")
    ) {
      return false;
    }

    // Verifica etapas ativas de atendimento / simulação
    return (
      lowerContent.includes("para qual cidade e estado será a instalação") ||
      lowerContent.includes("qual o padrão de entrada da instalação") ||
      lowerContent.includes("qual a estrutura do telhado") ||
      lowerContent.includes("estrutura do telhado") ||
      lowerContent.includes("taxa padrão configurada") ||
      lowerContent.includes("taxa padrão") ||
      lowerContent.includes("qual valor por kwp") ||
      lowerContent.includes("qual valor você deseja utilizar") ||
      lowerContent.includes("como deseja prosseguir para esta cotação") ||
      lowerContent.includes("como você deseja prosseguir para esta cotação") ||
      lowerContent.includes("qual opção você prefere para o seu cliente") ||
      lowerContent.includes("cliente final") ||
      lowerContent.includes("qual o nome do cliente final") ||
      lowerContent.includes("qual o whatsapp dele") ||
      lowerContent.includes("qual modelo de proposta comercial você deseja usar") ||
      lowerContent.includes("consumo médio mensal") ||
      lowerContent.includes("potência de pico") ||
      lowerContent.includes("placas solares") ||
      lowerContent.includes("fatura analisada com precisão") ||
      lowerContent.includes("dados extraídos com precisão")
    );
  }

  private async checkInactiveConversations(): Promise<void> {
    try {
      // Busca um phoneNumberId global recente caso alguma conversa não tenha salvo no metadata
      let globalPhoneNumberId = this.config.get<string>("WHATSAPP_PHONE_NUMBER_ID")?.trim() || "";
      if (!globalPhoneNumberId) {
        const convWithPhone = await this.prisma.conversation.findFirst({
          where: {
            channel: "whatsapp",
          },
          orderBy: { createdAt: "desc" },
        });
        if (convWithPhone && (convWithPhone.metadata as any)?.phoneNumberId) {
          globalPhoneNumberId = (convWithPhone.metadata as any).phoneNumberId;
        }
      }

      // Busca todas as conversas ativas do canal WhatsApp que possuem mensagens
      const conversations = await this.prisma.conversation.findMany({
        where: {
          channel: "whatsapp",
          messages: { some: {} },
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      for (const conversation of conversations) {
        if (!conversation.messages || conversation.messages.length === 0) continue;

        const lastMsg = conversation.messages[conversation.messages.length - 1];
        if (!lastMsg || lastMsg.role !== "assistant") continue;

        // Se a conversa já foi encerrada por inatividade, não processa
        if (
          lastMsg.content.includes("encerramos este atendimento") ||
          lastMsg.content.includes("estou encerrando este atendimento")
        ) {
          continue;
        }

        // Recupera a última mensagem funcional (sem ser lembrete)
        const functionalMsgs = conversation.messages.filter(
          (m) => m.role === "assistant" && !m.content?.includes("Você ainda está por aí?")
        );
        const lastFunctionalBotMsg =
          functionalMsgs.length > 0 ? functionalMsgs[functionalMsgs.length - 1]?.content || "" : "";

        // Só monitora inatividade se um fluxo de atendimento foi iniciado e não concluído
        if (!this.isFlowActive(lastFunctionalBotMsg)) {
          continue;
        }

        // Calcula o tempo decorrido desde a última resposta do usuário (ou da pergunta do bot se não houve resposta ainda)
        const lastUserMsg = [...conversation.messages].reverse().find((m) => m.role === "user");
        const referenceDate = lastUserMsg
          ? new Date(lastUserMsg.createdAt)
          : new Date(functionalMsgs[functionalMsgs.length - 1]?.createdAt || lastMsg.createdAt);
        const totalIdleTimeMs = Date.now() - referenceDate.getTime();

        const meta = (conversation.metadata as any) || {};
        const toWaId = meta.customerWaId || conversation.title;
        const phoneNumberId = meta.phoneNumberId || globalPhoneNumberId;

        if (!toWaId || !phoneNumberId) continue;

        // 15 MINUTOS OU MAIS: Encerra educadamente e profissionalmente
        if (totalIdleTimeMs >= 15 * 60 * 1000) {
          const closureText =
            `Como não tivemos retorno por aqui, encerramos este atendimento. ☀️\n\n` +
            `Quando quiser iniciar uma nova cotação, basta nos enviar uma mensagem. Estamos à disposição e ótimas vendas!`;

          await this.whatsappCloud.sendTextMessage({
            phoneNumberId,
            toWaId,
            body: closureText,
          });

          // Limpa as mensagens antigas para que a próxima interação comece do zero
          await this.prisma.message.deleteMany({
            where: { conversationId: conversation.id },
          });

          await this.prisma.message.create({
            data: {
              conversationId: conversation.id,
              role: "assistant",
              content: closureText,
              channel: "whatsapp",
            },
          });

          await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
          });

          this.logger.log(
            `Conversa ${conversation.id} (${toWaId}) encerrada por inatividade de 15 minutos.`
          );

          await this.flushPendingProposalViewAlerts(conversation.id, phoneNumberId, toWaId);
          continue;
        }

        // 10 MINUTOS: Pergunta educadamente se o usuário ainda está por aí
        if (totalIdleTimeMs >= 10 * 60 * 1000) {
          // Se já enviou o lembrete, não envia de novo
          if (lastMsg.content.includes("Você ainda está por aí?")) {
            continue;
          }

          const reminderText =
            `Olá! Você ainda está por aí? ☀️\n\n` +
            `Podemos continuar sua simulação quando quiser. Falta pouco para gerarmos a proposta para o seu cliente!`;

          await this.whatsappCloud.sendTextMessage({
            phoneNumberId,
            toWaId,
            body: reminderText,
          });

          await this.prisma.message.create({
            data: {
              conversationId: conversation.id,
              role: "assistant",
              content: reminderText,
              channel: "whatsapp",
            },
          });

          await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
          });

          this.logger.log(
            `Lembrete de 10 min enviado para conversa ${conversation.id} (${toWaId}).`
          );
        }
      }
    } catch (err) {
      this.logger.error("Erro na rotina de checagem de inatividade do WhatsApp:", err);
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

  async handleEvolutionWebhookPayload(payload: any): Promise<void> {
    if (!payload) return;

    // Normalização: a Evolution pode enviar { event: "messages.upsert", data: { ... } }
    // ou array de dados ou payload direto
    const event = payload.event;
    if (event && event !== "messages.upsert") {
      // Ignora status de conexão, contatos, etc.
      return;
    }

    const data = payload.data || payload;
    const key = data.key;
    if (!key) return;

    // Ignora mensagens enviadas pelo próprio bot
    if (key.fromMe) return;

    const remoteJid = key.remoteJid || "";
    // Ignora grupos e status do WhatsApp
    if (remoteJid.endsWith("@g.us") || remoteJid.includes("status@broadcast")) {
      return;
    }

    const fromWaId = remoteJid.replace(/@.*$/, "").replace(/\D/g, "");
    if (!fromWaId) return;

    const messageContent = data.message || {};
    const messageId = key.id || `evo_${Date.now()}`;
    const contactName = data.pushName || "Integrador";

    let msgType = "unknown";
    const mappedMessage: WebhookMessage = {
      id: messageId,
      from: fromWaId,
    };

    // 1. Mensagem de texto simples ou estendida
    if (messageContent.conversation) {
      msgType = "text";
      mappedMessage.type = "text";
      mappedMessage.text = { body: messageContent.conversation };
    } else if (messageContent.extendedTextMessage?.text) {
      msgType = "text";
      mappedMessage.type = "text";
      mappedMessage.text = { body: messageContent.extendedTextMessage.text };
    }
    // 2. Documento (ex: conta de luz em PDF)
    else if (messageContent.documentMessage) {
      msgType = "document";
      const doc = messageContent.documentMessage;
      mappedMessage.type = "document";
      mappedMessage.document = {
        id: messageId,
        filename: doc.fileName || doc.title || "fatura.pdf",
        mime_type: doc.mimetype || "application/pdf",
      };

      const b64 = doc.base64 || data.base64 || messageContent.base64;
      if (b64) {
        const cleanB64 = b64.replace(/^data:.*?;base64,/, "");
        this.whatsappCloud.registerMediaBuffer(
          messageId,
          Buffer.from(cleanB64, "base64"),
          mappedMessage.document.mime_type || "application/pdf"
        );
      }
    }
    // 3. Imagem (ex: foto de conta de luz)
    else if (messageContent.imageMessage) {
      msgType = "image";
      const img = messageContent.imageMessage;
      mappedMessage.type = "image";
      mappedMessage.image = {
        id: messageId,
        caption: img.caption || "",
        mime_type: img.mimetype || "image/jpeg",
      };

      const b64 = img.base64 || data.base64 || messageContent.base64;
      if (b64) {
        const cleanB64 = b64.replace(/^data:.*?;base64,/, "");
        this.whatsappCloud.registerMediaBuffer(
          messageId,
          Buffer.from(cleanB64, "base64"),
          mappedMessage.image.mime_type || "image/jpeg"
        );
      }
    }
    // 4. Áudio / Mensagem de Voz
    else if (messageContent.audioMessage) {
      msgType = "audio";
      mappedMessage.type = "audio";
      mappedMessage.audio = { id: messageId };

      const b64 = messageContent.audioMessage.base64 || data.base64 || messageContent.base64;
      if (b64) {
        const cleanB64 = b64.replace(/^data:.*?;base64,/, "");
        this.whatsappCloud.registerMediaBuffer(
          messageId,
          Buffer.from(cleanB64, "base64"),
          messageContent.audioMessage.mimetype || "audio/ogg; codecs=opus"
        );
      }
    }

    if (msgType === "unknown") {
      this.logger.debug(
        `[Evolution API] Mensagem de tipo desconhecido/não suportada recebida de ${fromWaId}`
      );
      return;
    }

    await this.processSingleMessage({
      message: mappedMessage,
      phoneNumberId: payload.instance || "evolution",
      contactName,
    });
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
            subscription: {
              include: { plan: true },
            },
          },
        },
      },
    });

    if (boundPhone && boundPhone.organization) {
      return boundPhone.organization;
    }

    return null;
  }

  private async isTenantPlanActive(tenant: {
    id: string;
    createdAt: Date;
    subscription?: {
      status: string;
      plan?: { id?: string; name?: string | null; features?: unknown } | null;
    } | null;
  }): Promise<{
    active: boolean;
    reason?: "trial_expired" | "proposal_limit_reached" | "bot_disabled";
    planName?: string;
    monthlyLimit?: number | null;
  }> {
    const planDetails = getTenantPlanDetails(tenant);

    if (planDetails.isTrial) {
      if (planDetails.trialExpired) {
        return { active: false, reason: "trial_expired", planName: planDetails.planName };
      }

      const proposalsCount = await this.prisma.proposal.count({
        where: { tenantId: tenant.id, deletedAt: null },
      });

      if (proposalsCount >= 20) {
        return {
          active: false,
          reason: "proposal_limit_reached",
          planName: planDetails.planName,
          monthlyLimit: 20,
        };
      }

      return { active: true, planName: planDetails.planName };
    }

    if (!planDetails.features.hasWhatsappBot) {
      return { active: false, reason: "bot_disabled", planName: planDetails.planName };
    }

    const monthlyLimit = planDetails.features.maxProposalsPerMonth;
    if (monthlyLimit !== null && monthlyLimit !== undefined && monthlyLimit > 0) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const count = await this.prisma.proposal.count({
        where: {
          tenantId: tenant.id,
          deletedAt: null,
          createdAt: { gte: startOfMonth },
        },
      });

      if (count >= monthlyLimit) {
        return {
          active: false,
          reason: "proposal_limit_reached",
          planName: planDetails.planName,
          monthlyLimit,
        };
      }
    }

    return { active: true, planName: planDetails.planName };
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
        `1️⃣ Acesse a plataforma: *https://www.energivia.com.br*\n` +
        `2️⃣ Clique no botão *"IA no WhatsApp"* no topo da tela e envie o código gerado aqui.\n\n` +
        `Se você ainda não possui um plano ativo, conheça nossos recursos e comece a gerar propostas solares em segundos:\n` +
        `👉 *https://www.energivia.com.br*`;

      await this.whatsappCloud.sendTextMessage({
        phoneNumberId,
        toWaId: fromWaId,
        body: salesMsg,
      });
      return;
    }

    // 5. Verificação de Assinatura / Plano Ativo
    const planStatus = await this.isTenantPlanActive(tenant);
    if (!planStatus.active) {
      this.logger.warn(
        `Plano inativo/expirado para organização ${tenant.id} no WhatsApp ${fromWaId} (${planStatus.reason})`
      );
      let blockMsg =
        `Olá! ☀️ O assistente de WhatsApp com IA da *EnergivIA* não está habilitado no plano da sua organização.\n\n` +
        `Para desbloquear o assistente de IA 24/7 e cotações no WhatsApp, escolha o seu plano em:\n` +
        `👉 *https://www.energivia.com.br/gestao/meus-planos*`;

      if (planStatus.reason === "proposal_limit_reached") {
        blockMsg =
          planStatus.monthlyLimit && planStatus.monthlyLimit > 20
            ? `Olá! ⚡ Sua empresa atingiu o limite mensal de ${planStatus.monthlyLimit} propostas do seu plano (${planStatus.planName || "atual"}).\n\n` +
              `Para continuar gerando propostas comerciais ilimitadas com IA pelo WhatsApp, faça upgrade para o *Plano Pro* em:\n` +
              `👉 *https://www.energivia.com.br/gestao/meus-planos*`
            : `Olá! ⚡ Sua empresa atingiu o limite de 20 cotações gratuitas do período de teste da *EnergivIA*.\n\n` +
              `Para continuar gerando propostas comerciais ilimitadas e dimensionamentos com IA para seus clientes pelo WhatsApp, escolha o seu plano em:\n` +
              `👉 *https://www.energivia.com.br/gestao/meus-planos*`;
      } else if (planStatus.reason === "trial_expired") {
        blockMsg =
          `Olá! ☀️ O período de teste gratuito de 5 dias úteis da sua organização na *EnergivIA* foi concluído.\n\n` +
          `Para continuar utilizando o assistente de IA, dimensionamentos e propostas comerciais automáticas pelo WhatsApp, escolha o seu plano em:\n` +
          `👉 *https://www.energivia.com.br/gestao/meus-planos*`;
      }

      await this.whatsappCloud.sendTextMessage({
        phoneNumberId,
        toWaId: fromWaId,
        body: blockMsg,
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

      // 15 MINUTOS OU MAIS: Se inativo por mais de 15 minutos no fluxo OU última msg foi encerramento OU inativo > 24h OU nova fatura:
      const isInactive15MinInFlow =
        lastMsg && timeSinceLastMsg >= 15 * 60 * 1000 && this.isFlowActive(lastMsg.content);
      const wasClosed =
        lastMsg &&
        (lastMsg.content.includes("encerramos este atendimento") ||
          lastMsg.content.includes("estou encerrando este atendimento"));
      const isExpired24h = lastMsg && timeSinceLastMsg > SESSION_INACTIVITY_MS;

      if (isInactive15MinInFlow || wasClosed || isExpired24h || isNewMedia) {
        this.logger.log(
          `Resetando contexto para nova sessão: de=${fromWaId}, motivo=${
            isInactive15MinInFlow
              ? "inatividade_15min"
              : wasClosed
                ? "atendimento_encerrado"
                : isNewMedia
                  ? "nova_midia"
                  : "inatividade_24h"
          }`
        );
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
    } else {
      const currentMeta = (conversation.metadata as Record<string, any>) || {};
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          updatedAt: new Date(),
          metadata: {
            ...currentMeta,
            customerWaId: fromWaId,
            contactName: contactName || currentMeta["contactName"],
            phoneNumberId: phoneNumberId || currentMeta["phoneNumberId"],
          },
        },
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
    let replyText = "";
    try {
      replyText = await this.generateBotResponse({
        conversation: freshConversation || conversation,
        incomingText,
        extractionResult,
        contactName,
      });
    } catch (err: any) {
      this.logger.error(`Erro ao gerar resposta do bot para ${fromWaId}:`, err);
      replyText =
        "Desculpe, ocorreu um erro inesperado ao processar sua solicitação. Por favor, tente novamente (digite '0' ou 'novo').";
    }

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

      // Se acabou de gerar a proposta, descarrega alertas pendentes de visualização
      if (replyText.includes("Proposta comercial gerada com sucesso")) {
        await this.flushPendingProposalViewAlerts(conversation.id, phoneNumberId, fromWaId);
      }
    }
  }

  private async flushPendingProposalViewAlerts(
    conversationId: string,
    phoneNumberId: string,
    toWaId: string
  ): Promise<void> {
    try {
      const conv = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { metadata: true },
      });
      const meta = (conv?.metadata as Record<string, any>) || {};
      const alerts = Array.isArray(meta["pendingProposalViewAlerts"])
        ? (meta["pendingProposalViewAlerts"] as string[])
        : [];
      if (alerts.length > 0) {
        const nextMeta: Record<string, any> = { ...meta };
        delete nextMeta["pendingProposalViewAlerts"];
        await this.prisma.conversation.update({
          where: { id: conversationId },
          data: { metadata: nextMeta },
        });

        for (const alertBody of alerts) {
          await this.whatsappCloud.sendTextMessage({
            phoneNumberId,
            toWaId,
            body: alertBody,
          });
        }
      }
    } catch (err) {
      this.logger.warn(`Falha ao descarregar alertas pendentes de visualização: ${err}`);
    }
  }

  private async runOcrOnBuffer(buffer: Buffer): Promise<string> {
    try {
      const worker = await createWorker();
      await worker.loadLanguage("por");
      await worker.initialize("por");
      const {
        data: { text },
      } = await worker.recognize(buffer);
      await worker.terminate();
      return text || "";
    } catch (err) {
      this.logger.error("Erro no OCR Tesseract WhatsApp:", err);
      return "";
    }
  }

  private parseBillTextDeterministic(text: string): {
    data: ExtractedBillData;
    isComplete: boolean;
  } {
    const t = (text || "").replace(/[\u00A0\r]/g, " ");

    let distribuidora: string | undefined;
    const providers = [
      { name: "COPEL", pattern: /\b(copel|copel\s+distribui[cç][aã]o)\b/i },
      { name: "ENEL", pattern: /\b(enel|eletropaulo|ampla|coelce)\b/i },
      { name: "CPFL", pattern: /\b(cpfl|paulista|piratininga|santa\s+cruz)\b/i },
      { name: "CEMIG", pattern: /\b(cemig|companhia\s+energ[eé]tica\s+de\s+minas)\b/i },
      { name: "EQUATORIAL", pattern: /\b(equatorial|ceal|cepisa|celpa|cemar)\b/i },
      { name: "ENERGISA", pattern: /\b(energisa)\b/i },
      { name: "NEOENERGIA", pattern: /\b(neoenergia|coelba|celpe|cosern|elektro)\b/i },
      { name: "LIGHT", pattern: /\b(light\s+servi[cç]os)\b/i },
      { name: "EDP", pattern: /\b(edp|bandeirante|escelsa)\b/i },
      { name: "RGE", pattern: /\b(rge|rio\s+grande\s+energia)\b/i },
      { name: "CELESC", pattern: /\b(celesc)\b/i },
    ];
    for (const p of providers) {
      if (p.pattern.test(t)) {
        distribuidora = p.name;
        break;
      }
    }

    let consumptionKwh: number | undefined;
    const kwhPatterns = [
      /(?:consumo\s+(?:ativo|faturado|medido|do\s+m[eê]s)?|total\s+consumo)[\s:=]*(\d{1,6}(?:[.,]\d{1,3})?)\s*(?:kwh|kw-h)/i,
      /(\d{1,6}(?:[.,]\d{1,3})?)\s*(?:kwh|kw-h)\s*(?:\/m[eê]s)?/i,
    ];
    for (const p of kwhPatterns) {
      const m = t.match(p);
      if (m && m[1]) {
        const val = parseBrazilianKwh(m[1]);
        if (val > 0 && val < 500000) {
          consumptionKwh = val;
          break;
        }
      }
    }

    let totalAmount: number | undefined;
    const brlPatterns = [
      /(?:total\s+a\s+pagar|valor\s+total|total\s+fatura|valor\s+a\s+pagar|total\s+da\s+fatura)[\s:=]*r\$\s*(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?)/i,
      /r\$\s*(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2}))/i,
    ];
    for (const p of brlPatterns) {
      const m = t.match(p);
      if (m && m[1]) {
        const clean = m[1].replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
        const n = parseFloat(clean);
        if (Number.isFinite(n) && n > 0) {
          totalAmount = Number(n.toFixed(2));
          break;
        }
      }
    }

    let referenceMonth: string | undefined;
    const refMatch = t.match(
      /(?:compet[eê]ncia|refer[eê]ncia|m[eê]s\/ano)[\s:=]*([0-1]?\d\s*\/\s*(?:20)?\d{2})/i
    );
    if (refMatch && refMatch[1]) {
      referenceMonth = refMatch[1].replace(/\s+/g, "");
    } else {
      const mmMatch = t.match(/\b(0[1-9]|1[0-2])[\/-](20\d{2}|\d{2})\b/);
      if (mmMatch) {
        referenceMonth = `${mmMatch[1]}/${mmMatch[2]}`;
      }
    }

    let tipo_conexao: string | undefined;
    if (/trif[aá]sico/i.test(t)) {
      tipo_conexao = "Trifásico";
    } else if (/bif[aá]sico/i.test(t)) {
      tipo_conexao = "Bifásico";
    } else if (/monof[aá]sico/i.test(t)) {
      tipo_conexao = "Monofásico";
    }

    // 5. Cidade / UF
    const ufList = [
      "AC",
      "AL",
      "AP",
      "AM",
      "BA",
      "CE",
      "DF",
      "ES",
      "GO",
      "MA",
      "MT",
      "MS",
      "MG",
      "PA",
      "PB",
      "PR",
      "PE",
      "PI",
      "RJ",
      "RN",
      "RS",
      "RO",
      "RR",
      "SC",
      "SP",
      "SE",
      "TO",
    ];
    let cidade: string | undefined;
    let uf: string | undefined;

    // 1. Procura primeiro Cidade/UF no bloco de Unidade Consumidora / Endereço / CEP
    const cepCityUfMatch = t.match(
      /(?:(?:MUNIC[IÍ]PIO|CIDADE|LOCAL(?:IDADE)?|ENDERE[CÇ]O|UNIDADE\s+CONSUMIDORA)[\s:=]+([A-ZÁ-Ú\s]{3,35})\s*[-/]\s*([A-Z]{2})|\d{5}[-\s]?\d{3}[\s,.-]+([A-ZÁ-Ú\s]{3,35})\s*[-/]\s*([A-Z]{2})|([A-ZÁ-Ú\s]{3,35})\s*[-/]\s*([A-Z]{2})[\s,.-]+(?:CEP|\d{5}))/i
    );
    if (cepCityUfMatch) {
      const candCity = (cepCityUfMatch[1] || cepCityUfMatch[2] || cepCityUfMatch[3] || "").trim();
      const candUf = (cepCityUfMatch[2] || cepCityUfMatch[4] || "").toUpperCase();
      if (ufList.includes(candUf) && candCity.length >= 3) {
        cidade = candCity;
        uf = candUf;
      }
    }

    // 2. Se não encontrou ou capturou Curitiba da Copel, faz busca em todas as ocorrências de CIDADE - UF
    const cityMatches = [...t.matchAll(/([A-ZÁ-Ú\s]{3,30})\s*[-/]\s*([A-Z]{2})\b/gi)];
    const validMatches: Array<{ city: string; uf: string }> = [];

    for (const cm of cityMatches) {
      const candUf = cm[2]?.toUpperCase() || "";
      const candCity = (cm[1] || "").trim();
      if (!ufList.includes(candUf)) continue;
      const low = candCity.toLowerCase();
      if (
        low.includes("emissao") ||
        low.includes("vencimento") ||
        low.includes("distribuicao") ||
        low.includes("distribuidora") ||
        low.includes("biazetto") ||
        low.includes("sede") ||
        low.includes("protocolo") ||
        low.includes("cnpj")
      ) {
        continue;
      }
      validMatches.push({ city: candCity, uf: candUf });
    }

    if (distribuidora === "COPEL") {
      const nonCuritiba = validMatches.find((m) => !m.city.toLowerCase().includes("curitiba"));
      if (nonCuritiba) {
        cidade = nonCuritiba.city;
        uf = nonCuritiba.uf;
      } else if (!cidade && validMatches.length > 0) {
        cidade = validMatches[0]?.city;
        uf = validMatches[0]?.uf;
      }
    } else if (validMatches.length > 0 && !cidade) {
      cidade = validMatches[0]?.city;
      uf = validMatches[0]?.uf;
    }

    // 6. Histórico de Consumo
    const historyCandidates: ExtractedBillHistoryItem[] = [];

    const monthMap: Record<string, string> = {
      "01": "JAN",
      "02": "FEV",
      "03": "MAR",
      "04": "ABR",
      "05": "MAI",
      "06": "JUN",
      "07": "JUL",
      "08": "AGO",
      "09": "SET",
      "10": "OUT",
      "11": "NOV",
      "12": "DEZ",
    };

    let historyText = t;
    const historySectionMatch = t.match(
      /(?:HIST[OÓ]RICO\s+DE\s+CONSUMO|CONSUMO\s+FATURADO|EVOLU[CÇ][AÃ]O\s+DO\s+CONSUMO|HIST[OÓ]RICO)[\s\S]{1,2000}/i
    );
    if (historySectionMatch) {
      historyText = historySectionMatch[0];
    }

    const rowRegex =
      /\b(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ|0[1-9]|1[0-2])[\s\/\-_]*(20\d{2}|\d{2})?\b(?=([^\n\r]{0,60}))/gi;
    const matches = [...historyText.matchAll(rowRegex)];

    for (const m of matches) {
      if (!m[1]) continue;
      let monStr = m[1].toUpperCase();

      if (m[1].match(/^\d{2}$/) && !m[2]) {
        continue;
      }

      if (monthMap[monStr]) monStr = monthMap[monStr]!;
      const yr = m[2] ? (m[2].length === 2 ? `20${m[2]}` : m[2]) : "";
      const label = yr ? `${monStr}/${yr}` : monStr;

      const restOfLine = m[3] || "";
      const numberMatches = [...restOfLine.matchAll(/\b(\d{1,5}(?:[.,]\d{1,3})?)\b/g)];

      const validNumbers = numberMatches
        .map((nm) => parseBrazilianKwh(nm[1]))
        .filter(
          (n) => n > 0 && n < 50000 && ![2022, 2023, 2024, 2025, 2026, 2027, 2028].includes(n)
        );

      if (validNumbers.length > 0) {
        let consumption = 0;
        const possibleConsumptions = validNumbers.filter((n) => n > 35);
        if (possibleConsumptions.length > 0 && typeof possibleConsumptions[0] === "number") {
          consumption = possibleConsumptions[0];
        } else {
          consumption = Math.max(...validNumbers);
        }
        historyCandidates.push({ mes_ano: label, consumo_kwh: consumption });
      }
    }

    const seenMonths = new Set<string>();
    const deduplicatedHistory: ExtractedBillHistoryItem[] = [];
    for (const item of historyCandidates) {
      if (!seenMonths.has(item.mes_ano)) {
        seenMonths.add(item.mes_ano);
        deduplicatedHistory.push(item);
      }
    }

    const normalizedHistory =
      deduplicatedHistory.length > 12 ? deduplicatedHistory.slice(0, 12) : deduplicatedHistory;

    if (!consumptionKwh && normalizedHistory.length > 0) {
      consumptionKwh = normalizedHistory[0]?.consumo_kwh;
    }
    if (!referenceMonth && normalizedHistory.length > 0) {
      referenceMonth = normalizedHistory[0]?.mes_ano;
    }

    const missingFields: string[] = [];
    if (!distribuidora) missingFields.push("Distribuidora");
    if (!cidade) missingFields.push("Cidade");
    if (!uf) missingFields.push("UF");
    if (!consumptionKwh && normalizedHistory.length === 0) missingFields.push("Consumo do Mês");
    if (normalizedHistory.length < 6)
      missingFields.push(
        `Histórico parcial (${normalizedHistory.length} meses encontrados pelo OCR, acionando IA para conferência de todos os meses)`
      );

    const isComplete = missingFields.length === 0;

    return {
      data: {
        distribuidora,
        cidade,
        uf,
        tipo_conexao,
        mes_referencia_atual: referenceMonth,
        consumo_mes_atual_kwh: consumptionKwh,
        valor_total_fatura_reais: totalAmount,
        historico_consumo: normalizedHistory,
      },
      isComplete,
    };
  }

  private async extractFromMediaDocument(
    mediaId: string,
    mimeType?: string
  ): Promise<BillExtractionResult | null> {
    try {
      const media = await this.whatsappCloud.downloadWhatsappMedia(mediaId);
      if (!media || !media.buffer) return null;

      let text = "";
      if (media.mimeType.includes("pdf") || mimeType?.includes("pdf")) {
        try {
          const parsed = await pdfParse(media.buffer);
          text = parsed.text || "";
        } catch {
          // ignora erro pdfParse
        }
        if (!text || text.trim().length < 30) {
          text = await this.runOcrOnBuffer(media.buffer);
        }
      } else {
        text = await this.runOcrOnBuffer(media.buffer);
      }

      if (text && text.trim().length > 30) {
        // Envia o texto extraído pelo OCR/PDF diretamente para a IA interpretar com precisão
        const aiParsed = await this.parseBillTextWithAI(text);
        if (aiParsed) {
          this.logger.log(
            "Fatura WhatsApp interpretada com sucesso pela IA a partir do texto OCR/PDF."
          );
          return aiParsed;
        }

        // Fallback determinístico offline se a IA falhar
        const deterministic = this.parseBillTextDeterministic(text);
        return processExtractedBillData(deterministic.data, text);
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

      // 1. Visão Computacional Direta da IA (enxerga com 100% de nitidez toda a tabela de 12 meses)
      const openAiKey = this.config.get<string>("OPENAI_API_KEY");
      if (openAiKey) {
        const fromVision = await this.extractImageWithOpenAI(
          media.buffer,
          media.mimeType || mimeType || "image/jpeg",
          openAiKey
        );
        if (fromVision) return fromVision;
      }

      if (this.genAI) {
        try {
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
        } catch (geminiErr) {
          this.logger.error("Erro extraindo imagem com Gemini no WhatsApp:", geminiErr);
        }
      }

      // 2. Fallback OCR Tesseract local se nenhuma API de IA de visão estiver disponível
      const ocrText = await this.runOcrOnBuffer(media.buffer);
      if (ocrText && ocrText.trim().length > 30) {
        const deterministic = this.parseBillTextDeterministic(ocrText);
        return processExtractedBillData(deterministic.data, ocrText);
      }
    } catch (e) {
      this.logger.error("Erro extraindo imagem da fatura:", e);
    }
    return null;
  }

  private async parseBillTextWithAI(
    pdfText: string,
    organizationId?: string | null
  ): Promise<BillExtractionResult | null> {
    if (!pdfText || pdfText.trim().length === 0) return null;

    const openAiKey = this.config.get<string>("OPENAI_API_KEY");
    if (openAiKey) {
      const startTime = Date.now();
      const model = "gpt-4o";
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openAiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
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

        const latencyMs = Date.now() - startTime;
        if (response.ok) {
          const json = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
            usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
          };

          if (json.usage) {
            void this.aiUsage.logUsage({
              organizationId,
              feature: AiFeature.WHATSAPP_BOT,
              model,
              promptTokens: json.usage.prompt_tokens || 0,
              completionTokens: json.usage.completion_tokens || 0,
              totalTokens: json.usage.total_tokens || 0,
              latencyMs,
              status: "SUCCESS",
            });
          }

          const content = json.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content) as ExtractedBillData;
            return processExtractedBillData(parsed, pdfText);
          }
        } else {
          void this.aiUsage.logUsage({
            organizationId,
            feature: AiFeature.WHATSAPP_BOT,
            model,
            latencyMs,
            status: "ERROR",
            errorMessage: `OpenAI HTTP ${response.status}`,
          });
        }
      } catch (err) {
        this.logger.error("Erro extraindo texto com OpenAI:", err);
      }
    }

    if (this.genAI) {
      const startTime = Date.now();
      const modelName = "gemini-1.5-flash";
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(
          `${BILL_EXTRACTION_SYSTEM_PROMPT}\n\nTexto da fatura:\n${pdfText}`
        );
        const latencyMs = Date.now() - startTime;
        const usage = result.response.usageMetadata;
        if (usage) {
          void this.aiUsage.logUsage({
            organizationId,
            provider: "google",
            feature: AiFeature.WHATSAPP_BOT,
            model: modelName,
            promptTokens: usage.promptTokenCount || 0,
            completionTokens: usage.candidatesTokenCount || 0,
            totalTokens: usage.totalTokenCount || 0,
            latencyMs,
            status: "SUCCESS",
          });
        }

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
    apiKey: string,
    organizationId?: string | null
  ): Promise<BillExtractionResult | null> {
    const startTime = Date.now();
    const model = "gpt-4o";
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
          model,
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

      const latencyMs = Date.now() - startTime;
      if (response.ok) {
        const json = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
        };

        if (json.usage) {
          void this.aiUsage.logUsage({
            organizationId,
            feature: AiFeature.OCR_BILL_VISION,
            model,
            promptTokens: json.usage.prompt_tokens || 0,
            completionTokens: json.usage.completion_tokens || 0,
            totalTokens: json.usage.total_tokens || 0,
            latencyMs,
            status: "SUCCESS",
          });
        }

        const content = json.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content) as ExtractedBillData;
          return processExtractedBillData(parsed);
        }
      } else {
        void this.aiUsage.logUsage({
          organizationId,
          feature: AiFeature.OCR_BILL_VISION,
          model,
          latencyMs,
          status: "ERROR",
          errorMessage: `OpenAI HTTP ${response.status}`,
        });
      }
    } catch (e) {
      this.logger.error("Erro extraindo imagem com OpenAI:", e);
    }
    return null;
  }

  private async getOrganizationDefaultKwpRate(organizationId?: string): Promise<number> {
    let ratePerKwp = 2800;
    if (organizationId) {
      try {
        const org = await this.prisma.tenant.findUnique({ where: { id: organizationId } });
        if (org) {
          const raw = (org.settings as any)?.defaultKwpRate;
          if (typeof raw === "number" && !isNaN(raw) && raw > 0) {
            ratePerKwp = raw;
          } else if (typeof raw === "string" && raw.trim()) {
            const num = Number(raw.replace(/[^\d.-]/g, ""));
            if (!isNaN(num) && num > 0) ratePerKwp = num;
          } else if ((org as any).defaultKwpRate) {
            ratePerKwp = Number((org as any).defaultKwpRate);
          }
        }
      } catch (e) {
        this.logger.error("Erro buscando defaultKwpRate da organização:", e);
      }
    }
    return ratePerKwp;
  }

  private getSystemSizingSummary(sessionCtx: {
    targetKWp?: number;
    targetModules?: number;
    modPowerWUser?: number;
    consumptionKwh?: number;
    [key: string]: any;
  }) {
    let finalTargetKWp = 3.0;
    const geracaoPorKwp = 130; // média nacional kWh/mês por kWp
    if (typeof sessionCtx.targetKWp === "number" && sessionCtx.targetKWp > 0) {
      finalTargetKWp = sessionCtx.targetKWp;
    } else if (
      typeof sessionCtx.targetModules === "number" &&
      sessionCtx.targetModules > 0 &&
      typeof sessionCtx.modPowerWUser === "number" &&
      sessionCtx.modPowerWUser > 0
    ) {
      finalTargetKWp = (sessionCtx.targetModules * sessionCtx.modPowerWUser) / 1000;
    } else if (typeof sessionCtx.consumptionKwh === "number" && sessionCtx.consumptionKwh > 0) {
      finalTargetKWp = sessionCtx.consumptionKwh / geracaoPorKwp;
    }
    const safeKwp = Math.max(0.5, finalTargetKWp);
    const modulePowerW = 585;
    const moduleQty = Math.max(4, Math.round((safeKwp * 1000) / modulePowerW));
    const realSystemKwp = Math.round(((moduleQty * modulePowerW) / 1000) * 100) / 100;
    const estimatedGeneration = Math.round(realSystemKwp * geracaoPorKwp);

    return {
      realSystemKwp,
      moduleQty,
      modulePowerW,
      estimatedGeneration,
    };
  }

  private async calculateDistributorKits({
    consumptionKwh,
    targetKWp,
    targetModules,
    modPowerWUser,
    cidade: _cidade,
    estado: _estado,
    roofType,
    gridVoltage: _gridVoltage,
    inverterType: _inverterType,
    organizationId,
    customRatePerKwp,
  }: {
    consumptionKwh?: number;
    targetKWp?: number;
    targetModules?: number;
    modPowerWUser?: number;
    cidade?: string;
    estado?: string;
    roofType?: string;
    gridVoltage?: string;
    inverterType?: string;
    organizationId?: string;
    customRatePerKwp?: number;
  }) {
    void _cidade;
    void _estado;
    void _gridVoltage;
    void _inverterType;

    let finalTargetKWp = 3.0;
    const geracaoPorKwp = 130; // média
    if (typeof targetKWp === "number" && targetKWp > 0) {
      finalTargetKWp = targetKWp;
    } else if (
      typeof targetModules === "number" &&
      targetModules > 0 &&
      typeof modPowerWUser === "number" &&
      modPowerWUser > 0
    ) {
      finalTargetKWp = (targetModules * modPowerWUser) / 1000;
    } else if (typeof consumptionKwh === "number" && consumptionKwh > 0) {
      finalTargetKWp = consumptionKwh / geracaoPorKwp;
    }
    const safeKwp = Math.max(0.5, finalTargetKWp);

    let ratePerKwp = 2800;
    if (customRatePerKwp && customRatePerKwp >= 500 && customRatePerKwp <= 25000) {
      ratePerKwp = customRatePerKwp;
    } else if (organizationId) {
      ratePerKwp = await this.getOrganizationDefaultKwpRate(organizationId);
    }

    const modulePowerW = 585;
    const moduleQty = Math.max(4, Math.round((safeKwp * 1000) / modulePowerW));
    const realSystemKwp = Math.round(((moduleQty * modulePowerW) / 1000) * 100) / 100;

    let roofLabel = "Cerâmico";
    const r = (roofType || "").toLowerCase();
    if (r.includes("solo") || r.includes("ground") || r === "4") {
      roofLabel = "Solo";
    } else if (r.includes("metal") || r.includes("metálic") || r === "3") {
      roofLabel = "Metálico";
    } else if (r.includes("laje") || r === "5") {
      roofLabel = "Laje";
    } else if (r.includes("fibro") || r === "2" || r === "6") {
      roofLabel = "Fibrocimento";
    } else if (r.includes("sem") || r === "7" || r === "none") {
      roofLabel = "Sem estrutura";
    }

    const invPowerSizes = [3, 3.6, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 75, 100];
    let invPower = 3;
    if (realSystemKwp > 3.8) {
      for (const size of invPowerSizes) {
        if (size * 1.3 >= realSystemKwp) {
          invPower = size;
          break;
        }
      }
      if (invPower < realSystemKwp / 1.3) invPower = Math.ceil(realSystemKwp);
    }

    const tiers = [
      {
        id: "economic",
        distributorName: "Standard",
        distributorId: "kwp-standard",
        materialCostFactor: 0.88,
        inverterBrand: "Growatt",
        moduleBrand: "DAH Solar",
      },
      {
        id: "cost_benefit",
        distributorName: "Elite",
        distributorId: "kwp-elite",
        materialCostFactor: 1.0,
        inverterBrand: "Deye",
        moduleBrand: "Canadian Solar",
      },
      {
        id: "premium",
        distributorName: "Premium",
        distributorId: "kwp-premium",
        materialCostFactor: 1.15,
        inverterBrand: "Huawei",
        moduleBrand: "Jinko Solar",
      },
    ];

    const results = tiers.map((cfg) => {
      // O preço por kWp informado pelo integrador é o PREÇO DE VENDA do kit escolhido.
      // Valor total = potência (kWp) x preço aplicado — idêntico para qualquer grupo de kit.
      const baseEquipmentRate = ratePerKwp * 0.55;
      const tierEquipmentRate = baseEquipmentRate * cfg.materialCostFactor;
      const totalPrice = Math.round(realSystemKwp * ratePerKwp * 100) / 100;

      const baseEquipmentBudget = Math.round(realSystemKwp * tierEquipmentRate);
      const modTotal = baseEquipmentBudget * 0.5;
      const invTotal = baseEquipmentBudget * 0.36;

      const structuredItems = [
        {
          productId: "kwp-mod",
          productName: `Módulo ${cfg.moduleBrand} ${modulePowerW}W N-Type`,
          brandName: cfg.moduleBrand,
          categoryName: "module",
          quantity: moduleQty,
          unitPrice: modTotal / moduleQty,
          lineTotal: modTotal,
        },
        {
          productId: "kwp-inv",
          productName: `Inversor ${cfg.inverterBrand} ${invPower}kW`,
          brandName: cfg.inverterBrand,
          categoryName: "inverter",
          quantity: 1,
          unitPrice: invTotal,
          lineTotal: invTotal,
        },
      ];

      if (roofLabel !== "Sem estrutura") {
        const structTotal = baseEquipmentBudget * 0.14;
        structuredItems.push({
          productId: "kwp-struct",
          productName: `Estrutura para ${moduleQty} módulos (${roofLabel})`,
          brandName: "Universal",
          categoryName: "structure",
          quantity: moduleQty,
          unitPrice: structTotal / moduleQty,
          lineTotal: structTotal,
        });
      }

      const kitItems = [
        `• ${moduleQty}x Módulos ${cfg.moduleBrand} ${modulePowerW}W`,
        `• 1x Inversor ${cfg.inverterBrand} ${invPower}kW`,
      ];
      if (roofLabel !== "Sem estrutura") {
        kitItems.push(`• Estrutura: ${roofLabel}`);
      }

      return {
        distributorName: cfg.distributorName,
        distributorId: cfg.distributorId,
        totalPrice,
        ratePerKwp,
        materialsTotal: baseEquipmentBudget,
        kwp: realSystemKwp,
        estimatedGeneration: Math.round(realSystemKwp * geracaoPorKwp),
        items: kitItems,
        invName: cfg.inverterBrand,
        modCount: moduleQty,
        modName: cfg.moduleBrand,
        structuredItems,
      };
    });

    return results;
  }

  private async getAvailableTemplates(
    tenantId: string
  ): Promise<Array<{ id: string; name: string }>> {
    const orgTemplates = await this.prisma.proposalTemplate.findMany({
      where: { tenantId, status: "PUBLISHED", deletedAt: null },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      take: 5,
    });

    if (orgTemplates.length > 0) {
      return orgTemplates.map((t) => ({ id: t.id, name: t.name }));
    }

    const blueprints = await this.prisma.proposalTemplateBlueprint.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
      take: 5,
    });

    if (blueprints.length > 0) {
      return blueprints.map((b) => ({ id: b.id, name: b.name }));
    }

    return [
      { id: "default-moderno", name: "Modelo Comercial Moderno (Padrão)" },
      { id: "default-executivo", name: "Modelo Executivo Solar" },
      { id: "default-minimalista", name: "Modelo Minimalista" },
    ];
  }

  private readonly ROOF_OPTIONS_TEXT =
    `*_Qual a estrutura do telhado?_* 🏠\n\n` +
    `> 1️⃣ *Cerâmica (Colonial)* (Telhas cerâmicas convencionais)\n` +
    `> 2️⃣ *Fibrocimento* (Telhas de fibrocimento em madeira)\n` +
    `> 3️⃣ *Metálico* (Telhas trapezoidais ou zipadas)\n` +
    `> 4️⃣ *Solo* (Estrutura para usina de solo)\n` +
    `> 5️⃣ *Laje* (Laje plana de concreto com triângulos)\n` +
    `> 6️⃣ *Fibrometal* (Fibrocimento em vigas metálicas)\n` +
    `> 7️⃣ *Sem estrutura* (Apenas equipamentos (sem fixação))\n` +
    `> 0️⃣ *Voltar / Corrigir padrão elétrico*\n\n` +
    `_(Responda com o número da opção)_`;

  private readonly GRID_OPTIONS_TEXT =
    `*_Qual o padrão de entrada da instalação?_* ⚡\n\n` +
    `> 1️⃣ *Monofásico 220V*\n` +
    `> 2️⃣ *Bifásico 127V/220V*\n` +
    `> 3️⃣ *Trifásico 220V*\n` +
    `> 4️⃣ *Trifásico 380V*\n` +
    `> 0️⃣ *Voltar / Corrigir localização ou consumo*\n\n` +
    `_(Responda com o número da opção)_`;

  private formatBrl(value: number): string {
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private resolveQuoteIndexFromText(text: string, max: number): number | null {
    const l = text.toLowerCase();
    let idx: number | null = null;
    if (l.includes("standard")) idx = 0;
    else if (l.includes("elite")) idx = 1;
    else if (l.includes("premium")) idx = 2;
    else {
      const m = l.match(/\b([1-9])\b/);
      if (m && m[1]) idx = parseInt(m[1], 10) - 1;
    }
    if (idx === null || idx < 0 || idx >= max) return null;
    return idx;
  }

  /** Etapa 2: kit escolhido -> pergunta o preço de venda por kWp */
  private buildPriceQuestionText(quote: any, orgDefaultRate: number): string {
    const total = Math.round(quote.kwp * orgDefaultRate * 100) / 100;
    const items: string[] = Array.isArray(quote.items) ? quote.items : [];
    return (
      `*_Kit ${quote.distributorName} selecionado!_* ☀️\n\n` +
      `> ⚡ Potência: \`${quote.kwp} kWp\` | Geração estimada: \`${quote.estimatedGeneration} kWh/mês\`\n` +
      items.map((i) => `> ${i}\n`).join("") +
      `\n*_Como você deseja prosseguir para esta cotação?_*\n\n` +
      `> 1️⃣ *Seguir com o preço padrão* (\`R$ ${this.formatBrl(orgDefaultRate)}/kWp\` — Total: \`R$ ${this.formatBrl(total)}\`)\n` +
      `> 2️⃣ *Informar outro preço por kWp* (ex: \`2500\`, \`R$ 3.200\` ou \`total 18500\`)\n` +
      `> 0️⃣ *Voltar / Escolher outro kit*\n\n` +
      `_(Responda 1, 2 ou digite o preço por kWp diretamente)_`
    );
  }

  /** Etapa 3: preço definido -> resumo com valor total e pergunta o nome do cliente */
  private buildPriceAppliedText(quote: any, rate: number, isDerivedFromTotal?: boolean): string {
    const total = Math.round(quote.kwp * rate * 100) / 100;
    const derivedNote = isDerivedFromTotal
      ? `\n_(Convertido a partir do valor total informado)_`
      : "";
    return (
      `*_Preço aplicado:_* \`R$ ${this.formatBrl(rate)}/kWp\` ✅${derivedNote}\n\n` +
      `*_Resumo da cotação — Kit ${quote.distributorName}:_*\n` +
      `> ⚡ Potência: \`${quote.kwp} kWp\`\n` +
      `> 💰 Valor total: \`R$ ${this.formatBrl(total)}\` (${quote.kwp} kWp × R$ ${this.formatBrl(rate)})\n` +
      `> _Validade da cotação: 3 dias úteis_\n\n` +
      `*_Qual o nome do cliente final para registrarmos no seu CRM?_*\n` +
      `_(ou digite 0️⃣ para alterar o preço)_`
    );
  }

  /** Etapa 1: lista os grupos de kits (sem preço) para o integrador escolher */
  private formatQuotesListText(
    quotes: any[],
    sessionCtx: {
      targetKWp?: number;
      targetModules?: number;
      consumptionKwh?: number;
      cidade?: string;
      estado?: string;
      customRatePerKwp?: number;
    }
  ): string {
    const localidade =
      sessionCtx.cidade && sessionCtx.estado
        ? ` em \`${sessionCtx.cidade}/${sessionCtx.estado}\``
        : sessionCtx.cidade
          ? ` em \`${sessionCtx.cidade}\``
          : "";

    const infoCabecalho = sessionCtx.targetKWp
      ? `para a potência de \`${sessionCtx.targetKWp} kWp\`${localidade}`
      : sessionCtx.targetModules
        ? `para \`${sessionCtx.targetModules} módulos\`${localidade}`
        : `para o consumo de \`${sessionCtx.consumptionKwh || 300} kWh/mês\`${localidade}`;

    let quoteText = `Excelente! Seguem os grupos de kits dimensionados ${infoCabecalho}:\n\n`;
    const first = quotes[0];
    if (first) {
      quoteText += `> ⚡ Potência: \`${first.kwp} kWp\` | Geração estimada: \`${first.estimatedGeneration} kWh/mês\`\n\n`;
    }

    quotes.forEach((q, index) => {
      const tierName =
        q.distributorName || (index === 0 ? "Standard" : index === 1 ? "Elite" : "Premium");
      const isTop = index === 0;
      const tag = isTop ? " (Mais Recomendado)" : "";
      const trophy = isTop ? " 🏆" : "";

      quoteText += `*_Opção ${index + 1} — ${tierName}${tag}_*${trophy}\n`;

      const items: string[] =
        q.items && q.items.length > 0
          ? q.items
          : q.structuredItems && q.structuredItems.length > 0
            ? q.structuredItems.map(
                (si: any) => `• ${si.quantity > 1 ? `${si.quantity}x ` : ""}${si.productName}`
              )
            : [];
      if (items.length > 0) {
        items.forEach((item: string) => {
          quoteText += `> ${item}\n`;
        });
      }
      quoteText += `\n`;
    });

    quoteText += `Qual opção você prefere para o seu cliente?\n`;
    quoteText += `_(Responda com o número ou nome da opção: 1 Standard, 2 Elite ou 3 Premium. Na sequência você define o preço por kWp)_\n`;
    quoteText += `> 0️⃣ *Voltar / Alterar estrutura*\n\n`;
    quoteText += `Equipe *_EnergivIA Solar._*`;
    return quoteText;
  }

  private numToEmoji(num: number): string {
    const emojis: Record<number, string> = {
      1: "1️⃣",
      2: "2️⃣",
      3: "3️⃣",
      4: "4️⃣",
      5: "5️⃣",
      6: "6️⃣",
      7: "7️⃣",
      8: "8️⃣",
      9: "9️⃣",
      10: "🔟",
    };
    return emojis[num] || `${num}️⃣`;
  }

  private getGreetingText(contactName?: string): string {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const brHours = (utcHours - 3 + 24) % 24;

    let saudacao = "Olá";
    if (brHours >= 5 && brHours < 12) {
      saudacao = "Bom dia";
    } else if (brHours >= 12 && brHours < 18) {
      saudacao = "Boa tarde";
    } else {
      saudacao = "Boa noite";
    }

    const cleanName = (contactName || "").trim();
    const firstName = cleanName && cleanName !== "Integrador" ? ` ${cleanName.split(" ")[0]}` : "";

    return `${saudacao}${firstName}! Tudo bem? ☀️`;
  }

  private buildGreetingMenu(contactName?: string): string {
    const greeting = this.getGreetingText(contactName);
    return (
      `${greeting}\n\n` +
      `Sou seu assistente de vendas e dimensionamento da *_EnergivIA Solar._*\n\n` +
      `*_Como posso ajudar você a gerar orçamentos hoje?_*\n\n` +
      `> 1️⃣ *Enviar fatura de energia* (PDF ou foto)\n` +
      `> 2️⃣ *Simular por consumo mensal* (ex: \`450 kWh\`)\n` +
      `> 3️⃣ *Simular por potência de pico* (ex: \`5 kWp\`)\n` +
      `> 4️⃣ *Simular por quantidade de placas* (ex: \`10 módulos\`)\n` +
      `> 5️⃣ *Dúvidas sobre equipamentos e preços de catálogo*\n\n` +
      `_(Responda com o número da opção ou envie a conta de luz diretamente)_\n\n` +
      `Equipe *_EnergivIA Solar._*`
    );
  }

  private async searchCatalogProducts(query: string, limit = 5) {
    try {
      const clean = query
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s\d]/g, " ")
        .trim();

      const stopWords = new Set([
        "de",
        "do",
        "da",
        "dos",
        "das",
        "para",
        "com",
        "sem",
        "em",
        "na",
        "no",
        "nas",
        "nos",
        "um",
        "uma",
        "uns",
        "umas",
        "o",
        "a",
        "os",
        "as",
        "que",
        "qual",
        "quanto",
        "custa",
        "valor",
        "preco",
        "preço",
        "tem",
        "voce",
        "voces",
        "temos",
        "sobre",
        "qualquer",
        "mais",
        "ola",
        "olá",
        "bom",
        "dia",
        "boa",
        "tarde",
        "noite",
        "gostaria",
        "saber",
      ]);

      const terms = clean.split(/\s+/).filter((t) => t.length >= 2 && !stopWords.has(t));

      const OR: any[] = [];
      for (const term of terms) {
        OR.push({ name: { contains: term, mode: "insensitive" } });
        OR.push({ category: { name: { contains: term, mode: "insensitive" } } });
        OR.push({ brand: { name: { contains: term, mode: "insensitive" } } });
      }

      const products = await this.prisma.product.findMany({
        where: {
          active: true,
          ...(OR.length > 0 ? { OR } : {}),
        },
        include: {
          brand: true,
          category: true,
          distributorProducts: {
            include: { distributor: true },
            take: 3,
          },
        },
        take: limit,
      });

      return products;
    } catch (e) {
      this.logger.error("Erro pesquisando catálogo de produtos para WhatsApp:", e);
      return [];
    }
  }

  private async answerFreeformQuestion({
    userQuestion,
    organizationId,
  }: {
    userQuestion: string;
    organizationId?: string | null;
  }): Promise<string> {
    const openAiKey = this.config.get<string>("OPENAI_API_KEY");
    if (!openAiKey) {
      return (
        `Não consegui consultar as especificações no momento. ` +
        `Para cotar um kit completo, você pode me enviar a fatura em PDF/foto ou digitar o consumo médio em kWh (ex: *450 kWh*).`
      );
    }

    const matchingProducts = await this.searchCatalogProducts(userQuestion, 4);

    let catalogContext = "";
    if (matchingProducts.length > 0) {
      catalogContext = "PRODUTOS ENCONTRADOS NO BANCO DE DADOS DA PLATAFORMA ENERGIVIA:\n";
      for (const p of matchingProducts) {
        const prices = p.distributorProducts
          .map(
            (dp) =>
              `${dp.distributor.name}: R$ ${Number(dp.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (Estoque: ${dp.stockQuantity})`
          )
          .join(" | ");
        const specsText = p.specs ? JSON.stringify(p.specs) : "Padrão do fabricante";
        catalogContext += `- Produto: ${p.name}\n  Categoria: ${p.category?.name || "Solar"}\n  Marca: ${p.brand?.name || "Fabricante"}\n  Ficha Técnica / Specs: ${specsText}\n  Preços / Distribuidores: ${prices || "Sob consulta"}\n`;
      }
    } else {
      catalogContext =
        "NENHUM PRODUTO ESPECÍFICO ENCONTRADO NO CATÁLOGO DO BANCO DE DADOS PARA ESSA PESQUISA.";
    }

    const systemPrompt = `Você é o assistente técnico e comercial inteligente da plataforma EnergivIA via WhatsApp.
REGRAS OBRIGATÓRIAS E INEGOCIÁVEIS:
1. ESCOPO ESTRITO: Responda APENAS sobre energia solar fotovoltaica e estritamente sobre os produtos/dados cadastrados na EnergivIA. Se o usuário perguntar sobre qualquer assunto fora de energia solar (esportes, piadas, culinária, política, curiosidades gerais, etc.), recuse educadamente em 1 linha e convide-o a simular um projeto solar ou tirar dúvidas da plataforma.
2. ZERO ALUCINAÇÃO / DADOS REAIS: Utilize EXCLUSIVAMENTE os produtos, fichas técnicas e preços listados abaixo em "CONTEXTO DO CATÁLOGO". NUNCA invente preços, potências, garantias ou marcas. NUNCA mencione informações da internet que não estejam no catálogo abaixo.
3. SE NÃO ENCONTRAR NO CATÁLOGO: Se o produto ou especificação exata não constar no catálogo abaixo, diga claramente em 1 ou 2 frases que não localizou esse modelo cadastrado no momento no catálogo dos distribuidores e oriente a informar o consumo (kWh) ou potência (kWp) para simularmos um kit completo.
4. RESPOSTA ULTRACURTA E DIRETA (MÁXIMO 2 A 3 FRASES): Seja 100% conciso, amigável e direto ao ponto. Proibido textos longos, introduções prolixas ou listas extensas. Economize tokens ao máximo.

CONTEXTO DO CATÁLOGO:
${catalogContext}`;

    const startTime = Date.now();
    const model = "gpt-4o-mini";

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          max_tokens: 150,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userQuestion },
          ],
        }),
      });

      const latencyMs = Date.now() - startTime;
      if (!response.ok) {
        void this.aiUsage.logUsage({
          organizationId,
          feature: AiFeature.WHATSAPP_BOT,
          model,
          latencyMs,
          status: "ERROR",
          errorMessage: `OpenAI HTTP ${response.status}`,
        });
        return "Desculpe, tive uma instabilidade temporária ao consultar o catálogo. Por favor, tente novamente em instantes.";
      }

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };

      if (json.usage) {
        void this.aiUsage.logUsage({
          organizationId,
          feature: AiFeature.WHATSAPP_BOT,
          model,
          promptTokens: json.usage.prompt_tokens || 0,
          completionTokens: json.usage.completion_tokens || 0,
          totalTokens: json.usage.total_tokens || 0,
          latencyMs,
          status: "SUCCESS",
        });
      }

      const answer = json.choices?.[0]?.message?.content?.trim();
      return (
        answer ||
        "Não localizei essa informação no catálogo no momento. Você pode enviar a conta de luz ou digitar o consumo em kWh para gerarmos uma cotação completa!"
      );
    } catch (err) {
      this.logger.error("Erro na resposta conversacional de IA no WhatsApp:", err);
      return "Não consegui processar a consulta agora. Digite *novo* para reiniciar ou envie a fatura em PDF/foto.";
    }
  }

  private async generateBotResponse({
    conversation,
    incomingText,
    extractionResult,
    contactName,
  }: {
    conversation: {
      id: string;
      organizationId: string;
      title: string | null;
      metadata?: unknown;
      messages?: Array<{
        role: string;
        content?: string | null;
        metadata?: unknown;
      }>;
    };
    incomingText: string;
    extractionResult: BillExtractionResult | null;
    contactName?: string;
  }): Promise<string> {
    const lower = incomingText.toLowerCase().trim();
    const messages = conversation?.messages || [];
    const resolvedContactName =
      contactName ||
      (conversation?.metadata as Record<string, unknown> | null | undefined)?.[
        "contactName"
      ]?.toString() ||
      "Integrador";

    // Helper interno para decodificar o estado acumulado da conversa
    const extractContextFromSession = () => {
      let consumptionKwh: number | undefined;
      let targetKWp: number | undefined;
      let targetModules: number | undefined;
      let modPowerWUser: number | undefined;
      let cidade = "";
      let estado = "";
      let gridVoltage = "";
      let roofType = "";
      let customRatePerKwp: number | undefined;
      let clientName = "Cliente";
      let clientWhatsapp = "WhatsApp";
      let chosenQuoteIndex = 0;

      for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        if (!m) continue;
        const meta = m.metadata as Record<string, unknown> | null | undefined;
        if (meta) {
          if (meta["exactAverageKwh"]) consumptionKwh = Number(meta["exactAverageKwh"]);
          if (meta["consumptionKwh"]) consumptionKwh = Number(meta["consumptionKwh"]);
          if (meta["targetKWp"]) targetKWp = Number(meta["targetKWp"]);
          if (meta["targetModules"]) targetModules = Number(meta["targetModules"]);
          if (meta["cidade"]) cidade = String(meta["cidade"]);
          if (meta["uf"]) estado = String(meta["uf"]);
          if (meta["gridVoltage"]) gridVoltage = String(meta["gridVoltage"]);
          if (meta["roofType"]) roofType = String(meta["roofType"]);
          if (meta["customRatePerKwp"]) customRatePerKwp = Number(meta["customRatePerKwp"]);
        }

        const content = typeof m.content === "string" ? m.content : "";
        const lowerC = content.toLowerCase().trim();

        // 7. Nome e WhatsApp do Cliente (pode ser detectado pelas confirmações do assistente)
        if (m.role === "assistant") {
          const kitSelM = content.match(/Kit (Standard|Elite|Premium) selecionado/i);
          if (kitSelM && kitSelM[1]) {
            const kn = kitSelM[1].toLowerCase();
            chosenQuoteIndex = kn === "standard" ? 0 : kn === "elite" ? 1 : 2;
          }

          const precoM = content.match(/Preço aplicado:[_*\s]*`?R\$\s*([\d.,]+)\/kWp/i);
          if (precoM && precoM[1]) {
            const parsedPreco = parseKwpRate(precoM[1]);
            if (parsedPreco) customRatePerKwp = parsedPreco.rate;
          }
          const consM = content.match(
            /(?:Consumo Registrado|Consumo m[ée]dio de):\s*\*?`?(\d+[\d.,]*)`?\s*kWh/i
          );
          if (consM && consM[1]) {
            const cVal = Math.round(Number(consM[1].replace(/\./g, "").replace(",", ".")));
            if (cVal >= 20 && cVal <= 500000) {
              consumptionKwh = cVal;
            }
          }

          const potM = content.match(/Potência Solicitada:\s*\*?`?([\d.,]+)`?\s*kWp/i);
          if (potM && potM[1]) {
            targetKWp = parseFloat(potM[1].replace(",", "."));
          }

          const qtyM = content.match(/Quantidade Solicitada:\s*\*?`?(\d+)`?\s*placas/i);
          if (qtyM && qtyM[1]) {
            targetModules = parseInt(qtyM[1], 10);
            const pM = content.match(/`?(\d{3,4})`?\s*w/i);
            if (pM && pM[1]) {
              modPowerWUser = parseInt(pM[1], 10);
            }
          }

          const gridM = content.match(/Padrão Elétrico Registrado:\s*\*?`?([^`*]+?)`?\s*⚡/i);
          if (gridM && gridM[1]) {
            gridVoltage = gridM[1].trim();
          }

          const rateMatch =
            content.match(
              /Taxa (?:personalizada|aplicada|padrão aplicada|definida):\s*\*?R\$\s*([\d.,]+)\/kWp\*?/i
            ) || content.match(/\(Taxa:\s*R\$\s*([\d.,]+)\/kWp\)/i);
          if (rateMatch && rateMatch[1]) {
            const parsed = parseKwpRate(rateMatch[1]);
            if (parsed) customRatePerKwp = parsed.rate;
          }

          const roofM = content.match(
            /Estrutura(?: registrada)?:\s*\*?([^*]+?)\*?(?:\s*🏠|\.|\n|$)/i
          );
          if (roofM && roofM[1]) {
            roofType = roofM[1].replace(/\*/g, "").trim();
          }

          const bothM = content.match(/Cliente \*([^*]+)\* e WhatsApp \*([^*]+)\*/i);
          if (bothM?.[1]) {
            clientName = bothM[1].replace(/\*/g, "").trim();
            if (bothM[2]) clientWhatsapp = bothM[2].replace(/\D/g, "");
          } else {
            const nameM1 = content.match(/registrar o cliente \*?([^*.]+)\*?\./i);
            const nameM2 = content.match(/Cliente \*([^*]+)\* anotado/i);
            if (nameM1?.[1]) clientName = nameM1[1].replace(/\*/g, "").trim();
            else if (nameM2?.[1]) clientName = nameM2[1].replace(/\*/g, "").trim();
          }

          const locM =
            content.match(/Localização identificada:\s*\*([^*\/]+)\/([A-Za-z]{2})\*/i) ||
            content.match(/Localização corrigida para:\s*\*([^*\/]+)\/([A-Za-z]{2})\*/i);
          if (locM && locM[1] && locM[2]) {
            cidade = locM[1].trim();
            estado = locM[2].trim().toUpperCase();
          }

          continue; // Não analisa mensagens do bot para evitar capturar exemplos de texto
        }

        const prevAssistantForLead = i > 0 ? messages[i - 1]?.content || "" : "";
        if (
          prevAssistantForLead.includes("taxa padrão configurada") ||
          prevAssistantForLead.includes("Qual valor por kWp") ||
          prevAssistantForLead.includes("Como deseja prosseguir para esta cotação")
        ) {
          const parsed = parseKwpRate(content);
          if (parsed) {
            customRatePerKwp = parsed.rate;
          }
        }

        if (
          prevAssistantForLead.includes("cliente final") ||
          prevAssistantForLead.includes("E qual o WhatsApp dele") ||
          prevAssistantForLead.includes("WhatsApp correto")
        ) {
          const { name: parsedName, phone: parsedPhone } = extractNameAndPhone(content);
          if (parsedPhone) {
            clientWhatsapp = parsedPhone;
          }
          if (
            parsedName &&
            parsedName.length >= 2 &&
            !parsedName.toLowerCase().startsWith("voltar") &&
            !parsedName.toLowerCase().startsWith("0")
          ) {
            clientName = parsedName;
          }
        }

        // 1. Extração de kWp
        const kwpM = content.match(/(\d+(?:[.,]\d+)?)\s*kwp/i);
        if (kwpM && kwpM[1]) {
          targetKWp = parseFloat(kwpM[1].replace(",", "."));
        } else if (
          prevAssistantForLead.includes("Simulação por Potência de Pico") ||
          prevAssistantForLead.includes("potência de pico") ||
          prevAssistantForLead.includes("potência (kWp)")
        ) {
          const numM = content.match(/(\d+(?:[.,]\d+)?)/);
          if (numM && numM[1]) {
            const pVal = parseFloat(numM[1].replace(",", "."));
            if (pVal >= 0.5 && pVal <= 5000) {
              targetKWp = pVal;
            }
          }
        }

        // 2. Extração de Módulos
        const modM = content.match(/(\d+)\s*(?:placas?|m[oó]dulos?|paineis?|pain[eé]is)/i);
        if (modM && modM[1]) {
          targetModules = parseInt(modM[1], 10);
          const pM = content.match(/(\d{3,4})\s*w/i);
          if (pM && pM[1]) {
            modPowerWUser = parseInt(pM[1], 10);
          }
        } else if (
          prevAssistantForLead.includes("Simulação por Quantidade de Módulos") ||
          prevAssistantForLead.includes("placas solares você deseja no kit")
        ) {
          const numM = content.match(/(\d+)/);
          if (numM && numM[1]) {
            const mVal = parseInt(numM[1], 10);
            if (mVal >= 1 && mVal <= 10000) {
              targetModules = mVal;
            }
          }
        }

        // 3. Extração de Consumo kWh
        const kwhM = content.match(
          /(?:consumo registrado:\s*|consumo m[ée]dio de\s*|consumo\s+(?:de\s+)?|gasto\s+(?:de\s+)?)?(\d+[\d.,]*)\s*(?:kwh|kw)(?:\/m[eê]s)?/i
        );
        if (kwhM && kwhM[1] && !kwpM) {
          const val = Math.round(Number(kwhM[1].replace(/\./g, "").replace(",", ".")));
          if (val >= 20 && val <= 500000) {
            consumptionKwh = val;
          }
        } else if (
          prevAssistantForLead.includes("Simulação por Consumo Mensal") ||
          prevAssistantForLead.includes("consumo médio mensal") ||
          prevAssistantForLead.includes("consumo em kWh") ||
          prevAssistantForLead.includes("consumo (kWh)")
        ) {
          const numM = content.match(/(\d+[\d.,]*)/);
          if (numM && numM[1]) {
            const val = Math.round(Number(numM[1].replace(/\./g, "").replace(",", ".")));
            if (val >= 20 && val <= 500000) {
              consumptionKwh = val;
            }
          }
        }

        // 4. Extração de Cidade e Estado
        const prevContent = prevAssistantForLead;
        if (
          prevContent.includes("Para qual cidade e estado será a instalação?") ||
          prevContent.includes("Vamos alterar a localização") ||
          prevContent.includes("Vamos corrigir a localização")
        ) {
          const hspRes = getHsp(content);
          if (hspRes.city) {
            cidade = hspRes.city;
            estado = hspRes.uf;
          }
        }

        const cityM = content.match(
          /(?:em|para|na cidade de|no munic[íi]pio de)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s'-]{3,35}?)(?:\s*[\/\-]\s*([A-Za-z]{2})|\s+([A-Za-z]{2}))?(?:\s*\(|$|\.|\n|,)/i
        );
        if (cityM && cityM[1]) {
          const candidate = (
            cityM[1] + (cityM[2] ? `/${cityM[2]}` : cityM[3] ? `/${cityM[3]}` : "")
          ).trim();
          const candLower = candidate.toLowerCase();
          if (
            !candLower.includes("monof") &&
            !candLower.includes("bifas") &&
            !candLower.includes("trifas") &&
            !candLower.includes("ceram") &&
            !candLower.includes("fibro") &&
            !candLower.includes("metal")
          ) {
            const hspRes = getHsp(candidate);
            cidade = hspRes.city;
            estado = hspRes.uf;
          }
        }

        if (
          lowerC.startsWith("mudar cidade") ||
          lowerC.startsWith("trocar cidade") ||
          lowerC.startsWith("alterar cidade") ||
          (isLocationInput(content) && !prevContent.includes("cliente final"))
        ) {
          const hspRes = getHsp(content);
          if (hspRes.city) {
            cidade = hspRes.city;
            estado = hspRes.uf;
          }
        }

        // 5. Extração de Padrão Elétrico
        if (
          lowerC === "1" ||
          lowerC.includes("1️⃣") ||
          lowerC.includes("monofásico") ||
          lowerC.includes("monofasico") ||
          lowerC.includes("mono 220") ||
          lowerC.includes("mono")
        ) {
          if (messages[i - 1]?.content?.includes("Qual o padrão de entrada da instalação")) {
            gridVoltage = "Monofásico 220V";
          }
        } else if (
          lowerC === "2" ||
          lowerC.includes("2️⃣") ||
          lowerC.includes("bifásico") ||
          lowerC.includes("bifasico") ||
          lowerC.includes("127/220") ||
          lowerC.includes("bi 220")
        ) {
          if (messages[i - 1]?.content?.includes("Qual o padrão de entrada da instalação")) {
            gridVoltage = "Bifásico 127V/220V";
          }
        } else if (
          lowerC === "3" ||
          lowerC.includes("3️⃣") ||
          lowerC.includes("trifasico 220") ||
          lowerC.includes("trifásico 220") ||
          lowerC.includes("tri 220") ||
          lowerC.includes("tri_220")
        ) {
          if (messages[i - 1]?.content?.includes("Qual o padrão de entrada da instalação")) {
            gridVoltage = "Trifásico 220V";
          }
        } else if (
          lowerC === "4" ||
          lowerC.includes("4️⃣") ||
          lowerC.includes("trifasico 380") ||
          lowerC.includes("trifásico 380") ||
          lowerC.includes("tri 380") ||
          lowerC.includes("tri_380") ||
          lowerC.includes("380v")
        ) {
          if (messages[i - 1]?.content?.includes("Qual o padrão de entrada da instalação")) {
            gridVoltage = "Trifásico 380V";
          }
        }

        // 6. Extração de Tipo de Telhado
        const isRoofQuestion =
          messages[i - 1]?.content?.includes("Qual a estrutura do telhado") ||
          messages[i - 1]?.content?.includes("estrutura do telhado");

        if (
          lowerC === "1" ||
          lowerC.includes("1️⃣") ||
          lowerC.includes("cerâmica") ||
          lowerC.includes("ceramica") ||
          lowerC.includes("colonial")
        ) {
          if (isRoofQuestion) {
            roofType = "Cerâmica (Colonial)";
          }
        } else if (
          lowerC === "2" ||
          lowerC.includes("2️⃣") ||
          lowerC.includes("fibrocimento") ||
          lowerC.includes("fibromadeira")
        ) {
          if (isRoofQuestion) {
            roofType = "Fibrocimento";
          }
        } else if (
          lowerC === "3" ||
          lowerC.includes("3️⃣") ||
          lowerC.includes("metálico") ||
          lowerC.includes("metalico")
        ) {
          if (isRoofQuestion) {
            roofType = "Metálico";
          }
        } else if (lowerC === "4" || lowerC.includes("4️⃣") || lowerC.includes("solo")) {
          if (isRoofQuestion) {
            roofType = "Solo";
          }
        } else if (lowerC === "5" || lowerC.includes("5️⃣") || lowerC.includes("laje")) {
          if (isRoofQuestion) {
            roofType = "Laje";
          }
        } else if (lowerC === "6" || lowerC.includes("6️⃣") || lowerC.includes("fibrometal")) {
          if (isRoofQuestion) {
            roofType = "Fibrometal";
          }
        } else if (
          lowerC === "7" ||
          lowerC.includes("7️⃣") ||
          lowerC.includes("sem estrutura") ||
          lowerC.includes("nenhuma")
        ) {
          if (isRoofQuestion) {
            roofType = "Sem estrutura";
          }
        }
      }

      return {
        consumptionKwh,
        targetKWp,
        targetModules,
        modPowerWUser,
        cidade,
        estado,
        gridVoltage,
        roofType,
        customRatePerKwp,
        clientName,
        clientWhatsapp,
        chosenQuoteIndex,
      };
    };

    const sessionCtx = extractContextFromSession();

    // Helper: recalcula os grupos de kits para a sessão atual
    const kitsFor = (overrides: { roofType?: string; customRatePerKwp?: number } = {}) =>
      this.calculateDistributorKits({
        consumptionKwh: sessionCtx.consumptionKwh,
        targetKWp: sessionCtx.targetKWp,
        targetModules: sessionCtx.targetModules,
        modPowerWUser: sessionCtx.modPowerWUser,
        cidade: sessionCtx.cidade || "São Paulo",
        estado: sessionCtx.estado || "SP",
        roofType: overrides.roofType || sessionCtx.roofType || "Cerâmica (Colonial)",
        gridVoltage: sessionCtx.gridVoltage || "Monofásico 220V",
        organizationId: conversation.organizationId,
        customRatePerKwp: overrides.customRatePerKwp,
      });
    const NO_KITS_TEXT =
      `No momento não encontramos kits com todos os componentes e estrutura (${sessionCtx.roofType || "padrão"}) disponíveis em estoque compatível.\n\n` +
      `Você pode selecionar a opção "7️⃣ Sem estrutura" para cotar apenas os equipamentos elétricos ou escolher outro tipo de telhado (ou envie 0️⃣ para voltar).`;

    // 1. Se acabou de extrair a fatura com sucesso
    if (extractionResult && extractionResult.exactAverageKwh > 0) {
      const cidade = extractionResult.data.cidade
        ? `${extractionResult.data.cidade}${extractionResult.data.uf ? `/${extractionResult.data.uf.trim().toUpperCase()}` : ""}`
        : "São Paulo/SP";
      const kwh = extractionResult.exactAverageKwh;
      const meses = extractionResult.monthCount || 1;
      const tipoConexao = extractionResult.data.tipo_conexao || "";
      const baseTexto =
        meses > 1
          ? `baseado no histórico de ${meses} meses da fatura`
          : `baseado no consumo do mês atual da fatura`;

      const conexaoInfo = tipoConexao ? `\n> Padrão de rede identificado: *${tipoConexao}*` : "";

      return (
        `*_Fatura Analisada com Precisão!_* 📄⚡\n\n` +
        `Consumo médio de \`${kwh.toLocaleString("pt-BR")} kWh/mês\` em \`${cidade}\`.\n\n` +
        `> Histórico: *${baseTexto}*${conexaoInfo}\n\n` +
        this.ROOF_OPTIONS_TEXT
      );
    }

    // Recupera a última mensagem do bot para saber o estado atual da conversa
    const assistantMessages = messages.filter((m) => m.role === "assistant");
    const lastRawBotMsg =
      assistantMessages.length > 0
        ? assistantMessages[assistantMessages.length - 1]?.content || ""
        : "";

    // Se o bot enviou o lembrete de 10 min e o usuário apenas confirmou presença (ex: "sim", "estou aqui", "oi"):
    if (
      lastRawBotMsg.includes("Você ainda está por aí?") &&
      (lower === "sim" ||
        lower === "estou" ||
        lower === "oi" ||
        lower === "ola" ||
        lower === "olá" ||
        lower === "opa" ||
        lower === "estou aqui" ||
        lower === "continuar" ||
        lower === "bora" ||
        lower === "estou por aqui" ||
        lower === "to aqui" ||
        lower === "tô aqui")
    ) {
      const priorFunctional = assistantMessages.filter(
        (m) => !m.content?.includes("Você ainda está por aí?")
      );
      const priorQuestion =
        priorFunctional.length > 0
          ? priorFunctional[priorFunctional.length - 1]?.content || ""
          : "";
      if (priorQuestion) {
        return `Maravilha! Continuando de onde paramos:\n\n${priorQuestion}`;
      }
    }

    // Para o fluxo das etapas, recupera a última mensagem funcional (ignorando o lembrete para não perder o passo)
    const functionalAssistantMessages = assistantMessages.filter(
      (m) => !m.content?.includes("Você ainda está por aí?")
    );
    const lastBotMsg =
      functionalAssistantMessages.length > 0
        ? functionalAssistantMessages[functionalAssistantMessages.length - 1]?.content || ""
        : "";

    // Tratamento Universal de Voltar / Corrigir
    const isBackCommand =
      lower === "0" ||
      lower === "0️⃣" ||
      lower === "voltar" ||
      lower === "corrigir" ||
      lower === "opcao 0" ||
      lower === "opção 0";

    if (isBackCommand) {
      if (
        lastBotMsg.includes("Simulação por Consumo Mensal") ||
        lastBotMsg.includes("consumo médio mensal") ||
        lastBotMsg.includes("Simulação por Potência de Pico") ||
        lastBotMsg.includes("potência de pico desejada") ||
        lastBotMsg.includes("Simulação por Quantidade de Módulos") ||
        lastBotMsg.includes("placas solares você deseja no kit")
      ) {
        return this.buildGreetingMenu(resolvedContactName);
      }

      if (lastBotMsg.includes("Qual o padrão de entrada da instalação?")) {
        if (sessionCtx.consumptionKwh) {
          return (
            `Certo! Vamos alterar a localização ou o consumo. 📍\n\n` +
            `Para qual cidade e estado será a instalação? (Ex: \`Cuiabá/MT\`, \`Maringá/PR\`, \`São Paulo/SP\`)`
          );
        }
        return (
          `Certo! Vamos alterar o dimensionamento. ☀️\n\n` +
          `Envie a potência desejada (ex: \`5 kWp\`), a quantidade de placas (ex: \`10 placas\`) ou o consumo médio (ex: \`450 kWh\`).`
        );
      }

      if (
        lastBotMsg.includes("Qual a estrutura do telhado") ||
        lastBotMsg.includes("estrutura do telhado")
      ) {
        return (
          `Sem problemas! Vamos corrigir o padrão elétrico da instalação. ⚡\n\n` +
          this.GRID_OPTIONS_TEXT
        );
      }

      if (
        lastBotMsg.includes("Como você deseja prosseguir para esta cotação") ||
        lastBotMsg.includes("Como deseja prosseguir para esta cotação") ||
        lastBotMsg.includes("taxa padrão configurada")
      ) {
        const quotes = await kitsFor();
        if (quotes.length === 0) return NO_KITS_TEXT;
        return (
          `Certo! Vamos escolher outro kit. ☀️\n\n` + this.formatQuotesListText(quotes, sessionCtx)
        );
      }

      if (
        lastBotMsg.includes("Qual valor por kWp") ||
        lastBotMsg.includes("Qual valor você deseja utilizar")
      ) {
        const quotes = await kitsFor();
        if (quotes.length === 0) return NO_KITS_TEXT;
        const quote = quotes[sessionCtx.chosenQuoteIndex] || quotes[0];
        if (!quote) return NO_KITS_TEXT;
        const orgDefaultRate = await this.getOrganizationDefaultKwpRate(
          conversation.organizationId
        );
        return this.buildPriceQuestionText(quote, orgDefaultRate);
      }

      if (lastBotMsg.includes("Qual opção você prefere para o seu cliente")) {
        return `Certo! Vamos alterar a estrutura do telhado. 🏠\n\n` + this.ROOF_OPTIONS_TEXT;
      }

      const isClientNameQuestion =
        lastBotMsg.includes("cliente final") ||
        lastBotMsg.includes("Qual o nome do cliente final") ||
        lastBotMsg.includes("nome correto do cliente final");

      if (isClientNameQuestion) {
        const quotes = await kitsFor();
        if (quotes.length > 0) {
          const quote = quotes[sessionCtx.chosenQuoteIndex] || quotes[0];
          if (quote) {
            const orgDefaultRate = await this.getOrganizationDefaultKwpRate(
              conversation.organizationId
            );
            return this.buildPriceQuestionText(quote, orgDefaultRate);
          }
        }
        return `Certo! Vamos alterar a estrutura do telhado. 🏠\n\n` + this.ROOF_OPTIONS_TEXT;
      }

      if (
        lastBotMsg.includes("E qual o WhatsApp dele") ||
        lastBotMsg.includes("qual o WhatsApp") ||
        lastBotMsg.includes("qual o whatsapp") ||
        lastBotMsg.includes("WhatsApp correto")
      ) {
        return `Sem problemas! Qual o nome do cliente final para registrarmos no seu CRM? (ou digite 0️⃣ para alterar o preço)`;
      }

      if (lastBotMsg.includes("Qual modelo de proposta comercial você deseja usar")) {
        return `Certo! Qual o WhatsApp correto do cliente com DDD? (ou digite 0️⃣ para voltar ao nome)`;
      }

      return (
        `*_O que você gostaria de alterar ou corrigir?_* 📝\n\n` +
        `> 1️⃣ *Cidade e Estado* (ex: digite \`Cuiabá/MT\`)\n` +
        `> 2️⃣ *Consumo ou Potência* (ex: digite \`500 kWh\` ou \`6 kWp\`)\n` +
        `> 3️⃣ *Padrão de Entrada* (ex: digite \`mono\`, \`bi\` ou \`tri 380V\`)\n` +
        `> 4️⃣ *Estrutura do Telhado* (ex: digite \`solo\`, \`laje\` ou \`fibrocimento\`)\n` +
        `> 5️⃣ *Reiniciar do início* (digite \`novo\`)\n\n` +
        `_(Responda com o número da opção desejada ou o comando)_`
      );
    }

    // ESTADO A: O Bot apresentou os grupos de kits (Standard, Elite, Premium) -> escolhido o kit, pergunta o preço por kWp
    if (lastBotMsg.includes("Qual opção você prefere para o seu cliente")) {
      const quotes = await kitsFor();
      if (quotes.length === 0) return NO_KITS_TEXT;
      const idx = this.resolveQuoteIndexFromText(incomingText, quotes.length);
      if (idx !== null && quotes[idx]) {
        const orgDefaultRate = await this.getOrganizationDefaultKwpRate(
          conversation.organizationId
        );
        return this.buildPriceQuestionText(quotes[idx], orgDefaultRate);
      }
      return (
        `Opção não reconhecida.\n\n` +
        `Qual opção você prefere para o seu cliente?\n` +
        `_(Responda 1 Standard, 2 Elite ou 3 Premium, ou envie 0️⃣ para voltar e alterar a estrutura)_`
      );
    }

    // ESTADO B: O Bot pediu o nome do cliente final (ou o nome correto)
    const isAskingClientName =
      (lastBotMsg.includes("cliente final") &&
        (lastBotMsg.includes("nome") ||
          lastBotMsg.includes("Nome") ||
          lastBotMsg.includes("CRM") ||
          lastBotMsg.includes("registrarmos"))) ||
      lastBotMsg.includes("Qual o nome do cliente final") ||
      lastBotMsg.includes("nome correto do cliente final");

    if (isAskingClientName) {
      const lower = incomingText.toLowerCase().trim();
      const isGreeting =
        /^(olá|ola|oi|oii|bom dia|boa tarde|boa noite|menu|iniciar|ajuda|novo|reiniciar)$/i.test(
          lower
        );
      if (isGreeting) {
        return (
          `Olá! Identifiquei sua mensagem. ☀️\n\n` +
          `Para gerarmos a proposta comercial oficial, qual o nome do cliente final? (Ex: João da Silva)\n` +
          `(Ou envie 0️⃣ para voltar e ver os kits disponíveis, ou *novo* para iniciar outra simulação)`
        );
      }

      const { name, phone } = extractNameAndPhone(incomingText);
      const effectiveName = name || (phone ? "Cliente" : incomingText.trim());

      // Se o usuário já enviou o Nome E o WhatsApp na mesma mensagem (ex: "cezar 44988117969" ou "cezar, 44099117969")
      if (phone && name) {
        const templates = await this.getAvailableTemplates(conversation.organizationId);
        let templateListText = "";
        templates.forEach((t, i) => {
          templateListText += `> ${this.numToEmoji(i + 1)} *${t.name}*\n`;
        });
        templateListText += `> 0️⃣ *Voltar / Rever dados*\n`;

        return (
          `Cliente *${effectiveName}* e WhatsApp \`${formatPhone(phone)}\` registrados com sucesso! 👤✨\n\n` +
          `*_Qual modelo de proposta comercial você deseja usar para o seu cliente?_*\n\n` +
          `${templateListText}\n` +
          `_(Responda com o número da opção desejada ou digite 0️⃣ para corrigir o nome/telefone)_`
        );
      }

      // Se enviou apenas o telefone sem nome
      if (phone && !name) {
        return `Anotado o WhatsApp \`${formatPhone(phone)}\`! E qual o *nome* do cliente final para registrarmos no seu CRM?`;
      }

      // Se enviou apenas o nome
      return `Certo, vou registrar o cliente *${effectiveName}*. E qual o WhatsApp dele com DDD? (ou digite 0️⃣ para voltar)`;
    }

    // ESTADO C: O Bot pediu o WhatsApp do cliente final -> Apresenta os modelos de proposta
    if (
      lastBotMsg.includes("E qual o WhatsApp dele") ||
      lastBotMsg.includes("qual o WhatsApp") ||
      lastBotMsg.includes("qual o whatsapp") ||
      lastBotMsg.includes("WhatsApp correto")
    ) {
      const clientNameMatch =
        lastBotMsg.match(/registrar o cliente \*?([^*.]+)\*?\./i) ||
        lastBotMsg.match(/Cliente \*([^*]+)\*/i);
      let clientName =
        clientNameMatch?.[1]?.replace(/\*/g, "").trim() || sessionCtx.clientName || "Cliente";

      const { name: newName, phone } = extractNameAndPhone(incomingText);
      if (newName && !phone) {
        // Usuário corrigiu apenas o nome
        return `Certo, corrigi o nome para *${newName}*. E qual o WhatsApp dele com DDD? (ou digite 0️⃣ para voltar)`;
      }
      if (newName && phone) {
        // Usuário enviou nome e telefone
        clientName = newName;
      }

      const templates = await this.getAvailableTemplates(conversation.organizationId);
      let templateListText = "";
      templates.forEach((t, i) => {
        templateListText += `> ${this.numToEmoji(i + 1)} *${t.name}*\n`;
      });
      templateListText += `> 0️⃣ *Voltar / Rever dados*\n`;

      const phoneDisplay = phone ? ` e WhatsApp \`${formatPhone(phone)}\`` : "";

      return (
        `Cliente *${clientName}*${phoneDisplay} anotado com sucesso! 👤✨\n\n` +
        `*_Qual modelo de proposta comercial você deseja usar para o seu cliente?_*\n\n` +
        `${templateListText}\n` +
        `_(Responda com o número da opção desejada)_`
      );
    }

    // ESTADO D: O Bot pediu para escolher o modelo de proposta -> GERA PROPOSTA COMPLETA!
    if (lastBotMsg.includes("Qual modelo de proposta comercial você deseja usar")) {
      const templateChoiceStr = incomingText.replace(/\D/g, "");
      const chosenTemplateIndex = templateChoiceStr ? parseInt(templateChoiceStr, 10) - 1 : 0;

      const availableTemplates = await this.getAvailableTemplates(conversation.organizationId);
      const chosenTemplate = availableTemplates[chosenTemplateIndex] || availableTemplates[0];

      let clientName = sessionCtx.clientName || "Cliente";
      let clientWhatsapp =
        sessionCtx.clientWhatsapp && sessionCtx.clientWhatsapp !== "WhatsApp"
          ? sessionCtx.clientWhatsapp
          : "WhatsApp";
      const chosenQuoteIndex = sessionCtx.chosenQuoteIndex || 0;

      // Recupera escolhas das mensagens
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (!m) continue;
        const content = typeof m.content === "string" ? m.content.trim() : "";

        if (clientWhatsapp === "WhatsApp") {
          const { phone } = extractNameAndPhone(content);
          if (phone) {
            clientWhatsapp = phone;
          }
        }

        if (m.role === "assistant" && content.includes("E qual o WhatsApp dele")) {
          for (let j = i + 1; j < messages.length; j++) {
            const nextUserMsg = messages[j];
            if (
              nextUserMsg &&
              nextUserMsg.role === "user" &&
              typeof nextUserMsg.content === "string"
            ) {
              const digits = nextUserMsg.content.replace(/\D/g, "");
              if (digits.length >= 8) {
                clientWhatsapp = digits;
              }
              break;
            }
          }
        }
      }

      const quotes = await this.calculateDistributorKits({
        consumptionKwh: sessionCtx.consumptionKwh,
        targetKWp: sessionCtx.targetKWp,
        targetModules: sessionCtx.targetModules,
        modPowerWUser: sessionCtx.modPowerWUser,
        cidade: sessionCtx.cidade || "São Paulo",
        estado: sessionCtx.estado || "SP",
        roofType: sessionCtx.roofType || "Cerâmica (Colonial)",
        gridVoltage: sessionCtx.gridVoltage,
        organizationId: conversation.organizationId,
        customRatePerKwp: sessionCtx.customRatePerKwp,
      });

      const effectiveConsumption =
        sessionCtx.consumptionKwh ||
        (sessionCtx.targetKWp ? Math.round(sessionCtx.targetKWp * 130) : 300);

      const selectedQuote = quotes[chosenQuoteIndex] ||
        quotes[0] || {
          distributorName: "Edeltec Solar",
          distributorId: undefined,
          totalPrice: Math.round(effectiveConsumption * 28),
          kwp: sessionCtx.targetKWp || Number((effectiveConsumption / 100).toFixed(2)),
          estimatedGeneration: effectiveConsumption,
          items: [],
          structuredItems: [],
        };

      let proposalId = "";
      let quotedSaleBrl = selectedQuote.totalPrice;
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

        // 2. Custos do Projeto e Margem
        const orgRuleRows = await this.prisma.companyCostRule.findMany({
          where: { organizationId: conversation.organizationId },
          orderBy: [{ name: "asc" }, { minKwp: "asc" }],
        });
        const organizationRules = orgRuleRows.map((r) => ({
          id: r.id,
          name: r.name,
          calculationType: r.calculationType as "FIXED" | "PERCENTAGE" | "PER_KWP",
          value: r.value.toNumber(),
          minKwp: r.minKwp?.toNumber() ?? null,
          maxKwp: r.maxKwp?.toNumber() ?? null,
          percentageBase: r.percentageBase ?? null,
        }));
        const materialsSubtotal =
          (selectedQuote as any).materialsTotal > 0
            ? (selectedQuote as any).materialsTotal
            : selectedQuote.totalPrice;
        const costCalc = computeProjectCostSection(
          materialsSubtotal,
          selectedQuote.kwp,
          organizationRules
        );
        // Valor de venda = potência (kWp) x preço aplicado pelo integrador
        quotedSaleBrl = selectedQuote.totalPrice;

        // 3. Cria Deal
        const deal = await this.prisma.deal.create({
          data: {
            tenantId: conversation.organizationId,
            leadId: lead.id,
            title: `Sistema Fotovoltaico - ${clientName}`,
            stage: "PROPOSAL",
            value: quotedSaleBrl,
          },
        });

        // 4. Cria Dimensionamento
        await this.prisma.systemSizing.create({
          data: {
            tenantId: conversation.organizationId,
            leadId: lead.id,
            name: `Dimensionamento IA - ${selectedQuote.kwp} kWp`,
            input: {
              monthlyConsumptionKwh: effectiveConsumption,
              cidade: sessionCtx.cidade || "São Paulo",
              estado: sessionCtx.estado || "SP",
            },
            result: {
              recommendedPowerKw: selectedQuote.kwp,
              estimatedGeneration: selectedQuote.estimatedGeneration,
            },
          },
        });

        const monthlySavingsVal = Math.round(effectiveConsumption * 0.95);
        const calculatedPayback =
          monthlySavingsVal > 0
            ? Math.max(1, Math.round((quotedSaleBrl / (monthlySavingsVal * 12)) * 10) / 10)
            : 3.2;

        // 5. Cria Simulação
        const simulation = await this.prisma.simulation.create({
          data: {
            tenantId: conversation.organizationId,
            leadId: lead.id,
            name: `Simulação Comercial IA`,
            input: {
              systemSizeKw: selectedQuote.kwp,
              investmentAmount: quotedSaleBrl,
              financingType: "CASH",
              sizing: {
                monthlyConsumptionKwh: effectiveConsumption,
                cidade: sessionCtx.cidade || "São Paulo",
                estado: sessionCtx.estado || "SP",
                recommendedPowerKw: selectedQuote.kwp,
                estimatedGeneration: selectedQuote.estimatedGeneration,
              },
            },
            result: {
              paybackYears: calculatedPayback,
              monthlySavings: monthlySavingsVal,
              monthlySavingsBrl: monthlySavingsVal,
              annualSavings: [monthlySavingsVal * 12],
              sizing: {
                recommendedPowerKw: selectedQuote.kwp,
                estimatedGeneration: selectedQuote.estimatedGeneration,
                estimatedProductionKwhMonth: selectedQuote.estimatedGeneration,
              },
            },
          },
        });

        // 6. Template
        let template = chosenTemplate?.id
          ? await this.prisma.proposalTemplate.findFirst({
              where: {
                id: chosenTemplate.id,
                tenantId: conversation.organizationId,
                deletedAt: null,
              },
            })
          : null;

        if (!template && chosenTemplate?.id) {
          const blueprint = await this.prisma.proposalTemplateBlueprint.findFirst({
            where: { id: chosenTemplate.id, published: true },
          });
          if (blueprint) {
            template = await this.prisma.proposalTemplate.create({
              data: {
                tenantId: conversation.organizationId,
                name: blueprint.name,
                status: "PUBLISHED",
                config: blueprint.document as any,
                version: 1,
              },
            });
          }
        }

        const defaultTemplate =
          template ||
          (await this.prisma.proposalTemplate.findFirst({
            where: {
              tenantId: conversation.organizationId,
              status: "PUBLISHED",
              deletedAt: null,
            },
            orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
          }));

        const rawKitItems = (selectedQuote as any).structuredItems?.length
          ? (selectedQuote as any).structuredItems
          : selectedQuote.items.map((i) => ({
              productId: "",
              productName: i.replace(/^-\s*[^:]+:\s*(?:\d+x\s*)?/, "").trim() || i,
              brandName: "",
              categoryName: "equipment",
              quantity: 1,
              unitPrice: 0,
              lineTotal: 0,
            }));

        // 7. Proposta Comercial
        const proposalNumber = await getNextProposalNumber(
          this.prisma,
          conversation.organizationId
        );
        const proposal = await this.prisma.proposal.create({
          data: {
            tenantId: conversation.organizationId,
            dealId: deal.id,
            simulationId: simulation.id,
            proposalTemplateId: template?.id || defaultTemplate?.id || null,
            proposalTemplateVersion: template?.version || defaultTemplate?.version || 1,
            proposalNumber,
            title: `Proposta Comercial - ${clientName}`,
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            renderedData: {
              integrator: {
                version: 1,
                kitItems: rawKitItems,
                equipmentSubtotalBrl: materialsSubtotal,
                quotedSaleBrl: quotedSaleBrl,
                systemPowerKw: selectedQuote.kwp,
                sourceType: "kwp_rate",
                projectCostLines: costCalc.projectCostLines,
                defaultEssentialCostNames: costCalc.defaultEssentialCostNames,
                computedSaleFromCostRulesBrl: quotedSaleBrl,
                templateName:
                  template?.name ||
                  chosenTemplate?.name ||
                  defaultTemplate?.name ||
                  "Modelo Comercial Padrão",
              },
            } as any,
          },
        });

        proposalId = proposal.id;

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
        process.env["APP_BASE_URL"] ||
        process.env["PUBLIC_WEB_APP_BASE_URL"] ||
        process.env["NEXT_PUBLIC_APP_URL"] ||
        this.config.get<string>("APP_BASE_URL") ||
        this.config.get<string>("NEXT_PUBLIC_APP_URL") ||
        "https://www.energivia.com.br";

      const proposalLink = proposalId
        ? `${appBaseUrl}/proposta/${proposalId}`
        : `${appBaseUrl}/propostas`;

      return (
        `*_Proposta Comercial Gerada com Sucesso!_* 📋✨\n\n` +
        `Cliente: *${clientName}*\n\n` +
        `> ☀️ *Potência:* \`${selectedQuote.kwp} kWp\`\n` +
        `> 🏠 *Estrutura:* \`${sessionCtx.roofType || "Cerâmica (Colonial)"}\`\n` +
        `> 🎨 *Modelo:* \`${chosenTemplate?.name || "Comercial Moderno"}\`\n` +
        `> 💰 *Valor Total:* \`R$ ${quotedSaleBrl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\`\n\n` +
        `*_Acesse a Proposta no link abaixo:_* 🔗\n` +
        `${proposalLink}\n\n` +
        `_Ela também já está disponível no seu painel CRM da EnergivIA._\n\n` +
        `Equipe *_EnergivIA Solar._*`
      );
    }

    // ESTADO E: O Bot perguntou a estrutura do telhado OU o usuário respondeu a estrutura
    const roofMatch = [
      { key: "1", name: "Cerâmica (Colonial)" },
      { key: "1️⃣", name: "Cerâmica (Colonial)" },
      { key: "2", name: "Fibrocimento" },
      { key: "2️⃣", name: "Fibrocimento" },
      { key: "3", name: "Metálico" },
      { key: "3️⃣", name: "Metálico" },
      { key: "4", name: "Solo" },
      { key: "4️⃣", name: "Solo" },
      { key: "5", name: "Laje" },
      { key: "5️⃣", name: "Laje" },
      { key: "6", name: "Fibrometal" },
      { key: "6️⃣", name: "Fibrometal" },
      { key: "7", name: "Sem estrutura" },
      { key: "7️⃣", name: "Sem estrutura" },
      { key: "cerâmica", name: "Cerâmica (Colonial)" },
      { key: "ceramica", name: "Cerâmica (Colonial)" },
      { key: "colonial", name: "Cerâmica (Colonial)" },
      { key: "fibrocimento", name: "Fibrocimento" },
      { key: "fibromadeira", name: "Fibrocimento" },
      { key: "metálico", name: "Metálico" },
      { key: "metalico", name: "Metálico" },
      { key: "metal", name: "Metálico" },
      { key: "solo", name: "Solo" },
      { key: "laje", name: "Laje" },
      { key: "fibrometal", name: "Fibrometal" },
      { key: "sem estrutura", name: "Sem estrutura" },
      { key: "sem", name: "Sem estrutura" },
      { key: "nenhuma", name: "Sem estrutura" },
    ].find((r) => lower === r.key || lower.includes(r.key));

    if (
      lastBotMsg.includes("Qual a estrutura do telhado") ||
      lastBotMsg.includes("estrutura do telhado")
    ) {
      if (roofMatch) {
        const selectedRoof = roofMatch.name;
        const quotes = await kitsFor({ roofType: selectedRoof });
        if (quotes.length === 0) return NO_KITS_TEXT;

        return (
          `*_Estrutura Selecionada:_* \`${selectedRoof}\` 🏠\n\n` +
          this.formatQuotesListText(quotes, sessionCtx)
        );
      }

      return (
        `Opção de telhado não reconhecida. Por favor, responda com o número da opção (1 a 7) ou envie 0️⃣ para voltar:\n\n` +
        this.ROOF_OPTIONS_TEXT
      );
    }

    // ESTADO E.1: O Bot perguntou se deseja seguir com o preço padrão configurado ou informar outro preço por kWp
    if (
      lastBotMsg.includes("preço padrão") ||
      lastBotMsg.includes("taxa padrão configurada") ||
      lastBotMsg.includes("Como você deseja prosseguir para esta cotação?") ||
      lastBotMsg.includes("Como deseja prosseguir para esta cotação")
    ) {
      const orgDefaultRate = await this.getOrganizationDefaultKwpRate(conversation.organizationId);
      const quotes = await kitsFor();
      if (quotes.length === 0) return NO_KITS_TEXT;
      const quote = quotes[sessionCtx.chosenQuoteIndex] || quotes[0];
      if (!quote) return NO_KITS_TEXT;

      // Opção 1: Seguir com o preço padrão da conta
      const isChoice1 =
        lower === "1" ||
        lower === "1." ||
        lower.includes("1️⃣") ||
        lower === "opcao 1" ||
        lower === "opção 1" ||
        lower === "padrao" ||
        lower === "padrão" ||
        lower === "seguir" ||
        lower === "sim" ||
        lower === "manter" ||
        lower === "continuar";

      if (isChoice1) {
        return this.buildPriceAppliedText(quote, orgDefaultRate);
      }

      // Opção 2: Deseja informar outro preço por kWp
      const isChoice2 =
        lower === "2" ||
        lower === "2." ||
        lower.includes("2️⃣") ||
        lower === "opcao 2" ||
        lower === "opção 2" ||
        lower === "editar" ||
        lower === "outro" ||
        lower === "mudar" ||
        lower === "alterar" ||
        lower === "trocar";

      if (isChoice2) {
        return (
          `*_Personalização de Preço por kWp_* 💰\n\n` +
          `Kit selecionado: *${quote.distributorName}* (\`${quote.kwp} kWp\`)\n\n` +
          `*_Qual preço você deseja utilizar para esta cotação?_*\n\n` +
          `> 💵 *Por kWp:* ex: \`2500\`, \`R$ 3.200,00\` ou \`4000\`\n` +
          `> 🏷️ *Ou valor total do projeto:* ex: \`total 18500\` (calculado automaticamente)\n` +
          `> 0️⃣ *Voltar*\n\n` +
          `_(Envie o valor desejado ou 0️⃣ para voltar)_`
        );
      }

      // Usuário digitou o valor diretamente (ex: "4000", "2500", "R$ 3.200", "4.000/kwp", "total 18500")
      const directParsed = parseKwpRate(incomingText, quote.kwp);
      if (directParsed) {
        return this.buildPriceAppliedText(
          quote,
          directParsed.rate,
          directParsed.isDerivedFromTotal
        );
      }

      return `Opção não reconhecida.\n\n` + this.buildPriceQuestionText(quote, orgDefaultRate);
    }

    // ESTADO E.2: O Bot pediu especificamente para digitar o preço por kWp
    if (
      lastBotMsg.includes("Qual preço você deseja utilizar") ||
      lastBotMsg.includes("Qual valor por kWp") ||
      lastBotMsg.includes("Qual valor você deseja utilizar")
    ) {
      const quotes = await kitsFor();
      if (quotes.length === 0) return NO_KITS_TEXT;
      const quote = quotes[sessionCtx.chosenQuoteIndex] || quotes[0];
      if (!quote) return NO_KITS_TEXT;
      const parsedRateObj = parseKwpRate(incomingText, quote.kwp);
      if (parsedRateObj) {
        return this.buildPriceAppliedText(
          quote,
          parsedRateObj.rate,
          parsedRateObj.isDerivedFromTotal
        );
      }

      return (
        `Valor não reconhecido. Por favor, informe o preço por kWp desejado:\n\n` +
        `> Ex: \`2500\`, \`R$ 3.200,00\`, \`4000\` ou \`total 18500\`\n` +
        `> Envie 0️⃣ para voltar\n\n` +
        `_(Qual preço você deseja utilizar para esta cotação?)_`
      );
    }

    // ESTADO F: O Bot perguntou o padrão de entrada da rede elétrica
    if (lastBotMsg.includes("Qual o padrão de entrada da instalação?")) {
      // Verifica se o usuário enviou uma localização para corrigir (ex: "Cuiabá, mt")
      if (
        isLocationInput(incomingText) ||
        incomingText.includes("/") ||
        incomingText.includes(",") ||
        lower.startsWith("mudar cidade") ||
        lower.startsWith("trocar cidade")
      ) {
        const hspRes = getHsp(incomingText);
        if (hspRes.city) {
          return (
            `*_Localização Corrigida com Sucesso!_* 📍☀️\n\n` +
            `> Cidade: \`${hspRes.city}/${hspRes.uf}\`\n` +
            `> Irradiação Solar: \`${hspRes.hsp.toFixed(2)} kWh/m²/dia\`\n\n` +
            this.GRID_OPTIONS_TEXT
          );
        }
      }

      let chosenGrid = "";
      if (lower === "1" || lower === "1." || lower.includes("1️⃣") || lower.includes("mono")) {
        chosenGrid = "Monofásico 220V";
      } else if (
        lower === "2" ||
        lower === "2." ||
        lower.includes("2️⃣") ||
        lower.includes("bi") ||
        lower.includes("127/220")
      ) {
        chosenGrid = "Bifásico 127V/220V";
      } else if (
        lower === "3" ||
        lower === "3." ||
        lower.includes("3️⃣") ||
        lower.includes("tri 220") ||
        lower.includes("tri_220")
      ) {
        chosenGrid = "Trifásico 220V";
      } else if (
        lower === "4" ||
        lower === "4." ||
        lower.includes("4️⃣") ||
        lower.includes("tri 380") ||
        lower.includes("tri_380") ||
        lower.includes("380")
      ) {
        chosenGrid = "Trifásico 380V";
      }

      if (chosenGrid) {
        return `*_Padrão Elétrico Registrado:_* \`${chosenGrid}\` ⚡\n\n` + this.ROOF_OPTIONS_TEXT;
      }

      return (
        `Opção não reconhecida. Por favor, responda com o número da opção desejada (1 a 4) ou envie 0️⃣ para voltar:\n\n` +
        this.GRID_OPTIONS_TEXT
      );
    }

    // ESTADO G: O Bot perguntou a cidade da instalação
    if (
      lastBotMsg.includes("Para qual cidade e estado será a instalação?") ||
      lastBotMsg.includes("Vamos alterar a localização") ||
      lastBotMsg.includes("Vamos corrigir a localização")
    ) {
      const hspRes = getHsp(incomingText);
      return (
        `*_Localização Identificada!_* 📍☀️\n\n` +
        `> Cidade: \`${hspRes.city}/${hspRes.uf}\`\n` +
        `> Irradiação Solar: \`${hspRes.hsp.toFixed(2)} kWh/m²/dia\`\n\n` +
        this.GRID_OPTIONS_TEXT
      );
    }

    // ESTADO: O Bot perguntou o consumo médio mensal em kWh
    const isAskingConsumption =
      lastBotMsg.includes("Simulação por Consumo Mensal") ||
      lastBotMsg.includes("consumo médio mensal") ||
      lastBotMsg.includes("consumo em kWh") ||
      lastBotMsg.includes("informe seu consumo (kWh)") ||
      lastBotMsg.includes("qual é o consumo") ||
      lastBotMsg.includes("qual o consumo");

    if (isAskingConsumption) {
      const kwhMatch = incomingText.match(/(\d+[\d.,]*)\s*(?:kwh|kw)?(?:\/m[eê]s)?/i);
      if (kwhMatch && kwhMatch[1]) {
        const rawKwh = Number(kwhMatch[1].replace(/\./g, "").replace(",", "."));
        if (rawKwh >= 20 && rawKwh <= 500000) {
          const consumo = Math.round(rawKwh);

          const cityInSameMsg = incomingText.match(
            /(?:em|para|na cidade de|no munic[íi]pio de)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s'-]{3,35}?)(?:\s*[\/\-]\s*([A-Za-z]{2})|\s+([A-Za-z]{2}))?(?:\s*\(|$|\.|\n|,)/i
          );
          if (cityInSameMsg && cityInSameMsg[1]) {
            const cand = (
              cityInSameMsg[1] +
              (cityInSameMsg[2]
                ? `/${cityInSameMsg[2]}`
                : cityInSameMsg[3]
                  ? `/${cityInSameMsg[3]}`
                  : "")
            ).trim();
            const hspRes = getHsp(cand);
            return (
              `*_Consumo Registrado:_* \`${consumo} kWh/mês\` em \`${hspRes.city}/${hspRes.uf}\` ☀️📍\n\n` +
              this.GRID_OPTIONS_TEXT
            );
          }

          if (sessionCtx.cidade && sessionCtx.estado) {
            return (
              `*_Consumo Registrado:_* \`${consumo} kWh/mês\` em \`${sessionCtx.cidade}/${sessionCtx.estado}\` ☀️📍\n\n` +
              this.GRID_OPTIONS_TEXT
            );
          }

          return (
            `*_Consumo Registrado:_* \`${consumo} kWh/mês\` ☀️\n\n` +
            `Para qual cidade e estado será a instalação? (Ex: \`Maringá/PR\`, \`Presidente Prudente/SP\`)`
          );
        }
      }

      return (
        `Não consegui identificar o consumo em kWh.\n\n` +
        `Por favor, informe o consumo médio mensal do seu cliente em kWh (ex: \`450\` ou \`450 kWh\`) ou envie 0️⃣ para voltar ao menu inicial:`
      );
    }

    // ESTADO: O Bot perguntou a potência de pico (kWp)
    const isAskingKwp =
      lastBotMsg.includes("Simulação por Potência de Pico") ||
      lastBotMsg.includes("potência de pico") ||
      lastBotMsg.includes("potência desejada") ||
      lastBotMsg.includes("potência (kWp)");

    if (isAskingKwp) {
      const kwpMatch = incomingText.match(/(\d+(?:[.,]\d+)?)\s*(?:kwp|kw)?/i);
      if (kwpMatch && kwpMatch[1]) {
        const targetKWp = parseFloat(kwpMatch[1].replace(",", "."));
        if (targetKWp >= 0.5 && targetKWp <= 5000) {
          const cityInSameMsg = incomingText.match(
            /(?:em|para|na cidade de|no munic[íi]pio de)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s'-]{3,35}?)(?:\s*[\/\-]\s*([A-Za-z]{2})|\s+([A-Za-z]{2}))?(?:\s*\(|$|\.|\n|,)/i
          );
          if (cityInSameMsg && cityInSameMsg[1]) {
            const cand = (
              cityInSameMsg[1] +
              (cityInSameMsg[2]
                ? `/${cityInSameMsg[2]}`
                : cityInSameMsg[3]
                  ? `/${cityInSameMsg[3]}`
                  : "")
            ).trim();
            const hspRes = getHsp(cand);
            return (
              `*_Potência Solicitada:_* \`${targetKWp} kWp\` em \`${hspRes.city}/${hspRes.uf}\` ☀️📍\n\n` +
              this.GRID_OPTIONS_TEXT
            );
          }

          if (sessionCtx.cidade && sessionCtx.estado) {
            return (
              `*_Potência Solicitada:_* \`${targetKWp} kWp\` em \`${sessionCtx.cidade}/${sessionCtx.estado}\` ☀️📍\n\n` +
              this.GRID_OPTIONS_TEXT
            );
          }

          return (
            `*_Potência Solicitada:_* \`${targetKWp} kWp\` ☀️\n\n` +
            `Para qual cidade e estado será a instalação? (Ex: \`Maringá/PR\`, \`Presidente Prudente/SP\`)`
          );
        }
      }

      return (
        `Não consegui identificar a potência desejada.\n\n` +
        `Por favor, informe a potência de pico desejada em kWp (ex: \`5\` ou \`7.5 kWp\`) ou envie 0️⃣ para voltar ao menu inicial:`
      );
    }

    // ESTADO: O Bot perguntou a quantidade de placas/módulos
    const isAskingModules =
      lastBotMsg.includes("Simulação por Quantidade de Módulos") ||
      lastBotMsg.includes("placas solares você deseja no kit") ||
      lastBotMsg.includes("quantidade de placas");

    if (isAskingModules) {
      const modMatch = incomingText.match(/(\d+)\s*(?:placas?|m[oó]dulos?|paineis?|pain[eé]is)?/i);
      if (modMatch && modMatch[1]) {
        const modCount = parseInt(modMatch[1], 10);
        if (modCount >= 1 && modCount <= 10000) {
          const modPowerMatch = incomingText.match(/(\d{3,4})\s*w/i);
          const modPower =
            modPowerMatch && modPowerMatch[1] ? parseInt(modPowerMatch[1], 10) : undefined;
          const kwpCalculado = modPower ? ((modCount * modPower) / 1000).toFixed(2) : undefined;
          const extraInfo = modPower ? ` de \`${modPower}W\` (\`${kwpCalculado} kWp\`)` : "";

          if (sessionCtx.cidade && sessionCtx.estado) {
            return (
              `*_Quantidade Solicitada:_* \`${modCount} placas\`${extraInfo} em \`${sessionCtx.cidade}/${sessionCtx.estado}\` ☀️📍\n\n` +
              this.GRID_OPTIONS_TEXT
            );
          }

          return (
            `*_Quantidade Solicitada:_* \`${modCount} placas\`${extraInfo} ☀️\n\n` +
            `Para qual cidade e estado será a instalação? (Ex: \`Maringá/PR\`, \`Presidente Prudente/SP\`)`
          );
        }
      }

      return (
        `Não consegui identificar a quantidade de módulos.\n\n` +
        `Por favor, informe a quantidade de placas (ex: \`10 placas de 590W\` ou \`12\`) ou envie 0️⃣ para voltar ao menu inicial:`
      );
    }

    // Opções do menu inicial (1 a 5) quando não estiver em fluxos específicos
    const isChoosingOtherOption =
      lastBotMsg.includes("Qual opção você prefere para o seu cliente") ||
      lastBotMsg.includes("Qual o padrão de entrada da instalação") ||
      lastBotMsg.includes("Qual a estrutura do telhado") ||
      lastBotMsg.includes("estrutura do telhado") ||
      lastBotMsg.includes("Qual modelo de proposta comercial você deseja usar") ||
      lastBotMsg.includes("cliente final") ||
      lastBotMsg.includes("taxa padrão configurada") ||
      lastBotMsg.includes("preço padrão") ||
      lastBotMsg.includes("Preço aplicado") ||
      lastBotMsg.includes("Qual preço você deseja utilizar") ||
      lastBotMsg.includes("Qual valor por kWp") ||
      lastBotMsg.includes("Qual valor você deseja utilizar") ||
      lastBotMsg.includes("Como deseja prosseguir para esta cotação") ||
      lastBotMsg.includes("Como você deseja prosseguir para esta cotação") ||
      lastBotMsg.includes("WhatsApp") ||
      lastBotMsg.includes("whatsapp") ||
      lastBotMsg.includes("Simulação por Consumo Mensal") ||
      lastBotMsg.includes("consumo médio mensal") ||
      lastBotMsg.includes("Simulação por Potência de Pico") ||
      lastBotMsg.includes("potência de pico") ||
      lastBotMsg.includes("potência desejada") ||
      lastBotMsg.includes("Simulação por Quantidade de Módulos") ||
      lastBotMsg.includes("placas solares você deseja no kit") ||
      lastBotMsg.includes("Para qual cidade e estado será a instalação");

    if (!isChoosingOtherOption) {
      if (lower === "1" || lower === "1." || lower === "opcao 1" || lower === "opção 1") {
        return (
          `*_Envio de Fatura de Energia_* 📄⚡\n\n` +
          `Envie o arquivo em *PDF* ou a *foto da conta de luz* do seu cliente por aqui mesmo.\n\n` +
          `> Nossa inteligência artificial vai extrair automaticamente todos os dados de consumo, histórico e padrão de rede!`
        );
      }
      if (lower === "2" || lower === "2." || lower === "opcao 2" || lower === "opção 2") {
        return (
          `*_Simulação por Consumo Mensal_* ⚡\n\n` +
          `Qual é o *consumo médio mensal* do seu cliente em kWh?\n\n` +
          `> Exemplo: digite \`450 kWh\` ou \`600 kWh\``
        );
      }
      if (lower === "3" || lower === "3." || lower === "opcao 3" || lower === "opção 3") {
        return (
          `*_Simulação por Potência de Pico_* ☀️\n\n` +
          `Qual a *potência de pico* desejada para o sistema solar?\n\n` +
          `> Exemplo: digite \`5 kWp\` ou \`7.5 kWp\``
        );
      }
      if (lower === "4" || lower === "4." || lower === "opcao 4" || lower === "opção 4") {
        return (
          `*_Simulação por Quantidade de Módulos_* 🔌\n\n` +
          `Quantas *placas solares* você deseja no kit e qual a potência delas?\n\n` +
          `> Exemplo: digite \`10 placas de 590W\` ou \`12 módulos\``
        );
      }
      if (lower === "5" || lower === "5." || lower === "opcao 5" || lower === "opção 5") {
        return (
          `*_Consulta de Catálogo e Equipamentos_* 🔎\n\n` +
          `Você pode me perguntar sobre modelos, marcas e preços dos inversores, módulos ou estruturas cadastrados no nosso catálogo da EnergivIA.\n\n` +
          `> Exemplo: _"qual o valor do inversor de 5kw?"_ ou _"quais marcas de módulos estão disponíveis?"_`
        );
      }
    }

    // ESTADO H: Saudação inicial / Menu
    const greetingTriggers = [
      "oi",
      "olá",
      "ola",
      "bom dia",
      "boa tarde",
      "boa noite",
      "start",
      "ajuda",
      "help",
      "menu",
      "inicio",
      "início",
      "comecar",
      "começar",
      "opcoes",
      "opções",
    ];
    if (
      greetingTriggers.includes(lower) ||
      lower.startsWith("bom dia") ||
      lower.startsWith("boa tarde") ||
      lower.startsWith("boa noite")
    ) {
      return this.buildGreetingMenu(resolvedContactName);
    }

    // ESTADO I: Entrada por kWp direto (ex: "5 kwp", "kit 7.5kwp", "15 kwp")
    const kwpDirectMatch = incomingText.match(/(\d+(?:[.,]\d+)?)\s*kwp/i);
    if (kwpDirectMatch && kwpDirectMatch[1]) {
      const targetKWp = parseFloat(kwpDirectMatch[1].replace(",", "."));
      if (targetKWp > 0) {
        return `*_Potência Solicitada:_* \`${targetKWp} kWp\` ☀️\n\n` + this.GRID_OPTIONS_TEXT;
      }
    }

    // ESTADO J: Entrada por Quantidade de Módulos (ex: "12 placas de 590W", "10 módulos")
    const modDirectMatch = incomingText.match(
      /(\d+)\s*(?:placas?|m[oó]dulos?|paineis?|pain[eé]is)/i
    );
    if (modDirectMatch && modDirectMatch[1]) {
      const modCount = parseInt(modDirectMatch[1], 10);
      const modPowerMatch = incomingText.match(/(\d{3,4})\s*w/i);
      const modPower =
        modPowerMatch && modPowerMatch[1] ? parseInt(modPowerMatch[1], 10) : undefined;
      const kwpCalculado = modPower ? ((modCount * modPower) / 1000).toFixed(2) : undefined;
      const extraInfo = modPower ? ` de \`${modPower}W\` (\`${kwpCalculado} kWp\`)` : "";

      return (
        `*_Quantidade Solicitada:_* \`${modCount} placas\`${extraInfo} ☀️\n\n` +
        this.GRID_OPTIONS_TEXT
      );
    }

    // ESTADO K: Entrada por Consumo em kWh (ex: "300 kwh", "300kw", "500 kwh/mes")
    const kwhDirectMatch = incomingText.match(/(\d+[\d.,]*)\s*(?:kwh|kw)(?:\/m[eê]s)?/i);
    if (kwhDirectMatch && kwhDirectMatch[1]) {
      const rawKwh = Number(kwhDirectMatch[1].replace(",", "."));
      if (rawKwh >= 30) {
        const consumo = Math.round(rawKwh);

        // Verifica se a cidade já foi informada na mesma mensagem
        const cityInSameMsg = incomingText.match(
          /(?:em|para|na cidade de)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s'-]{3,30}?)(?:\s*[\/\-]\s*([A-Za-z]{2})|\s+([A-Za-z]{2}))?(?:\s*\(|$|\.|\n|,)/i
        );

        if (cityInSameMsg && cityInSameMsg[1]) {
          const cand = (
            cityInSameMsg[1] +
            (cityInSameMsg[2]
              ? `/${cityInSameMsg[2]}`
              : cityInSameMsg[3]
                ? `/${cityInSameMsg[3]}`
                : "")
          ).trim();
          const hspRes = getHsp(cand);
          return (
            `*_Consumo Registrado:_* \`${consumo} kWh/mês\` em \`${hspRes.city}/${hspRes.uf}\` ☀️📍\n\n` +
            this.GRID_OPTIONS_TEXT
          );
        }

        return (
          `*_Consumo Registrado:_* \`${consumo} kWh/mês\` ☀️\n\n` +
          `Para qual cidade e estado será a instalação? (Ex: \`Maringá/PR\`, \`Presidente Prudente/SP\`)`
        );
      }
    }

    // Se o usuário digitou apenas um número avulso (ex: 450, 600, 1000) e não foi capturado acima
    const pureNumMatch = incomingText.trim().match(/^(\d{2,5})$/);
    if (pureNumMatch && pureNumMatch[1]) {
      const pureVal = parseInt(pureNumMatch[1], 10);
      if (pureVal >= 30 && pureVal <= 50000) {
        if (sessionCtx.cidade && sessionCtx.estado) {
          return (
            `*_Consumo Registrado:_* \`${pureVal} kWh/mês\` em \`${sessionCtx.cidade}/${sessionCtx.estado}\` ☀️📍\n\n` +
            this.GRID_OPTIONS_TEXT
          );
        }
        return (
          `*_Consumo Registrado:_* \`${pureVal} kWh/mês\` ☀️\n\n` +
          `Para qual cidade e estado será a instalação? (Ex: \`Maringá/PR\`, \`Presidente Prudente/SP\`)`
        );
      }
    }

    // Fallback Inteligente: Pergunta livre respondida com IA confinada ao catálogo
    if (incomingText.trim().length >= 3) {
      return await this.answerFreeformQuestion({
        userQuestion: incomingText,
        organizationId: conversation.organizationId,
      });
    }

    return this.buildGreetingMenu(resolvedContactName);
  }
}
