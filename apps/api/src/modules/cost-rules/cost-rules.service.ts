import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CostCalculationType, InvitationStatus, OrgRole, PercentageBase } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { softDeleteWhere as soft } from "../../prisma/soft-delete";
import type { CreateCostRuleDto } from "./dto/create-cost-rule.dto";
import type { UpdateCostRuleDto } from "./dto/update-cost-rule.dto";

type HalfOpenRange = { lo: number; hi: number | null };

function toNumber(d: Prisma.Decimal | null | undefined): number | null {
  if (d === null || d === undefined) return null;
  return d.toNumber();
}

function parseRange(
  minKwp: number | null | undefined,
  maxKwp: number | null | undefined
): "global" | HalfOpenRange {
  const minNull = minKwp === null || minKwp === undefined;
  const maxNull = maxKwp === null || maxKwp === undefined;
  if (minNull && maxNull) return "global";
  if (minNull && !maxNull) {
    throw new BadRequestException(
      "Informe também “De (kWp)” ao usar limite superior, ou deixe ambos vazios para todos os projetos."
    );
  }
  const lo = Number(minKwp);
  if (!Number.isFinite(lo) || lo < 0) {
    throw new BadRequestException("“De (kWp)” inválido.");
  }
  if (maxNull) {
    return { lo, hi: null };
  }
  const hi = Number(maxKwp);
  if (!Number.isFinite(hi) || hi < 0) {
    throw new BadRequestException("“Até (kWp)” inválido.");
  }
  if (!(lo < hi)) {
    throw new BadRequestException(
      "“De” deve ser menor que “Até”. O valor “Até” é exclusivo (ex.: De 0 e Até 5 cobre de 0 até antes de 5 kWp)."
    );
  }
  return { lo, hi };
}

function rangesOverlapHalfOpen(a: HalfOpenRange, b: HalfOpenRange): boolean {
  const aEnd = a.hi ?? Number.POSITIVE_INFINITY;
  const bEnd = b.hi ?? Number.POSITIVE_INFINITY;
  const left = Math.max(a.lo, b.lo);
  const right = Math.min(aEnd, bEnd);
  return left < right;
}

function rowToRange(row: {
  minKwp: Prisma.Decimal | null;
  maxKwp: Prisma.Decimal | null;
}): "global" | HalfOpenRange {
  const min = toNumber(row.minKwp);
  const max = toNumber(row.maxKwp);
  if (min === null && max === null) return "global";
  if (min !== null && max === null) return { lo: min, hi: null };
  if (min !== null && max !== null) return { lo: min, hi: max };
  return "global";
}

@Injectable()
export class CostRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, userId: string) {
    await this.requireMembership(organizationId, userId);
    const org = await this.prisma.tenant.findFirst({ where: { id: organizationId, ...soft } });
    if (!org) throw new NotFoundException("Organização não encontrada.");

