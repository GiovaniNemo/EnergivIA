import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

interface SlaRule {
  status: "AWAITING_DOCUMENTS" | "SUBMITTED_TO_BANK" | "UNDER_REVIEW" | "PENDING";
  thresholdDays: number;
  title: string;
  message: (customerName: string, providerName: string, days: number) => string;
}

const RULES: SlaRule[] = [
  {
    status: "AWAITING_DOCUMENTS",
    thresholdDays: 2,
    title: "Cliente atrasado nos documentos",
    message: (c, _p, d) => `${c} está há ${d} dia(s) sem enviar os documentos. Cobre por WhatsApp.`,
  },
  {
    status: "SUBMITTED_TO_BANK",
    thresholdDays: 5,
    title: "Banco sem resposta",
    message: (c, p, d) =>
      `${c}: ${p} sem retorno há ${d} dia(s) desde o envio. Considere cobrar a equipe do banco.`,
  },
  {
    status: "UNDER_REVIEW",
    thresholdDays: 7,
    title: "Análise prolongada",
    message: (c, p, d) =>
      `${c}: ${p} em análise há ${d} dia(s). Cliente pode estar desistindo — sinaliza pra equipe.`,
  },
  {
    status: "PENDING",
    thresholdDays: 3,
    title: "Pendência aberta há vários dias",
    message: (c, p, d) => `${c}: pendência aberta no ${p} há ${d} dia(s). Verifique o que falta.`,
  },
];

@Injectable()
export class FinancingSlaService {
  private readonly logger = new Logger(FinancingSlaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService
  ) {}

  async runScan(): Promise<{
    scanned: number;
    alerted: Record<string, number>;
  }> {
    const now = Date.now();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    let scanned = 0;
    const alerted: Record<string, number> = {};

    for (const rule of RULES) {
      const thresholdMs = rule.thresholdDays * 24 * 60 * 60 * 1000;
      const cutoff = new Date(now - thresholdMs);
      const apps = await this.prisma.financingApplication.findMany({
        where: {
          status: rule.status,
          updatedAt: { lt: cutoff },
        },
        include: {
          provider: { select: { name: true } },
          simulation: { select: { customerName: true, leadId: true, dealId: true } },
        },
      });
      scanned += apps.length;

      for (const app of apps) {
        const recent = await this.prisma.userNotification.findFirst({
          where: {
            tenantId: app.tenantId,
            type: "LEAD_NEEDS_ATTENTION",
            leadId: app.simulation.leadId,
            createdAt: { gte: oneDayAgo },
          },
          select: { id: true },
        });
        if (recent) continue;

        const daysOpen = Math.floor((now - app.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
        const recipients = app.assignedUserId
          ? [app.assignedUserId]
          : await this.notifications.listCommercialRecipientUserIds(app.tenantId);

        for (const userId of recipients) {
          await this.prisma.userNotification.create({
            data: {
              tenantId: app.tenantId,
              userId,
              type: "LEAD_NEEDS_ATTENTION",
              title: rule.title,
              message: rule.message(app.simulation.customerName, app.provider.name, daysOpen),
              linkPath: `/financiamento/aplicacoes/${app.id}`,
              proposalId: null,
              leadId: app.simulation.leadId,
              dealId: app.simulation.dealId,
            },
          });
        }
        alerted[rule.status] = (alerted[rule.status] ?? 0) + 1;
      }
    }

    this.logger.log(
      `SLA scan: ${scanned} app(s) verificada(s), alertas: ${JSON.stringify(alerted)}`
    );
    return { scanned, alerted };
  }
}
