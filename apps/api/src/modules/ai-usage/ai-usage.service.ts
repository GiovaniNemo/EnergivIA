import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AiFeature, Prisma } from "@prisma/client";

export interface ModelPricing {
  promptUsdPer1M: number;
  completionUsdPer1M: number;
}

export const DEFAULT_USD_TO_BRL = 5.75;

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "gpt-4o": { promptUsdPer1M: 2.5, completionUsdPer1M: 10.0 },
  "gpt-4o-2024-08-06": { promptUsdPer1M: 2.5, completionUsdPer1M: 10.0 },
  "gpt-4o-mini": { promptUsdPer1M: 0.15, completionUsdPer1M: 0.6 },
  "gpt-4o-mini-2024-07-18": { promptUsdPer1M: 0.15, completionUsdPer1M: 0.6 },
  "gpt-4-turbo": { promptUsdPer1M: 10.0, completionUsdPer1M: 30.0 },
  "gpt-3.5-turbo": { promptUsdPer1M: 0.5, completionUsdPer1M: 1.5 },
  "gemini-1.5-flash": { promptUsdPer1M: 0.075, completionUsdPer1M: 0.3 },
  "gemini-1.5-pro": { promptUsdPer1M: 1.25, completionUsdPer1M: 5.0 },
  "gemini-2.0-flash": { promptUsdPer1M: 0.1, completionUsdPer1M: 0.4 },
  "claude-3-5-sonnet": { promptUsdPer1M: 3.0, completionUsdPer1M: 15.0 },
  "claude-3-5-haiku": { promptUsdPer1M: 0.8, completionUsdPer1M: 4.0 },
};

export interface LogAiUsageParams {
  organizationId?: string | null;
  userId?: string | null;
  feature: AiFeature;
  provider?: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  status?: "SUCCESS" | "ERROR";
  errorMessage?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula o custo estimado em USD e BRL com base no modelo e quantidade de tokens.
   */
  public calculateCost(
    model: string,
    promptTokens = 0,
    completionTokens = 0,
    usdBrlRate = DEFAULT_USD_TO_BRL
  ): { costUsd: number; costBrl: number } {
    const norm = (model || "").toLowerCase().trim();
    // Default fallback rate se o modelo não estiver explicitamente mapeado
    const pricing = MODEL_PRICING[norm] || {
      promptUsdPer1M: 0.5,
      completionUsdPer1M: 1.5,
    };

    const promptCost = (promptTokens / 1_000_000) * pricing.promptUsdPer1M;
    const completionCost = (completionTokens / 1_000_000) * pricing.completionUsdPer1M;
    const costUsd = Number((promptCost + completionCost).toFixed(8));
    const costBrl = Number((costUsd * usdBrlRate).toFixed(8));

    return { costUsd, costBrl };
  }

  /**
   * Grava o log de uso de IA de forma não-bloqueante para o fluxo principal.
   */
  async logUsage(params: LogAiUsageParams): Promise<void> {
    try {
      const promptTokens = params.promptTokens || 0;
      const completionTokens = params.completionTokens || 0;
      const totalTokens = params.totalTokens || promptTokens + completionTokens;

      const { costUsd, costBrl } = this.calculateCost(params.model, promptTokens, completionTokens);

      // Validação de organizationId existente para não falhar por FK se não existir
      let validOrgId: string | null = null;
      if (params.organizationId) {
        const orgExists = await this.prisma.tenant.findUnique({
          where: { id: params.organizationId },
          select: { id: true },
        });
        if (orgExists) {
          validOrgId = orgExists.id;
        }
      }

      await this.prisma.aiUsageLog.create({
        data: {
          organizationId: validOrgId,
          userId: params.userId || null,
          feature: params.feature,
          provider: params.provider || "openai",
          model: params.model,
          promptTokens,
          completionTokens,
          totalTokens,
          costUsd: new Prisma.Decimal(costUsd),
          costBrl: new Prisma.Decimal(costBrl),
          latencyMs: params.latencyMs || null,
          status: params.status || "SUCCESS",
          errorMessage: params.errorMessage || null,
          resourceId: params.resourceId || null,
          metadata: (params.metadata as Prisma.InputJsonValue) || undefined,
        },
      });
    } catch (err) {
      this.logger.error("Falha ao registrar telemetria de IA:", err);
    }
  }

