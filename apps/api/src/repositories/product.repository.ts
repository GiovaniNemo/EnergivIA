import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SupplierProductRepository } from "./supplier-product.repository";
import type { ProductWithSpecs } from "../domain/solar-sizing/types";
import type {
  ModuleSpec,
  StringInverterSpec,
  MicroInverterSpec,
  HybridInverterSpec,
  OffGridInverterSpec,
  BatterySpec,
  BmsSpec,
  StringBoxSpec,
} from "../domain/product-specs";
import {
  isModuleSpec,
  isMicroInverterSpec,
  isStringInverterSpec,
  isHybridInverterSpec,
  isOffGridInverterSpec,
  isBatterySpec,
  isBmsSpec,
  isStringBoxSpec,
} from "../domain/product-specs";

const CATEGORY_NAMES = {
  MODULE: "module",
  INVERTER: "inverter",
  MICROINVERTER: "microinverter",
  HYBRID_INVERTER: "hybrid_inverter",
  OFF_GRID_INVERTER: "off_grid_inverter",
  BATTERY: "battery",
  BMS: "bms",
  STRUCTURE_KIT: "structure_kit",
  DC_CABLE: "dc_cable",
  CONNECTOR: "connector",
  PROFILE: "profile",
  STRING_BOX: "string_box",
} as const;

