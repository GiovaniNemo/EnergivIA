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

      // Busca usuário e organização vinculada
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

      let whatsappPhone: string | null = null;
      if (user?.tenantId) {
        const boundPhone = await this.prisma.tenantWhatsappInboundPhone.findFirst({
          where: { organizationId: user.tenantId },
        });
        if (boundPhone) {
          whatsappPhone = boundPhone.phoneDigits;
        }
      }

      enrichedList.push({
        ...item,
        userId: user?.id || null,
        userName: user?.name || null,
        organizationId: user?.tenantId || null,
        organizationName: user?.tenant?.name || null,
        whatsappPhone,
      });
    }

    return enrichedList.sort((a, b) => a.email.localeCompare(b.email));
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
    return fullList.find((item) => item.email === cleanEmail) || (newEntry as SpecialAccessItem);
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

    // 1. Busca usuário e organização vinculada
    const user = await this.prisma.user.findFirst({
      where: { email: cleanEmail },
      include: { tenant: true },
    });

    if (user?.tenantId) {
      const tenantId = user.tenantId;

      // 2. DERRUBADA DO WHATSAPP: Expurga números da organização da base
      await this.prisma.tenantWhatsappInboundPhone.deleteMany({
        where: { organizationId: tenantId },
      });
      this.logger.log(`[SpecialAccess] WhatsApp desconectado para organização ${tenantId}`);

      // 3. DERRUBADA DA WEB: Grava status de revogado nos settings da organização
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
   * Sincroniza as flags do Tenant quando o usuário faz login ou cria organização.
   */
  async syncTenantSettings(email: string, isActive: boolean): Promise<void> {
    const cleanEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: cleanEmail },
      include: { tenant: true },
    });

    if (!user?.tenantId) return;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
    });

    const currentSettings = (tenant?.settings as Record<string, unknown> | null) || {};
    await this.prisma.tenant.update({
      where: { id: user.tenantId },
      data: {
        settings: {
          ...currentSettings,
          specialAccessActive: isActive,
          specialAccessRevoked: !isActive,
        } as Prisma.InputJsonValue,
      },
    });
  }
}
