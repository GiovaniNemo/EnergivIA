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
    // Se a proposta já foi concluída, não há lembretes nem encerramento
    if (
      lastBotContent.includes("Proposta comercial gerada com sucesso") ||
      lastBotContent.includes("Acesse a Proposta Pronta no link") ||
      lastBotContent.includes("Disponível no seu painel CRM")
    ) {
      return false;
    }
    // Se já foi encerrado por inatividade ou reiniciado
    if (
      lastBotContent.includes("encerramos este atendimento") ||
      lastBotContent.includes("estou encerrando este atendimento") ||
      lastBotContent.includes("Sessão reiniciada com sucesso")
    ) {
      return false;
    }
    // Se está apenas no menu inicial (antes de qualquer fluxo ser iniciado)
    if (
      lastBotContent.includes("Escolha uma opção digitando o número:") &&
      !lastBotContent.includes("Qual opção você prefere para o seu cliente?")
    ) {
      return false;
    }

    // Verifica etapas ativas de atendimento / simulação
    return (
      lastBotContent.includes("Para qual cidade e estado será a instalação?") ||
      lastBotContent.includes("Qual o padrão de entrada da instalação?") ||
      lastBotContent.includes("Qual a estrutura do telhado?") ||
      lastBotContent.includes("Qual opção você prefere para o seu cliente?") ||
      lastBotContent.includes("Qual o nome do cliente final") ||
      lastBotContent.includes("E qual o WhatsApp dele") ||
      lastBotContent.includes("Qual modelo de proposta comercial você deseja usar") ||
      lastBotContent.includes("Qual é o *consumo médio mensal*") ||
      lastBotContent.includes("Qual a *potência de pico*") ||
      lastBotContent.includes("Quantas *placas solares* você deseja") ||
      lastBotContent.includes("dados extraídos com precisão")
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

  private async calculateDistributorKits({
    consumptionKwh,
    targetKWp,
    targetModules,
    modPowerWUser,
    cidade,
    estado,
    roofType,
    gridVoltage,
    inverterType,
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
  }) {
    let mappedRoof = "ceramic";
    const s = (roofType || "").toLowerCase().trim();
    if (s === "1" || s.includes("ceramic") || s.includes("cerâmica") || s.includes("colonial")) {
      mappedRoof = "ceramic";
    } else if (
      s === "2" ||
      s.includes("fibrocimento") ||
      s.includes("fibro") ||
      s.includes("fibromadeira")
    ) {
      mappedRoof = "fibromadeira";
    } else if (s === "6" || s.includes("fibrometal")) {
      mappedRoof = "fibrometal";
    } else if (s === "3" || s.includes("metal") || s.includes("metálic")) {
      mappedRoof = "metal";
    } else if (s === "4" || s.includes("solo") || s.includes("ground")) {
      mappedRoof = "ground";
    } else if (s === "5" || s.includes("laje")) {
      mappedRoof = "laje";
    } else if (s === "7" || s.includes("sem") || s.includes("nenhum") || s === "none") {
      mappedRoof = "none";
    }

    const forcedIncludeStructure = mappedRoof !== "none";
    const roofFactor = 1.0;
    const hspResult = getHsp(cidade || "São Paulo", estado || "SP");
    const hsp = hspResult.hsp;
    const perdas = 0.284;
    const pr = 1 - perdas; // 0.716
    const geracaoPorKwp = hsp * 30 * pr;

    let finalTargetKWp: number | null = null;
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
      const consumoAjustado = consumptionKwh * 1.07;
      finalTargetKWp = consumoAjustado / (geracaoPorKwp * roofFactor);
    } else {
      finalTargetKWp = 3.0; // fallback padrão seguro
    }

    const distributorsRaw = await this.prisma.distributor.findMany({
      include: {
        distributorProducts: {
          include: { product: { include: { brand: true, category: true } } },
        },
      },
    });

    const normalizeStr = (str: string) =>
      (str || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .trim();

    const distributors = distributorsRaw.filter(
      (d) => !normalizeStr(d.name || "").includes("ALDO")
    );

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
      structuredItems?: Array<{
        productId: string;
        productName: string;
        brandName: string;
        categoryName: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
        imageUrl?: string;
        specs?: Record<string, unknown>;
      }>;
    }> = [];

    for (const d of distributors) {
      const prods = d.distributorProducts || [];
      if (prods.length === 0) continue;

      const allProds = prods.map((dp) => ({
        ...dp,
        price: Number(dp.price) || 0,
      }));

      const isStructureOrAccessory = (p: any) => {
        const s = normalizeStr(
          (p.product?.name || "") +
            " " +
            (p.product?.description || "") +
            " " +
            (p.product?.category?.name || "")
        );
        return (
          s.includes("ESTRUTURA") ||
          s.includes("PERFIL") ||
          s.includes("TRILHO") ||
          s.includes("SUPORTE") ||
          s.includes("FIXACAO") ||
          s.includes("ACESSORIO") ||
          s.includes("GRAMPO") ||
          s.includes("GANCHO") ||
          s.includes("PARAFUSO") ||
          s.includes("TERMINAL")
        );
      };

      const invs = allProds.filter((p: any) => {
        if (p.price <= 0) return false;
        const s = normalizeStr(
          (p.product?.name || "") +
            " " +
            (p.product?.description || "") +
            " " +
            (p.product?.category?.name || "")
        );
        if (isStructureOrAccessory(p)) return false;
        if (s.includes("CABO") || s.includes("CONECTOR")) return false;
        return (
          s.includes("INVERSOR") || s.includes("MICROINVERSOR") || s.includes("MICRO INVERSOR")
        );
      });

      const mods = allProds.filter((p: any) => {
        if (p.price <= 0) return false;
        const s = normalizeStr(
          (p.product?.name || "") +
            " " +
            (p.product?.description || "") +
            " " +
            (p.product?.category?.name || "")
        );
        if (isStructureOrAccessory(p)) return false;
        if (s.includes("INVERSOR") || s.includes("CABO") || s.includes("CONECTOR")) return false;
        return (
          s.includes("MODULO") ||
          s.includes("PAINEL") ||
          s.includes("PLACA SOLAR") ||
          s.includes("FOTOVOLTAICO")
        );
      });

      const cabs = allProds.filter(
        (p: any) => p.price > 0 && JSON.stringify(p).toLowerCase().includes("cabo")
      );
      const cons = allProds.filter(
        (p: any) => p.price > 0 && JSON.stringify(p).toLowerCase().includes("conector")
      );
      const ests = allProds.filter(
        (p: any) =>
          p.price > 0 &&
          (JSON.stringify(p).toLowerCase().includes("estrutura") ||
            JSON.stringify(p).toLowerCase().includes("perfil"))
      );

      // Escolhe o melhor módulo (preferência pelo de potência pedida se houver, ou primeiro módulo válido)
      let mod = mods.find((m) => {
        const sp = m.product?.specs as Record<string, any> | undefined;
        const pw = Number(sp?.["power_w"]);
        return modPowerWUser && pw === modPowerWUser;
      });
      if (!mod) {
        const validMods = mods.filter((m) => {
          const sp = m.product?.specs as Record<string, any> | undefined;
          return !!sp?.["power_w"];
        });
        mod = validMods.length > 0 ? validMods[0] : mods[0];
      }
      if (!mod) continue;

      const modSpecs = mod.product?.specs as Record<string, any> | undefined;
      let modPowerW = Number(modSpecs?.["power_w"]);
      if (!modPowerW) {
        const modName = (mod.product?.name || "").toUpperCase();
        const modMatch = modName.match(/(\d{3,4})\s*W/);
        if (modMatch && modMatch[1]) modPowerW = parseInt(modMatch[1], 10);
        else modPowerW = modPowerWUser || 550;
      }

      let moduleQ = targetModules ? targetModules : Math.ceil((finalTargetKWp * 1000) / modPowerW);
      let realKWp = (moduleQ * modPowerW) / 1000;

      // Inversores compatíveis com a tensão/padrão de rede
      const validInvs = [];
      for (const invObj of invs) {
        const specs = invObj.product?.specs as Record<string, any> | undefined;
        const name = (invObj.product?.name || "").toUpperCase();
        const voltSpec = String(
          specs?.["output_voltage_v"] || specs?.["ac_output_voltage"] || ""
        ).toUpperCase();

        // Checa compatibilidade com gridVoltage
        if (gridVoltage) {
          const g = gridVoltage.toLowerCase();
          const isTri380 =
            g.includes("380") ||
            g === "4" ||
            g.includes("tri 380") ||
            g.includes("tri_380") ||
            g.includes("trifasico 380") ||
            g.includes("trifásico 380");
          const isTri220 =
            (g.includes("tri") && g.includes("220")) ||
            g === "3" ||
            g.includes("tri 220") ||
            g.includes("tri_220") ||
            g.includes("trifasico 220") ||
            g.includes("trifásico 220");
          const isMono220 =
            g.includes("mono") || g === "1" || g.includes("monofasico") || g.includes("monofásico");
          const isBi220 =
            g.includes("bi") || g === "2" || g.includes("bifasico") || g.includes("bifásico");

          if (isTri380) {
            const isMatch380 =
              name.includes("380V") ||
              name.includes("380") ||
              voltSpec.includes("380") ||
              ((name.includes("TRIFASICO") || name.includes("TRIFÁSICO")) &&
                !name.includes("220V") &&
                !name.includes("-LV"));
            if (!isMatch380) continue;
          } else if (isTri220) {
            const isMatch220 =
              (name.includes("TRIFASICO") || name.includes("TRIFÁSICO")) &&
              (name.includes("220V") ||
                name.includes("220") ||
                name.includes("-LV") ||
                voltSpec.includes("220"));
            if (!isMatch220) continue;
          } else if (isMono220 || isBi220) {
            if (
              name.includes("380V") ||
              name.includes("380") ||
              name.includes("TRIFASICO") ||
              name.includes("TRIFÁSICO")
            ) {
              continue;
            }
          }
        }

        let testModuleQ = moduleQ;
        if (
          (name.includes("MONOF") || name.includes("MONO")) &&
          testModuleQ < 4 &&
          !targetModules
        ) {
          testModuleQ = 4;
        }
        const testRealKWp = (testModuleQ * modPowerW) / 1000;

        const match = name.match(/(\d+(?:[.,]\d+)?)\s*(K?W)/);
        let invKWp = null;

        if (match && match[1]) {
          invKWp = parseFloat(match[1].replace(",", "."));
          if (match[2] === "W") invKWp = invKWp / 1000;
        } else if (specs && specs["max_dc_power"]) {
          invKWp = Number(specs["max_dc_power"]) / 1000;
        } else {
          invKWp = finalTargetKWp;
        }

        const ratio = testRealKWp / invKWp;
        if (ratio < 0.45 || ratio > 1.55) continue;

        validInvs.push({
          ...invObj,
          _testModuleQ: testModuleQ,
          _testRealKWp: testRealKWp,
        });
      }

      if (validInvs.length === 0) continue;

      const categorizedInvs = validInvs.map((invObj: any) => {
        const name = (invObj.product?.name || "").toUpperCase();
        const voltSpec = String(
          invObj.product?.specs?.output_voltage_v || invObj.product?.specs?.ac_output_voltage || ""
        ).toUpperCase();
        const isMicro = name.includes("MICRO") || voltSpec.includes("MICRO");
        const isHybrid =
          name.includes("HIBRID") ||
          name.includes("HÍBRID") ||
          name.includes("HYBRID") ||
          voltSpec.includes("HIBRID");
        const isOffGrid =
          name.includes("OFF-GRID") ||
          name.includes("OFF GRID") ||
          name.includes("OFFGRID") ||
          voltSpec.includes("OFF");
        const isString = !isMicro && !isHybrid && !isOffGrid;

        return {
          ...invObj,
          _isMicro: isMicro,
          _isHybrid: isHybrid,
          _isOffGrid: isOffGrid,
          _isString: isString,
        };
      });

      const userInvType = (inverterType || "string").toLowerCase();
      let preferredInvs: any[] = [];
      if (userInvType === "micro") {
        preferredInvs = categorizedInvs.filter((i) => i._isMicro);
      } else if (userInvType === "hybrid") {
        preferredInvs = categorizedInvs.filter((i) => i._isHybrid);
      } else if (userInvType === "off_grid") {
        preferredInvs = categorizedInvs.filter((i) => i._isOffGrid);
      } else {
        preferredInvs = categorizedInvs.filter((i) => i._isString);
      }

      const poolToUse = preferredInvs.length > 0 ? preferredInvs : categorizedInvs;
      poolToUse.sort((a, b) => Number(a.price) - Number(b.price));
      const inv = poolToUse[0];
      if (!inv) continue;

      moduleQ = inv._testModuleQ;
      realKWp = inv._testRealKWp;

      const cabPreto =
        cabs.find((c: any) => JSON.stringify(c).toLowerCase().includes("preto")) || cabs[0];
      const cabVermelho =
        cabs.find((c: any) => JSON.stringify(c).toLowerCase().includes("vermelho")) ||
        (cabs.length > 1 && cabs[1] !== cabPreto ? cabs[1] : null);
      const con = cons[0];

      // Removed normalizeStr redeclaration to fix Temporal Dead Zone ReferenceError

      const matchedEsts = ests.filter((p: any) => {
        const n = p.product?.name || "";
        const d = p.product?.description || "";
        const s = normalizeStr(n + " " + d);

        if (mappedRoof === "fibrometal") return s.includes("FIBROMETAL");
        if (mappedRoof === "fibromadeira") {
          return (
            (s.includes("FIBROMADEIRA") || s.includes("FIBROCIMENTO") || s.includes("FIBRO")) &&
            !s.includes("FIBROMETAL")
          );
        }
        if (mappedRoof === "ceramic") {
          return s.includes("CERAMIC") || s.includes("COLONIAL") || s.includes("TELHA");
        }
        if (mappedRoof === "metal") {
          return (
            (s.includes("METAL") ||
              s.includes("TRILHO") ||
              s.includes("ZINCO") ||
              s.includes("TRAPEZOIDAL")) &&
            !s.includes("FIBROMETAL")
          );
        }
        if (mappedRoof === "ground") {
          return s.includes("SOLO") || s.includes("GROUND");
        }
        if (mappedRoof === "laje") {
          return s.includes("LAJE") || s.includes("TRIANGULO") || s.includes("TRIANGULAR");
        }
        return s.includes(normalizeStr(mappedRoof));
      });

      const effectiveEsts = matchedEsts.length > 0 ? matchedEsts : ests;

      const parsedEsts = effectiveEsts
        .map((p: any) => {
          const n = (p.product?.name || "").toUpperCase();
          const m = n.match(/(\d+)\s*(MOD|PAIN|PLAC)/);
          let cap = m ? parseInt(m[1], 10) : 0;
          if (cap > 4 && mappedRoof !== "ground") {
            cap = 0;
          }
          return { ...p, cap };
        })
        .filter((p) => p.cap > 0);

      const selectedStructures: any[] = [];
      if (parsedEsts.length > 0) {
        let remaining = moduleQ;
        const bestByCap: Record<number, any> = {};
        for (const p of parsedEsts) {
          if (!bestByCap[p.cap] || Number(p.price) < Number(bestByCap[p.cap].price)) {
            bestByCap[p.cap] = p;
          }
        }
        const uniqueCaps = Object.values(bestByCap).sort((a: any, b: any) => b.cap - a.cap);

        while (remaining > 0) {
          let best = uniqueCaps.find((p: any) => p.cap <= remaining);
          if (!best) {
            const larger = [...uniqueCaps].sort((a: any, b: any) => a.cap - b.cap);
            best = larger.find((p: any) => p.cap >= remaining);
          }
          if (!best) break;
          selectedStructures.push(best);
          remaining -= best.cap;
        }
      } else if (effectiveEsts.length > 0) {
        selectedStructures.push(effectiveEsts[0]);
      }

      // Se o usuário selecionou uma estrutura e o distribuidor NÃO tem estrutura cadastrada, pula
      if (forcedIncludeStructure && selectedStructures.length === 0) {
        continue;
      }

      let profileQty = 0;
      let profileProd: any = null;

      if (forcedIncludeStructure) {
        const perfis = ests.filter((p: any) => {
          const n = (p.product?.name || "").toLowerCase();
          return n.includes("perfil") && !n.includes("s/ perfil") && !n.includes("sem perfil");
        });

        if (perfis.length > 0) {
          if (mappedRoof === "metal") {
            profileProd =
              perfis.find((p: any) => {
                const n = (p.product?.name || "").toLowerCase();
                return n.includes("baixo") || n.includes("mini trilho");
              }) || perfis[0];
          } else {
            profileProd =
              perfis.find((p: any) => {
                const n = (p.product?.name || "").toLowerCase();
                return (
                  !n.includes("baixo") && !n.includes("mini trilho") && !n.includes("fechamento")
                );
              }) || perfis[0];
          }

          if (mappedRoof === "metal") {
            for (const est of selectedStructures) {
              if (est.cap === 4) profileQty += 10;
              else if (est.cap === 2) profileQty += 5;
              else profileQty += Math.ceil((est.cap || 1) * 2.5);
            }
            if (moduleQ % 2 !== 0) profileQty += 1;
          } else if (mappedRoof === "ground") {
            profileQty = 1;
          } else {
            profileQty = moduleQ % 2 === 0 ? moduleQ : moduleQ + 1;
          }
        }
      }

      let precoEst = 0;
      const estLines: string[] = [];
      const cleanProdName = (n?: string | null) =>
        (n || "")
          .replace(/[\s\-_]+$/, "")
          .replace(/\s+-\s*$/, "")
          .trim();

      if (forcedIncludeStructure && selectedStructures.length > 0) {
        const counts = new Map<string, number>();
        for (const est of selectedStructures) {
          precoEst += Number(est.price) || 0;
          const name = est.product?.name || "Estrutura de Fixação";
          counts.set(name, (counts.get(name) || 0) + 1);
        }
        for (const [name, count] of counts.entries()) {
          estLines.push(`• Estrutura: ${count}x ${cleanProdName(name)}`);
        }
      }

      const precoInv = Number(inv.price) || 0;
      const precoMod = (Number(mod.price) || 0) * moduleQ;
      const precoCabPreto = cabPreto ? Number(cabPreto.price) || 0 : 0;
      const precoCabVermelho = cabVermelho ? Number(cabVermelho.price) || 0 : 0;
      const precoCon = con ? (Number(con.price) || 0) * 2 : 0;
      const precoPerfil =
        profileProd && profileQty > 0 ? (Number(profileProd.price) || 0) * profileQty : 0;

      const somaTotal =
        precoInv + precoMod + precoCabPreto + precoCabVermelho + precoCon + precoEst + precoPerfil;

      const structuredItems: Array<{
        productId: string;
        productName: string;
        brandName: string;
        categoryName: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
        imageUrl?: string;
        specs?: Record<string, unknown>;
      }> = [];

      // 1. Inversor
      const invProdName = cleanProdName(inv.product?.name) || "Inversor Solar";
      const invBrand = inv.product?.brand?.name || "";
      structuredItems.push({
        productId: inv.product?.id || inv.productId || inv.id || "",
        productName: invProdName,
        brandName: invBrand,
        categoryName: "inverter",
        quantity: 1,
        unitPrice: precoInv,
        lineTotal: precoInv,
        imageUrl: inv.product?.imageUrl || undefined,
        specs: (inv.product?.specs as Record<string, unknown>) || undefined,
      });

      // 2. Módulos
      const modProdName = cleanProdName(mod.product?.name) || `Módulo Solar ${modPowerW}W`;
      const modBrand = mod.product?.brand?.name || "";
      structuredItems.push({
        productId: mod.product?.id || mod.productId || mod.id || "",
        productName: modProdName,
        brandName: modBrand,
        categoryName: "module",
        quantity: moduleQ,
        unitPrice: Number(mod.price) || 0,
        lineTotal: precoMod,
        imageUrl: mod.product?.imageUrl || undefined,
        specs: (mod.product?.specs as Record<string, unknown>) || undefined,
      });

      // 3. Estruturas
      if (forcedIncludeStructure && selectedStructures.length > 0) {
        const estMap = new Map<string, { item: any; count: number }>();
        for (const est of selectedStructures) {
          const key = est.product?.id || est.id || est.product?.name || "est";
          const existing = estMap.get(key);
          if (existing) {
            existing.count += 1;
          } else {
            estMap.set(key, { item: est, count: 1 });
          }
        }
        for (const { item: est, count } of estMap.values()) {
          const uPrice = Number(est.price) || 0;
          structuredItems.push({
            productId: est.product?.id || est.productId || est.id || "",
            productName: cleanProdName(est.product?.name) || "Estrutura de Fixação",
            brandName: est.product?.brand?.name || "",
            categoryName: "structure_kit",
            quantity: count,
            unitPrice: uPrice,
            lineTotal: uPrice * count,
            imageUrl: est.product?.imageUrl || undefined,
            specs: (est.product?.specs as Record<string, unknown>) || undefined,
          });
        }
      }

      // 4. Perfil / Trilho
      if (profileProd && profileQty > 0) {
        const uPrice = Number(profileProd.price) || 0;
        structuredItems.push({
          productId: profileProd.product?.id || profileProd.productId || profileProd.id || "",
          productName: cleanProdName(profileProd.product?.name) || "Perfil / Trilho",
          brandName: profileProd.product?.brand?.name || "",
          categoryName: "profile",
          quantity: profileQty,
          unitPrice: uPrice,
          lineTotal: precoPerfil,
          imageUrl: profileProd.product?.imageUrl || undefined,
          specs: (profileProd.product?.specs as Record<string, unknown>) || undefined,
        });
      }

      // 5. Cabos
      if (cabPreto) {
        const uPrice = Number(cabPreto.price) || 0;
        structuredItems.push({
          productId: cabPreto.product?.id || cabPreto.productId || cabPreto.id || "",
          productName: cleanProdName(cabPreto.product?.name) || "Cabo Solar 6mm Preto",
          brandName: cabPreto.product?.brand?.name || "",
          categoryName: "dc_cable",
          quantity: 1,
          unitPrice: uPrice,
          lineTotal: precoCabPreto,
          imageUrl: cabPreto.product?.imageUrl || undefined,
          specs: (cabPreto.product?.specs as Record<string, unknown>) || undefined,
        });
      }
      if (cabVermelho) {
        const uPrice = Number(cabVermelho.price) || 0;
        structuredItems.push({
          productId: cabVermelho.product?.id || cabVermelho.productId || cabVermelho.id || "",
          productName: cleanProdName(cabVermelho.product?.name) || "Cabo Solar 6mm Vermelho",
          brandName: cabVermelho.product?.brand?.name || "",
          categoryName: "dc_cable",
          quantity: 1,
          unitPrice: uPrice,
          lineTotal: precoCabVermelho,
          imageUrl: cabVermelho.product?.imageUrl || undefined,
          specs: (cabVermelho.product?.specs as Record<string, unknown>) || undefined,
        });
      }

      // 6. Conectores
      if (con) {
        const uPrice = Number(con.price) || 0;
        structuredItems.push({
          productId: con.product?.id || con.productId || con.id || "",
          productName: cleanProdName(con.product?.name) || "Conectores MC4",
          brandName: con.product?.brand?.name || "",
          categoryName: "connector",
          quantity: 2,
          unitPrice: uPrice,
          lineTotal: precoCon,
          imageUrl: con.product?.imageUrl || undefined,
          specs: (con.product?.specs as Record<string, unknown>) || undefined,
        });
      }

      const items = [
        `• Inversor: ${cleanProdName(inv.product?.name) || "Inversor Solar"}`,
        `• Módulos: ${moduleQ}x ${cleanProdName(mod.product?.name) || `Módulo Solar ${modPowerW}W`}`,
        ...estLines,
        profileProd && profileQty > 0
          ? `• Perfil: ${profileQty}x ${cleanProdName(profileProd.product?.name)}`
          : null,
        cabPreto ? `• Cabo Preto: ${cleanProdName(cabPreto.product?.name)}` : null,
        cabVermelho ? `• Cabo Vermelho: ${cleanProdName(cabVermelho.product?.name)}` : null,
        con ? `• Conectores: 2x ${cleanProdName(con.product?.name)}` : null,
      ].filter(Boolean) as string[];

      quotes.push({
        distributorName: d.name,
        distributorId: d.id,
        totalPrice: somaTotal,
        kwp: Number(realKWp.toFixed(2)),
        estimatedGeneration: Math.round(realKWp * geracaoPorKwp * roofFactor),
        items,
        invName: inv.product?.name || "Inversor",
        modCount: moduleQ,
        modName: mod.product?.name || "Módulo",
        structuredItems,
      });
    }

    return quotes;
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
    `Qual a estrutura do telhado?\n` +
    `1️⃣ Cerâmica (Colonial)\n` +
    `2️⃣ Fibrocimento\n` +
    `3️⃣ Metálico\n` +
    `4️⃣ Solo\n` +
    `5️⃣ Laje\n` +
    `6️⃣ Fibrometal\n` +
    `7️⃣ Sem estrutura\n` +
    `0️⃣ Voltar / Corrigir padrão elétrico\n\n` +
    `(Responda com o número da opção)`;

  private readonly GRID_OPTIONS_TEXT =
    `Qual o padrão de entrada da instalação?\n` +
    `1️⃣ Monofásico 220V\n` +
    `2️⃣ Bifásico 127V/220V\n` +
    `3️⃣ Trifásico 220V\n` +
    `4️⃣ Trifásico 380V\n` +
    `0️⃣ Voltar / Corrigir localização ou consumo\n\n` +
    `(Responda com o número da opção)`;

  private formatQuotesListText(
    quotes: any[],
    sessionCtx: {
      targetKWp?: number;
      targetModules?: number;
      consumptionKwh?: number;
      cidade?: string;
      estado?: string;
    }
  ): string {
    const localidade =
      sessionCtx.cidade && sessionCtx.estado
        ? ` em *${sessionCtx.cidade}/${sessionCtx.estado}*`
        : sessionCtx.cidade
          ? ` em *${sessionCtx.cidade}*`
          : "";

    const infoCabecalho = sessionCtx.targetKWp
      ? `para a potência de *${sessionCtx.targetKWp} kWp*${localidade}`
      : sessionCtx.targetModules
        ? `para *${sessionCtx.targetModules} módulos*${localidade}`
        : `para o consumo de *${sessionCtx.consumptionKwh || 300} kWh/mês*${localidade}`;

    let quoteText = `Excelente! Seguem as melhores opções de kits dimensionados ${infoCabecalho}:\n\n`;

    quotes.forEach((q, index) => {
      quoteText += `${this.numToEmoji(index + 1)} *${q.distributorName}* - R$ ${q.totalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
      quoteText += `Itens do Kit:\n`;
      q.items.forEach((item: string) => {
        quoteText += `${item}\n`;
      });
      quoteText += `Info: Potência: ${q.kwp} kWp | Geração Estimada: ${q.estimatedGeneration} kWh/mês (em condições ideais)*\n`;
      quoteText += `*Obs: A estimativa de geração considera condições ideais de irradiação solar. A geração real pode variar conforme as caídas e inclinação do telhado, orientação solar (azimute) e eventuais sombreamentos.\n\n`;
    });

    quoteText += `Qual opção você prefere para o seu cliente?\n(Responda com o número da opção ou envie 0️⃣ para voltar/alterar estrutura)`;
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
      `${greeting}\n` +
      `Sou seu assistente de vendas e dimensionamento da *EnergivIA*.\n\n` +
      `Como posso ajudar você a gerar orçamentos e propostas para seus clientes hoje?\n\n` +
      `*Escolha uma opção digitando o número:*\n` +
      `1️⃣ Enviar fatura de energia (PDF ou foto)\n` +
      `2️⃣ Simular por consumo mensal (ex: 450 kWh)\n` +
      `3️⃣ Simular por potência de pico (ex: 5 kWp)\n` +
      `4️⃣ Simular por quantidade de placas (ex: 10 módulos)\n` +
      `5️⃣ Dúvidas sobre equipamentos e preços de catálogo\n\n` +
      `_(Ou me envie diretamente a conta de luz em PDF/foto ou sua dúvida)_`
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
        }

        const content = typeof m.content === "string" ? m.content : "";
        const lowerC = content.toLowerCase().trim();

        // 7. Nome e WhatsApp do Cliente (pode ser detectado pelas confirmações do assistente)
        if (m.role === "assistant") {
          const nameM1 = content.match(/registrar o cliente ([^.]+)\./i);
          const nameM2 = content.match(/Cliente \*([^*]+)\* anotado/i);
          if (nameM1?.[1]) clientName = nameM1[1].trim();
          else if (nameM2?.[1]) clientName = nameM2[1].trim();

          const locM =
            content.match(/Localização identificada:\s*\*([^*\/]+)\/([A-Za-z]{2})\*/i) ||
            content.match(/Localização corrigida para:\s*\*([^*\/]+)\/([A-Za-z]{2})\*/i);
          if (locM && locM[1] && locM[2]) {
            cidade = locM[1].trim();
            estado = locM[2].trim().toUpperCase();
          }

          continue; // Não analisa mensagens do bot para evitar capturar exemplos de texto
        }

        // 1. Extração de kWp
        const kwpM = content.match(/(\d+(?:[.,]\d+)?)\s*kwp/i);
        if (kwpM && kwpM[1]) {
          targetKWp = parseFloat(kwpM[1].replace(",", "."));
        }

        // 2. Extração de Módulos
        const modM = content.match(/(\d+)\s*(?:placas?|m[oó]dulos?|paineis?|pain[eé]is)/i);
        if (modM && modM[1]) {
          targetModules = parseInt(modM[1], 10);
          const pM = content.match(/(\d{3,4})\s*w/i);
          if (pM && pM[1]) {
            modPowerWUser = parseInt(pM[1], 10);
          }
        }

        // 3. Extração de Consumo kWh
        const kwhM = content.match(
          /(?:consumo registrado:\s*|consumo m[ée]dio de\s*|consumo\s+(?:de\s+)?|gasto\s+(?:de\s+)?)?(\d+[\d.,]*)\s*(?:kwh|kw)(?:\/m[eê]s)?/i
        );
        if (kwhM && kwhM[1] && !kwpM) {
          const val = Math.round(Number(kwhM[1].replace(",", ".")));
          if (val >= 30 && val <= 500000) {
            consumptionKwh = val;
          }
        }

        // 4. Extração de Cidade e Estado
        const prevContent = i > 0 ? messages[i - 1]?.content || "" : "";
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
          (isLocationInput(content) && !prevContent.includes("nome do cliente final"))
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
          if (messages[i - 1]?.content?.includes("Qual o padrão de entrada da instalação?")) {
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
          if (messages[i - 1]?.content?.includes("Qual o padrão de entrada da instalação?")) {
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
          if (messages[i - 1]?.content?.includes("Qual o padrão de entrada da instalação?")) {
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
          if (messages[i - 1]?.content?.includes("Qual o padrão de entrada da instalação?")) {
            gridVoltage = "Trifásico 380V";
          }
        }

        // 6. Extração de Tipo de Telhado
        if (
          lowerC === "1" ||
          lowerC.includes("1️⃣") ||
          lowerC.includes("cerâmica") ||
          lowerC.includes("ceramica") ||
          lowerC.includes("colonial")
        ) {
          if (messages[i - 1]?.content?.includes("Qual a estrutura do telhado?")) {
            roofType = "Cerâmica (Colonial)";
          }
        } else if (
          lowerC === "2" ||
          lowerC.includes("2️⃣") ||
          lowerC.includes("fibrocimento") ||
          lowerC.includes("fibromadeira")
        ) {
          if (messages[i - 1]?.content?.includes("Qual a estrutura do telhado?")) {
            roofType = "Fibrocimento";
          }
        } else if (
          lowerC === "3" ||
          lowerC.includes("3️⃣") ||
          lowerC.includes("metálico") ||
          lowerC.includes("metalico")
        ) {
          if (messages[i - 1]?.content?.includes("Qual a estrutura do telhado?")) {
            roofType = "Metálico";
          }
        } else if (lowerC === "4" || lowerC.includes("4️⃣") || lowerC.includes("solo")) {
          if (messages[i - 1]?.content?.includes("Qual a estrutura do telhado?")) {
            roofType = "Solo";
          }
        } else if (lowerC === "5" || lowerC.includes("5️⃣") || lowerC.includes("laje")) {
          if (messages[i - 1]?.content?.includes("Qual a estrutura do telhado?")) {
            roofType = "Laje";
          }
        } else if (lowerC === "6" || lowerC.includes("6️⃣") || lowerC.includes("fibrometal")) {
          if (messages[i - 1]?.content?.includes("Qual a estrutura do telhado?")) {
            roofType = "Fibrometal";
          }
        } else if (
          lowerC === "7" ||
          lowerC.includes("7️⃣") ||
          lowerC.includes("sem estrutura") ||
          lowerC.includes("nenhuma")
        ) {
          if (messages[i - 1]?.content?.includes("Qual a estrutura do telhado?")) {
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
        clientName,
        clientWhatsapp,
        chosenQuoteIndex,
      };
    };

    const sessionCtx = extractContextFromSession();

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

      const conexaoInfo = tipoConexao ? `\nPadrão de rede identificado: *${tipoConexao}*` : "";

      return (
        `Legal, dados extraídos com precisão!\n` +
        `Consumo médio de *${kwh} kWh/mês* em *${cidade}* (${baseTexto}).${conexaoInfo}\n\n` +
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
      if (lastBotMsg.includes("Qual o padrão de entrada da instalação?")) {
        if (sessionCtx.consumptionKwh) {
          return (
            `Certo! Vamos alterar a localização ou o consumo. 📍\n\n` +
            `Para qual cidade e estado será a instalação? (Ex: Cuiabá/MT, Maringá/PR, São Paulo/SP)`
          );
        }
        return (
          `Certo! Vamos alterar o dimensionamento. ☀️\n\n` +
          `Envie a potência desejada (ex: *5 kWp*), a quantidade de placas (ex: *10 placas*) ou o consumo médio (ex: *450 kWh*).`
        );
      }

      if (lastBotMsg.includes("Qual a estrutura do telhado?")) {
        return (
          `Sem problemas! Vamos corrigir o padrão elétrico da instalação. ⚡\n\n` +
          this.GRID_OPTIONS_TEXT
        );
      }

      if (lastBotMsg.includes("Qual opção você prefere para o seu cliente?")) {
        return `Certo! Vamos alterar a estrutura do telhado. 🏠\n\n` + this.ROOF_OPTIONS_TEXT;
      }

      if (lastBotMsg.includes("Qual o nome do cliente final")) {
        const quotes = await this.calculateDistributorKits({
          consumptionKwh: sessionCtx.consumptionKwh,
          targetKWp: sessionCtx.targetKWp,
          targetModules: sessionCtx.targetModules,
          modPowerWUser: sessionCtx.modPowerWUser,
          cidade: sessionCtx.cidade || "São Paulo",
          estado: sessionCtx.estado || "SP",
          roofType: sessionCtx.roofType || "Cerâmica (Colonial)",
          gridVoltage: sessionCtx.gridVoltage || "Monofásico 220V",
        });

        if (quotes.length > 0) {
          return this.formatQuotesListText(quotes, sessionCtx);
        }
        return `Certo! Vamos alterar a estrutura do telhado. 🏠\n\n` + this.ROOF_OPTIONS_TEXT;
      }

      if (lastBotMsg.includes("E qual o WhatsApp dele")) {
        return `Sem problemas! Qual o nome correto do cliente final para registrarmos no seu CRM?`;
      }

      if (lastBotMsg.includes("Qual modelo de proposta comercial você deseja usar")) {
        return `Certo! Qual o WhatsApp correto do cliente com DDD? (ou digite 0️⃣ para voltar ao nome)`;
      }

      return (
        `O que você gostaria de alterar ou corrigir? 📝\n\n` +
        `1️⃣ Cidade e Estado (ex: digite *Cuiabá/MT*)\n` +
        `2️⃣ Consumo ou Potência (ex: digite *500 kWh* ou *6 kWp*)\n` +
        `3️⃣ Padrão de Entrada (ex: digite *mono*, *bi* ou *tri 380V*)\n` +
        `4️⃣ Estrutura do Telhado (ex: digite *solo*, *laje* ou *fibrocimento*)\n` +
        `5️⃣ Reiniciar do início (digite *novo*)`
      );
    }

    // ESTADO A: O Bot acabou de apresentar os distribuidores e pediu para escolher a opção (1 ou 2)
    if (lastBotMsg.includes("Qual opção você prefere para o seu cliente?")) {
      const choiceMatch = incomingText.match(/\b([1-9]|10)\b/);
      if (choiceMatch) {
        return (
          `Ótima escolha! Kit selecionado com sucesso. ☀️\n\n` +
          `Qual o nome do cliente final para registrarmos no seu CRM? (ou digite 0️⃣ para voltar às opções de kits)`
        );
      }
      return `Por favor, responda com o número da opção do kit desejado (ex: 1 ou 2) ou envie 0️⃣ para voltar e alterar a estrutura.`;
    }

    // ESTADO B: O Bot pediu o nome do cliente final
    if (lastBotMsg.includes("Qual o nome do cliente final")) {
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
      const clientName = incomingText.trim();
      return `Certo, vou registrar o cliente *${clientName}*. E qual o WhatsApp dele com DDD? (ou digite 0️⃣ para voltar)`;
    }

    // ESTADO C: O Bot pediu o WhatsApp do cliente final -> Apresenta os modelos de proposta
    if (lastBotMsg.includes("E qual o WhatsApp dele")) {
      const clientNameMatch = lastBotMsg.match(/registrar o cliente \*?([^.*]+)\*?\./i);
      const clientName = clientNameMatch?.[1]?.trim() || "Cliente";

      const templates = await this.getAvailableTemplates(conversation.organizationId);
      let templateListText = "";
      templates.forEach((t, i) => {
        templateListText += `${this.numToEmoji(i + 1)} ${t.name}\n`;
      });
      templateListText += `0️⃣ Voltar / Rever dados\n`;

      return (
        `Cliente *${clientName}* anotado com sucesso! 👤✨\n\n` +
        `Qual modelo de proposta comercial você deseja usar para o seu cliente?\n` +
        `${templateListText}\n` +
        `(Responda com o número da opção desejada)`
      );
    }

    // ESTADO D: O Bot pediu para escolher o modelo de proposta -> GERA PROPOSTA COMPLETA!
    if (lastBotMsg.includes("Qual modelo de proposta comercial você deseja usar")) {
      const templateChoiceStr = incomingText.replace(/\D/g, "");
      const chosenTemplateIndex = templateChoiceStr ? parseInt(templateChoiceStr, 10) - 1 : 0;

      const availableTemplates = await this.getAvailableTemplates(conversation.organizationId);
      const chosenTemplate = availableTemplates[chosenTemplateIndex] || availableTemplates[0];

      let clientName = sessionCtx.clientName || "Cliente";
      let clientWhatsapp = "WhatsApp";
      let chosenQuoteIndex = 0;

      // Recupera escolhas das mensagens
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (!m) continue;
        const content = typeof m.content === "string" ? m.content.trim() : "";

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

        if (
          m.role === "assistant" &&
          content.includes("Qual opção você prefere para o seu cliente?")
        ) {
          for (let j = i + 1; j < messages.length; j++) {
            const nextUserMsg = messages[j];
            if (
              nextUserMsg &&
              nextUserMsg.role === "user" &&
              typeof nextUserMsg.content === "string"
            ) {
              const numMatch = nextUserMsg.content.match(/\b([1-9])\b/);
              if (numMatch && numMatch[1]) {
                const idx = parseInt(numMatch[1], 10) - 1;
                if (idx >= 0) chosenQuoteIndex = idx;
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
        const costCalc = computeProjectCostSection(
          selectedQuote.totalPrice,
          selectedQuote.kwp,
          organizationRules
        );
        quotedSaleBrl =
          costCalc.computedSaleFromCostRulesBrl > 0
            ? Math.round(costCalc.computedSaleFromCostRulesBrl * 100) / 100
            : selectedQuote.totalPrice;

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
        const proposal = await this.prisma.proposal.create({
          data: {
            tenantId: conversation.organizationId,
            dealId: deal.id,
            simulationId: simulation.id,
            proposalTemplateId: template?.id || defaultTemplate?.id || null,
            proposalTemplateVersion: template?.version || defaultTemplate?.version || 1,
            title: `Proposta Comercial - ${clientName}`,
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            renderedData: {
              integrator: {
                version: 1,
                kitItems: rawKitItems,
                equipmentSubtotalBrl: selectedQuote.totalPrice,
                quotedSaleBrl: quotedSaleBrl,
                systemPowerKw: selectedQuote.kwp,
                sourceType: "distributor",
                distributorId: selectedQuote.distributorId,
                distributorName: selectedQuote.distributorName,
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
        `Perfeito! Proposta comercial gerada com sucesso para o cliente *${clientName}*! 📋✅\n\n` +
        `☀️ *Potência:* ${selectedQuote.kwp} kWp\n` +
        `🏢 *Distribuidor:* ${selectedQuote.distributorName}\n` +
        `🎨 *Modelo:* ${chosenTemplate?.name || "Comercial Moderno"}\n` +
        `💰 *Valor Total:* R$ ${quotedSaleBrl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\n\n` +
        `📄 *Acesse a Proposta Pronta no link:*\n` +
        `${proposalLink}\n\n` +
        `Ela já está disponível no seu painel CRM da EnergivIA. Posso te ajudar com mais algum orçamento hoje?`
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

    if (lastBotMsg.includes("Qual a estrutura do telhado?")) {
      if (roofMatch) {
        const selectedRoof = roofMatch.name;

        const quotes = await this.calculateDistributorKits({
          consumptionKwh: sessionCtx.consumptionKwh,
          targetKWp: sessionCtx.targetKWp,
          targetModules: sessionCtx.targetModules,
          modPowerWUser: sessionCtx.modPowerWUser,
          cidade: sessionCtx.cidade || "São Paulo",
          estado: sessionCtx.estado || "SP",
          roofType: selectedRoof,
          gridVoltage: sessionCtx.gridVoltage || "Monofásico 220V",
        });

        if (quotes.length === 0) {
          return (
            `No momento não encontramos kits com todos os componentes e estrutura (${selectedRoof}) disponíveis nos distribuidores cadastrados com estoque compatível.\n\n` +
            `Você pode selecionar a opção "7️⃣ Sem estrutura" para cotar apenas os equipamentos elétricos ou escolher outro tipo de telhado (ou envie 0️⃣ para voltar).`
          );
        }

        return this.formatQuotesListText(quotes, sessionCtx);
      }

      return (
        `Opção de telhado não reconhecida. Por favor, responda com o número da opção (1 a 7) ou envie 0️⃣ para voltar:\n\n` +
        this.ROOF_OPTIONS_TEXT
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
            `Perfeito! Localização corrigida para: *${hspRes.city}/${hspRes.uf}* (Irradiação solar de ${hspRes.hsp.toFixed(2)} kWh/m²/dia calculada com precisão). 📍☀️\n\n` +
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
        return `Legal! Padrão registrado: *${chosenGrid}*. ⚡\n\n` + this.ROOF_OPTIONS_TEXT;
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
        `Perfeito! Localização identificada: *${hspRes.city}/${hspRes.uf}* (Irradiação solar de ${hspRes.hsp.toFixed(2)} kWh/m²/dia calculada com precisão). 📍☀️\n\n` +
        this.GRID_OPTIONS_TEXT
      );
    }

    // Opções do menu inicial (1 a 5) quando não estiver em fluxos específicos
    const isChoosingOtherOption =
      lastBotMsg.includes("Qual opção você prefere para o seu cliente?") ||
      lastBotMsg.includes("Qual o padrão de entrada da instalação?") ||
      lastBotMsg.includes("Qual a estrutura do telhado?") ||
      lastBotMsg.includes("Qual modelo de proposta comercial você deseja usar");

    if (!isChoosingOtherOption) {
      if (lower === "1" || lower === "1." || lower === "opcao 1" || lower === "opção 1") {
        return (
          `Perfeito! 📄 Envie o arquivo em *PDF* ou a *foto da conta de luz* do seu cliente por aqui mesmo.\n\n` +
          `Nossa inteligência artificial vai extrair automaticamente todos os dados de consumo e histórico!`
        );
      }
      if (lower === "2" || lower === "2." || lower === "opcao 2" || lower === "opção 2") {
        return (
          `Legal! ⚡ Qual é o *consumo médio mensal* do seu cliente em kWh?\n\n` +
          `(Exemplo: digite *450 kWh* ou *600 kWh*)`
        );
      }
      if (lower === "3" || lower === "3." || lower === "opcao 3" || lower === "opção 3") {
        return (
          `Excelente! ☀️ Qual a *potência de pico* desejada para o sistema solar?\n\n` +
          `(Exemplo: digite *5 kWp* ou *7.5 kWp*)`
        );
      }
      if (lower === "4" || lower === "4." || lower === "opcao 4" || lower === "opção 4") {
        return (
          `Ótimo! 🔌 Quantas *placas solares* você deseja no kit e qual a potência delas?\n\n` +
          `(Exemplo: digite *10 placas de 590W* ou *12 módulos*)`
        );
      }
      if (lower === "5" || lower === "5." || lower === "opcao 5" || lower === "opção 5") {
        return (
          `Com certeza! 🔎 Você pode me perguntar sobre modelos, marcas e preços dos inversores, módulos ou estruturas cadastrados no nosso catálogo da EnergivIA.\n\n` +
          `(Exemplo: *"qual o valor do inversor de 5kw?"* ou *"quais marcas de módulos estão disponíveis?"*)`
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
        return `Legal! Potência solicitada: *${targetKWp} kWp*. ☀️\n\n` + this.GRID_OPTIONS_TEXT;
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
      const extraInfo = modPower ? ` de ${modPower}W (${kwpCalculado} kWp)` : "";

      return (
        `Legal! Quantidade solicitada: *${modCount} placas${extraInfo}*. ☀️\n\n` +
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
            `Legal, consumo registrado: *${consumo} kWh/mês* em *${hspRes.city}/${hspRes.uf}*! ☀️📍\n\n` +
            this.GRID_OPTIONS_TEXT
          );
        }

        return (
          `Legal, consumo registrado: *${consumo} kWh/mês*. ☀️\n\n` +
          `Para qual cidade e estado será a instalação? (Ex: Maringá/PR, Presidente Prudente/SP)`
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
