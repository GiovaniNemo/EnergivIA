import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SupplierProductRepository } from "./supplier-product.repository";
import type { ProductWithSpecs } from "../domain/solar-sizing/types";
import type { ModuleSpec, StringInverterSpec, MicroInverterSpec } from "../domain/product-specs";
import { isModuleSpec, isMicroInverterSpec, isStringInverterSpec } from "../domain/product-specs";

const CATEGORY_NAMES = {
  MODULE: "module",
  INVERTER: "inverter",
  MICROINVERTER: "microinverter",
  STRUCTURE_KIT: "structure_kit",
  DC_CABLE: "dc_cable",
  CONNECTOR: "connector",
} as const;

export type KitProductSource = {
  supplierId?: string;
  stockOwnerOrgId?: string;
};

@Injectable()
export class ProductRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supplierProductRepo: SupplierProductRepository
  ) {}

  private async getStockProductIds(orgId: string): Promise<string[]> {
    const rows = await this.prisma.stockItem.findMany({
      where: { organizationId: orgId },
      select: { productId: true, quantity: true, reservedQuantity: true },
    });
    return rows.filter((r) => r.quantity - r.reservedQuantity > 0).map((r) => r.productId);
  }

  async getStockAvailability(orgId: string, productIds: string[]): Promise<Map<string, number>> {
    if (productIds.length === 0) return new Map();
    const rows = await this.prisma.stockItem.findMany({
      where: { organizationId: orgId, productId: { in: productIds } },
      select: { productId: true, quantity: true, reservedQuantity: true },
    });
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.productId, r.quantity - r.reservedQuantity);
    return map;
  }

  private async getStockOffers(
    orgId: string,
    productIds: string[]
  ): Promise<Map<string, { price: number }>> {
    if (productIds.length === 0) return new Map();
    const rows = await this.prisma.stockItem.findMany({
      where: { organizationId: orgId, productId: { in: productIds } },
      select: { productId: true, unitCost: true, quantity: true, reservedQuantity: true },
    });
    const map = new Map<string, { price: number }>();
    for (const r of rows) {
      if (r.quantity - r.reservedQuantity > 0) {
        map.set(r.productId, { price: r.unitCost.toNumber() });
      }
    }
    return map;
  }

  private async restrictProductIds(source: KitProductSource): Promise<string[] | null> {
    if (source.stockOwnerOrgId) return this.getStockProductIds(source.stockOwnerOrgId);
    if (source.supplierId)
      return this.supplierProductRepo.getProductIdsBySupplier(source.supplierId);
    return null;
  }

  private async attachPrices<T extends { id: string }>(
    items: T[],
    source: KitProductSource
  ): Promise<(T & { price: number })[]> {
    if (items.length === 0) return [];
    const productIds = items.map((i) => i.id);

    if (source.stockOwnerOrgId) {
      const offers = await this.getStockOffers(source.stockOwnerOrgId, productIds);
      return items
        .filter((p) => offers.has(p.id))
        .map((p) => ({ ...p, price: offers.get(p.id)!.price }) as T & { price: number });
    }

    if (source.supplierId) {
      const offers = await this.supplierProductRepo.getOffersBySupplier(
        source.supplierId,
        productIds
      );
      return items
        .filter((p) => offers.has(p.id))
        .map((p) => ({ ...p, price: offers.get(p.id)!.price }) as T & { price: number });
    }

    const withPrice: (T & { price: number })[] = [];
    for (const item of items) {
      const offer = await this.supplierProductRepo.getCheapestOffer(item.id);
      if (offer) withPrice.push({ ...item, price: offer.price } as T & { price: number });
    }
    return withPrice;
  }

  async findActiveModules(
    brandName?: string,
    source: KitProductSource = {}
  ): Promise<ProductWithSpecs<ModuleSpec>[]> {
    const where: {
      category: { name: string };
      active: boolean;
      brand?: { name: { equals: string; mode: "insensitive" } };
      id?: { in: string[] };
    } = {
      category: { name: CATEGORY_NAMES.MODULE },
      active: true,
    };
    if (brandName) {
      where.brand = { name: { equals: brandName, mode: "insensitive" } };
    }
    const restrictIds = await this.restrictProductIds(source);
    if (restrictIds) {
      if (restrictIds.length === 0) return [];
      where.id = { in: restrictIds };
    }
    const rows = await this.prisma.product.findMany({
      where,
      include: { brand: true },
      orderBy: [{ brand: { name: "asc" } }, { name: "asc" }],
    });
    const filtered = rows.filter((p) => isModuleSpec(p.specs));
    return this.attachPrices(
      filtered.map((p) => ({
        id: p.id,
        name: p.name,
        brandName: p.brand.name,
        specs: p.specs as unknown as ModuleSpec,
      })),
      source
    );
  }

  async findActiveStringInverters(
    source: KitProductSource = {}
  ): Promise<ProductWithSpecs<StringInverterSpec>[]> {
    const where: { category: { name: string }; active: boolean; id?: { in: string[] } } = {
      category: { name: CATEGORY_NAMES.INVERTER },
      active: true,
    };
    const restrictIds = await this.restrictProductIds(source);
    if (restrictIds) {
      if (restrictIds.length === 0) return [];
      where.id = { in: restrictIds };
    }
    const rows = await this.prisma.product.findMany({
      where,
      include: { brand: true },
      orderBy: { name: "asc" },
    });
    const filtered = rows.filter((p) => isStringInverterSpec(p.specs));
    return this.attachPrices(
      filtered.map((p) => ({
        id: p.id,
        name: p.name,
        brandName: p.brand.name,
        specs: p.specs as unknown as StringInverterSpec,
      })),
      source
    );
  }

  async findActiveMicroInverters(
    source: KitProductSource = {}
  ): Promise<ProductWithSpecs<MicroInverterSpec>[]> {
    const where: { category: { name: string }; active: boolean; id?: { in: string[] } } = {
      category: { name: CATEGORY_NAMES.MICROINVERTER },
      active: true,
    };
    const restrictIds = await this.restrictProductIds(source);
    if (restrictIds) {
      if (restrictIds.length === 0) return [];
      where.id = { in: restrictIds };
    }
    const rows = await this.prisma.product.findMany({
      where,
      include: { brand: true },
      orderBy: { name: "asc" },
    });
    const filtered = rows.filter((p) => isMicroInverterSpec(p.specs));
    return this.attachPrices(
      filtered.map((p) => ({
        id: p.id,
        name: p.name,
        brandName: p.brand.name,
        specs: p.specs as unknown as MicroInverterSpec,
      })),
      source
    );
  }

  async findStructureKitByRoofType(
    roofType: string,
    source: KitProductSource = {}
  ): Promise<{
    id: string;
    name: string;
    brandName: string;
    price: number;
    maxModules: number;
  } | null> {
    const products = await this.prisma.product.findMany({
      where: {
        category: { name: CATEGORY_NAMES.STRUCTURE_KIT },
        active: true,
      },
      include: { brand: true },
    });
    const product = products.find(
      (p) => (p.specs as { roof_type?: string }).roof_type === roofType
    );
    if (!product) return null;
    const specs = product.specs as { roof_type?: string; max_modules?: number };
    if (typeof specs.max_modules !== "number") return null;
    const withPrice = await this.attachPrices(
      [
        {
          id: product.id,
          name: product.name,
          brandName: product.brand.name,
          maxModules: specs.max_modules,
        },
      ],
      source
    );
    const one = withPrice[0];
    if (!one) return null;
    return {
      id: product.id,
      name: one.name,
      brandName: one.brandName,
      price: one.price,
      maxModules: one.maxModules,
    };
  }

  async findDcCableBySection(
    sectionMm2: number,
    source: KitProductSource = {}
  ): Promise<{
    id: string;
    name: string;
    brandName: string;
    price: number;
    section_mm2: number;
  } | null> {
    const products = await this.prisma.product.findMany({
      where: {
        category: { name: CATEGORY_NAMES.DC_CABLE },
        active: true,
      },
      include: { brand: true },
    });
    const product = products.find(
      (p) => (p.specs as { section_mm2?: number }).section_mm2 === sectionMm2
    );
    if (!product) return null;
    const specs = product.specs as { section_mm2: number };
    const withPrice = await this.attachPrices(
      [
        {
          id: product.id,
          name: product.name,
          brandName: product.brand.name,
          section_mm2: specs.section_mm2,
        },
      ],
      source
    );
    const one = withPrice[0];
    if (!one) return null;
    return {
      id: product.id,
      name: one.name,
      brandName: one.brandName,
      price: one.price,
      section_mm2: one.section_mm2,
    };
  }

  async findConnectorByType(
    connectorType: string,
    source: KitProductSource = {}
  ): Promise<{
    id: string;
    name: string;
    brandName: string;
    price: number;
  } | null> {
    const products = await this.prisma.product.findMany({
      where: {
        category: { name: CATEGORY_NAMES.CONNECTOR },
        active: true,
      },
      include: { brand: true },
    });
    const product = products.find((p) => (p.specs as { type?: string }).type === connectorType);
    if (!product) return null;
    const withPrice = await this.attachPrices(
      [
        {
          id: product.id,
          name: product.name,
          brandName: product.brand.name,
        },
      ],
      source
    );
    const one = withPrice[0];
    if (!one) return null;
    return {
      id: product.id,
      name: one.name,
      brandName: one.brandName,
      price: one.price,
    };
  }

  async findCategoryByName(name: string): Promise<{ id: string } | null> {
    const cat = await this.prisma.category.findUnique({
      where: { name },
      select: { id: true },
    });
    return cat;
  }

  async findBrandByName(name: string): Promise<{ id: string } | null> {
    const brand = await this.prisma.brand.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    return brand;
  }
}
