import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

interface ProviderBreakdownRow {
  providerId: string;
  providerName: string;
  simulations: number;
  applications: number;
  approved: number;
  released: number;
  totalFinancedBrl: number;
}

interface SellerBreakdownRow {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  applications: number;
  approved: number;
  totalFinancedBrl: number;
}

export interface FinancingDashboardSummary {
  totalSimulations: number;
  totalApplications: number;
  totalApproved: number;
  totalReleased: number;
  totalFinancedBrl: number;
  approvalRate: number;
  avgApprovalDays: number | null;
  byProvider: ProviderBreakdownRow[];
  bySeller: SellerBreakdownRow[];
  byStatus: Record<string, number>;
}

@Injectable()
export class FinancingDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(tenantId: string): Promise<FinancingDashboardSummary> {
    const [simulations, applications] = await Promise.all([
      this.prisma.financingSimulation.count({ where: { tenantId } }),
      this.prisma.financingApplication.findMany({
        where: { tenantId },
        select: {
          id: true,
          providerId: true,
          status: true,
          assignedUserId: true,
          approvedAmount: true,
          approvedAt: true,
          createdAt: true,
          selectedOffer: { select: { financedAmount: true } },
          provider: { select: { name: true } },
        },
      }),
    ]);

    const APPROVED_STATUSES = new Set<string>([
      "APPROVED",
      "CONTRACT_SIGNED",
      "CREDIT_RELEASED",
      "COMPLETED",
    ]);
    const RELEASED_STATUSES = new Set<string>(["CREDIT_RELEASED", "COMPLETED"]);

    let totalApproved = 0;
    let totalReleased = 0;
    let totalFinancedBrl = 0;
    let approvalDurationsMs = 0;
    let approvalDurationsCount = 0;
    const byProvider = new Map<string, ProviderBreakdownRow>();
    const bySeller = new Map<string, SellerBreakdownRow>();
    const byStatus: Record<string, number> = {};

    for (const app of applications) {
      byStatus[app.status] = (byStatus[app.status] ?? 0) + 1;
      const isApproved = APPROVED_STATUSES.has(app.status);
      const isReleased = RELEASED_STATUSES.has(app.status);
      if (isApproved) totalApproved++;
      if (isReleased) totalReleased++;

      const financed = isApproved
        ? Number(app.approvedAmount ?? app.selectedOffer.financedAmount)
        : 0;
      totalFinancedBrl += financed;

      if (isApproved && app.approvedAt) {
        approvalDurationsMs +=
          new Date(app.approvedAt).getTime() - new Date(app.createdAt).getTime();
        approvalDurationsCount++;
      }

      const provRow = byProvider.get(app.providerId) ?? {
        providerId: app.providerId,
        providerName: app.provider.name,
        simulations: 0,
        applications: 0,
        approved: 0,
        released: 0,
        totalFinancedBrl: 0,
      };
      provRow.applications++;
      if (isApproved) provRow.approved++;
      if (isReleased) provRow.released++;
      provRow.totalFinancedBrl += financed;
      byProvider.set(app.providerId, provRow);

      if (app.assignedUserId) {
        const sellerRow = bySeller.get(app.assignedUserId) ?? {
          userId: app.assignedUserId,
          userName: null,
          userEmail: null,
          applications: 0,
          approved: 0,
          totalFinancedBrl: 0,
        };
        sellerRow.applications++;
        if (isApproved) sellerRow.approved++;
        sellerRow.totalFinancedBrl += financed;
        bySeller.set(app.assignedUserId, sellerRow);
      }
    }

    if (bySeller.size > 0) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: Array.from(bySeller.keys()) } },
        select: { id: true, name: true, email: true },
      });
      for (const u of users) {
        const row = bySeller.get(u.id);
        if (row) {
          row.userName = u.name;
          row.userEmail = u.email;
        }
      }
    }

    const offersByProvider = await this.prisma.financingOffer.groupBy({
      by: ["providerId"],
      where: { simulation: { tenantId } },
      _count: { _all: true },
    });
    for (const row of offersByProvider) {
      const existing = byProvider.get(row.providerId);
      if (existing) {
        existing.simulations = row._count._all;
      } else {
        const prov = await this.prisma.financingProvider.findUnique({
          where: { id: row.providerId },
          select: { name: true },
        });
        if (prov) {
          byProvider.set(row.providerId, {
            providerId: row.providerId,
            providerName: prov.name,
            simulations: row._count._all,
            applications: 0,
            approved: 0,
            released: 0,
            totalFinancedBrl: 0,
          });
        }
      }
    }

    const totalApplications = applications.length;
    const approvalRate = totalApplications > 0 ? totalApproved / totalApplications : 0;
    const avgApprovalDays =
      approvalDurationsCount > 0
        ? Math.round((approvalDurationsMs / approvalDurationsCount / (1000 * 60 * 60 * 24)) * 10) /
          10
        : null;

    return {
      totalSimulations: simulations,
      totalApplications,
      totalApproved,
      totalReleased,
      totalFinancedBrl: Math.round(totalFinancedBrl * 100) / 100,
      approvalRate: Math.round(approvalRate * 10000) / 10000,
      avgApprovalDays,
      byProvider: Array.from(byProvider.values()).sort(
        (a, b) => b.totalFinancedBrl - a.totalFinancedBrl
      ),
      bySeller: Array.from(bySeller.values()).sort(
        (a, b) => b.totalFinancedBrl - a.totalFinancedBrl
      ),
      byStatus,
    };
  }
}
