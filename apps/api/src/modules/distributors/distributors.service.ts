import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { CreateDistributorDto } from "./dto/create-distributor.dto";
import type { UpdateDistributorDto } from "./dto/update-distributor.dto";
import type { CreateDistributorProductDto } from "./dto/create-distributor-product.dto";
import type { UpdateDistributorProductDto } from "./dto/update-distributor-product.dto";
import type { QueryDistributorProductsDto } from "./dto/query-distributor-products.dto";
import type { BulkDistributorProductRowDto } from "./dto/bulk-distributor-products.dto";
import type { Distributor } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export interface FreightRuleRow {
  state: string;
  value: number;
}

const UF_RE = /^[A-Z]{2}$/;

export function normalizeFreightRules(
  rules: Array<{ state: string; value: number }>
): FreightRuleRow[] {
  const seen = new Set<string>();
  const normalized: FreightRuleRow[] = [];
  for (const rule of rules) {
    const state = String(rule.state ?? "")
      .trim()
      .toUpperCase();
    if (!UF_RE.test(state)) {
      throw new BadRequestException(
        `UF inválida: "${rule.state}". Use a sigla de 2 letras (ex.: SP).`
      );
    }
    const value = Number(rule.value);
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException(`Valor de frete inválido para ${state}.`);
    }
    if (seen.has(state)) {
      throw new BadRequestException(`UF duplicada nas regras de frete: ${state}.`);
    }
    seen.add(state);
    normalized.push({ state, value: Math.round(value * 100) / 100 });
  }
  return normalized;
}

