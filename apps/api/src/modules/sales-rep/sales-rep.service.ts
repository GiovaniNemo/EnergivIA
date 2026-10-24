import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import type {
  AuthorizeSalesRepDto,
  CreateSalesActivityNoteDto,
  ListTenantsQueryDto,
} from "./dto/sales-rep.dto";

export interface CommissionTiers {
  firstMonth: number; // 20 (%)
  months2To12: number; // 10 (%)
  months13Plus: number; // 5 (%)
}

export const DEFAULT_COMMISSION_TIERS: CommissionTiers = {
  firstMonth: 20,
  months2To12: 10,
  months13Plus: 5,
};

export function calculateTenantInstallment(
  createdAt: Date | string,
  tiers: CommissionTiers = DEFAULT_COMMISSION_TIERS
): {
  installmentNumber: number;
  ratePercentage: number;
} {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = Math.max(0, now.getTime() - created.getTime());
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const installmentNumber = Math.max(1, Math.floor(diffDays / 30.4375) + 1);

  let ratePercentage = tiers.months13Plus;
  if (installmentNumber === 1) {
    ratePercentage = tiers.firstMonth;
  } else if (installmentNumber <= 12) {
    ratePercentage = tiers.months2To12;
  }

  return { installmentNumber, ratePercentage };
}

export interface StoredSalesRepEntry {
  email: string;
  name?: string;
  commissionRate?: number; // fallback legado (ex: 10)
  commissionTiers?: CommissionTiers;
  status: "ACTIVE" | "REVOKED";
  createdAt: string;
  revokedAt?: string | null;
  notes?: string;
}

export interface SalesRepManagementItem extends StoredSalesRepEntry {
  userId?: string | null;
  userName?: string | null;
  referralCode?: string | null;
  referralLink?: string | null;
  isRegistered: boolean;
  tenantsCount: number;
  commissionTiers: CommissionTiers;
}

