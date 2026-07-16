import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { JwtPayload } from "@energivia/types";
import { PrismaService } from "../../prisma/prisma.service";
import { UserRole } from "@prisma/client";
import { softDeleteWhere } from "../../prisma/soft-delete";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
