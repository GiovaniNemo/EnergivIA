import { Injectable, Logger, NotFoundException, type MessageEvent } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { DealStage, NotificationType, OrgRole } from "@prisma/client";
import { defer, from, interval, merge, of, type Observable } from "rxjs";
import { distinctUntilChanged, map, switchMap } from "rxjs/operators";
import { LeadActivityLogService } from "../lead-activity-log/lead-activity-log.service";
import { PrismaService } from "../../prisma/prisma.service";

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

const REVISIT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

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
    private readonly leadActivityLog: LeadActivityLogService
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

  async handlePublicProposalView(proposalId: string): Promise<void> {
    const result = await this.prisma.$transaction(async (tx) => {
      const p = await tx.proposal.findFirst({
        where: { id: proposalId, deletedAt: null },
        include: {
          deal: true,
        },
      });
      if (!p) return null;
      if (!p.deal || p.deal.deletedAt != null) return null;
      if (p.status !== "SENT" && p.status !== "VIEWED") return null;

      const prevCount = p.clientViewCount;
      const now = new Date();

      const updated = await tx.proposal.update({
        where: { id: proposalId },
        data: {
          clientViewCount: { increment: 1 },
          clientFirstViewedAt: p.clientFirstViewedAt ?? now,
          clientLastViewedAt: now,
          status: p.status === "SENT" ? "VIEWED" : p.status,
        },
        include: {
          deal: true,
        },
      });
      if (!updated.deal || updated.deal.deletedAt != null) return null;

      return { proposal: updated, prevCount, now };
    });

    if (!result) return;

    const { proposal: p, prevCount, now } = result;
    const tenantId = p.tenantId;
    const leadId = p.deal?.leadId;
    if (!leadId) return;

    const userIds = await this.listCommercialRecipientUserIds(tenantId);
    if (userIds.length === 0) return;

    const linkPath = `/propostas/${p.id}`;

    if (prevCount === 0) {
      try {
        await this.leadActivityLog.append({
          tenantId,
          leadId,
          kind: "PROPOSAL_VIEWED",
          label: `Cliente visualizou a proposta (${p.title})`,
          meta: { proposalId: p.id },
          occurredAt: now,
        });
      } catch (e) {
        this.logger.warn(
          `Failed to append lead activity for proposal view: ${e instanceof Error ? e.message : String(e)}`
        );
      }
      await this.createManyIfNotExists(userIds, {
        tenantId,
        type: "PROPOSAL_VIEWED",
        title: "Cliente visualizou a proposta",
        message: "O cliente abriu a proposta agora",
        linkPath,
        proposalId: p.id,
        leadId,
        dealId: p.dealId,
      });
      return;
    }

    const lastRev = p.lastRevisitNotifiedAt;
    const canRevisit = !lastRev || now.getTime() - lastRev.getTime() >= REVISIT_COOLDOWN_MS;
    if (!canRevisit) return;

    const created = await this.createManyIfNotExistsDaily(userIds, {
      tenantId,
      type: "PROPOSAL_REVISITED",
      title: "Cliente voltou à proposta",
      message: "O cliente abriu a proposta novamente — sinal de interesse.",
      linkPath,
      proposalId: p.id,
      leadId,
      dealId: p.dealId,
    });

    if (created > 0) {
      await this.prisma.proposal.update({
        where: { id: p.id },
        data: { lastRevisitNotifiedAt: now },
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
