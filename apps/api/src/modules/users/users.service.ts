import { ForbiddenException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import type { JwtPayload } from "@energivia/types";
import { PrismaService } from "../../prisma/prisma.service";
import { UserRole } from "@prisma/client";
import { softDeleteWhere } from "../../prisma/soft-delete";
import { AdminAlertsService } from "../notifications/admin-alerts.service";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly adminAlerts?: AdminAlertsService
  ) {}

  async updateOnboardingContact(userId: string, data: { phone?: string }) {
    const rawDigits = (data.phone || "").replace(/\D/g, "");
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        phone: rawDigits || null,
        lastActiveAt: new Date(),
      },
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        onboardingStatus: true,
      },
    });
  }

  async markOnboardingAbandoned(userId: string, data: { step?: number }) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, ...softDeleteWhere },
      include: {
        organizationMemberships: {
          where: { status: "ACCEPTED" },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("Usuário não encontrado.");
    }

    // Se o usuário já concluiu o onboarding e possui organização, não marca como abandono
    if ((user.organizationMemberships?.length ?? 0) > 0) {
      return { success: true, onboardingStatus: "COMPLETED", alreadyCompleted: true };
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        onboardingStatus: "ABANDONED",
        onboardingAbandonedAt: new Date(),
        lastActiveAt: new Date(),
      },
    });

    if (this.adminAlerts) {
      this.adminAlerts
        .notifyOnboardingAbandoned({
          name: user.name || "Integrador",
          email: user.email,
          phone: user.phone,
          step: data.step ?? 1,
        })
        .catch(() => undefined);
    }

    return {
      success: true,
      onboardingStatus: updated.onboardingStatus,
    };
  }

  async getActivationStatusList() {
    const users = await this.prisma.user.findMany({
      where: { ...softDeleteWhere },
      include: {
        organizationMemberships: {
          where: { status: "ACCEPTED" },
          include: {
            organization: {
              include: {
                _count: {
                  select: { proposals: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items = users.map((u) => {
      const activeMembership = u.organizationMemberships[0];
      const org = activeMembership?.organization;
      const totalProposals = u.organizationMemberships.reduce(
        (acc, m) => acc + (m.organization?._count?.proposals || 0),
        0
      );

      let activationStatus: "ABANDONED_ONBOARDING" | "REGISTERED_NO_USAGE" | "ACTIVE" = "ACTIVE";

      if (u.organizationMemberships.length === 0 || u.onboardingStatus === "ABANDONED") {
        activationStatus = "ABANDONED_ONBOARDING";
      } else if (totalProposals === 0) {
        activationStatus = "REGISTERED_NO_USAGE";
      } else {
        activationStatus = "ACTIVE";
      }

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        organizationId: org?.id ?? null,
        organizationName: org?.name ?? null,
        onboardingStatus:
          u.onboardingStatus ||
          (u.organizationMemberships.length > 0 ? "COMPLETED" : "IN_PROGRESS"),
        activationStatus,
        totalProposals,
        createdAt: u.createdAt,
        lastActiveAt: u.lastActiveAt,
        onboardingAbandonedAt: u.onboardingAbandonedAt,
      };
    });

    const summary = {
      total: items.length,
      abandoned: items.filter((i) => i.activationStatus === "ABANDONED_ONBOARDING").length,
      registeredNoUsage: items.filter((i) => i.activationStatus === "REGISTERED_NO_USAGE").length,
      active: items.filter((i) => i.activationStatus === "ACTIVE").length,
    };

    return { summary, items };
  }

  async findByIdInternal(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, ...softDeleteWhere },
      select: {
        id: true,
        email: true,
        name: true,
        picture: true,
        role: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException("Usuário não encontrado.");
    return user;
  }

  async updateOwnProfile(id: string, data: { name?: string; picture?: string | null }) {
    await this.findByIdInternal(id);
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.picture !== undefined && { picture: data.picture }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        picture: true,
        role: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByIdForMember(tenantId: string, actor: JwtPayload, targetUserId: string) {
    if (actor.sub !== targetUserId && actor.role !== "ADMIN") {
      throw new ForbiddenException("Acesso negado.");
    }
    const user = await this.prisma.user.findFirst({
      where: { id: targetUserId, tenantId, ...softDeleteWhere },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException("Usuário não encontrado.");
    return user;
  }

  async findByEmailAndTenant(email: string, tenantId: string) {
    return this.prisma.user.findFirst({
      where: { email, tenantId, ...softDeleteWhere },
    });
  }

  async ensureTenantExists(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, ...softDeleteWhere },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException("Organização não encontrada.");
    return tenant.id;
  }

  async findManyByTenant(tenantId: string, role?: UserRole) {
    return this.prisma.user.findMany({
      where: { tenantId, ...softDeleteWhere, ...(role ? { role } : {}) },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });
  }
}