export type KitProductSource = {
  supplierId?: string;
  distributorId?: string;
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
    if (source.supplierId || source.distributorId) {
      const supIds = source.supplierId
        ? await this.supplierProductRepo.getProductIdsBySupplier(source.supplierId)
        : [];
      const distOffers = source.distributorId
        ? await this.prisma.distributorProduct.findMany({
            where: { distributorId: source.distributorId, stockQuantity: { gt: 0 } },
            select: { productId: true },
          })
        : [];
      const distIds = distOffers.map((o) => o.productId);
      return Array.from(new Set([...supIds, ...distIds]));
    }
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

    if (source.supplierId || source.distributorId) {
      const supOffers = source.supplierId
        ? await this.supplierProductRepo.getOffersBySupplier(source.supplierId, productIds)
        : new Map();

      const distOffersRows = source.distributorId
        ? await this.prisma.distributorProduct.findMany({
            where: {
              distributorId: source.distributorId,
              productId: { in: productIds },
              stockQuantity: { gt: 0 },
            },
          })
        : [];
      const distOffers = new Map(
        distOffersRows.map((o) => [o.productId, { price: Number(o.price) }])
      );

      return items
        .filter((p) => supOffers.has(p.id) || distOffers.has(p.id))
        .map((p) => {
          let price = 0;
          if (supOffers.has(p.id) && distOffers.has(p.id)) {
            price = Math.min(supOffers.get(p.id)!.price, distOffers.get(p.id)!.price);
          } else if (supOffers.has(p.id)) {
            price = supOffers.get(p.id)!.price;
          } else if (distOffers.has(p.id)) {
            price = distOffers.get(p.id)!.price;
          }
          return { ...p, price } as T & { price: number };
        });
    }

    const withPrice: (T & { price: number })[] = [];
    for (const item of items) {
      const offerSup = await this.supplierProductRepo.getCheapestOffer(item.id);
      const offerDistRow = await this.prisma.distributorProduct.findFirst({
        where: { productId: item.id },
        orderBy: { price: "asc" },
      });

      let bestPrice: number | null = null;
      const distPrice = offerDistRow ? Number(offerDistRow.price) : null;

      if (offerSup && distPrice !== null) bestPrice = Math.min(offerSup.price, distPrice);
      else if (offerSup) bestPrice = offerSup.price;
      else if (distPrice !== null) bestPrice = distPrice;

      if (bestPrice !== null)
        withPrice.push({ ...item, price: bestPrice } as T & { price: number });
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
        datasheetUrl: p.datasheetUrl,
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
        datasheetUrl: p.datasheetUrl,
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
        datasheetUrl: p.datasheetUrl,
      })),
      source
    );
  }

  async findActiveHybridInverters(
    source: KitProductSource = {}
  ): Promise<ProductWithSpecs<HybridInverterSpec>[]> {
    const where: { category: { name: string }; active: boolean; id?: { in: string[] } } = {
      category: { name: CATEGORY_NAMES.HYBRID_INVERTER },
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
    const filtered = rows.filter((p) => isHybridInverterSpec(p.specs));
    return this.attachPrices(
      filtered.map((p) => ({
        id: p.id,
        name: p.name,
        brandName: p.brand.name,
        specs: p.specs as unknown as HybridInverterSpec,
        datasheetUrl: p.datasheetUrl,
      })),
      source
    );
  }

  async findActiveOffGridInverters(
    source: KitProductSource = {}
  ): Promise<ProductWithSpecs<OffGridInverterSpec>[]> {
    const where: { category: { name: string }; active: boolean; id?: { in: string[] } } = {
      category: { name: CATEGORY_NAMES.OFF_GRID_INVERTER },
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
    const filtered = rows.filter((p) => isOffGridInverterSpec(p.specs));
    return this.attachPrices(
      filtered.map((p) => ({
        id: p.id,
        name: p.name,
        brandName: p.brand.name,
        specs: p.specs as unknown as OffGridInverterSpec,
        datasheetUrl: p.datasheetUrl,
      })),
      source
    );
  }

  async findActiveBatteries(source: KitProductSource = {}): Promise<
    {
      id: string;
      name: string;
      brandName: string;
      specs: BatterySpec;
      datasheetUrl?: string | null;
      price: number;
    }[]
  > {
    const where: { category: { name: string }; active: boolean; id?: { in: string[] } } = {
      category: { name: CATEGORY_NAMES.BATTERY },
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
    const filtered = rows.filter((p) => isBatterySpec(p.specs));
    return this.attachPrices(
      filtered.map((p) => ({
        id: p.id,
        name: p.name,
        brandName: p.brand.name,
        specs: p.specs as unknown as BatterySpec,
        datasheetUrl: p.datasheetUrl,
      })),
      source
    );
  }

  async findActiveBms(source: KitProductSource = {}): Promise<
    {
      id: string;
      name: string;
      brandName: string;
      specs: BmsSpec;
      datasheetUrl?: string | null;
      price: number;
    }[]
  > {
    const where: { category: { name: string }; active: boolean; id?: { in: string[] } } = {
      category: { name: CATEGORY_NAMES.BMS },
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
    const filtered = rows.filter((p) => isBmsSpec(p.specs));
    return this.attachPrices(
      filtered.map((p) => ({
        id: p.id,
        name: p.name,
        brandName: p.brand.name,
        specs: p.specs as unknown as BmsSpec,
        datasheetUrl: p.datasheetUrl,
      })),
      source
    );
  }

  async findActiveStringBoxes(source: KitProductSource = {}): Promise<
    {
      id: string;
      name: string;
      brandName: string;
      specs: StringBoxSpec;
      datasheetUrl?: string | null;
      price: number;
    }[]
  > {
    const where: { category: { name: string }; active: boolean; id?: { in: string[] } } = {
      category: { name: CATEGORY_NAMES.STRING_BOX },
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
    const filtered = rows.filter((p) => isStringBoxSpec(p.specs));
    return this.attachPrices(
      filtered.map((p) => ({
        id: p.id,
        name: p.name,
        brandName: p.brand.name,
        specs: p.specs as unknown as StringBoxSpec,
        datasheetUrl: p.datasheetUrl,
      })),
      source
    );
  }

  async findRecommendedStringBox(
    stringCount: number,
    mpptCount: number,
    source: KitProductSource = {}
  ): Promise<{
    id: string;
    name: string;
    brandName: string;
    price: number;
    specs: StringBoxSpec;
  } | null> {
    const allBoxes = await this.findActiveStringBoxes(source);
    if (allBoxes.length === 0) return null;

    // Ideal input/output matches
    // e.g. 1 string -> 1E/1S (inputs_count: 1, outputs_count: 1)
    // 2 strings, 2 mppts -> 2E/2S (inputs: 2, outputs: 2)
    // 2 strings, 1 mppt -> 2E/1S (inputs: 2, outputs: 1)
    const expectedInputs = Math.max(1, stringCount);
    const expectedOutputs = Math.min(expectedInputs, Math.max(1, mpptCount));

    // Try exact match by spec fields
    const exactMatch = allBoxes.find((b) => {
      const inputs = b.specs.inputs_count;
      const outputs = b.specs.outputs_count;
      if (inputs === expectedInputs && (outputs === expectedOutputs || !outputs)) return true;
      return false;
    });
    if (exactMatch) return exactMatch;

    // Try text heuristic matching from name (e.g. "2E/2S", "1E/1S", "2E-2S", "1E-1S", "2E / 2S")
    const searchToken = `${expectedInputs}E/${expectedOutputs}S`.toLowerCase();
    const searchTokenDash = `${expectedInputs}e-${expectedOutputs}s`.toLowerCase();
    const searchTokenSpace = `${expectedInputs}e / ${expectedOutputs}s`.toLowerCase();
    const nameMatch = allBoxes.find((b) => {
      const name = b.name.toLowerCase();
      return (
        name.includes(searchToken) ||
        name.includes(searchTokenDash) ||
        name.includes(searchTokenSpace) ||
        name.includes(`${expectedInputs}e`)
      );
    });
    if (nameMatch) return nameMatch;

    // Otherwise return the first available box
    return allBoxes[0] ?? null;
  }

  async findStructureKitsByRoofType(
    roofType: string,
    source: KitProductSource = {}
  ): Promise<
    {
      id: string;
      name: string;
      brandName: string;
      price: number;
      maxModules: number;
    }[]
  > {
    const products = await this.prisma.product.findMany({
      where: {
        category: { name: CATEGORY_NAMES.STRUCTURE_KIT },
        active: true,
      },
      include: { brand: true },
    });

    const matchingProducts = products.filter(
      (p) => (p.specs as { roof_type?: string }).roof_type === roofType
    );

    if (matchingProducts.length === 0) return [];

    const dtos = matchingProducts
      .filter((p) => typeof (p.specs as { max_modules?: number }).max_modules === "number")
      .map((p) => ({
        id: p.id,
        name: p.name,
        brandName: p.brand.name,
        maxModules: (p.specs as { max_modules?: number }).max_modules as number,
      }));

    if (dtos.length === 0) return [];

    const withPrice = await this.attachPrices(dtos, source);

    return withPrice
      .map((p) => ({
        id: p.id,
        name: p.name,
        brandName: p.brandName,
        price: p.price,
        maxModules: p.maxModules,
      }))
      .sort((a, b) => b.maxModules - a.maxModules); // Sort descending by max modules
  }

  async findDcCablesBySection(
    sectionMm2: number,
    source: KitProductSource = {}
  ): Promise<
    {
      id: string;
      name: string;
      brandName: string;
      price: number;
      section_mm2: number;
      color: "red" | "black" | "unknown";
      roll_length_m: number;
    }[]
  > {
    const products = await this.prisma.product.findMany({
      where: {
        category: { name: CATEGORY_NAMES.DC_CABLE },
        active: true,
      },
      include: { brand: true },
    });

    const matchingProducts = products.filter(
      (p) => Number((p.specs as Record<string, unknown>)["section_mm2"]) === sectionMm2
    );

    if (matchingProducts.length === 0) return [];

    const dtos = matchingProducts.map((p) => {
      const specs = p.specs as { section_mm2: number; color?: string; roll_length_m?: number };
      return {
        id: p.id,
        name: p.name,
        brandName: p.brand.name,
        section_mm2: specs.section_mm2,
        specColor: specs.color,
        roll_length_m: specs.roll_length_m,
      };
    });

    const withPrice = await this.attachPrices(dtos, source);

    return withPrice.map((p) => {
      const lowerName = p.name.toLowerCase();
      let color: "red" | "black" | "unknown" = "unknown";

      if (p.specColor === "vermelho" || p.specColor === "red") color = "red";
      else if (p.specColor === "preto" || p.specColor === "black") color = "black";
      else if (lowerName.includes("preto") || lowerName.includes("black")) color = "black";
      else if (lowerName.includes("vermelho") || lowerName.includes("red")) color = "red";

      return {
        id: p.id,
        name: p.name,
        brandName: p.brandName,
        price: p.price,
        section_mm2: p.section_mm2,
        color,
        roll_length_m: p.roll_length_m || 1,
      };
    });
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

  async findProfile(
    minLengthM: number,
    roofType: string,
    source: KitProductSource = {}
  ): Promise<{
    id: string;
    name: string;
    brandName: string;
    price: number;
  } | null> {
    const products = await this.prisma.product.findMany({
      where: {
        category: { name: CATEGORY_NAMES.PROFILE },
        active: true,
      },
      include: { brand: true },
    });

    let product = null;

    if (roofType === "metal") {
      product = products.find(
        (p) => (p.specs as { profile_type?: string }).profile_type === "baixo"
      );
    } else if (roofType === "ground") {
      product = products.find(
        (p) => (p.specs as { profile_type?: string }).profile_type === "fechamento"
      );
    }

    if (!product) {
      product = products.find((p) => {
        const specs = p.specs as { profile_type?: string; length_m?: number };
        // Do not pick specific profiles when looking for standard ones
        if (specs.profile_type === "baixo" || specs.profile_type === "fechamento") return false;
        const l = specs.length_m;
        return typeof l === "number" && l >= minLengthM;
      });
    }

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

  async findStringBoxById(
    stringBoxId: string,
    source: KitProductSource = {}
  ): Promise<{
    id: string;
    name: string;
    brandName: string;
    price: number;
  } | null> {
    const product = await this.prisma.product.findFirst({
      where: {
        id: stringBoxId,
        category: { name: CATEGORY_NAMES.STRING_BOX },
        active: true,
      },
      include: { brand: true },
    });
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