const SETTING_KEY = "sales_rep_whitelist";

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
  private readonly logger = new Logger(SalesRepService.name);

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

  generateReferralCode(name?: string, idHint?: string): string {
    const baseSlug = this.slugify(name || "vendedor") || "rep";
    const suffix = (idHint || Math.random().toString(36).substring(2, 6)).slice(-4).toLowerCase();
    return `${baseSlug}-${suffix}`;
  }

  private resolveAppUrl(): string {
    const raw =
      process.env["PUBLIC_PROPOSAL_SITE_URL"] ||
      process.env["FRONTEND_URL"] ||
      process.env["WEB_APP_URL"] ||
      process.env["APP_URL"] ||
      process.env["NEXT_PUBLIC_APP_URL"] ||
      "https://www.energivia.com.br";
    return raw.trim().replace(/\/+$/, "").replace("app.energivia.com.br", "www.energivia.com.br");
  }

  async getStoredEntries(): Promise<StoredSalesRepEntry[]> {
    try {
      const row = await this.prisma.systemSetting.findUnique({
        where: { key: SETTING_KEY },
      });
      if (!row || !row.value) return [];
      const parsed = JSON.parse(row.value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      this.logger.error("Erro ao ler lista de vendedores autorizados do banco:", err);
      return [];
    }
  }

  async saveStoredEntries(entries: StoredSalesRepEntry[]): Promise<void> {
    await this.prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      update: { value: JSON.stringify(entries) },
      create: { key: SETTING_KEY, value: JSON.stringify(entries) },
    });
  }

  async isEmailAuthorized(email: string): Promise<boolean> {
    if (!email) return false;
    const cleanEmail = email.trim().toLowerCase();
    const stored = await this.getStoredEntries();
    const match = stored.find((item) => item.email.toLowerCase() === cleanEmail);
    return match ? match.status === "ACTIVE" : false;
  }

  async listAuthorizedReps(): Promise<SalesRepManagementItem[]> {
    const stored = await this.getStoredEntries();
    const map = new Map<string, StoredSalesRepEntry>();
    for (const item of stored) {
      map.set(item.email.trim().toLowerCase(), item);
    }

    // Busca usuários com role PLATFORM_SALES no banco
    try {
      const existingSalesUsers = await this.prisma.user.findMany({
        where: { role: "PLATFORM_SALES", deletedAt: null },
        select: {
          id: true,
          email: true,
          name: true,
          referralCode: true,
          commissionRate: true,
          createdAt: true,
        },
      });

      if (Array.isArray(existingSalesUsers)) {
        for (const u of existingSalesUsers) {
          const clean = u.email.trim().toLowerCase();
          if (!map.has(clean)) {
            map.set(clean, {
              email: clean,
              name: u.name,
              commissionRate: u.commissionRate ? Number(u.commissionRate) * 100 : 10,
              status: "ACTIVE",
              createdAt: u.createdAt.toISOString(),
              notes: "Identificado por role PLATFORM_SALES no banco",
            });
          }
        }
      }
    } catch (err) {
      this.logger.warn("Erro ao buscar usuários PLATFORM_SALES no banco:", err);
    }

    const appUrl = this.resolveAppUrl();
    const results: SalesRepManagementItem[] = [];

    for (const entry of Array.from(map.values())) {
      const cleanEmail = entry.email.trim().toLowerCase();
      let user: {
        id: string;
        name: string;
        email: string;
        referralCode: string | null;
        commissionRate: Prisma.Decimal | null;
      } | null = null;

      try {
        user = await this.prisma.user.findFirst({
          where: { email: { equals: cleanEmail, mode: "insensitive" }, deletedAt: null },
          select: { id: true, name: true, email: true, referralCode: true, commissionRate: true },
        });
      } catch {
        user = await this.prisma.user.findFirst({
          where: { email: cleanEmail, deletedAt: null },
          select: { id: true, name: true, email: true, referralCode: true, commissionRate: true },
        });
      }

      let tenantsCount = 0;
      let referralCode = user?.referralCode || null;
      let referralLink: string | null = null;

      if (user) {
        tenantsCount = await this.prisma.tenant.count({
          where: { salesRepId: user.id, deletedAt: null },
        });
        if (!referralCode) {
          referralCode = this.generateReferralCode(user.name, user.id);
          await this.prisma.user.update({
            where: { id: user.id },
            data: { referralCode },
          });
        }
        referralLink = `${appUrl}/cadastro?ref=${referralCode}`;
      } else {
        const previewCode = this.slugify(entry.name || cleanEmail.split("@")[0] || "rep");
        referralCode = previewCode;
        referralLink = `${appUrl}/cadastro?ref=${previewCode}`;
      }

      const repTiers: CommissionTiers = entry.commissionTiers ?? {
        firstMonth: 20,
        months2To12: user?.commissionRate
          ? Number(user.commissionRate) * 100
          : (entry.commissionRate ?? 10),
        months13Plus: 5,
      };

      results.push({
        ...entry,
        userId: user?.id || null,
        userName: user?.name || entry.name || null,
        referralCode,
        referralLink,
        isRegistered: Boolean(user),
        tenantsCount,
        commissionRate: repTiers.months2To12,
        commissionTiers: repTiers,
      });
    }

    return results.sort((a, b) => a.email.localeCompare(b.email));
  }

  async authorizeSalesRep(dto: AuthorizeSalesRepDto): Promise<SalesRepManagementItem> {
    const cleanEmail = dto.email?.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      throw new BadRequestException("E-mail de vendedor inválido.");
    }

    const firstMonth = dto.commissionFirstMonth ?? 20;
    const months2To12 = dto.commissionMonths2To12 ?? dto.commissionRate ?? 10;
    const months13Plus = dto.commissionMonths13Plus ?? 5;

    const commissionTiers: CommissionTiers = {
      firstMonth: Number(firstMonth) || 20,
      months2To12: Number(months2To12) || 10,
      months13Plus: Number(months13Plus) || 5,
    };

    const stored = await this.getStoredEntries();
    const existingIndex = stored.findIndex((s) => s.email.toLowerCase() === cleanEmail);
    const existing = existingIndex >= 0 ? stored[existingIndex] : undefined;

    const now = new Date().toISOString();
    const updatedEntry: StoredSalesRepEntry = {
      email: cleanEmail,
      name: dto.name?.trim() || existing?.name,
      commissionRate: commissionTiers.months2To12,
      commissionTiers,
      status: "ACTIVE",
      notes: dto.notes?.trim() || existing?.notes || "Liberado via Painel Comercial",
      createdAt: existing?.createdAt || now,
      revokedAt: null,
    };

    if (existingIndex >= 0) {
      stored[existingIndex] = updatedEntry;
    } else {
      stored.push(updatedEntry);
    }

    await this.saveStoredEntries(stored);

    // Se o usuário já existe na base, atualiza para PLATFORM_SALES e gera referralCode
    let user: { id: string; name: string; referralCode: string | null } | null = null;
    try {
      user = await this.prisma.user.findFirst({
        where: { email: { equals: cleanEmail, mode: "insensitive" }, deletedAt: null },
        select: { id: true, name: true, referralCode: true },
      });
    } catch {
      user = await this.prisma.user.findFirst({
        where: { email: cleanEmail, deletedAt: null },
        select: { id: true, name: true, referralCode: true },
      });
    }

    if (user) {
      let code = user.referralCode;
      if (!code) {
        code = this.generateReferralCode(user.name || dto.name, user.id);
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          role: "PLATFORM_SALES",
          referralCode: code,
          commissionRate: commissionTiers.months2To12 / 100,
        },
      });
    }

    const list = await this.listAuthorizedReps();
    const found = list.find((item) => item.email.toLowerCase() === cleanEmail);
    if (found) return found;

    const appUrl = this.resolveAppUrl();
    const previewCode = this.slugify(dto.name || cleanEmail.split("@")[0] || "rep");
    return {
      ...updatedEntry,
      userId: user?.id || null,
      userName: user?.name || dto.name || null,
      referralCode: previewCode,
      referralLink: `${appUrl}/cadastro?ref=${previewCode}`,
      isRegistered: Boolean(user),
      tenantsCount: 0,
      commissionTiers,
    };
  }

  async revokeSalesRep(email: string): Promise<{ success: boolean }> {
    const cleanEmail = email?.trim().toLowerCase();
    if (!cleanEmail) {
      throw new BadRequestException("E-mail não informado.");
    }

    const stored = await this.getStoredEntries();
    const existingIndex = stored.findIndex((s) => s.email.toLowerCase() === cleanEmail);
    const existing = existingIndex >= 0 ? stored[existingIndex] : undefined;

    const now = new Date().toISOString();
    const revokedEntry: StoredSalesRepEntry = {
      email: cleanEmail,
      name: existing?.name,
      commissionRate: existing?.commissionRate ?? 10,
      status: "REVOKED",
      notes: existing?.notes || "Revogado via Painel Comercial",
      createdAt: existing?.createdAt || now,
      revokedAt: now,
    };

    if (existingIndex >= 0) {
      stored[existingIndex] = revokedEntry;
    } else {
      stored.push(revokedEntry);
    }

    await this.saveStoredEntries(stored);

    // Se o usuário existir, altera o cargo para SALES
    try {
      const user = await this.prisma.user.findFirst({
        where: { email: { equals: cleanEmail, mode: "insensitive" }, deletedAt: null },
      });
      if (user && user.role === "PLATFORM_SALES") {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { role: "SALES" },
        });
      }
    } catch {
      // Fallback
    }

    return { success: true };
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
      code = this.generateReferralCode(user.name, user.id);
      await this.prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
      });
    }

    const appUrl = this.resolveAppUrl();
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
    let estimatedCommission = 0;

    const stored = await this.getStoredEntries();
    const repEmail = user?.id
      ? (
          await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
          })
        )?.email
      : undefined;
    const cleanUserEmail = (repEmail || "").toLowerCase().trim();
    const whitelistEntry = stored.find((e) => e.email.toLowerCase() === cleanUserEmail);
    const repTiers: CommissionTiers = whitelistEntry?.commissionTiers ?? DEFAULT_COMMISSION_TIERS;

    for (const t of tenants) {
      const hasActiveSub = t.subscription?.status === "active";
      const hasPaidPlan = Boolean(t.subscriptionPlan && t.subscriptionPlan !== "TRIAL");
      if (hasActiveSub || hasPaidPlan) {
        activeTenants++;
        const { ratePercentage } = calculateTenantInstallment(t.createdAt, repTiers);
        estimatedCommission += 197 * (ratePercentage / 100);
      }
      totalProposals += t._count?.proposals || 0;
    }

    const trialTenants = totalTenants - activeTenants;

    return {
      totalTenants,
      trialTenants,
      activeTenants,
      totalProposals,
      commissionRate: repTiers.months2To12 / 100,
      commissionTiers: repTiers,
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
      const installmentInfo = calculateTenantInstallment(t.createdAt);

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
        currentInstallment: !isTrial
          ? {
              installmentNumber: installmentInfo.installmentNumber,
              commissionPercent: installmentInfo.ratePercentage,
            }
          : null,
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
