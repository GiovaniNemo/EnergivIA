import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import type { CreateSalesActivityNoteDto, ListTenantsQueryDto } from "./dto/sales-rep.dto";

const DEFAULT_PLATFORM_ADMIN_EMAILS = [
  "sgiovanimendes@gmail.com",
  "contato@energivia.com.br",
  "admin@energivia.com.br",
];

export function isPlatformSuperAdmin(user?: { role?: string; email?: string }): boolean {
  if (!user) return false;
  if (user.role === "PLATFORM") return true;
  const envEmails = (process.env["PLATFORM_ADMIN_EMAILS"] ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const allowed = envEmails.length > 0 ? envEmails : DEFAULT_PLATFORM_ADMIN_EMAILS;
  return Boolean(user.email && allowed.includes(user.email.toLowerCase().trim()));
}

@Injectable()
export class SalesRepService {
  constructor(private readonly prisma: PrismaService) {}

  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async getReferralLink(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, name: true, referralCode: true },
    });

    if (!user) {
      throw new NotFoundException("Usuário vendedor não encontrado.");
    }

    let code = user.referralCode;
    if (!code) {
      const baseSlug = this.slugify(user.name || "vendedor") || "rep";
      code = `${baseSlug}-${user.id.slice(-4).toLowerCase()}`;
      await this.prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
      });
    }

    const appUrl = (process.env["APP_URL"] || "https://app.energivia.com.br").replace(/\/+$/, "");
    return {
      referralCode: code,
      referralLink: `${appUrl}/cadastro?ref=${code}`,
    };
  }

  async getDashboardSummary(userId: string, isSuperAdmin: boolean) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, name: true, referralCode: true, commissionRate: true },
    });

    const referral = await this.getReferralLink(userId);

    const whereClause: Prisma.TenantWhereInput = { deletedAt: null };
    if (!isSuperAdmin) {
      whereClause.salesRepId = userId;
    }

    const tenants = await this.prisma.tenant.findMany({
      where: whereClause,
      include: {
        subscription: {
          select: { status: true },
        },
        _count: {
          select: { proposals: true },
        },
      },
    });

    const totalTenants = tenants.length;
    let activeTenants = 0;
    let totalProposals = 0;

    for (const t of tenants) {
      const hasActiveSub = t.subscription?.status === "active";
      const hasPaidPlan = Boolean(t.subscriptionPlan && t.subscriptionPlan !== "TRIAL");
      if (hasActiveSub || hasPaidPlan) {
        activeTenants++;
      }
      totalProposals += t._count?.proposals || 0;
    }

    const trialTenants = totalTenants - activeTenants;
    const rate = Number(user?.commissionRate ?? 0.1);
    // Projeção baseada em ticket médio do plano Plus (R$ 197) * taxa de comissão
    const estimatedCommission = activeTenants * 197 * rate;

    return {
      totalTenants,
      trialTenants,
      activeTenants,
      totalProposals,
      commissionRate: rate,
      estimatedCommission,
      referralCode: referral.referralCode,
      referralLink: referral.referralLink,
    };
  }

  async listTenants(userId: string, isSuperAdmin: boolean, query: ListTenantsQueryDto) {
    const whereClause: Prisma.TenantWhereInput = { deletedAt: null };
    if (!isSuperAdmin) {
      whereClause.salesRepId = userId;
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      whereClause.OR = [
        { name: { contains: s, mode: "insensitive" } },
        { slug: { contains: s, mode: "insensitive" } },
        { creator: { name: { contains: s, mode: "insensitive" } } },
        { creator: { email: { contains: s, mode: "insensitive" } } },
      ];
    }

    const tenants = await this.prisma.tenant.findMany({
      where: whereClause,
      include: {
        whatsappInboundPhones: {
          select: { id: true },
        },
        _count: {
          select: { proposals: true, energyBills: true },
        },
        creator: {
          select: { id: true, name: true, email: true, phone: true },
        },
        subscription: {
          select: { status: true },
        },
        salesNotes: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, content: true, stage: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const now = Date.now();
    const formatted = tenants.map((t) => {
      const createdAtMs = new Date(t.createdAt).getTime();
      const elapsedDays = (now - createdAtMs) / (1000 * 60 * 60 * 24);
      const trialDaysLeft = Math.max(0, Math.ceil(7 - elapsedDays));
      const hasActiveSub = t.subscription?.status === "active";
      const hasPaidPlan = Boolean(t.subscriptionPlan && t.subscriptionPlan !== "TRIAL");
      const isTrial = !hasActiveSub && !hasPaidPlan;

      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        createdAt: t.createdAt,
        subscriptionPlan: t.subscriptionPlan || "TRIAL",
        salesRepId: t.salesRepId,
        referralCode: t.referralCode,
        isTrial,
        trialDaysLeft,
        hasActiveSubscription: hasActiveSub,
        proposalsCount: t._count.proposals,
        billsCount: t._count.energyBills,
        hasWhatsappConnected: (t.whatsappInboundPhones?.length ?? 0) > 0,
        primaryContact: t.creator
          ? {
              name: t.creator.name,
              email: t.creator.email,
              phone: t.creator.phone ?? null,
            }
          : null,
        lastNote: t.salesNotes?.[0] || null,
      };
    });

    if (query.filter === "trial") {
      return formatted.filter((t) => t.isTrial);
    }
    if (query.filter === "active") {
      return formatted.filter((t) => !t.isTrial);
    }
    if (query.filter === "churn_risk") {
      return formatted.filter((t) => t.isTrial && (t.trialDaysLeft <= 2 || t.proposalsCount === 0));
    }

    return formatted;
  }

  async addNote(
    userId: string,
    tenantId: string,
    isSuperAdmin: boolean,
    dto: CreateSalesActivityNoteDto
  ) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { id: true, salesRepId: true },
    });

    if (!tenant) {
      throw new NotFoundException("Empresa integradora não encontrada.");
    }

    if (!isSuperAdmin && tenant.salesRepId !== userId) {
      throw new ForbiddenException("Esta empresa não está atribuída à sua carteira de vendedor.");
    }

    return this.prisma.salesActivityNote.create({
      data: {
        tenantId,
        salesRepId: userId,
        content: dto.content,
        stage: dto.stage || "TRIAL_ONBOARDING",
      },
    });
  }

  async listNotes(userId: string, tenantId: string, isSuperAdmin: boolean) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      select: { id: true, salesRepId: true },
    });

    if (!tenant) {
      throw new NotFoundException("Empresa integradora não encontrada.");
    }

    if (!isSuperAdmin && tenant.salesRepId !== userId) {
      throw new ForbiddenException("Esta empresa não está atribuída à sua carteira de vendedor.");
    }

    return this.prisma.salesActivityNote.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      include: {
        salesRep: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }
}