    const rows = await this.prisma.companyCostRule.findMany({
      where: { organizationId },
      orderBy: [{ name: "asc" }, { minKwp: "asc" }],
    });
    return rows.map((r) => this.serialize(r));
  }

  async create(organizationId: string, userId: string, dto: CreateCostRuleDto) {
    await this.requireOwnerOrAdmin(organizationId, userId);
    await this.ensureOrgExists(organizationId);

    const name = dto.name.trim();
    const range = parseRange(dto.minKwp, dto.maxKwp);
    await this.assertNoConflict(organizationId, name, range, undefined);

    const row = await this.prisma.companyCostRule.create({
      data: {
        organizationId,
        name,
        calculationType: dto.calculationType,
        value: new Prisma.Decimal(dto.value),
        minKwp: range === "global" ? null : new Prisma.Decimal(range.lo),
        maxKwp: range === "global" ? null : range.hi === null ? null : new Prisma.Decimal(range.hi),
        percentageBase:
          dto.calculationType === "PERCENTAGE"
            ? (dto.percentageBase ?? PercentageBase.PROJECT_COST)
            : null,
      },
    });
    return this.serialize(row);
  }

  async update(organizationId: string, id: string, userId: string, dto: UpdateCostRuleDto) {
    await this.requireOwnerOrAdmin(organizationId, userId);
    await this.ensureOrgExists(organizationId);

    const existing = await this.prisma.companyCostRule.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException("Regra não encontrada.");

    const name = (dto.name !== undefined ? dto.name : existing.name).trim();
    const minIn = dto.minKwp !== undefined ? dto.minKwp : toNumber(existing.minKwp);
    const maxIn = dto.maxKwp !== undefined ? dto.maxKwp : toNumber(existing.maxKwp);
    const range = parseRange(minIn, maxIn);
    await this.assertNoConflict(organizationId, name, range, id);

    const nextType = dto.calculationType ?? existing.calculationType;
    const nextPercentageBase: PercentageBase | null =
      nextType === "PERCENTAGE"
        ? dto.percentageBase !== undefined
          ? dto.percentageBase
          : (existing.percentageBase ?? PercentageBase.PROJECT_COST)
        : null;

    const row = await this.prisma.companyCostRule.update({
      where: { id },
      data: {
        name,
        calculationType: dto.calculationType ?? existing.calculationType,
        value: dto.value !== undefined ? new Prisma.Decimal(dto.value) : existing.value,
        minKwp: range === "global" ? null : new Prisma.Decimal(range.lo),
        maxKwp: range === "global" ? null : range.hi === null ? null : new Prisma.Decimal(range.hi),
        percentageBase: nextPercentageBase,
      },
    });
    return this.serialize(row);
  }

  async remove(organizationId: string, id: string, userId: string) {
    await this.requireOwnerOrAdmin(organizationId, userId);
    const existing = await this.prisma.companyCostRule.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException("Regra não encontrada.");
    await this.prisma.companyCostRule.delete({ where: { id } });
    return { success: true };
  }

  private serialize(r: {
    id: string;
    organizationId: string;
    name: string;
    calculationType: CostCalculationType;
    value: Prisma.Decimal;
    minKwp: Prisma.Decimal | null;
    maxKwp: Prisma.Decimal | null;
    percentageBase: PercentageBase | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: r.id,
      organizationId: r.organizationId,
      name: r.name,
      calculationType: r.calculationType,
      value: r.value.toNumber(),
      minKwp: toNumber(r.minKwp),
      maxKwp: toNumber(r.maxKwp),
      percentageBase: r.percentageBase ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  private async assertNoConflict(
    organizationId: string,
    name: string,
    range: "global" | HalfOpenRange,
    excludeId: string | undefined
  ) {
    const siblings = await this.prisma.companyCostRule.findMany({
      where: { organizationId, name },
    });

    const others = siblings.filter((s) => s.id !== excludeId);
    const globals = others.filter((s) => rowToRange(s) === "global");
    const ranged = others
      .map((s) => ({ id: s.id, r: rowToRange(s) }))
      .filter((x): x is { id: string; r: HalfOpenRange } => x.r !== "global");

    if (range === "global") {
      if (globals.length > 0) {
        throw new BadRequestException(
          `Já existe uma regra global para “${name}”. Edite a existente ou use faixas de kWp.`
        );
      }
      if (ranged.length > 0) {
        throw new BadRequestException(
          `Já existem faixas de kWp para “${name}”. Remova-as ou edite-as antes de criar uma regra para todos os projetos.`
        );
      }
      return;
    }

    if (globals.length > 0) {
      throw new BadRequestException(
        `Já existe uma regra global para “${name}”. Remova-a antes de usar faixas de kWp.`
      );
    }

    for (const { r: other } of ranged) {
      if (rangesOverlapHalfOpen(range, other)) {
        throw new BadRequestException(
          `As faixas de kWp para “${name}” não podem se sobrepor. Ajuste “De” e “Até”.`
        );
      }
    }
  }

  private async ensureOrgExists(organizationId: string) {
    const org = await this.prisma.tenant.findFirst({ where: { id: organizationId, ...soft } });
    if (!org) throw new NotFoundException("Organização não encontrada.");
  }

  private async requireMembership(organizationId: string, userId: string) {
    const m = await this.prisma.organizationMember.findFirst({
      where: { organizationId, userId, status: InvitationStatus.ACCEPTED },
    });
    if (!m) throw new NotFoundException("Organização não encontrada.");
  }

  private async requireOwnerOrAdmin(organizationId: string, userId: string) {
    const m = await this.prisma.organizationMember.findFirst({
      where: { organizationId, userId, status: InvitationStatus.ACCEPTED },
    });
    if (!m) throw new NotFoundException("Organização não encontrada.");
    if (m.role !== OrgRole.OWNER && m.role !== OrgRole.ADMIN) {
      throw new ForbiddenException("Sem permissão para alterar regras de custo.");
    }
  }
}
