/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger, Optional } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateFeedbackDto } from "./dto/create-feedback.dto";
import type { JwtPayload } from "@energivia/types";
import { getTenantPlanDetails } from "../../common/utils/plan-limits";
import { AdminAlertsService } from "../notifications/admin-alerts.service";

@Injectable()
export class FeedbacksService {
  private readonly logger = new Logger(FeedbacksService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly adminAlerts?: AdminAlertsService
  ) {}

  async create(dto: CreateFeedbackDto, user?: JwtPayload, tenantIdFromHeader?: string) {
    let resolvedTenantId =
      (tenantIdFromHeader || user?.tenantId || dto.tenantId || "").trim() || null;
    let resolvedUserId: string | null = null;
    let resolvedUserName = dto.userName || (user as any)?.name || null;
    let resolvedUserEmail = dto.userEmail || user?.email || null;
    let resolvedPlanName: string = dto.userPlan || "TRIAL";

    if (user?.sub) {
      const dbUser = await this.prisma.user.findFirst({
        where: {
          OR: [{ auth0Sub: user.sub }, { id: user.sub }, { email: user.email }],
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
        if (!resolvedTenantId && dbUser.tenantId) {
          resolvedTenantId = dbUser.tenantId;
        }

        if (dbUser.tenant) {
          const planDetails = getTenantPlanDetails(dbUser.tenant);
          resolvedPlanName = planDetails.isTrial ? "TRIAL" : planDetails.planName;
        }
      }
    } else if (resolvedTenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: resolvedTenantId },
        include: {
          subscription: {
            include: { plan: true },
          },
        },
      });
      if (tenant) {
        const planDetails = getTenantPlanDetails(tenant);
        resolvedPlanName = planDetails.isTrial ? "TRIAL" : planDetails.planName;
      } else {
        resolvedTenantId = null;
      }
    }

    if (resolvedUserId) {
      const userExists = await this.prisma.user.findUnique({
        where: { id: resolvedUserId },
        select: { id: true },
      });
      if (!userExists) {
        resolvedUserId = null;
      }
    }

    let feedback;
    try {
      feedback = await this.prisma.platformFeedback.create({
        data: {
          tenantId: resolvedTenantId,
          userId: resolvedUserId,
          userName: resolvedUserName,
          userEmail: resolvedUserEmail,
          phone: dto.phone || null,
          rating: Math.max(1, Math.min(5, Math.round(dto.rating))),
          comment: dto.comment?.trim() || null,
          tags: (dto.tags as any) || undefined,
          channel: (dto.channel || "web").toLowerCase(),
          userPlan: resolvedPlanName,
          metadata: (dto.metadata as any) || undefined,
        },
      });
    } catch (createErr) {
      this.logger.warn(`Erro ao criar feedback com relações (tentando sem FK): ${createErr}`);
      feedback = await this.prisma.platformFeedback.create({
        data: {
          tenantId: null,
          userId: null,
          userName: resolvedUserName,
          userEmail: resolvedUserEmail,
          phone: dto.phone || null,
          rating: Math.max(1, Math.min(5, Math.round(dto.rating))),
          comment: dto.comment?.trim() || null,
          tags: (dto.tags as any) || undefined,
          channel: (dto.channel || "web").toLowerCase(),
          userPlan: resolvedPlanName,
          metadata: (dto.metadata as any) || undefined,
        },
      });
    }

    this.logger.log(
      `Novo feedback registrado! Nota: ${feedback.rating}/5 | Canal: ${feedback.channel} | Usuário: ${feedback.userName || "Anônimo"}`
    );