@Injectable()
export class DistributorsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFreightRules(distributorId: string): Promise<FreightRuleRow[]> {
    await this.findOne(distributorId);
    const rows = await this.prisma.freightRule.findMany({
      where: { distributorId },
      orderBy: { state: "asc" },
    });
    return rows.map((r) => ({ state: r.state, value: r.value.toNumber() }));
  }

  async setFreightRules(
    distributorId: string,
    rules: Array<{ state: string; value: number }>
  ): Promise<FreightRuleRow[]> {
    await this.findOne(distributorId);
    const normalized = normalizeFreightRules(rules);
    await this.prisma.$transaction([
      this.prisma.freightRule.deleteMany({ where: { distributorId } }),
      ...(normalized.length > 0
        ? [
            this.prisma.freightRule.createMany({
              data: normalized.map((r) => ({
                distributorId,
                state: r.state,
                value: new Decimal(r.value),
              })),
            }),
          ]
        : []),
    ]);
    return this.getFreightRules(distributorId);
  }

  async findAll(): Promise<(Distributor & { _count: { distributorProducts: number } })[]> {
    return this.prisma.distributor.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { distributorProducts: true } } },
    }) as Promise<(Distributor & { _count: { distributorProducts: number } })[]>;
  }

  async findOne(id: string): Promise<Distributor> {
    const distributor = await this.prisma.distributor.findUnique({
      where: { id },
    });
    if (!distributor) throw new NotFoundException("Distribuidor não encontrado.");
    return distributor;
  }

  async create(dto: CreateDistributorDto): Promise<Distributor> {
    return this.prisma.distributor.create({
      data: {
        name: dto.name,
        cnpj: dto.cnpj,
        email: dto.email,
        phone: dto.phone,
        website: dto.website,
        city: dto.city,
        state: dto.state,
      },
    });
  }

  async update(id: string, dto: UpdateDistributorDto): Promise<Distributor> {
    await this.prisma.distributor.findUniqueOrThrow({ where: { id } });
    return this.prisma.distributor.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.cnpj !== undefined && { cnpj: dto.cnpj }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.distributor.findUniqueOrThrow({ where: { id } });
    await this.prisma.distributor.delete({ where: { id } });
  }

  async findProductsByDistributor(
    distributorId: string,
    query: QueryDistributorProductsDto
  ): Promise<{
    data: Array<{
      id: string;
      distributorSku: string | null;
      price: unknown;
      stockQuantity: number;
      leadTimeDays: number | null;
      minimumOrderQuantity: number;
      lastPriceUpdate: Date | null;
      updatedAt: Date;
      product: {
        id: string;
        name: string;
        imageUrl: string | null;
        brand: { id: string; name: string; imageUrl: string | null };
        category: { id: string; name: string };
      };
    }>;
    total: number;
  }> {
    await this.findOne(distributorId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: {
      distributorId: string;
      product?: { name?: { contains: string; mode: "insensitive" }; categoryId?: string };
    } = { distributorId };
    if (query.search?.trim()) {
      where.product = {
        ...where.product,
        name: { contains: query.search.trim(), mode: "insensitive" },
      };
    }
    if (query.category_id) {
      where.product = { ...where.product, categoryId: query.category_id };
    }

    const [data, total] = await Promise.all([
      this.prisma.distributorProduct.findMany({
        where,
        skip,
        take: limit,
        orderBy: { product: { name: "asc" } },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              brand: { select: { id: true, name: true, imageUrl: true } },
              category: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.distributorProduct.count({ where }),
    ]);

    const productIds = [...new Set(data.map((r) => r.productId))];
    const minPrices =
      productIds.length > 0
        ? await this.prisma.distributorProduct.groupBy({
            by: ["productId"],
            _min: { price: true },
            where: { productId: { in: productIds } },
          })
        : [];
    const minPriceByProduct: Record<string, number> = {};
    for (const g of minPrices) {
      if (g._min.price != null) minPriceByProduct[g.productId] = Number(g._min.price);
    }

    return {
      data: data.map((row) => {
        const priceNum = Number(row.price);
        const minPrice = minPriceByProduct[row.productId];
        const isCheapestOffer = minPrice != null && priceNum <= minPrice;
        return {
          id: row.id,
          distributorSku: row.distributorSku,
          price: row.price,
          stockQuantity: row.stockQuantity,
          leadTimeDays: row.leadTimeDays,
          minimumOrderQuantity: row.minimumOrderQuantity,
          lastPriceUpdate: row.lastPriceUpdate,
          updatedAt: row.updatedAt,
          product: row.product,
          isCheapestOffer: !!isCheapestOffer,
        };
      }),
      total,
    };
  }

  async addProductToDistributor(distributorId: string, dto: CreateDistributorProductDto) {
    await this.findOne(distributorId);
    return this.prisma.distributorProduct.upsert({
      where: {
        distributorId_productId: {
          distributorId,
          productId: dto.product_id,
        },
      },
      create: {
        distributorId,
        productId: dto.product_id,
        distributorSku: dto.distributor_sku,
        price: new Decimal(dto.price),
        stockQuantity: dto.stock_quantity ?? 0,
        leadTimeDays: dto.lead_time_days ?? undefined,
        minimumOrderQuantity: dto.minimum_order_quantity ?? 1,
        lastPriceUpdate: new Date(),
      },
      update: {
        distributorSku: dto.distributor_sku,
        price: new Decimal(dto.price),
        stockQuantity: dto.stock_quantity ?? 0,
        leadTimeDays: dto.lead_time_days ?? undefined,
        minimumOrderQuantity: dto.minimum_order_quantity ?? 1,
        lastPriceUpdate: new Date(),
      },
    });
  }

  async updateDistributorProduct(id: string, dto: UpdateDistributorProductDto) {
    const existing = await this.prisma.distributorProduct.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("Produto do distribuidor não encontrado.");

    const data: {
      distributorSku?: string;
      price?: Decimal;
      stockQuantity?: number;
      leadTimeDays?: number | null;
      minimumOrderQuantity?: number;
      lastPriceUpdate?: Date;
    } = {};
    if (dto.distributor_sku !== undefined) data.distributorSku = dto.distributor_sku;
    if (dto.price !== undefined) {
      data.price = new Decimal(dto.price);
      data.lastPriceUpdate = new Date();
    }
    if (dto.stock_quantity !== undefined) data.stockQuantity = dto.stock_quantity;
    if (dto.lead_time_days !== undefined) data.leadTimeDays = dto.lead_time_days;
    if (dto.minimum_order_quantity !== undefined)
      data.minimumOrderQuantity = dto.minimum_order_quantity;

    return this.prisma.distributorProduct.update({
      where: { id },
      data,
    });
  }

  async removeDistributorProduct(id: string): Promise<void> {
    await this.prisma.distributorProduct.findUniqueOrThrow({ where: { id } });
    await this.prisma.distributorProduct.delete({ where: { id } });
  }

  async bulkUpsertDistributorProducts(
    distributorId: string,
    rows: BulkDistributorProductRowDto[]
  ): Promise<{ created: number; updated: number; skipped: { index: number; reason: string }[] }> {
    await this.findOne(distributorId);
    let created = 0;
    let updated = 0;
    const skipped: { index: number; reason: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      const product = await this.prisma.product.findFirst({
        where: {
          name: { equals: row.product_name, mode: "insensitive" },
          brand: { name: { equals: row.brand, mode: "insensitive" } },
        },
        select: { id: true },
      });
      if (!product) {
        skipped.push({
          index: i,
          reason: `Produto não encontrado: ${row.product_name} / ${row.brand}`,
        });
        continue;
      }

      const existing = await this.prisma.distributorProduct.findUnique({
        where: {
          distributorId_productId: { distributorId, productId: product.id },
        },
      });

      await this.prisma.distributorProduct.upsert({
        where: {
          distributorId_productId: { distributorId, productId: product.id },
        },
        create: {
          distributorId,
          productId: product.id,
          distributorSku: row.distributor_sku ?? null,
          price: new Decimal(row.price),
          stockQuantity: row.stock ?? 0,
          leadTimeDays: row.lead_time_days ?? null,
          minimumOrderQuantity: row.moq ?? 1,
          lastPriceUpdate: new Date(),
        },
        update: {
          distributorSku: row.distributor_sku ?? undefined,
          price: new Decimal(row.price),
          stockQuantity: row.stock ?? undefined,
          leadTimeDays: row.lead_time_days ?? undefined,
          minimumOrderQuantity: row.moq ?? undefined,
          lastPriceUpdate: new Date(),
        },
      });

      if (existing) updated++;
      else created++;
    }

    return { created, updated, skipped };
  }

  async findDistributorsByProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException("Produto não encontrado.");

    const rows = await this.prisma.distributorProduct.findMany({
      where: { productId },
      include: {
        distributor: {
          select: {
            id: true,
            name: true,
            cnpj: true,
            city: true,
            state: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { price: "asc" },
    });

    return rows.map((r) => ({
      id: r.id,
      distributor_sku: r.distributorSku,
      price: Number(r.price),
      stock_quantity: r.stockQuantity,
      lead_time_days: r.leadTimeDays,
      minimum_order_quantity: r.minimumOrderQuantity,
      last_price_update: r.lastPriceUpdate,
      distributor: r.distributor,
    }));
  }
}