  /**
   * Visão geral de métricas para o Painel Administrativo
   */
  async getAdminOverview(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalCalls, totalTokensSum, logs, orgs] = await Promise.all([
      this.prisma.aiUsageLog.count({
        where: { createdAt: { gte: startDate } },
      }),
      this.prisma.aiUsageLog.aggregate({
        where: { createdAt: { gte: startDate } },
        _sum: {
          promptTokens: true,
          completionTokens: true,
          totalTokens: true,
          costUsd: true,
          costBrl: true,
        },
        _avg: {
          latencyMs: true,
        },
      }),
      this.prisma.aiUsageLog.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          feature: true,
          model: true,
          costBrl: true,
          costUsd: true,
          totalTokens: true,
          organizationId: true,
          createdAt: true,
          status: true,
        },
      }),
      this.prisma.tenant.findMany({
        select: { id: true, name: true, slug: true },
      }),
    ]);

    const orgMap = new Map(orgs.map((o) => [o.id, o]));

    // Agrupamento por Feature
    const featureBreakdown: Record<string, { count: number; costBrl: number; tokens: number }> = {};
    // Agrupamento por Modelo
    const modelBreakdown: Record<string, { count: number; costBrl: number; tokens: number }> = {};
    // Agrupamento por Organização
    const orgBreakdown: Record<
      string,
      { organizationId: string; name: string; count: number; costBrl: number; tokens: number }
    > = {};
    // Agrupamento diário
    const dailyMap: Record<
      string,
      { date: string; calls: number; costBrl: number; tokens: number }
    > = {};

    for (const log of logs) {
      const cost = Number(log.costBrl || 0);
      const tokens = log.totalTokens || 0;
      const feat = log.feature as string;
      const mod = log.model as string;
      const dayKey = log.createdAt.toISOString().split("T")[0] || "unknown";

      // Daily
      const existingDaily = dailyMap[dayKey];
      if (!existingDaily) {
        dailyMap[dayKey] = { date: dayKey, calls: 1, costBrl: cost, tokens };
      } else {
        existingDaily.calls += 1;
        existingDaily.costBrl += cost;
        existingDaily.tokens += tokens;
      }

      // Feature
      const existingFeature = featureBreakdown[feat];
      if (!existingFeature) {
        featureBreakdown[feat] = { count: 1, costBrl: cost, tokens };
      } else {
        existingFeature.count += 1;
        existingFeature.costBrl += cost;
        existingFeature.tokens += tokens;
      }

      // Model
      const existingModel = modelBreakdown[mod];
      if (!existingModel) {
        modelBreakdown[mod] = { count: 1, costBrl: cost, tokens };
      } else {
        existingModel.count += 1;
        existingModel.costBrl += cost;
        existingModel.tokens += tokens;
      }

      // Org
      if (log.organizationId) {
        const orgId = log.organizationId;
        const orgInfo = orgMap.get(orgId);
        const orgName = orgInfo?.name || "Organização Excluída";
        const existingOrg = orgBreakdown[orgId];
        if (!existingOrg) {
          orgBreakdown[orgId] = {
            organizationId: orgId,
            name: orgName,
            count: 1,
            costBrl: cost,
            tokens,
          };
        } else {
          existingOrg.count += 1;
          existingOrg.costBrl += cost;
          existingOrg.tokens += tokens;
        }
      }
    }

    const topOrganizations = Object.values(orgBreakdown)
      .sort((a, b) => b.costBrl - a.costBrl)
      .slice(0, 10);

    const dailyTimeline = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    const totalCostUsd = Number(totalTokensSum._sum.costUsd || 0);
    const totalCostBrl = Number(totalTokensSum._sum.costBrl || 0);
    const avgLatencyMs = Math.round(totalTokensSum._avg.latencyMs || 0);

    return {
      periodDays: days,
      summary: {
        totalCalls,
        totalTokens: totalTokensSum._sum.totalTokens || 0,
        promptTokens: totalTokensSum._sum.promptTokens || 0,
        completionTokens: totalTokensSum._sum.completionTokens || 0,
        totalCostUsd,
        totalCostBrl,
        avgLatencyMs,
        avgCostPerCallBrl: totalCalls > 0 ? totalCostBrl / totalCalls : 0,
      },
      featureBreakdown,
      modelBreakdown,
      topOrganizations,
      dailyTimeline,
    };
  }

  /**
   * Visão de consumo para um Tenant / Organização específica
   */
  async getTenantOverview(organizationId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [summary, logs] = await Promise.all([
      this.prisma.aiUsageLog.aggregate({
        where: {
          organizationId,
          createdAt: { gte: startDate },
        },
        _count: { _all: true },
        _sum: {
          totalTokens: true,
          costBrl: true,
        },
      }),
      this.prisma.aiUsageLog.findMany({
        where: {
          organizationId,
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          feature: true,
          model: true,
          totalTokens: true,
          costBrl: true,
          latencyMs: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      totalCalls: summary._count._all,
      totalTokens: summary._sum.totalTokens || 0,
      totalCostBrl: Number(summary._sum.costBrl || 0),
      recentLogs: logs,
    };
  }

  /**
   * Listagem paginada de logs para auditoria no admin
   */
  async getLogs(params: {
    page?: number;
    limit?: number;
    organizationId?: string;
    feature?: AiFeature;
    status?: string;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.AiUsageLogWhereInput = {};
    if (params.organizationId) where.organizationId = params.organizationId;
    if (params.feature) where.feature = params.feature;
    if (params.status) where.status = params.status;

    const [total, items] = await Promise.all([
      this.prisma.aiUsageLog.count({ where }),
      this.prisma.aiUsageLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          organization: { select: { id: true, name: true, slug: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
