import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "../../prisma/prisma.service";
import type { CreateCommissionRuleDto, UpdateCommissionRuleDto } from "./dto/commission.dto";

@Injectable()
export class FinancingCommissionRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(providerId?: string) {
    return this.prisma.financingCommissionRule.findMany({
      where: providerId ? { providerId } : undefined,
      include: { provider: { select: { id: true, name: true, slug: true } } },
      orderBy: [{ providerId: "asc" }, { createdAt: "desc" }],
    });
  }

  async create(dto: CreateCommissionRuleDto) {
    if (dto.minAmount != null && dto.maxAmount != null && dto.minAmount > dto.maxAmount) {
      throw new BadRequestException("minAmount deve ser <= maxAmount.");
    }
    const provider = await this.prisma.financingProvider.findUnique({
      where: { id: dto.providerId },
    });
    if (!provider) throw new NotFoundException("Provider não encontrado.");

    return this.prisma.financingCommissionRule.create({
      data: {
        providerId: dto.providerId,
        personType: dto.personType ?? null,
        calculationType: dto.calculationType,
        value: new Decimal(dto.value),
        baseAmount: dto.baseAmount ?? "FINANCED_AMOUNT",
        minAmount: dto.minAmount != null ? new Decimal(dto.minAmount) : null,
        maxAmount: dto.maxAmount != null ? new Decimal(dto.maxAmount) : null,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        active: dto.active ?? true,
        notes: dto.notes,
      },
    });
  }

  async update(id: string, dto: UpdateCommissionRuleDto) {
    const row = await this.prisma.financingCommissionRule.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Regra não encontrada.");
    return this.prisma.financingCommissionRule.update({
      where: { id },
      data: {
        ...(dto.personType !== undefined ? { personType: dto.personType } : {}),
        ...(dto.calculationType !== undefined ? { calculationType: dto.calculationType } : {}),
        ...(dto.value !== undefined ? { value: new Decimal(dto.value) } : {}),
        ...(dto.baseAmount !== undefined ? { baseAmount: dto.baseAmount } : {}),
        ...(dto.minAmount !== undefined
          ? { minAmount: dto.minAmount != null ? new Decimal(dto.minAmount) : null }
          : {}),
        ...(dto.maxAmount !== undefined
          ? { maxAmount: dto.maxAmount != null ? new Decimal(dto.maxAmount) : null }
          : {}),
        ...(dto.validFrom !== undefined
          ? { validFrom: dto.validFrom ? new Date(dto.validFrom) : null }
          : {}),
        ...(dto.validUntil !== undefined
          ? { validUntil: dto.validUntil ? new Date(dto.validUntil) : null }
          : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  }

  async remove(id: string) {
    const row = await this.prisma.financingCommissionRule.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Regra não encontrada.");
    await this.prisma.financingCommissionRule.delete({ where: { id } });
  }
}
