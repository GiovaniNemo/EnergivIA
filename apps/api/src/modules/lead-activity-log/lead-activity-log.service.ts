import { Injectable } from "@nestjs/common";
import type { LeadActivityKind, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class LeadActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  async append(params: {
    tenantId: string;
    leadId: string;
    kind: LeadActivityKind;
    label: string;
    meta?: Record<string, unknown>;
    occurredAt?: Date;
  }): Promise<{ id: string }> {
    const row = await this.prisma.leadActivityLog.create({
      data: {
        tenantId: params.tenantId,
        leadId: params.leadId,
        kind: params.kind,
        label: params.label,
        meta: params.meta !== undefined ? (params.meta as Prisma.InputJsonValue) : undefined,
        occurredAt: params.occurredAt ?? new Date(),
      },
    });
    return { id: row.id };
  }
}