    if (this.adminAlerts) {
      const protocol = `FB-${feedback.id.slice(-6).toUpperCase()}`;
      const isNegative = typeof feedback.rating === "number" && feedback.rating <= 3;
      this.adminAlerts
        .notifySupportTicket({
          protocol,
          category: isNegative ? "dificuldade" : "melhoria",
          severity: typeof feedback.rating === "number" && feedback.rating <= 2 ? "alta" : "media",
          subject: `Feedback na Plataforma (${feedback.rating || 5}/5 estrelas)`,
          message:
            feedback.comment || `Avaliação registrada com nota ${feedback.rating}/5 estrelas.`,
          name: feedback.userName || "Usuário",
          email: feedback.userEmail || "",
          phone: feedback.phone || undefined,
          userPlan: feedback.userPlan || "TRIAL",
        })
        .catch((err) => {
          this.logger.warn(`Erro não bloqueante ao enviar alerta de feedback: ${err}`);
        });
    }

    return feedback;
  }

  async getMetricsSummary() {
    const totalFeedbacks = await this.prisma.platformFeedback.count();

    if (totalFeedbacks === 0) {
      return {
        totalFeedbacks: 0,
        averageRating: 5.0,
        satisfactionRate: 100,
        starDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        channelDistribution: { web: 0, whatsapp: 0 },
        planDistribution: { trial: 0, paid: 0 },
        recentFeedbacks: [],
      };
    }

    const [feedbacks, avgAgg] = await Promise.all([
      this.prisma.platformFeedback.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          tenant: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.platformFeedback.aggregate({
        _avg: { rating: true },
        _count: { id: true },
      }),
    ]);

    const starDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const channelDistribution = { web: 0, whatsapp: 0 };
    const planDistribution = { trial: 0, paid: 0 };
    let satisfiedCount = 0;

    feedbacks.forEach((f) => {
      const r = Math.round(f.rating);
      if (r >= 1 && r <= 5) {
        starDistribution[r] = (starDistribution[r] || 0) + 1;
      }
      if (r >= 4) satisfiedCount++;

      if (f.channel === "whatsapp") {
        channelDistribution.whatsapp++;
      } else {
        channelDistribution.web++;
      }

      if (f.userPlan?.toUpperCase() === "TRIAL") {
        planDistribution.trial++;
      } else {
        planDistribution.paid++;
      }
    });

    const averageRating = Number((avgAgg._avg.rating || 5.0).toFixed(1));
    const satisfactionRate = Math.round((satisfiedCount / feedbacks.length) * 100);

    return {
      totalFeedbacks,
      averageRating,
      satisfactionRate,
      starDistribution,
      channelDistribution,
      planDistribution,
      recentFeedbacks: feedbacks.map((f) => ({
        id: f.id,
        rating: f.rating,
        comment: f.comment,
        tags: f.tags,
        channel: f.channel,
        userName: f.userName || f.tenant?.name || "Integrador",
        userEmail: f.userEmail,
        phone: f.phone,
        companyName: f.tenant?.name,
        userPlan: f.userPlan || "TRIAL",
        createdAt: f.createdAt.toISOString(),
      })),
    };
  }

  async getUserFeedbackStatus(user?: JwtPayload, tenantId?: string) {
    if (!user && !tenantId) {
      return { hasSubmitted: false };
    }

    const conditions: Array<Record<string, any>> = [];

    if (user?.sub) {
      conditions.push({ userId: user.sub });
      try {
        const dbUser = await this.prisma.user.findFirst({
          where: {
            OR: [{ auth0Sub: user.sub }, { id: user.sub }, { email: user.email }],
            deletedAt: null,
          },
          select: { id: true, email: true, tenantId: true },
        });

        if (dbUser) {
          conditions.push({ userId: dbUser.id });
          if (dbUser.email) conditions.push({ userEmail: dbUser.email });
          if (dbUser.tenantId) conditions.push({ tenantId: dbUser.tenantId });
        }
      } catch (err) {
        this.logger.warn(`Erro ao consultar usuário para status de feedback: ${err}`);
      }
    }

    if (user?.email) {
      conditions.push({ userEmail: user.email });
    }

    if (tenantId) {
      conditions.push({ tenantId });
    }

    if (conditions.length === 0) {
      return { hasSubmitted: false };
    }

    const count = await this.prisma.platformFeedback.count({
      where: {
        OR: conditions,
      },
    });

    return { hasSubmitted: count > 0 };
  }
}
