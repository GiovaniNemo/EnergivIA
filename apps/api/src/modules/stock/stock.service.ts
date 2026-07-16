import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InvitationStatus, OrgRole, Prisma, StockMovementType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { softDeleteWhere as soft } from "../../prisma/soft-delete";
import type { CreateStockItemDto } from "./dto/create-stock-item.dto";
import type { UpdateStockItemDto } from "./dto/update-stock-item.dto";
import { normalizeFreightRules, type FreightRuleRow } from "../distributors/distributors.service";
import { Decimal } from "@prisma/client/runtime/library";

const stockItemInclude = {
  product: { include: { brand: true, category: true } },
} satisfies Prisma.StockItemInclude;

type StockItemWithProduct = Prisma.StockItemGetPayload<{ include: typeof stockItemInclude }>;

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async getFreightRules(organizationId: string, userId: string): Promise<FreightRuleRow[]> {
    await this.requireMembership(organizationId, userId);
    const rows = await this.prisma.freightRule.findMany({
      where: { organizationId },
      orderBy: { state: "asc" },
    });
    return rows.map((r) => ({ state: r.state, value: r.value.toNumber() }));
  }

  async setFreightRules(
    organizationId: string,
    userId: string,
    rules: Array<{ state: string; value: number }>
  ): Promise<FreightRuleRow[]> {
    await this.requireMembership(organizationId, userId);
    const normalized = normalizeFreightRules(rules);
    await this.prisma.$transaction([
      this.prisma.freightRule.deleteMany({ where: { organizationId } }),
      ...(normalized.length > 0
        ? [
            this.prisma.freightRule.createMany({
              data: normalized.map((r) => ({
                organizationId,
                state: r.state,
                value: new Decimal(r.value),
              })),
            }),
          ]
        : []),
    ]);
    return this.getFreightRules(organizationId, userId);
  }

  async findAll(organizationId: string, userId: string) {
    await this.requireMembership(organizationId, userId);
    const rows = await this.prisma.stockItem.findMany({
      where: { organizationId },
      include: stockItemInclude,
      orderBy: [{ product: { category: { name: "asc" } } }, { product: { name: "asc" } }],
    });
    return rows.map((r) => this.serialize(r));
  }

  async create(organizationId: string, userId: string, dto: CreateStockItemDto) {
    await this.requireOwnerOrAdmin(organizationId, userId);

    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException("Produto não encontrado no catálogo.");

    const existing = await this.prisma.stockItem.findUnique({
      where: { organizationId_productId: { organizationId, productId: dto.productId } },
    });
    if (existing) {
      throw new BadRequestException("Este produto já está no seu estoque. Edite o item existente.");
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const item = await tx.stockItem.create({
        data: {
          organizationId,
          productId: dto.productId,
          quantity: dto.quantity,
          unitCost: new Prisma.Decimal(dto.unitCost),
          sku: dto.sku ?? null,
          notes: dto.notes ?? null,
        },
        include: stockItemInclude,
      });
      if (dto.quantity > 0) {
        await tx.stockMovement.create({
          data: {
            organizationId,
            stockItemId: item.id,
            type: StockMovementType.INBOUND,
            quantity: dto.quantity,
            reason: "Cadastro inicial do estoque",
            createdById: userId,
          },
        });
      }
      return item;
    });

    return this.serialize(created);
  }

  async update(organizationId: string, id: string, userId: string, dto: UpdateStockItemDto) {
    await this.requireOwnerOrAdmin(organizationId, userId);

    const current = await this.prisma.stockItem.findFirst({ where: { id, organizationId } });
    if (!current) throw new NotFoundException("Item de estoque não encontrado.");

    const nextQuantity = dto.quantity ?? current.quantity;
    if (nextQuantity < current.reservedQuantity) {
      throw new BadRequestException(
        `Quantidade não pode ser menor que o reservado em propostas abertas (${current.reservedQuantity}).`
      );
    }

    const data: Prisma.StockItemUpdateInput = {};
    if (dto.quantity !== undefined) data.quantity = dto.quantity;
    if (dto.unitCost !== undefined) data.unitCost = new Prisma.Decimal(dto.unitCost);
    if (dto.sku !== undefined) data.sku = dto.sku;
    if (dto.notes !== undefined) data.notes = dto.notes;

    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.stockItem.update({
        where: { id },
        data,
        include: stockItemInclude,
      });
      const delta = nextQuantity - current.quantity;
      if (delta !== 0) {
        await tx.stockMovement.create({
          data: {
            organizationId,
            stockItemId: item.id,
            type: StockMovementType.ADJUSTMENT,
            quantity: Math.abs(delta),
            reason: `Ajuste manual: ${current.quantity} → ${nextQuantity}`,
            createdById: userId,
          },
        });
      }
      return item;
    });

    return this.serialize(updated);
  }

  async remove(organizationId: string, id: string, userId: string) {
    await this.requireOwnerOrAdmin(organizationId, userId);
    const current = await this.prisma.stockItem.findFirst({ where: { id, organizationId } });
    if (!current) throw new NotFoundException("Item de estoque não encontrado.");
    if (current.reservedQuantity > 0) {
      throw new BadRequestException(
        "Não é possível remover: há quantidade reservada em propostas abertas."
      );
    }
    await this.prisma.stockItem.delete({ where: { id } });
    return { ok: true };
  }

  async listMovements(organizationId: string, id: string, userId: string) {
    await this.requireMembership(organizationId, userId);
    const item = await this.prisma.stockItem.findFirst({ where: { id, organizationId } });
    if (!item) throw new NotFoundException("Item de estoque não encontrado.");
    const rows = await this.prisma.stockMovement.findMany({
      where: { organizationId, stockItemId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows.map((m) => ({
      id: m.id,
      type: m.type,
      quantity: m.quantity,
      reason: m.reason,
      referenceType: m.referenceType,
      referenceId: m.referenceId,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async searchProducts(
    organizationId: string,
    userId: string,
    params: { search?: string; category?: string }
  ) {
    await this.requireMembership(organizationId, userId);
    const where: Prisma.ProductWhereInput = { active: true };
    if (params.search && params.search.trim()) {
      where.name = { contains: params.search.trim(), mode: "insensitive" };
    }
    if (params.category && params.category.trim()) {
      where.category = { name: params.category.trim() };
    }
    const products = await this.prisma.product.findMany({
      where,
      include: { brand: true, category: true },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
      take: 30,
    });
    const inStockIds = new Set(
      (
        await this.prisma.stockItem.findMany({
          where: { organizationId, productId: { in: products.map((p) => p.id) } },
          select: { productId: true },
        })
      ).map((s) => s.productId)
    );
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      brandName: p.brand.name,
      categoryName: p.category.name,
      imageUrl: p.imageUrl,
      alreadyInStock: inStockIds.has(p.id),
    }));
  }

  private serialize(r: StockItemWithProduct) {
    return {
      id: r.id,
      organizationId: r.organizationId,
      productId: r.productId,
      productName: r.product.name,
      brandName: r.product.brand.name,
      categoryName: r.product.category.name,
      imageUrl: r.product.imageUrl,
      quantity: r.quantity,
      reservedQuantity: r.reservedQuantity,
      availableQuantity: r.quantity - r.reservedQuantity,
      unitCost: r.unitCost.toNumber(),
      sku: r.sku,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  private async requireMembership(organizationId: string, userId: string) {
    const org = await this.prisma.tenant.findFirst({ where: { id: organizationId, ...soft } });
    if (!org) throw new NotFoundException("Organização não encontrada.");
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
      throw new ForbiddenException("Sem permissão para alterar o estoque.");
    }
  }
}
