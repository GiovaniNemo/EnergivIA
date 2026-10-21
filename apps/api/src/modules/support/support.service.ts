/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { EmailService } from "../../common/email/email.service";
import { CreateSupportTicketDto } from "./dto/create-support-ticket.dto";
import type { JwtPayload } from "@energivia/types";
import { getTenantPlanDetails } from "../../common/utils/plan-limits";
import { buildSupportTicketTeamTemplate } from "./templates/support-ticket-team.template";
import { buildSupportTicketClientTemplate } from "./templates/support-ticket-client.template";

import { AdminAlertsService } from "../notifications/admin-alerts.service";
import { Optional } from "@nestjs/common";

export interface SupportTicketResponse {
  success: boolean;
  protocol: string;
  message: string;
  createdAt: string;
}

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);
  private static readonly SUPPORT_INBOX = "contato@energivia.com.br";

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    @Optional()
    private readonly adminAlerts?: AdminAlertsService
  ) {}

  generateProtocol(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `TKT-${timestamp}-${randomSuffix}`;
  }

  async createTicket(
    dto: CreateSupportTicketDto,
    user?: JwtPayload,
    tenantIdFromHeader?: string
  ): Promise<SupportTicketResponse> {
    const protocol = this.generateProtocol();
    const createdAt = new Date();

    let resolvedTenantId =
      (tenantIdFromHeader || user?.tenantId || dto.tenantId || "").trim() || null;
    let resolvedUserId: string | null = null;
    let resolvedUserName = dto.name || (user as any)?.name || null;
    let resolvedUserEmail = dto.email || user?.email || null;
    let resolvedCompanyName = dto.companyName || null;
    let resolvedPlanName: string = dto.userPlan || "TRIAL";
    let resolvedPhone = dto.phone || null;

    // Se o usuário estiver autenticado, tenta enriquecer dados via banco
    if (user?.sub || resolvedUserEmail) {
      try {
        const dbUser = await this.prisma.user.findFirst({
          where: {
            OR: [
              ...(user?.sub ? [{ auth0Sub: user.sub }, { id: user.sub }] : []),
              ...(resolvedUserEmail ? [{ email: resolvedUserEmail }] : []),
            ],
            deletedAt: null,
          },
          include: {
            tenant: {
              include: {
                subscription: {
                  include: { plan: true },
                },
              },
            },
          },
        });

        if (dbUser) {
          resolvedUserId = dbUser.id;
          resolvedUserName = resolvedUserName || dbUser.name;
          resolvedUserEmail = resolvedUserEmail || dbUser.email;
          resolvedPhone = resolvedPhone || (dbUser as any).phone || null;

          if (!resolvedTenantId && dbUser.tenantId) {
            resolvedTenantId = dbUser.tenantId;
          }

          if (dbUser.tenant) {
            resolvedCompanyName = resolvedCompanyName || dbUser.tenant.name;
            const planDetails = getTenantPlanDetails(dbUser.tenant);
            resolvedPlanName = planDetails.isTrial ? "TRIAL" : planDetails.planName;
          }
        }
      } catch (err) {
        this.logger.warn(`Erro não impeditivo ao buscar usuário no banco: ${err}`);
      }
    }

    // Persistência segura em PlatformFeedback para rastreabilidade permanente
    try {
      await this.prisma.platformFeedback.create({
        data: {
          tenantId: resolvedTenantId,
          userId: resolvedUserId,
          userName: resolvedUserName,
          userEmail: resolvedUserEmail,
          phone: resolvedPhone,
          rating: 5,
          comment: `[${dto.category.toUpperCase()}] ${dto.subject}\n\n${dto.message}`,
          tags: [
            `protocol:${protocol}`,
            `category:${dto.category}`,
            `severity:${dto.severity || "media"}`,
          ],
          channel: "support_ticket",
          userPlan: resolvedPlanName,
          metadata: {
            protocol,
            category: dto.category,
            severity: dto.severity || "media",
            subject: dto.subject,
            companyName: resolvedCompanyName,
            attachmentsCount: dto.attachments?.length || 0,
            ...(dto.metadata || {}),
          },
        },
      });
      this.logger.log(`Ticket #${protocol} registrado na base de feedbacks.`);
    } catch (saveErr) {
      this.logger.warn(`Aviso: falha ao salvar ticket na base local: ${saveErr}`);
    }

    // 1. Preparar e enviar e-mail para a equipe (contato@energivia.com.br)
    const teamEmail = buildSupportTicketTeamTemplate({
      protocol,
      category: dto.category,
      severity: dto.severity,
      subject: dto.subject,
      message: dto.message,
      name: resolvedUserName || dto.name,
      email: resolvedUserEmail || dto.email,
      phone: resolvedPhone || undefined,
      companyName: resolvedCompanyName || undefined,
      userPlan: resolvedPlanName,
      attachments: dto.attachments,
      metadata: dto.metadata,
      createdAt,
    });

    try {
      await this.emailService.sendEmail({
        to: SupportService.SUPPORT_INBOX,
        subject: teamEmail.subject,
        text: teamEmail.text,
        html: teamEmail.html,
      });
      this.logger.log(
        `E-mail de suporte #${protocol} enviado com sucesso para ${SupportService.SUPPORT_INBOX}`
      );
    } catch (teamMailErr) {
      this.logger.error(
        `Erro ao enviar e-mail de suporte para a equipe: ${teamMailErr instanceof Error ? teamMailErr.message : String(teamMailErr)}`
      );
    }

    // 2. Preparar e enviar confirmação automática para o cliente
    const clientTargetEmail = resolvedUserEmail || dto.email;
    if (clientTargetEmail) {
      const clientEmail = buildSupportTicketClientTemplate({
        protocol,
        category: dto.category,
        severity: dto.severity,
        subject: dto.subject,
        message: dto.message,
        name: resolvedUserName || dto.name,
        userPlan: resolvedPlanName,
        createdAt,
      });

      try {
        await this.emailService.sendEmail({
          to: clientTargetEmail,
          subject: clientEmail.subject,
          text: clientEmail.text,
          html: clientEmail.html,
        });
        this.logger.log(`Confirmação do chamado #${protocol} enviada para ${clientTargetEmail}`);
      } catch (clientMailErr) {
        this.logger.warn(
          `Erro ao enviar confirmação de e-mail ao cliente: ${clientMailErr instanceof Error ? clientMailErr.message : String(clientMailErr)}`
        );
      }
    }

    // 3. Notificação instantânea para o grupo executivo no WhatsApp (se configurado)
    if (this.adminAlerts) {
      this.adminAlerts
        .notifySupportTicket({
          protocol,
          category: dto.category,
          severity: dto.severity,
          subject: dto.subject,
          message: dto.message,
          name: resolvedUserName || dto.name,
          email: resolvedUserEmail || dto.email,
          phone: resolvedPhone || undefined,
          companyName: resolvedCompanyName || undefined,
          userPlan: resolvedPlanName,
        })
        .catch((err) => {
          this.logger.warn(`Erro ao enviar alerta de suporte para o grupo WhatsApp: ${err}`);
        });
    }

    return {
      success: true,
      protocol,
      message: "Sua solicitação foi registrada e nossa equipe já foi notificada.",
      createdAt: createdAt.toISOString(),
    };
  }
}
