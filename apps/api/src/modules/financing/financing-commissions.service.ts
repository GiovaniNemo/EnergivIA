import { Injectable, Logger } from "@nestjs/common";
import type {
  CommissionBase,
  CommissionCalculationType,
  CommissionStatus,
  FinancingApplication,
  FinancingCommissionRule,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "../../prisma/prisma.service";

interface CommissionCalculation {
  rule: FinancingCommissionRule | null;
  calculationType: CommissionCalculationType;
  appliedValue: number;
  baseAmount: CommissionBase;
  baseAmountBrl: number;
  grossCommissionBrl: number;
}

@Injectable()
export class FinancingCommissionsService {
  private readonly logger = new Logger(FinancingCommissionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async ensureCommissionForApprovedApplication(applicationId: string) {
    const existing = await this.prisma.financingCommission.findUnique({
      where: { applicationId },
    });
    if (existing) return existing;

    const application = await this.prisma.financingApplication.findUnique({
      where: { id: applicationId },
      include: {
        selectedOffer: true,
        simulation: { select: { personType: true } },
      },
    });
    if (!application) {
      this.logger.warn(`ensureCommission: application=${applicationId} não encontrada.`);
      return null;
    }

    const calc = await this.calculateCommission(application);
    if (!calc) {
      this.logger.warn(
        `ensureCommission: nenhuma regra de comissão aplicável para application=${applicationId} (provider=${application.providerId}).`
      );
      return null;
    }

    return this.prisma.financingCommission.create({
      data: {
        applicationId,
        providerId: application.providerId,
        tenantId: application.tenantId,
        ruleId: calc.rule?.id ?? null,
        calculationType: calc.calculationType,
        appliedValue: new Decimal(calc.appliedValue),
        baseAmount: calc.baseAmount,
        baseAmountBrl: new Decimal(calc.baseAmountBrl),
        grossCommissionBrl: new Decimal(calc.grossCommissionBrl),
        status: "PENDING" as CommissionStatus,
      },
    });
  }

  async recalculateForApplication(applicationId: string): Promise<{
    before: { grossCommissionBrl: number; baseAmountBrl: number };
    after: { grossCommissionBrl: number; baseAmountBrl: number };
  } | null> {
    const existing = await this.prisma.financingCommission.findUnique({
      where: { applicationId },
    });
    if (!existing) return null;
    if (existing.status === "RECEIVED" || existing.status === "CANCELLED") {
      this.logger.log(
        `recalculate: commission ${existing.id} em estado ${existing.status} — recálculo bloqueado.`
      );
      return null;
    }

    const application = await this.prisma.financingApplication.findUnique({
      where: { id: applicationId },
      include: {
        selectedOffer: true,
        simulation: { select: { personType: true } },
      },
    });
    if (!application) return null;

    const calc = await this.calculateCommission(application);
    if (!calc) return null;

    const before = {
      grossCommissionBrl: Number(existing.grossCommissionBrl),
      baseAmountBrl: Number(existing.baseAmountBrl),
    };
    const after = {
      grossCommissionBrl: calc.grossCommissionBrl,
      baseAmountBrl: calc.baseAmountBrl,
    };

    if (
      Math.abs(before.grossCommissionBrl - after.grossCommissionBrl) < 0.01 &&
      Math.abs(before.baseAmountBrl - after.baseAmountBrl) < 0.01
    ) {
      return null;
    }

    await this.prisma.financingCommission.update({
      where: { applicationId },
      data: {
        ruleId: calc.rule?.id ?? null,
        calculationType: calc.calculationType,
        appliedValue: new Decimal(calc.appliedValue),
        baseAmount: calc.baseAmount,
        baseAmountBrl: new Decimal(calc.baseAmountBrl),
        grossCommissionBrl: new Decimal(calc.grossCommissionBrl),
      },
    });

    this.logger.log(
      `recalculate: commission ${existing.id} ${before.grossCommissionBrl} → ${after.grossCommissionBrl}`
    );
    return { before, after };
  }

  async syncCommissionToApplicationStatus(applicationId: string, status: string) {
    const commission = await this.prisma.financingCommission.findUnique({
      where: { applicationId },
    });
    if (!commission) return;

    let nextStatus: CommissionStatus | null = null;
    let paidAt: Date | null | undefined = undefined;
    if (status === "REJECTED" || status === "COMPLETED") {
      if (status === "REJECTED") nextStatus = "CANCELLED";
    }
    if (status === "CONTRACT_SIGNED") {
      nextStatus = "CONFIRMED";
    }
    if (status === "CREDIT_RELEASED") {
      if (commission.status === "PENDING") nextStatus = "CONFIRMED";
    }

    if (nextStatus && nextStatus !== commission.status) {
      await this.prisma.financingCommission.update({
        where: { applicationId },
        data: {
          status: nextStatus,
          ...(paidAt !== undefined ? { paidAt } : {}),
        },
      });
    }
  }

  async updateCommission(
    id: string,
    dto: {
      status?: CommissionStatus;
      grossCommissionBrl?: number;
      paidAt?: string | null;
      notes?: string;
    }
  ) {
    const data: Record<string, unknown> = {};
    if (dto.status !== undefined) {
      data["status"] = dto.status;
      if (dto.status === "RECEIVED" && dto.paidAt === undefined) {
        data["paidAt"] = new Date();
      }
    }
    if (dto.grossCommissionBrl !== undefined) {
      data["grossCommissionBrl"] = new Decimal(dto.grossCommissionBrl);
    }
    if (dto.paidAt !== undefined) {
      data["paidAt"] = dto.paidAt ? new Date(dto.paidAt) : null;
    }
    if (dto.notes !== undefined) data["notes"] = dto.notes;
    return this.prisma.financingCommission.update({ where: { id }, data });
  }

  async list(params: { status?: CommissionStatus; providerId?: string; tenantId?: string }) {
    return this.prisma.financingCommission.findMany({
      where: {
        ...(params.status ? { status: params.status } : {}),
        ...(params.providerId ? { providerId: params.providerId } : {}),
        ...(params.tenantId ? { tenantId: params.tenantId } : {}),
      },
      include: {
        provider: { select: { id: true, name: true, slug: true } },
        application: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            approvedAt: true,
            simulation: { select: { customerName: true, leadId: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
  }

  async revenueSummary() {
    const all = await this.prisma.financingCommission.findMany({
      select: {
        status: true,
        grossCommissionBrl: true,
        providerId: true,
        tenantId: true,
        provider: { select: { name: true } },
      },
    });

    let pending = 0;
    let confirmed = 0;
    let received = 0;
    let cancelled = 0;
    const byProvider = new Map<
      string,
      {
        providerId: string;
        providerName: string;
        pending: number;
        confirmed: number;
        received: number;
        count: number;
      }
    >();
    const byTenant = new Map<string, { tenantId: string; total: number; count: number }>();

    for (const c of all) {
      const v = Number(c.grossCommissionBrl);
      if (c.status === "PENDING") pending += v;
      else if (c.status === "CONFIRMED") confirmed += v;
      else if (c.status === "RECEIVED") received += v;
      else if (c.status === "CANCELLED") cancelled += v;

      const pRow = byProvider.get(c.providerId) ?? {
        providerId: c.providerId,
        providerName: c.provider.name,
        pending: 0,
        confirmed: 0,
        received: 0,
        count: 0,
      };
      pRow.count++;
      if (c.status === "PENDING") pRow.pending += v;
      if (c.status === "CONFIRMED") pRow.confirmed += v;
      if (c.status === "RECEIVED") pRow.received += v;
      byProvider.set(c.providerId, pRow);

      const tRow = byTenant.get(c.tenantId) ?? { tenantId: c.tenantId, total: 0, count: 0 };
      tRow.count++;
      tRow.total += v;
      byTenant.set(c.tenantId, tRow);
    }

    return {
      total: Math.round((pending + confirmed + received) * 100) / 100,
      pending: Math.round(pending * 100) / 100,
      confirmed: Math.round(confirmed * 100) / 100,
      received: Math.round(received * 100) / 100,
      cancelled: Math.round(cancelled * 100) / 100,
      byProvider: Array.from(byProvider.values()).sort(
        (a, b) => b.pending + b.confirmed + b.received - (a.pending + a.confirmed + a.received)
      ),
      byTenant: Array.from(byTenant.values()).sort((a, b) => b.total - a.total),
    };
  }

  private async calculateCommission(
    application: FinancingApplication & {
      selectedOffer: {
        financedAmount: Decimal;
        totalAmount: Decimal;
        term: number;
        installmentValue: Decimal;
      };
      simulation: { personType: "PF" | "PJ" };
    }
  ): Promise<CommissionCalculation | null> {
    const financedAmount = Number(
      application.approvedAmount ?? application.selectedOffer.financedAmount
    );
    const totalAmount = Number(application.selectedOffer.totalAmount);

    const now = new Date();
    const rule = await this.prisma.financingCommissionRule.findFirst({
      where: {
        providerId: application.providerId,
        active: true,
        OR: [{ personType: null }, { personType: application.simulation.personType }],
        AND: [
          { OR: [{ minAmount: null }, { minAmount: { lte: new Decimal(financedAmount) } }] },
          { OR: [{ maxAmount: null }, { maxAmount: { gte: new Decimal(financedAmount) } }] },
          { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
          { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
        ],
      },
      orderBy: [{ personType: "desc" }, { createdAt: "desc" }],
    });
    if (!rule) return null;

    const appliedValue = Number(rule.value);
    const baseAmountBrl = rule.baseAmount === "TOTAL_AMOUNT" ? totalAmount : financedAmount;
    const grossCommissionBrl =
      rule.calculationType === "PERCENTAGE"
        ? Math.round(baseAmountBrl * appliedValue * 100) / 100
        : Math.round(appliedValue * 100) / 100;

    return {
      rule,
      calculationType: rule.calculationType,
      appliedValue,
      baseAmount: rule.baseAmount,
      baseAmountBrl: Math.round(baseAmountBrl * 100) / 100,
      grossCommissionBrl,
    };
  }
}
