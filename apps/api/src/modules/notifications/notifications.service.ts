import { Injectable, Logger, NotFoundException, type MessageEvent } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { DealStage, NotificationType, OrgRole } from "@prisma/client";
import { defer, from, interval, merge, of, type Observable } from "rxjs";
import { distinctUntilChanged, map, switchMap } from "rxjs/operators";
import { LeadActivityLogService } from "../lead-activity-log/lead-activity-log.service";
import { PrismaService } from "../../prisma/prisma.service";
import { EmailService } from "../../common/email/email.service";
import { WhatsappCloudService } from "../whatsapp/whatsapp-cloud.service";
import type { RespondPublicProposalDto } from "../proposals/dto/respond-public-proposal.dto";

const COMMERCIAL_ROLES: OrgRole[] = ["OWNER", "ADMIN", "SALES"];

const NOTIFICATION_BY_STATUS: Record<
  "APPROVED" | "REJECTED" | "CONTRACT_SIGNED" | "CREDIT_RELEASED" | "PENDING",
  { type: NotificationType; title: string }
> = {
  APPROVED: { type: "FINANCING_APPROVED", title: "Financiamento aprovado" },
  REJECTED: { type: "FINANCING_REJECTED", title: "Financiamento recusado" },
  CONTRACT_SIGNED: {
    type: "FINANCING_CONTRACT_SIGNED",
    title: "Contrato de financiamento assinado",
  },
  CREDIT_RELEASED: { type: "FINANCING_CREDIT_RELEASED", title: "Crédito liberado" },
  PENDING: { type: "FINANCING_PENDENCY", title: "Pendência no financiamento" },
};

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

