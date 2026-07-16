import { randomUUID } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { computeProjectCostSection } from "@energivia/proposal-economia";
import {
  isProposalIntegratorSnapshot,
  PROPOSAL_INTEGRATOR_SNAPSHOT_VERSION,
  type ProposalIntegratorKitLine,
  type ProposalIntegratorSnapshot,
} from "@energivia/shared-types";
import { PrismaService } from "../../prisma/prisma.service";
import { StockReservationService } from "../stock/stock-reservation.service";
import { softDeleteWhere as soft } from "../../prisma/soft-delete";

export interface EquipmentEditContext {
  proposalId: string;
  sourceType: "distributor" | "own_stock";
  distributorId: string | null;
  distributorName: string | null;
  alternateDistributors: Array<{ id: string; name: string }>;
  items: Array<{
    productId: string;
    productName: string;
    brandName: string;
    categoryName: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  equipmentSubtotalBrl: number;
  quotedSaleBrl: number;
  systemPowerKw: number | null;
  freightState: string | null;
  freightBrl: number | null;
}

export interface EquipmentOptionsRow {
  productId: string;
  productName: string;
  brandName: string;
  categoryName: string;
  unitPrice: number;
  stockQuantity: number;
  imageUrl: string | null;
}

export interface UpdateKitItemsInput {
  distributorId: string;
  items: Array<{ productId: string; quantity: number }>;
  freightState?: string | null;
}

export interface DistributorAvailabilityRow {
  id: string;
  name: string;
  matchedCount: number;
  totalCount: number;
  hasAllItems: boolean;
  total: number | null;
}

export interface ItemAvailabilityRow {
  productId: string;
  productName: string;
  brandName: string;
  categoryName: string | null;
  quantity: number;
  available: boolean;
  unitPrice: number | null;
  lineTotal: number | null;
}

export interface ItemsAvailabilitySummary {
  distributorId: string;
  distributorName: string;
  rows: ItemAvailabilityRow[];
}

@Injectable()
export class ProposalEquipmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stockReservation: StockReservationService
  ) {}

  private estimateSystemPowerKw(
    kitItems: ProposalIntegratorKitLine[],
    productById: Map<string, { specs: unknown; category: { name: string } }>,
    previous: ProposalIntegratorSnapshot
  ): number {
    let watts = 0;
    for (const line of kitItems) {
      const p = productById.get(line.productId);
      if (!p) continue;
      if (p.category.name !== "module") continue;
      const specs = p.specs as { power_w?: unknown } | null;
      const pw = specs && typeof specs.power_w === "number" ? specs.power_w : 0;
      if (pw > 0) watts += pw * line.quantity;
    }
    if (watts > 0) return Math.round((watts / 1000) * 100) / 100;
    if (typeof previous.systemPowerKw === "number" && previous.systemPowerKw > 0) {
      return previous.systemPowerKw;
    }
    return 0.5;
  }

  private parseIntegrator(renderedData: unknown): ProposalIntegratorSnapshot | null {
    if (!renderedData || typeof renderedData !== "object") return null;
    const int = (renderedData as { integrator?: unknown }).integrator;
    return isProposalIntegratorSnapshot(int) ? int : null;
  }

  private async getProposalOrFail(tenantId: string, proposalId: string) {
    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, tenantId, ...soft },
    });
    if (!proposal) throw new NotFoundException("Proposta não encontrada.");
    return proposal;
  }

  private async findDistributorsWithAllProducts(productIds: string[]) {
    if (productIds.length === 0) return [];
    const rows = await this.prisma.distributorProduct.findMany({
      where: { productId: { in: productIds } },
      select: { distributorId: true, productId: true },
    });
    const countByDist = new Map<string, Set<string>>();
    for (const r of rows) {
      if (!countByDist.has(r.distributorId)) countByDist.set(r.distributorId, new Set());
      countByDist.get(r.distributorId)!.add(r.productId);
    }
    const eligibleIds: string[] = [];
    for (const [distId, set] of countByDist.entries()) {
      if (set.size === productIds.length) eligibleIds.push(distId);
    }
    if (eligibleIds.length === 0) return [];
    const distributors = await this.prisma.distributor.findMany({
      where: { id: { in: eligibleIds } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return distributors;
  }

  async getEquipmentContext(tenantId: string, proposalId: string): Promise<EquipmentEditContext> {
    const proposal = await this.getProposalOrFail(tenantId, proposalId);
    const integrator = this.parseIntegrator(proposal.renderedData);
    if (!integrator) {
      throw new BadRequestException(
        "Esta proposta não possui kit de equipamentos detalhado para edição."
      );
    }
    const productIds = integrator.kitItems.map((i) => i.productId);
    if (productIds.length === 0) {
      throw new BadRequestException("Nenhum equipamento listado para editar.");
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });
    const productById = new Map(products.map((p) => [p.id, p]));

    const eligibleDistributors = await this.findDistributorsWithAllProducts(productIds);

    let chosenId = integrator.distributorId ?? null;
    if (chosenId && !eligibleDistributors.find((d) => d.id === chosenId)) {
      chosenId = null;
    }
    if (!chosenId && eligibleDistributors.length > 0) {
      chosenId = eligibleDistributors[0]!.id;
    }
    const chosenName = chosenId
      ? (eligibleDistributors.find((d) => d.id === chosenId)?.name ?? null)
      : null;
    const alternates = eligibleDistributors.filter((d) => d.id !== chosenId);

    let pricesByProduct = new Map<string, number>();
    if (chosenId && chosenId !== integrator.distributorId) {
      const offers = await this.prisma.distributorProduct.findMany({
        where: { distributorId: chosenId, productId: { in: productIds } },
        select: { productId: true, price: true },
      });
      pricesByProduct = new Map(offers.map((o) => [o.productId, Number(o.price)]));
    }

    const items = integrator.kitItems.map((line) => {
      const p = productById.get(line.productId);
      const overridePrice = pricesByProduct.get(line.productId);
      const unitPrice = overridePrice ?? line.unitPrice;
      const lineTotal =
        overridePrice != null
          ? Math.round(overridePrice * line.quantity * 100) / 100
          : line.lineTotal;
      return {
        productId: line.productId,
        productName: line.productName,
        brandName: line.brandName,
        categoryName: line.categoryName ?? p?.category.name ?? null,
        quantity: line.quantity,
        unitPrice,
        lineTotal,
      };
    });

    const ownStock = integrator.sourceType === "own_stock";

    const systemPowerKw = this.estimateSystemPowerKw(integrator.kitItems, productById, integrator);

    return {
      proposalId,
      sourceType: ownStock ? "own_stock" : "distributor",
      distributorId: ownStock ? null : chosenId,
      distributorName: ownStock ? "Meu estoque" : chosenName,
      alternateDistributors: ownStock ? [] : alternates,
      items,
      equipmentSubtotalBrl: integrator.equipmentSubtotalBrl,
      quotedSaleBrl: integrator.quotedSaleBrl,
      systemPowerKw: systemPowerKw > 0 ? systemPowerKw : null,
      freightState: integrator.freightState ?? null,
      freightBrl: typeof integrator.freightBrl === "number" ? integrator.freightBrl : null,
    };
  }

  async listFreightRulesForDistributor(
    tenantId: string,
    proposalId: string,
    distributorId: string
  ): Promise<Array<{ state: string; value: number }>> {
    await this.getProposalOrFail(tenantId, proposalId);
    if (!distributorId) return [];
    const rows = await this.prisma.freightRule.findMany({
      where: { distributorId },
      orderBy: { state: "asc" },
    });
    return rows.map((r) => ({ state: r.state, value: r.value.toNumber() }));
  }

  async listAvailableDistributors(
    tenantId: string,
    proposalId: string
  ): Promise<DistributorAvailabilityRow[]> {
    const proposal = await this.getProposalOrFail(tenantId, proposalId);
    const integrator = this.parseIntegrator(proposal.renderedData);
    if (!integrator) {
      throw new BadRequestException(
        "Esta proposta não possui kit de equipamentos detalhado para edição."
      );
    }
    const productIds = integrator.kitItems.map((i) => i.productId);
    const totalCount = productIds.length;

    const [allDistributors, offers] = await Promise.all([
      this.prisma.distributor.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      productIds.length > 0
        ? this.prisma.distributorProduct.findMany({
            where: { productId: { in: productIds } },
            select: { distributorId: true, productId: true, price: true },
          })
        : Promise.resolve([]),
    ]);

    const offersByDist = new Map<string, Map<string, number>>();
    for (const r of offers) {
      if (!offersByDist.has(r.distributorId)) offersByDist.set(r.distributorId, new Map());
      offersByDist.get(r.distributorId)!.set(r.productId, Number(r.price));
    }

    const qtyByProduct = new Map(integrator.kitItems.map((i) => [i.productId, i.quantity]));

    const rows: DistributorAvailabilityRow[] = allDistributors.map((d) => {
      const distOffers = offersByDist.get(d.id) ?? new Map<string, number>();
      const matched = distOffers.size;
      const hasAllItems = totalCount > 0 && matched === totalCount;
      let total: number | null = null;
      if (hasAllItems) {
        let sum = 0;
        for (const [productId, qty] of qtyByProduct) {
          sum += (distOffers.get(productId) ?? 0) * qty;
        }
        total = Math.round(sum * 100) / 100;
      }
      return {
        id: d.id,
        name: d.name,
        matchedCount: matched,
        totalCount,
        hasAllItems,
        total,
      };
    });
    rows.sort((a, b) => {
      if (a.hasAllItems !== b.hasAllItems) return a.hasAllItems ? -1 : 1;
      if (a.hasAllItems && b.hasAllItems) {
        return (a.total ?? Number.MAX_SAFE_INTEGER) - (b.total ?? Number.MAX_SAFE_INTEGER);
      }
      if (a.matchedCount !== b.matchedCount) return b.matchedCount - a.matchedCount;
      return a.name.localeCompare(b.name, "pt-BR");
    });
    return rows;
  }

  async getItemsAvailability(
    tenantId: string,
    proposalId: string,
    distributorId: string
  ): Promise<ItemsAvailabilitySummary> {
    const proposal = await this.getProposalOrFail(tenantId, proposalId);
    const integrator = this.parseIntegrator(proposal.renderedData);
    if (!integrator) {
      throw new BadRequestException(
        "Esta proposta não possui kit de equipamentos detalhado para edição."
      );
    }
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
      select: { id: true, name: true },
    });
    if (!distributor) throw new NotFoundException("Distribuidor não encontrado.");

    const productIds = integrator.kitItems.map((i) => i.productId);
    const [products, offers] = await Promise.all([
      this.prisma.product.findMany({
        where: { id: { in: productIds } },
        include: {
          brand: { select: { name: true } },
          category: { select: { name: true } },
        },
      }),
      this.prisma.distributorProduct.findMany({
        where: { distributorId, productId: { in: productIds } },
        select: { productId: true, price: true },
      }),
    ]);
    const productById = new Map(products.map((p) => [p.id, p]));
    const priceByProduct = new Map(offers.map((o) => [o.productId, Number(o.price)]));

    const rows: ItemAvailabilityRow[] = integrator.kitItems.map((line) => {
      const product = productById.get(line.productId);
      const unitPrice = priceByProduct.get(line.productId) ?? null;
      const lineTotal =
        unitPrice != null ? Math.round(unitPrice * line.quantity * 100) / 100 : null;
      return {
        productId: line.productId,
        productName: line.productName,
        brandName: line.brandName,
        categoryName: line.categoryName ?? product?.category.name ?? null,
        quantity: line.quantity,
        available: unitPrice != null,
        unitPrice,
        lineTotal,
      };
    });

    return {
      distributorId: distributor.id,
      distributorName: distributor.name,
      rows,
    };
  }

  async listEquipmentOptions(
    tenantId: string,
    proposalId: string,
    distributorId: string,
    categoryName: string,
    search?: string
  ): Promise<EquipmentOptionsRow[]> {
    await this.getProposalOrFail(tenantId, proposalId);
    const distributor = await this.prisma.distributor.findUnique({
      where: { id: distributorId },
      select: { id: true },
    });
    if (!distributor) throw new NotFoundException("Distribuidor não encontrado.");

    const productWhere: Prisma.ProductWhereInput = {
      active: true,
      category: { name: categoryName },
    };
    if (search?.trim()) {
      productWhere.name = { contains: search.trim(), mode: "insensitive" };
    }
    const where: Prisma.DistributorProductWhereInput = {
      distributorId,
      product: productWhere,
    };

    const rows = await this.prisma.distributorProduct.findMany({
      where,
      take: 200,
      orderBy: { price: "asc" },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            brand: { select: { name: true } },
            category: { select: { name: true } },
          },
        },
      },
    });

    return rows.map((r) => ({
      productId: r.product.id,
      productName: r.product.name,
      brandName: r.product.brand.name,
      categoryName: r.product.category.name,
      unitPrice: Number(r.price),
      stockQuantity: r.stockQuantity,
      imageUrl: r.product.imageUrl,
    }));
  }

  async updateKitItems(tenantId: string, proposalId: string, input: UpdateKitItemsInput) {
    const proposal = await this.getProposalOrFail(tenantId, proposalId);
    const integrator = this.parseIntegrator(proposal.renderedData);
    if (!integrator) {
      throw new BadRequestException(
        "Esta proposta não possui kit de equipamentos detalhado para edição."
      );
    }
    if (!input.items.length) {
      throw new BadRequestException("Informe ao menos um equipamento.");
    }
    for (const it of input.items) {
      if (!it.productId) throw new BadRequestException("productId obrigatório por linha.");
      if (!Number.isFinite(it.quantity) || it.quantity <= 0) {
        throw new BadRequestException("Quantidade deve ser maior que zero.");
      }
    }

    const distributor = await this.prisma.distributor.findUnique({
      where: { id: input.distributorId },
      select: { id: true, name: true },
    });
    if (!distributor) throw new NotFoundException("Distribuidor não encontrado.");

    const productIds = input.items.map((i) => i.productId);
    const offers = await this.prisma.distributorProduct.findMany({
      where: { distributorId: input.distributorId, productId: { in: productIds } },
      select: { productId: true, price: true },
    });
    const priceByProduct = new Map(offers.map((o) => [o.productId, Number(o.price)]));
    const missing = productIds.filter((id) => !priceByProduct.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Produtos fora do catálogo de ${distributor.name}: ${missing.length} item(ns). Use somente produtos disponíveis no mesmo distribuidor.`
      );
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true } },
      },
    });
    const productById = new Map(products.map((p) => [p.id, p]));
    const missingProduct = productIds.find((id) => !productById.has(id));
    if (missingProduct) {
      throw new BadRequestException("Produto não encontrado no catálogo.");
    }

    const newKitItems: ProposalIntegratorKitLine[] = input.items.map((it) => {
      const product = productById.get(it.productId)!;
      const unitPrice = priceByProduct.get(it.productId)!;
      const lineTotal = Math.round(it.quantity * unitPrice * 100) / 100;
      return {
        productId: it.productId,
        productName: product.name,
        brandName: product.brand.name,
        quantity: it.quantity,
        unitPrice,
        lineTotal,
        categoryName: product.category.name,
      };
    });

    const equipmentSubtotalBrl =
      Math.round(newKitItems.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;

    const systemPowerKw = this.estimateSystemPowerKw(newKitItems, productById, integrator);

    const orgRuleRows = await this.prisma.companyCostRule.findMany({
      where: { organizationId: tenantId },
      orderBy: [{ name: "asc" }, { minKwp: "asc" }],
    });
    const organizationRules = orgRuleRows.map((r) => ({
      id: r.id,
      name: r.name,
      calculationType: r.calculationType as "FIXED" | "PERCENTAGE" | "PER_KWP",
      value: r.value.toNumber(),
      minKwp: r.minKwp?.toNumber() ?? null,
      maxKwp: r.maxKwp?.toNumber() ?? null,
      percentageBase: r.percentageBase ?? null,
    }));
    const cost = computeProjectCostSection(equipmentSubtotalBrl, systemPowerKw, organizationRules);

    const requestedState =
      input.freightState === undefined ? integrator.freightState : input.freightState;
    const freightState = requestedState ? String(requestedState).trim().toUpperCase() : null;
    if (freightState && !/^[A-Z]{2}$/.test(freightState)) {
      throw new BadRequestException(`UF de frete inválida: "${requestedState}".`);
    }
    let freightBrl = 0;
    if (freightState) {
      const freightRule = await this.prisma.freightRule.findFirst({
        where: { distributorId: distributor.id, state: freightState },
      });
      freightBrl = freightRule ? freightRule.value.toNumber() : 0;
    }
    const computedWithFreightBrl =
      Math.round((cost.computedSaleFromCostRulesBrl + freightBrl) * 100) / 100;
    const quotedSaleBrl = Math.max(1000, computedWithFreightBrl);

    const freightCostLines =
      freightState && freightBrl > 0
        ? [
            {
              ruleId: null,
              name: `Frete (${freightState})`,
              calculationType: "FIXED" as const,
              value: freightBrl,
              appliedAmountBrl: freightBrl,
              source: "organization" as const,
            },
          ]
        : [];

    const renderedData = (proposal.renderedData ?? {}) as Record<string, unknown>;
    const nextIntegrator: ProposalIntegratorSnapshot = {
      ...integrator,
      version: PROPOSAL_INTEGRATOR_SNAPSHOT_VERSION,
      kitItems: newKitItems,
      equipmentSubtotalBrl,
      sourceType: "distributor",
      distributorId: distributor.id,
      systemPowerKw,
      quotedSaleBrl,
      projectCostLines: [...cost.projectCostLines, ...freightCostLines],
      computedSaleFromCostRulesBrl: computedWithFreightBrl,
      freightState: freightState ?? undefined,
      freightBrl: freightState ? freightBrl : undefined,
      ...(cost.defaultEssentialCostNames.length > 0
        ? { defaultEssentialCostNames: cost.defaultEssentialCostNames }
        : { defaultEssentialCostNames: undefined }),
    };

    const nextRendered: Record<string, unknown> = {
      ...renderedData,
      integrator: nextIntegrator,
    };

    const nextPublicToken = randomUUID();
    await this.prisma.proposal.update({
      where: { id: proposalId },
      data: {
        renderedData: nextRendered as Prisma.InputJsonValue,
        publicToken: nextPublicToken,
      },
    });

    if (integrator.sourceType === "own_stock") {
      await this.stockReservation.releaseForProposal(tenantId, proposalId).catch(() => undefined);
    }

    const context = await this.getEquipmentContext(tenantId, proposalId);
    return { ...context, publicToken: nextPublicToken };
  }
}
