import { Injectable, Logger, Inject } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";

export interface StoredSpecialAccessEntry {
  email: string;
  source: "ENV" | "MANUAL";
  status: "ACTIVE" | "REVOKED";
  notes?: string;
  createdAt: string;
  revokedAt?: string | null;
}

export interface SpecialAccessItem extends StoredSpecialAccessEntry {
  userId?: string | null;
  userName?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  whatsappPhone?: string | null;
}

const SETTING_KEY = "special_access_list";

@Injectable()
export class SpecialAccessService {
  private readonly logger = new Logger(SpecialAccessService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private getEnvEmails(): string[] {
    const raw = process.env["COMPLIMENTARY_ACCESS_EMAILS"] || "";
    return raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => Boolean(e) && e.includes("@"));
  }

  private async getStoredEntries(): Promise<StoredSpecialAccessEntry[]> {
    try {
      const row = await this.prisma.systemSetting.findUnique({
        where: { key: SETTING_KEY },
      });
      if (!row || !row.value) return [];
      const parsed = JSON.parse(row.value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      this.logger.error("Erro ao ler lista de acessos especiais do banco:", err);
      return [];
    }
  }

  private async saveStoredEntries(entries: StoredSpecialAccessEntry[]): Promise<void> {
    await this.prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      update: { value: JSON.stringify(entries) },
      create: { key: SETTING_KEY, value: JSON.stringify(entries) },
    });
  }

  /**
   * Verifica se um e-mail possui autorização de Acesso Especial ativa.
   * Regra de ouro: REVOKED no banco tem precedência máxima sobre variáveis de ambiente.
   */
  async isEmailAuthorized(email: string): Promise<boolean> {
    if (!email) return false;
    const cleanEmail = email.trim().toLowerCase();

    const stored = await this.getStoredEntries();
    const storedMatch = stored.find((item) => item.email.toLowerCase() === cleanEmail);

    if (storedMatch) {
      return storedMatch.status === "ACTIVE";
    }

    const envEmails = this.getEnvEmails();
    return envEmails.includes(cleanEmail);
  }

  /**
   * Lista completa para o Painel Administrativo, mesclando banco + env var e enriquecendo com dados reais.
   */
  async listAll(): Promise<SpecialAccessItem[]> {
    const stored = await this.getStoredEntries();
    const envEmails = this.getEnvEmails();

    const emailMap = new Map<string, StoredSpecialAccessEntry>();

    // 1. Inicializa com variáveis de ambiente (padrão ACTIVE, a não ser que haja override)
    for (const envEmail of envEmails) {
      emailMap.set(envEmail, {
        email: envEmail,
        source: "ENV",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        notes: "Configurado via variável COMPLIMENTARY_ACCESS_EMAILS",
      });
    }

    // 2. Sobrescreve com os registros do banco de dados (que têm prioridade)
    for (const item of stored) {
      const key = item.email.trim().toLowerCase();
      emailMap.set(key, item);
    }

    const items = Array.from(emailMap.values());
    const enrichedList: SpecialAccessItem[] = [];

    for (const item of items) {
      const cleanEmail = item.email.toLowerCase();

      // Busca usuário
      let user: {
        id: string;
        name: string;
        tenantId: string | null;
        tenant?: { id: string; name: string } | null;
      } | null = null;
      try {
        user = (await this.prisma.user.findFirst({
          where: { email: { equals: cleanEmail, mode: "insensitive" }, deletedAt: null },
          include: { tenant: true },
        })) as typeof user;
      } catch {
        // Fallback se insensitive mode não suportado em mock
        user = await this.prisma.user.findFirst({
          where: { email: cleanEmail },
          include: { tenant: true },
        });
      }

      const orgs = await this.findOrganizationsForEmail(cleanEmail);
      const primaryOrg =
        orgs[0] || (user?.tenant ? { id: user.tenant.id, name: user.tenant.name } : null);

      let whatsappPhone: string | null = null;
      const targetOrgId = primaryOrg?.id || user?.tenantId;
      if (targetOrgId) {
        try {
          const boundPhone = await this.prisma.tenantWhatsappInboundPhone.findFirst({
            where: { organizationId: targetOrgId },
          });
          if (boundPhone) {
            whatsappPhone = boundPhone.phoneDigits;
          }
        } catch {
          // Fallback se mock não tiver tenantWhatsappInboundPhone
        }
      }

      enrichedList.push({
        ...item,
        userId: user?.id || null,
        userName: user?.name || null,
        organizationId: targetOrgId || null,
        organizationName: primaryOrg?.name || null,
        whatsappPhone,
      });
    }

    return enrichedList.sort((a, b) => a.email.localeCompare(b.email));
  }

  /**
   * Localiza todas as organizações associadas a um e-mail (via User.tenantId, OrganizationMember ou createdTenants).
   */
  async findOrganizationsForEmail(email: string): Promise<Array<{ id: string; name: string }>> {
    const cleanEmail = email.trim().toLowerCase();
    const orgs: Array<{ id: string; name: string }> = [];
    const seenOrgIds = new Set<string>();

    // 1. Busca por usuários com esse e-mail (podem ser múltiplos ou Auth0)
    let users: Array<{
      id: string;
      tenantId: string | null;
      tenant?: { id: string; name: string } | null;
      organizationMemberships?: Array<{ organization?: { id: string; name: string } | null }>;
      createdTenants?: Array<{ id: string; name: string }>;
    }> = [];

    try {
      users = (await this.prisma.user.findMany({
        where: { email: { equals: cleanEmail, mode: "insensitive" }, deletedAt: null },
        include: {
          tenant: true,
          organizationMemberships: {
            where: { organization: { deletedAt: null } },
            include: { organization: true },
          },
          createdTenants: {
            where: { deletedAt: null },
          },
        },
      })) as typeof users;
    } catch {
      try {
        users = (await this.prisma.user.findMany({
          where: { email: cleanEmail },
          include: {
            tenant: true,
            organizationMemberships: {
              include: { organization: true },
            },
            createdTenants: true,
          },
        })) as typeof users;
      } catch {
        // Fallback para mocks onde user.findMany pode não estar configurado
        try {
          const single = await this.prisma.user.findFirst({
            where: { email: cleanEmail },
            include: { tenant: true },
          });
          if (single) users = [single as unknown as (typeof users)[0]];
        } catch {
          users = [];
        }
      }
    }

    if (Array.isArray(users)) {
      for (const u of users) {
        if (u?.tenant && !seenOrgIds.has(u.tenant.id)) {
          orgs.push({ id: u.tenant.id, name: u.tenant.name });
          seenOrgIds.add(u.tenant.id);
        }
        if (Array.isArray(u?.organizationMemberships)) {
          for (const m of u.organizationMemberships) {
            if (m?.organization && !seenOrgIds.has(m.organization.id)) {
              orgs.push({ id: m.organization.id, name: m.organization.name });
              seenOrgIds.add(m.organization.id);
            }
          }
        }
        if (Array.isArray(u?.createdTenants)) {
          for (const t of u.createdTenants) {
            if (t && !seenOrgIds.has(t.id)) {
              orgs.push({ id: t.id, name: t.name });
              seenOrgIds.add(t.id);
            }
          }
        }
      }
    }

    // 2. Busca também em organizationMember por e-mail diretamente (se model existir)
    if (this.prisma.organizationMember?.findMany) {
      try {
        const directMemberships = await this.prisma.organizationMember.findMany({
          where: {
            email: { equals: cleanEmail, mode: "insensitive" },
            organization: { deletedAt: null },
          },
          include: { organization: true },
        });
        if (Array.isArray(directMemberships)) {
          for (const dm of directMemberships) {
            if (dm?.organization && !seenOrgIds.has(dm.organization.id)) {
              orgs.push({ id: dm.organization.id, name: dm.organization.name });
              seenOrgIds.add(dm.organization.id);
            }
          }
        }
      } catch {
        // Fallback se model não estiver mockado
      }
    }

    return orgs;
  }

  /**
   * Concede Acesso Especial diretamente pela interface de Admin (sem precisar mexer no Railway/Vercel).
   */
  async addSpecialAccess(email: string, notes?: string): Promise<SpecialAccessItem> {
    const cleanEmail = email.trim().toLowerCase();
    const stored = await this.getStoredEntries();
    const existingIndex = stored.findIndex((s) => s.email.toLowerCase() === cleanEmail);
    const existing = existingIndex >= 0 ? stored[existingIndex] : undefined;

    const now = new Date().toISOString();
    const newEntry: StoredSpecialAccessEntry = {
      email: cleanEmail,
      source: "MANUAL",
      status: "ACTIVE",
      notes: notes?.trim() || "Concedido via Painel Administrativo",
      createdAt: existing?.createdAt || now,
      revokedAt: null,
    };

    if (existingIndex >= 0) {
      stored[existingIndex] = newEntry;
    } else {
      stored.push(newEntry);
    }

    await this.saveStoredEntries(stored);

    // Se o usuário/tenant já existir no banco, sincroniza os settings da organização
    await this.syncTenantSettings(cleanEmail, true);

    const fullList = await this.listAll();
    const found = fullList.find((item) => item.email === cleanEmail);
    if (found) return found;

    const orgs = await this.findOrganizationsForEmail(cleanEmail);
    return {
      ...newEntry,
      organizationId: orgs[0]?.id || null,
      organizationName: orgs[0]?.name || null,
    };
  }

  /**
   * KILL-SWITCH ÚNICO: Derruba tudo (Web + WhatsApp Bot) de uma única vez.
   */
  async revokeSpecialAccess(email: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    const stored = await this.getStoredEntries();
    const existingIndex = stored.findIndex((s) => s.email.toLowerCase() === cleanEmail);
    const existing = existingIndex >= 0 ? stored[existingIndex] : undefined;

    const now = new Date().toISOString();
    const revokedEntry: StoredSpecialAccessEntry = {
      email: cleanEmail,
      source: existing?.source || "ENV",
      status: "REVOKED",
      notes: existing?.notes || "Revogado via Painel Administrativo",
      createdAt: existing?.createdAt || now,
      revokedAt: now,
    };

    if (existingIndex >= 0) {
      stored[existingIndex] = revokedEntry;
    } else {
      stored.push(revokedEntry);
    }

    await this.saveStoredEntries(stored);

    // 1. Busca todas as organizações vinculadas ao usuário
    const orgs = await this.findOrganizationsForEmail(cleanEmail);
    const targetOrgIds = new Set<string>(orgs.map((o) => o.id));

    let user: { id: string; tenantId: string | null } | null = null;
    try {
      user = await this.prisma.user.findFirst({
        where: { email: cleanEmail },
      });
    } catch {
      // Fallback
    }

    if (user?.tenantId) {
      targetOrgIds.add(user.tenantId);
    }

    for (const tenantId of targetOrgIds) {
      // 2. DERRUBADA DO WHATSAPP: Expurga números da organização da base
      try {
        await this.prisma.tenantWhatsappInboundPhone.deleteMany({
          where: { organizationId: tenantId },
        });
        this.logger.log(`[SpecialAccess] WhatsApp desconectado para organização ${tenantId}`);
      } catch (err) {
        this.logger.error(`[SpecialAccess] Erro ao remover WhatsApp para ${tenantId}:`, err);
      }

      // 3. DERRUBADA DA WEB: Grava status de revogado nos settings da organização
      try {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: tenantId },
        });

        const currentSettings = (tenant?.settings as Record<string, unknown> | null) || {};
        await this.prisma.tenant.update({
          where: { id: tenantId },
          data: {
            settings: {
              ...currentSettings,
              specialAccessActive: false,
              specialAccessRevoked: true,
              specialAccessRevokedAt: now,
            } as Prisma.InputJsonValue,
          },
        });

        this.logger.log(
          `[SpecialAccess] Acesso especial revogado para organização ${tenantId} (${cleanEmail})`
        );
      } catch (err) {
        this.logger.error(`[SpecialAccess] Erro ao atualizar tenant ${tenantId}:`, err);
      }
    }
  }

  /**
   * Restaura o acesso especial previamente revogado.
   */
  async restoreSpecialAccess(email: string): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    const stored = await this.getStoredEntries();
    const existingIndex = stored.findIndex((s) => s.email.toLowerCase() === cleanEmail);
    const existing = existingIndex >= 0 ? stored[existingIndex] : undefined;

    if (existing) {
      existing.status = "ACTIVE";
      existing.revokedAt = null;
      await this.saveStoredEntries(stored);
    }

    await this.syncTenantSettings(cleanEmail, true);
  }

  /**
   * Sincroniza as flags do Tenant quando o usuário faz login, cria organização ou tem o acesso concedido.
   */
  async syncTenantSettings(email: string, isActive: boolean): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    const orgs = await this.findOrganizationsForEmail(cleanEmail);

    // Se temos usuário cujo tenantId é nulo mas encontramos organização, vincula tenantId para curar inconsistência
    try {
      const user = await this.prisma.user.findFirst({
        where: { email: cleanEmail },
      });
      if (user && !user.tenantId && orgs[0]) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { tenantId: orgs[0].id },
        });
      }
    } catch {
      // Ignora se restrição ou mock
    }

    if (orgs.length === 0) {
      try {
        const user = await this.prisma.user.findFirst({
          where: { email: cleanEmail },
        });
        if (user?.tenantId) {
          orgs.push({ id: user.tenantId, name: "Tenant" });
        } else {
          return;
        }
      } catch {
        return;
      }
    }

    for (const org of orgs) {
      try {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: org.id },
        });

        const currentSettings = (tenant?.settings as Record<string, unknown> | null) || {};
        await this.prisma.tenant.update({
          where: { id: org.id },
          data: {
            settings: {
              ...currentSettings,
              specialAccessActive: isActive,
              specialAccessRevoked: !isActive,
              ...(isActive
                ? { specialAccessGrantedAt: new Date().toISOString() }
                : { specialAccessRevokedAt: new Date().toISOString() }),
            } as Prisma.InputJsonValue,
          },
        });
      } catch (err) {
        this.logger.error(`[SpecialAccess] Erro ao sincronizar tenant ${org.id}:`, err);
      }
    }
  }
}