@Injectable()
export class NotificationsService {
  private static readonly SSE_UNREAD_POLL_MS = 10_000;
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly leadActivityLog: LeadActivityLogService,
    private readonly emailService: EmailService,
    private readonly whatsappCloud: WhatsappCloudService
  ) {}

  unreadCountSseStream(tenantId: string, userId: string): Observable<MessageEvent> {
    const pollMs = NotificationsService.SSE_UNREAD_POLL_MS;
    return defer(() => from(this.countUnread(tenantId, userId))).pipe(
      switchMap((first) =>
        merge(
          of(first),
          interval(pollMs).pipe(switchMap(() => from(this.countUnread(tenantId, userId))))
        )
      ),
      distinctUntilChanged(),
      map(
        (count): MessageEvent => ({
          data: JSON.stringify({ type: "unread_count", count }),
        })
      )
    );
  }

  private getLeadStaleDays(): number {
    const raw = this.config.get<string>("LEAD_STALE_DAYS");
    const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
    return Number.isFinite(n) && n > 0 ? n : 7;
  }

  async listCommercialRecipientUserIds(tenantId: string): Promise<string[]> {
    const rows = await this.prisma.organizationMember.findMany({
      where: {
        organizationId: tenantId,
        status: "ACCEPTED",
        userId: { not: null },
        role: { in: COMMERCIAL_ROLES },
      },
      select: { userId: true },
    });
    return rows.map((r) => r.userId).filter((id): id is string => Boolean(id));
  }

  async listCommercialRecipientUsers(
    tenantId: string
  ): Promise<Array<{ id: string; email: string; name?: string }>> {
    const rows = await this.prisma.organizationMember.findMany({
      where: {
        organizationId: tenantId,
        status: "ACCEPTED",
        userId: { not: null },
        role: { in: COMMERCIAL_ROLES },
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });
    const result: Array<{ id: string; email: string; name?: string }> = [];
    for (const row of rows) {
      if (row.user && row.user.email) {
        result.push({
          id: row.user.id,
          email: row.user.email,
          name: row.user.name || undefined,
        });
      }
    }
    return result;
  }

  async listTenantNotificationPhones(tenantId: string): Promise<string[]> {
    const phones = new Set<string>();
    const inbound = await this.prisma.tenantWhatsappInboundPhone.findMany({
      where: { organizationId: tenantId },
      select: { phoneDigits: true },
    });
    for (const item of inbound) {
      if (item.phoneDigits) phones.add(item.phoneDigits);
    }
    return Array.from(phones);
  }

  async handlePublicProposalView(proposalId: string): Promise<void> {
    const result = await this.prisma.$transaction(async (tx) => {
      const p = await tx.proposal.findFirst({
        where: { id: proposalId, deletedAt: null },
        include: {
          deal: { include: { lead: true } },
          tenant: { select: { name: true } },
        },
      });
      if (!p) return null;
      if (!p.deal || p.deal.deletedAt != null) return null;

      const prevCount = p.clientViewCount;
      const now = new Date();

      const updated = await tx.proposal.update({
        where: { id: proposalId },
        data: {
          clientViewCount: { increment: 1 },
          clientFirstViewedAt: p.clientFirstViewedAt ?? now,
          clientLastViewedAt: now,
          status: p.status === "SENT" || p.status === "DRAFT" ? "VIEWED" : p.status,
        },
        include: {
          deal: { include: { lead: true } },
          tenant: { select: { name: true } },
        },
      });
      if (!updated.deal || updated.deal.deletedAt != null) return null;

      return { proposal: updated, prevCount, now };
    });

    if (!result) return;

    const { proposal: p, prevCount, now } = result;
    const tenantId = p.tenantId;
    const lead = p.deal?.lead;
    const leadId = lead?.id;
    if (!leadId) return;

    const userIds = await this.listCommercialRecipientUserIds(tenantId);
    const linkPath = `/propostas/${p.id}`;
    const webBaseUrl =
      this.config.get<string>("PUBLIC_WEB_APP_BASE_URL") ||
      this.config.get<string>("APP_BASE_URL") ||
      "https://www.energivia.com.br";
    const fullProposalUrl = `${webBaseUrl.replace(/\/$/, "")}/propostas/${p.id}`;

    const isFirstView = prevCount === 0;
    const lastRev = p.lastRevisitNotifiedAt;
    const cooldownMs = 5 * 60 * 1000; // 5 minutos de cooldown para revisitas
    const canNotifyRevisit =
      !isFirstView && (!lastRev || now.getTime() - lastRev.getTime() >= cooldownMs);

    if (isFirstView || canNotifyRevisit) {
      const notifType: NotificationType = isFirstView ? "PROPOSAL_VIEWED" : "PROPOSAL_REVISITED";
      const notifTitle = isFirstView
        ? `👀 ${lead?.name || "Cliente"} está visualizando a proposta!`
        : `🔥 ${lead?.name || "Cliente"} está visualizando a proposta novamente!`;
      const notifMessage = isFirstView
        ? `O cliente ${lead?.name || "Cliente"} acabou de abrir a proposta "${p.title}" neste momento.`
        : `O cliente ${lead?.name || "Cliente"} abriu a proposta "${p.title}" neste momento (${p.clientViewCount}ª visualização). Sinal de alto interesse!`;

      // 1. Grava no Log de Atividades
      try {
        await this.leadActivityLog.append({
          tenantId,
          leadId,
          kind: "PROPOSAL_VIEWED",
          label: isFirstView
            ? `Cliente visualizou a proposta (${p.title}) pela 1ª vez`
            : `Cliente visualizou a proposta (${p.title}) novamente (${p.clientViewCount}ª vez)`,
          meta: { proposalId: p.id, viewCount: p.clientViewCount },
          occurredAt: now,
        });
      } catch (e) {
        this.logger.warn(
          `Failed to append lead activity for proposal view: ${e instanceof Error ? e.message : String(e)}`
        );
      }

      // 2. In-App Notification (cria diretamente para todos os usuários comerciais)
      if (userIds.length > 0) {
        for (const userId of userIds) {
          await this.prisma.userNotification.create({
            data: {
              tenantId,
              userId,
              type: notifType,
              title: notifTitle,
              message: notifMessage,
              linkPath,
              proposalId: p.id,
              leadId,
              dealId: p.dealId,
            },
          });
        }
      }

      // 3. Atualiza timestamp de revisita se aplicável
      if (!isFirstView) {
        await this.prisma.proposal.update({
          where: { id: p.id },
          data: { lastRevisitNotifiedAt: now },
        });
      }

      // 4. Email Notification
      this.sendProposalViewedEmail({
        tenantId,
        leadName: lead?.name || "Cliente",
        proposalTitle: p.title,
        proposalUrl: fullProposalUrl,
        isRevisit: !isFirstView,
        viewCount: p.clientViewCount,
      }).catch((err) => {
        this.logger.warn(`Failed to send proposal viewed email: ${err}`);
      });

      // 5. WhatsApp Notification
      this.sendProposalViewedWhatsapp({
        tenantId,
        leadName: lead?.name || "Cliente",
        proposalTitle: p.title,
        fullProposalUrl,
        isRevisit: !isFirstView,
        viewCount: p.clientViewCount,
      }).catch((err) => {
        this.logger.warn(`Failed to send proposal viewed whatsapp: ${err}`);
      });
    }
  }

  async handlePublicProposalResponse(
    proposalId: string,
    dto: RespondPublicProposalDto
  ): Promise<void> {
    const p = await this.prisma.proposal.findFirst({
      where: { id: proposalId, deletedAt: null },
      include: {
        deal: { include: { lead: true } },
        tenant: { select: { name: true } },
      },
    });
    if (!p || !p.deal || !p.deal.lead) return;

    const now = new Date();
    const tenantId = p.tenantId;
    const lead = p.deal.lead;
    const leadId = lead.id;
    const linkPath = `/propostas/${p.id}`;
    const webBaseUrl =
      this.config.get<string>("PUBLIC_WEB_APP_BASE_URL") ||
      this.config.get<string>("APP_BASE_URL") ||
      "https://www.energivia.com.br";
    const fullProposalUrl = `${webBaseUrl.replace(/\/$/, "")}/propostas/${p.id}`;

    let notifType: NotificationType;
    let notifTitle: string;
    let notifMessage: string;
    let activityKind: "PROPOSAL_ACCEPTED" | "PROPOSAL_CHANGE_REQUESTED" | "PROPOSAL_REJECTED";
    let activityLabel: string;

    if (dto.decision === "ACCEPT") {
      notifType = "PROPOSAL_ACCEPTED";
      notifTitle = "🎉 Proposta aceita pelo cliente!";
      notifMessage = `${lead.name} aceitou a proposta "${p.title}"! Assinatura: ${dto.signatureName || lead.name}.`;
      activityKind = "PROPOSAL_ACCEPTED";
      activityLabel = `Cliente ACEITOU a proposta (${p.title}) — Assinado por ${dto.signatureName || lead.name}`;
    } else if (dto.decision === "REQUEST_CHANGES") {
      notifType = "PROPOSAL_CHANGE_REQUESTED";
      notifTitle = "✏️ Solicitação de alteração na proposta";
      notifMessage = `${lead.name} solicitou ajustes na proposta "${p.title}": "${dto.comments || "Sem detalhes adicionais"}".`;
      activityKind = "PROPOSAL_CHANGE_REQUESTED";
      activityLabel = `Cliente solicitou ALTERAÇÕES na proposta (${p.title}): ${dto.comments || ""}`;
    } else {
      notifType = "PROPOSAL_REJECTED";
      notifTitle = "❌ Proposta recusada pelo cliente";
      notifMessage = `${lead.name} recusou a proposta "${p.title}"${dto.comments ? `: "${dto.comments}"` : "."}`;
      activityKind = "PROPOSAL_REJECTED";
      activityLabel = `Cliente RECUSOU a proposta (${p.title}): ${dto.comments || "Sem motivo informado"}`;
    }

    // 1. Gravar no log de atividades do lead
    try {
      await this.leadActivityLog.append({
        tenantId,
        leadId,
        kind: activityKind,
        label: activityLabel,
        meta: {
          proposalId: p.id,
          decision: dto.decision,
          comments: dto.comments,
          signatureName: dto.signatureName,
          contactWhatsapp: dto.contactWhatsapp,
        },
        occurredAt: now,
      });
    } catch (e) {
      this.logger.warn(
        `Failed to append lead activity for proposal response: ${e instanceof Error ? e.message : String(e)}`
      );
    }

    // 2. In-App Notification
    const userIds = await this.listCommercialRecipientUserIds(tenantId);
    if (userIds.length > 0) {
      for (const userId of userIds) {
        await this.prisma.userNotification.create({
          data: {
            tenantId,
            userId,
            type: notifType,
            title: notifTitle,
            message: notifMessage,
            linkPath,
            proposalId: p.id,
            leadId,
            dealId: p.dealId,
          },
        });
      }
    }

    // 3. Email Notification
    this.sendProposalResponseEmail({
      tenantId,
      leadName: lead.name,
      proposalTitle: p.title,
      decision: dto.decision,
      comments: dto.comments,
      signatureName: dto.signatureName,
      contactWhatsapp: dto.contactWhatsapp || lead.whatsapp,
      proposalUrl: fullProposalUrl,
    }).catch((err) => {
      this.logger.warn(`Failed to send proposal response email: ${err}`);
    });

    // 4. WhatsApp Notification
    this.sendProposalResponseWhatsapp({
      tenantId,
      leadName: lead.name,
      proposalTitle: p.title,
      decision: dto.decision,
      comments: dto.comments,
      signatureName: dto.signatureName,
      contactWhatsapp: dto.contactWhatsapp || lead.whatsapp,
      fullProposalUrl,
    }).catch((err) => {
      this.logger.warn(`Failed to send proposal response whatsapp: ${err}`);
    });
  }

  private async sendProposalViewedEmail(params: {
    tenantId: string;
    leadName: string;
    proposalTitle: string;
    proposalUrl: string;
    isRevisit?: boolean;
    viewCount?: number;
  }): Promise<void> {
    const recipients = await this.listCommercialRecipientUsers(params.tenantId);
    if (recipients.length === 0) return;

    const emails = recipients.map((r) => r.email).filter(Boolean);
    if (emails.length === 0) return;

    const countText = params.viewCount && params.viewCount > 1 ? ` (${params.viewCount}ª vez)` : "";
    const subject = params.isRevisit
      ? `🔥 [EnergivIA] ${params.leadName} está visualizando a proposta novamente!`
      : `👀 [EnergivIA] ${params.leadName} abriu a proposta agora!`;

    const title = params.isRevisit
      ? `Cliente Revisitou a Proposta${countText}`
      : "Proposta Aberta pelo Cliente";
    const subtitle = params.isRevisit
      ? `O cliente <strong>${params.leadName}</strong> está visualizando novamente a proposta <strong>"${params.proposalTitle}"</strong> neste momento (sinal de alto interesse!).`
      : `O cliente <strong>${params.leadName}</strong> acabou de abrir o link da proposta <strong>"${params.proposalTitle}"</strong>.`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; padding: 32px 16px; color: #f8fafc;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; padding: 8px 16px; background-color: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; border-radius: 9999px; color: #34d399; font-size: 13px; font-weight: 600;">
              ${params.isRevisit ? `🔥 REVISITA ATIVA${countText}` : "👀 PROPOSTA VISUALIZADA AGORA"}
            </div>
            <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 16px 0 8px 0;">${title}</h1>
            <p style="color: #94a3b8; font-size: 15px; margin: 0; line-height: 1.5;">${subtitle}</p>
          </div>

          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #334155;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="color: #94a3b8; padding: 6px 0; width: 35%;">Cliente:</td>
                <td style="color: #ffffff; font-weight: 600; padding: 6px 0;">${params.leadName}</td>
              </tr>
              <tr>
                <td style="color: #94a3b8; padding: 6px 0;">Proposta:</td>
                <td style="color: #ffffff; font-weight: 600; padding: 6px 0;">${params.proposalTitle}</td>
              </tr>
              <tr>
                <td style="color: #94a3b8; padding: 6px 0;">Data/Hora:</td>
                <td style="color: #ffffff; font-weight: 600; padding: 6px 0;">${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center;">
            <a href="${params.proposalUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
              Acessar Proposta no EnergivIA →
            </a>
          </div>
        </div>
      </div>
    `;

    await this.emailService.sendEmail({
      to: emails,
      subject,
      html,
      text: `${title}\n\n${subtitle}\n\nCliente: ${params.leadName}\nProposta: ${params.proposalTitle}\nAcesse: ${params.proposalUrl}`,
    });
  }

  private async sendProposalViewedWhatsapp(params: {
    tenantId: string;
    leadName: string;
    proposalTitle: string;
    fullProposalUrl: string;
    isRevisit?: boolean;
    viewCount?: number;
  }): Promise<void> {
    const phones = await this.listTenantNotificationPhones(params.tenantId);
    if (phones.length === 0) return;

    const phoneNumberId =
      this.config.get<string>("WHATSAPP_PHONE_NUMBER_ID")?.trim() || "590740927450532";
    const countText = params.viewCount && params.viewCount > 1 ? ` (${params.viewCount}ª vez)` : "";
    const header = params.isRevisit
      ? `🔥 *CLIENTE ESTÁ VISUALIZANDO A PROPOSTA NOVAMENTE!*${countText}`
      : "🔔 *CLIENTE ABRIU A PROPOSTA AGORA!* 👀";
    const bodyText = params.isRevisit
      ? `O cliente *${params.leadName}* está visualizando a proposta *"${params.proposalTitle}"* neste momento (alto sinal de interesse!).`
      : `O cliente *${params.leadName}* acabou de abrir o link da proposta *"${params.proposalTitle}"*.`;

    const message =
      `${header}\n\n` +
      `${bodyText}\n\n` +
      `📄 *Proposta:* ${params.proposalTitle}\n` +
      `👤 *Cliente:* ${params.leadName}\n` +
      `⏰ *Horário:* ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}\n\n` +
      `👉 *Acesse no EnergivIA:* ${params.fullProposalUrl}`;

    for (const phone of phones) {
      await this.whatsappCloud
        .sendTextMessage({
          phoneNumberId,
          toWaId: phone,
          body: message,
        })
        .catch((err) => {
          this.logger.warn(`Failed to send WhatsApp viewed message to ${phone}: ${err}`);
        });
    }
  }

  private async sendProposalResponseEmail(params: {
    tenantId: string;
    leadName: string;
    proposalTitle: string;
    decision: "ACCEPT" | "REQUEST_CHANGES" | "REJECT";
    comments?: string;
    signatureName?: string;
    contactWhatsapp?: string;
    proposalUrl: string;
  }): Promise<void> {
    const recipients = await this.listCommercialRecipientUsers(params.tenantId);
    if (recipients.length === 0) return;

    const emails = recipients.map((r) => r.email).filter(Boolean);
    if (emails.length === 0) return;

    let badgeColor = "#10b981";
    let badgeBg = "rgba(16, 185, 129, 0.15)";
    let badgeText = "🎉 PROPOSTA ACEITA";
    let subject = `🎉 [EnergivIA] Proposta ACEITA por ${params.leadName}!`;
    let mainHeading = "Proposta Aceita pelo Cliente!";

    if (params.decision === "REQUEST_CHANGES") {
      badgeColor = "#f59e0b";
      badgeBg = "rgba(245, 158, 11, 0.15)";
      badgeText = "✏️ SOLICITAÇÃO DE ALTERAÇÃO";
      subject = `✏️ [EnergivIA] Solicitação de alteração: ${params.leadName}`;
      mainHeading = "Cliente Solicitou Alterações";
    } else if (params.decision === "REJECT") {
      badgeColor = "#ef4444";
      badgeBg = "rgba(239, 68, 68, 0.15)";
      badgeText = "⚠️ PROPOSTA RECUSADA";
      subject = `⚠️ [EnergivIA] Proposta recusada por ${params.leadName}`;
      mainHeading = "Proposta Recusada pelo Cliente";
    }

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; padding: 32px 16px; color: #f8fafc;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.3);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; padding: 8px 16px; background-color: ${badgeBg}; border: 1px solid ${badgeColor}; border-radius: 9999px; color: ${badgeColor}; font-size: 13px; font-weight: 600;">
              ${badgeText}
            </div>
            <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 16px 0 8px 0;">${mainHeading}</h1>
            <p style="color: #94a3b8; font-size: 15px; margin: 0; line-height: 1.5;">O cliente respondeu à proposta no link público.</p>
          </div>

          <div style="background-color: #0f172a; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #334155;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="color: #94a3b8; padding: 6px 0; width: 35%;">Cliente:</td>
                <td style="color: #ffffff; font-weight: 600; padding: 6px 0;">${params.leadName}</td>
              </tr>
              <tr>
                <td style="color: #94a3b8; padding: 6px 0;">Proposta:</td>
                <td style="color: #ffffff; font-weight: 600; padding: 6px 0;">${params.proposalTitle}</td>
              </tr>
              ${
                params.signatureName
                  ? `<tr>
                      <td style="color: #94a3b8; padding: 6px 0;">Assinatura:</td>
                      <td style="color: #34d399; font-weight: 600; padding: 6px 0;">${params.signatureName}</td>
                    </tr>`
                  : ""
              }
              ${
                params.contactWhatsapp
                  ? `<tr>
                      <td style="color: #94a3b8; padding: 6px 0;">WhatsApp/Contato:</td>
                      <td style="color: #ffffff; font-weight: 600; padding: 6px 0;">${params.contactWhatsapp}</td>
                    </tr>`
                  : ""
              }
              ${
                params.comments
                  ? `<tr>
                      <td style="color: #94a3b8; padding: 6px 0; vertical-align: top;">Observações:</td>
                      <td style="color: #f1f5f9; padding: 6px 0; font-style: italic;">"${params.comments}"</td>
                    </tr>`
                  : ""
              }
              <tr>
                <td style="color: #94a3b8; padding: 6px 0;">Data/Hora:</td>
                <td style="color: #ffffff; font-weight: 600; padding: 6px 0;">${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center;">
            <a href="${params.proposalUrl}" style="display: inline-block; background-color: ${badgeColor}; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 28px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
              Ver Detalhes no EnergivIA →
            </a>
          </div>
        </div>
      </div>
    `;

    await this.emailService.sendEmail({
      to: emails,
      subject,
      html,
      text: `${mainHeading}\n\nCliente: ${params.leadName}\nProposta: ${params.proposalTitle}\nAssinatura: ${params.signatureName || "-"}\nObservações: ${params.comments || "-"}\nContato: ${params.contactWhatsapp || "-"}\n\nAcesse: ${params.proposalUrl}`,
    });
  }

  private async sendProposalResponseWhatsapp(params: {
    tenantId: string;
    leadName: string;
    proposalTitle: string;
    decision: "ACCEPT" | "REQUEST_CHANGES" | "REJECT";
    comments?: string;
    signatureName?: string;
    contactWhatsapp?: string;
    fullProposalUrl: string;
  }): Promise<void> {
    const phones = await this.listTenantNotificationPhones(params.tenantId);
    if (phones.length === 0) return;

    const phoneNumberId =
      this.config.get<string>("WHATSAPP_PHONE_NUMBER_ID")?.trim() || "590740927450532";

    let message = "";
    if (params.decision === "ACCEPT") {
      message =
        `🎉 *PROPOSTA ACEITA PELO CLIENTE!* ☀️\n\n` +
        `O cliente *${params.leadName}* acaba de aprovar a proposta *"${params.proposalTitle}"*!\n\n` +
        `✍️ *Assinado por:* ${params.signatureName || params.leadName}\n` +
        `📱 *Contato:* ${params.contactWhatsapp || "Não informado"}\n` +
        `⏰ *Horário:* ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}\n\n` +
        `🚀 Acesse o EnergivIA para dar andamento ao contrato:\n${params.fullProposalUrl}`;
    } else if (params.decision === "REQUEST_CHANGES") {
      message =
        `✏️ *SOLICITAÇÃO DE ALTERAÇÃO NA PROPOSTA*\n\n` +
        `O cliente *${params.leadName}* solicitou ajustes na proposta *"${params.proposalTitle}"*.\n\n` +
        `📝 *Detalhes do Pedido:*\n"${params.comments || "Cliente solicitou revisão de itens/condições."}"\n\n` +
        `📱 *Contato:* ${params.contactWhatsapp || "Não informado"}\n\n` +
        `👉 Acesse o EnergivIA para entrar em contato:\n${params.fullProposalUrl}`;
    } else {
      message =
        `⚠️ *PROPOSTA RECUSADA*\n\n` +
        `O cliente *${params.leadName}* informou que recusou a proposta *"${params.proposalTitle}"*.\n\n` +
        `💬 *Motivo informado:*\n"${params.comments || "Sem motivo informado."}"\n\n` +
        `👉 Acesse o EnergivIA para registrar no CRM:\n${params.fullProposalUrl}`;
    }

    for (const phone of phones) {
      await this.whatsappCloud
        .sendTextMessage({
          phoneNumberId,
          toWaId: phone,
          body: message,
        })
        .catch((err) => {
          this.logger.warn(`Failed to send WhatsApp response message to ${phone}: ${err}`);
        });
    }
  }

  private async createManyIfNotExists(
    userIds: string[],
    row: {
      tenantId: string;
      type: NotificationType;
      title: string;
      message: string;
      linkPath: string;
      proposalId: string | null;
      leadId: string | null;
      dealId: string | null;
    }
  ): Promise<void> {
    for (const userId of userIds) {
      const exists = await this.prisma.userNotification.findFirst({
        where: {
          userId,
          type: row.type,
          proposalId: row.proposalId,
        },
        select: { id: true },
      });
      if (exists) continue;
      await this.prisma.userNotification.create({
        data: {
          tenantId: row.tenantId,
          userId,
          type: row.type,
          title: row.title,
          message: row.message,
          linkPath: row.linkPath,
          proposalId: row.proposalId,
          leadId: row.leadId,
          dealId: row.dealId,
        },
      });
    }
  }

  private async createManyIfNotExistsDaily(
    userIds: string[],
    row: {
      tenantId: string;
      type: NotificationType;
      title: string;
      message: string;
      linkPath: string;
      proposalId: string | null;
      leadId: string | null;
      dealId: string | null;
    }
  ): Promise<number> {
    const dayStart = startOfUtcDay(new Date());
    let created = 0;
    for (const userId of userIds) {
      const exists = await this.prisma.userNotification.findFirst({
        where: {
          userId,
          type: row.type,
          proposalId: row.proposalId,
          createdAt: { gte: dayStart },
        },
        select: { id: true },
      });
      if (exists) continue;
      await this.prisma.userNotification.create({
        data: {
          tenantId: row.tenantId,
          userId,
          type: row.type,
          title: row.title,
          message: row.message,
          linkPath: row.linkPath,
          proposalId: row.proposalId,
          leadId: row.leadId,
          dealId: row.dealId,
        },
      });
      created += 1;
    }
    return created;
  }

  private async hasLeadTypeSince(
    userId: string,
    tenantId: string,
    type: NotificationType,
    leadId: string,
    since: Date
  ): Promise<boolean> {
    const row = await this.prisma.userNotification.findFirst({
      where: {
        userId,
        tenantId,
        type,
        leadId,
        createdAt: { gte: since },
      },
      select: { id: true },
    });
    return Boolean(row);
  }

  async notifyOnboardingTemplatesReady(
    tenantId: string,
    userId: string,
    templateCount: number
  ): Promise<void> {
    const message =
      templateCount === 1
        ? "Seu modelo gerado por IA está disponível em Modelos de proposta."
        : `Seus ${templateCount} modelos gerados por IA estão disponíveis em Modelos de proposta.`;
    await this.prisma.userNotification.create({
      data: {
        tenantId,
        userId,
        type: "ONBOARDING_TEMPLATES_READY",
        title: "Templates de proposta prontos",
        message,
        linkPath: "/propostas/templates",
        proposalId: null,
        leadId: null,
        dealId: null,
      },
    });
    this.logger.log(
      `Onboarding templates notification created userId=${userId} tenantId=${tenantId} templateCount=${templateCount}`
    );
  }

  async notifyOnboardingTemplateReady(
    tenantId: string,
    userId: string,
    dto: { proposalTemplateId: string; templateName: string; businessSegmentLabel: string }
  ): Promise<void> {
    const name = dto.templateName.trim().slice(0, 300);
    const segment = dto.businessSegmentLabel.trim().slice(0, 200);
    const message = `“${name}” foi gerado para o segmento ${segment}.`;
    await this.prisma.userNotification.create({
      data: {
        tenantId,
        userId,
        type: "ONBOARDING_TEMPLATES_READY",
        title: "Modelo de proposta criado",
        message,
        linkPath: `/propostas/templates/${dto.proposalTemplateId.trim()}`,
        proposalId: null,
        leadId: null,
        dealId: null,
      },
    });
    this.logger.log(
      `Onboarding single template notification userId=${userId} tenantId=${tenantId} proposalTemplateId=${dto.proposalTemplateId}`
    );
  }

  async notifyFinancingStatusChange(input: {
    tenantId: string;
    applicationId: string;
    leadId: string;
    dealId: string | null;
    customerName: string;
    providerName: string;
    status: "APPROVED" | "REJECTED" | "CONTRACT_SIGNED" | "CREDIT_RELEASED" | "PENDING";
    assignedUserId: string | null;
    reason?: string | null;
  }): Promise<void> {
    let recipientIds: string[];
    if (input.assignedUserId) {
      recipientIds = [input.assignedUserId];
    } else {
      const rows = await this.prisma.organizationMember.findMany({
        where: {
          organizationId: input.tenantId,
          status: "ACCEPTED",
          userId: { not: null },
          role: { in: ["OWNER", "ADMIN"] },
        },
        select: { userId: true },
      });
      recipientIds = rows.map((r) => r.userId).filter((id): id is string => Boolean(id));
    }
    if (recipientIds.length === 0) return;

    const config = NOTIFICATION_BY_STATUS[input.status];
    const linkPath = `/financiamento/aplicacoes/${input.applicationId}`;
    const message = `${input.customerName} · ${input.providerName}${
      input.reason ? ` — ${input.reason}` : ""
    }`;

    for (const userId of recipientIds) {
      await this.prisma.userNotification.create({
        data: {
          tenantId: input.tenantId,
          userId,
          type: config.type,
          title: config.title,
          message,
          linkPath,
          proposalId: null,
          leadId: input.leadId,
          dealId: input.dealId,
        },
      });
    }
    this.logger.log(
      `Financing notification applicationId=${input.applicationId} status=${input.status} recipients=${recipientIds.length}`
    );
  }

  async listForUser(
    tenantId: string,
    userId: string,
    options: { unreadOnly?: boolean; limit?: number }
  ) {
    const limit = Math.min(options.limit ?? 30, 100);
    const rows = await this.prisma.userNotification.findMany({
      where: {
        tenantId,
        userId,
        ...(options.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      linkPath: n.linkPath,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  async countUnread(tenantId: string, userId: string): Promise<number> {
    return this.prisma.userNotification.count({
      where: { tenantId, userId, readAt: null },
    });
  }

  async markRead(tenantId: string, userId: string, notificationId: string) {
    const row = await this.prisma.userNotification.findFirst({
      where: { id: notificationId, tenantId, userId },
    });
    if (!row) throw new NotFoundException("Notificação não encontrada.");
    return this.prisma.userNotification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(tenantId: string, userId: string) {
    await this.prisma.userNotification.updateMany({
      where: { tenantId, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true as const };
  }

  async runCrmNotificationJobs(): Promise<void> {
    const staleDays = this.getLeadStaleDays();
    const tenants = await this.prisma.tenant.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });

    const pipelineStages: DealStage[] = ["CONTACTED", "PROPOSAL", "NEGOTIATION"];
    const dayStart = startOfUtcDay(new Date());
    const staleCutoff = new Date();
    staleCutoff.setUTCDate(staleCutoff.getUTCDate() - staleDays);

    for (const { id: tenantId } of tenants) {
      const userIds = await this.listCommercialRecipientUserIds(tenantId);
      if (userIds.length === 0) continue;

      const leads = await this.prisma.lead.findMany({
        where: { tenantId, deletedAt: null },
        include: {
          deals: {
            where: { deletedAt: null },
          },
        },
      });

      for (const lead of leads) {
        const activeDeals = lead.deals.filter((d) => d.stage !== "WON" && d.stage !== "LOST");
        if (activeDeals.length === 0) continue;

        const linkPath = `/clientes/${lead.id}`;

        const contactDates = activeDeals
          .map((d) => d.lastContactAt)
          .filter((d): d is Date => d != null);
        const lastActivity =
          contactDates.length > 0
            ? new Date(Math.max(...contactDates.map((d) => d.getTime())))
            : lead.updatedAt;

        if (lastActivity < staleCutoff) {
          for (const userId of userIds) {
            const dup = await this.hasLeadTypeSince(
              userId,
              tenantId,
              "LEAD_NEEDS_ATTENTION",
              lead.id,
              dayStart
            );
            if (dup) continue;
            await this.prisma.userNotification.create({
              data: {
                tenantId,
                userId,
                type: "LEAD_NEEDS_ATTENTION",
                title: `Lead precisa de atenção: ${lead.name}`,
                message: `${lead.name} está sem atividade recente no funil`,
                linkPath,
                leadId: lead.id,
                dealId: activeDeals[0]?.id ?? null,
              },
            });
          }
        }

        const dealNeedingSchedule = activeDeals.find(
          (d) => pipelineStages.includes(d.stage) && !d.nextActionAt
        );
        if (dealNeedingSchedule) {
          for (const userId of userIds) {
            const dup = await this.hasLeadTypeSince(
              userId,
              tenantId,
              "LEAD_SCHEDULE_PENDING",
              lead.id,
              dayStart
            );
            if (dup) continue;
            await this.prisma.userNotification.create({
              data: {
                tenantId,
                userId,
                type: "LEAD_SCHEDULE_PENDING",
                title: `Agendamento pendente: ${lead.name}`,
                message: `Agende o próximo passo com ${lead.name}`,
                linkPath,
                leadId: lead.id,
                dealId: dealNeedingSchedule.id,
              },
            });
          }
        }

        const now = new Date();
        const overdueDeal = activeDeals.find(
          (d) => d.nextActionAt != null && d.nextActionAt <= now
        );
        if (overdueDeal) {
          for (const userId of userIds) {
            const dup = await this.hasLeadTypeSince(
              userId,
              tenantId,
              "FOLLOWUP_REMINDER",
              lead.id,
              dayStart
            );
            if (dup) continue;
            await this.prisma.userNotification.create({
              data: {
                tenantId,
                userId,
                type: "FOLLOWUP_REMINDER",
                title: `Lembrete de follow-up: ${lead.name}`,
                message: `Hora de entrar em contato com ${lead.name}`,
                linkPath,
                leadId: lead.id,
                dealId: overdueDeal.id,
              },
            });
          }
        }
      }
    }
  }
}
