import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "../../prisma/prisma.service";
import type { CreateFinancingProviderDto, UpdateFinancingProviderDto } from "./dto/provider.dto";
import type { CreateRateTableDto, UpdateRateTableDto } from "./dto/rate-table.dto";

@Injectable()
export class FinancingProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    const [providers, overrides] = await Promise.all([
      this.prisma.financingProvider.findMany({ orderBy: { name: "asc" } }),
      this.prisma.tenantFinancingProvider.findMany({ where: { tenantId } }),
    ]);
    const overrideById = new Map(overrides.map((o) => [o.providerId, o]));
    return providers.map((p) => {
      const override = overrideById.get(p.id);
      return {
        ...p,
        enabledForTenant: override ? override.active : p.active,
        hasTenantOverride: Boolean(override),
      };
    });
  }

  async create(dto: CreateFinancingProviderDto) {
    return this.prisma.financingProvider.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        logoUrl: dto.logoUrl,
        mode: dto.mode,
        active: dto.active ?? true,
        supportsPF: dto.supportsPF ?? true,
        supportsPJ: dto.supportsPJ ?? false,
        apiConfig: (dto.apiConfig as Prisma.InputJsonValue | undefined) ?? undefined,
        docsRequired: (dto.docsRequired as Prisma.InputJsonValue | undefined) ?? undefined,
      },
    });
  }

  async update(id: string, dto: UpdateFinancingProviderDto) {
    const exists = await this.prisma.financingProvider.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException("Financiador não encontrado.");
    return this.prisma.financingProvider.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
        ...(dto.mode !== undefined ? { mode: dto.mode } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.supportsPF !== undefined ? { supportsPF: dto.supportsPF } : {}),
        ...(dto.supportsPJ !== undefined ? { supportsPJ: dto.supportsPJ } : {}),
        ...(dto.apiConfig !== undefined
          ? { apiConfig: dto.apiConfig as Prisma.InputJsonValue }
          : {}),
        ...(dto.docsRequired !== undefined
          ? { docsRequired: dto.docsRequired as Prisma.InputJsonValue }
          : {}),
      },
    });
  }

  async setTenantAvailability(tenantId: string, providerId: string, active: boolean) {
    const exists = await this.prisma.financingProvider.findUnique({ where: { id: providerId } });
    if (!exists) throw new NotFoundException("Financiador não encontrado.");
    return this.prisma.tenantFinancingProvider.upsert({
      where: { tenantId_providerId: { tenantId, providerId } },
      create: { tenantId, providerId, active },
      update: { active },
    });
  }

  async listRateTables(tenantId: string, providerId: string) {
    return this.prisma.financingRateTable.findMany({
      where: {
        providerId,
        OR: [{ tenantId }, { tenantId: null }],
      },
      orderBy: [{ tenantId: "desc" }, { personType: "asc" }, { minAmount: "asc" }],
    });
  }

  async createRateTable(tenantId: string, dto: CreateRateTableDto) {
    if (dto.minAmount > dto.maxAmount) {
      throw new BadRequestException("minAmount deve ser <= maxAmount.");
    }
    if (dto.minTerm > dto.maxTerm) {
      throw new BadRequestException("minTerm deve ser <= maxTerm.");
    }
    const provider = await this.prisma.financingProvider.findUnique({
      where: { id: dto.providerId },
    });
    if (!provider) throw new NotFoundException("Financiador não encontrado.");
    return this.prisma.financingRateTable.create({
      data: {
        providerId: dto.providerId,
        tenantId: dto.global ? null : tenantId,
        personType: dto.personType ?? "PF",
        minAmount: new Decimal(dto.minAmount),
        maxAmount: new Decimal(dto.maxAmount),
        minTerm: dto.minTerm,
        maxTerm: dto.maxTerm,
        monthlyRate: new Decimal(dto.monthlyRate),
        feeRate: new Decimal(dto.feeRate ?? 0),
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        active: dto.active ?? true,
      },
    });
  }

  async updateRateTable(tenantId: string, id: string, dto: UpdateRateTableDto) {
    const row = await this.prisma.financingRateTable.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Tabela não encontrada.");
    if (row.tenantId && row.tenantId !== tenantId) {
      throw new NotFoundException("Tabela não encontrada para este tenant.");
    }
    return this.prisma.financingRateTable.update({
      where: { id },
      data: {
        ...(dto.personType !== undefined ? { personType: dto.personType } : {}),
        ...(dto.minAmount !== undefined ? { minAmount: new Decimal(dto.minAmount) } : {}),
        ...(dto.maxAmount !== undefined ? { maxAmount: new Decimal(dto.maxAmount) } : {}),
        ...(dto.minTerm !== undefined ? { minTerm: dto.minTerm } : {}),
        ...(dto.maxTerm !== undefined ? { maxTerm: dto.maxTerm } : {}),
        ...(dto.monthlyRate !== undefined ? { monthlyRate: new Decimal(dto.monthlyRate) } : {}),
        ...(dto.feeRate !== undefined ? { feeRate: new Decimal(dto.feeRate) } : {}),
        ...(dto.validFrom !== undefined
          ? { validFrom: dto.validFrom ? new Date(dto.validFrom) : null }
          : {}),
        ...(dto.validUntil !== undefined
          ? { validUntil: dto.validUntil ? new Date(dto.validUntil) : null }
          : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async deleteRateTable(tenantId: string, id: string) {
    const row = await this.prisma.financingRateTable.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Tabela não encontrada.");
    if (row.tenantId && row.tenantId !== tenantId) {
      throw new NotFoundException("Tabela não encontrada para este tenant.");
    }
    await this.prisma.financingRateTable.delete({ where: { id } });
  }
}
