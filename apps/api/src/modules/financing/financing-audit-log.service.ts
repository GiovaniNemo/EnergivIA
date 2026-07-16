import { Injectable } from "@nestjs/common";
import type { FinancingAuditEventType, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

export interface AuditContext {
  tenantId: string;
  userId: string | null;
  userRole: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditEventInput {
  eventType: FinancingAuditEventType;
  applicationId?: string | null;
  commissionId?: string | null;
  description: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

@Injectable()
export class FinancingAuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(ctx: AuditContext, event: AuditEventInput): Promise<void> {
    await this.prisma.financingAuditLog.create({
      data: {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        userRole: ctx.userRole,
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent ?? null,
        eventType: event.eventType,
        applicationId: event.applicationId ?? null,
        commissionId: event.commissionId ?? null,
        description: event.description,
        before: event.before as Prisma.InputJsonValue | undefined,
        after: event.after as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async listByApplication(applicationId: string, tenantId: string) {
    return this.prisma.financingAuditLog.findMany({
      where: { applicationId, tenantId },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async listGlobal(params: {
    tenantId?: string;
    applicationId?: string;
    eventType?: FinancingAuditEventType;
    limit?: number;
  }) {
    return this.prisma.financingAuditLog.findMany({
      where: {
        ...(params.tenantId ? { tenantId: params.tenantId } : {}),
        ...(params.applicationId ? { applicationId: params.applicationId } : {}),
        ...(params.eventType ? { eventType: params.eventType } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(params.limit ?? 500, 1000),
    });
  }
}
