import { Injectable, BadRequestException } from "@nestjs/common";
import { ProductRepository, type KitProductSource } from "../../repositories/product.repository";
import { sizeSolarSystem } from "../../domain/solar-sizing/solar-sizing.service";
import type {
  GenerateKitInput,
  GenerateKitResult,
  KitAlternativeOption,
  KitAlternativesResult,
  KitCrossSourceAlternative,
  KitItemLine,
  KitSourceOption,
  KitSourceOptionsResult,
  KitSwapCategory,
} from "./types";
import { isStringSizingResult } from "../../domain/solar-sizing/types";
import { PrismaService } from "../../prisma/prisma.service";
import { Decimal } from "@prisma/client/runtime/library";

const DC_CABLE_SECTION_MM2 = 6;
const DEFAULT_ROOF_TYPE = "ceramic";

const REQUIRED_KIT_CATEGORIES = 5;

function kitItemsTotal(items: KitItemLine[]): number {
  return Math.round(items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0) * 100) / 100;
}

type SizingResult = NonNullable<ReturnType<typeof sizeSolarSystem>>;

type BuiltKit = {
  kitItems: KitItemLine[];
  systemPowerKw: number;
  sizingResult: SizingResult;
};

@Injectable()
export class KitGenerationService {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly prisma: PrismaService
  ) {}

  async generateSolarKit(input: GenerateKitInput): Promise<GenerateKitResult> {
    const roofType = input.roof_type || DEFAULT_ROOF_TYPE;
    const wantStock = Boolean(input.stock_owner_org_id);

    let built: BuiltKit | null = null;
    let usedOwnStock = false;

    if (wantStock && input.stock_owner_org_id) {
      built = await this.buildKit(input, roofType, {
        stockOwnerOrgId: input.stock_owner_org_id,
      });
      if (built) usedOwnStock = true;
    }

    if (!built) {
      built = await this.buildKit(input, roofType, { supplierId: input.supplier_id });
    }

    if (!built) {
      throw new BadRequestException(
        wantStock
          ? "Não foi possível montar o kit pelo catálogo: não há módulo/inversor compatível." +
              (input.preferred_brand ? ` (marca "${input.preferred_brand}")` : "")
          : "Não foi possível montar o kit: catálogo sem módulo/inversor compatível." +
              (input.preferred_brand ? ` (marca "${input.preferred_brand}")` : "")
      );
    }

    const kit = await this.prisma.kit.create({
      data: { systemPowerKw: new Decimal(built.systemPowerKw) },
    });
    await this.prisma.kitItem.createMany({
      data: built.kitItems.map((item) => ({
        kitId: kit.id,
        productId: item.product_id,
        quantity: item.quantity,
      })),
    });

    return {
      kit_id: kit.id,
      system_power_kw: built.systemPowerKw,
      own_stock_used: usedOwnStock,
      modules: built.kitItems[0]!,
      inverter: built.kitItems[1]!,
      string_configuration: isStringSizingResult(built.sizingResult)
        ? {
            modules_per_string: built.sizingResult.string_configuration.modules_per_string,
            string_count: built.sizingResult.string_configuration.string_count,
            total_modules: built.sizingResult.string_configuration.total_modules,
            dc_power_w: built.sizingResult.string_configuration.dc_power_w,
            dc_ac_ratio: built.sizingResult.string_configuration.dc_ac_ratio,
          }
        : undefined,
      kit_items: built.kitItems,
    };
  }

  async listKitSourceOptions(
    input: GenerateKitInput,
    organizationId?: string
  ): Promise<KitSourceOptionsResult> {
    const roofType = input.roof_type || DEFAULT_ROOF_TYPE;

    const suppliers = await this.prisma.supplier.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    const supplierSources: KitSourceOption[] = [];
    for (const s of suppliers) {
      const built = await this.buildKit(input, roofType, { supplierId: s.id });
      supplierSources.push({
        type: "supplier",
        supplier_id: s.id,
        supplier_name: s.name,
        available: built !== null,
        complete: built !== null && built.kitItems.length >= REQUIRED_KIT_CATEGORIES,
        total: built ? kitItemsTotal(built.kitItems) : null,
        item_count: built ? built.kitItems.length : null,
      });
    }

    supplierSources.sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1;
      return (a.total ?? Number.MAX_SAFE_INTEGER) - (b.total ?? Number.MAX_SAFE_INTEGER);
    });

    const sources: KitSourceOption[] = [];
    if (organizationId) {
      const built = await this.buildKit(input, roofType, { stockOwnerOrgId: organizationId });
      sources.push({
        type: "own_stock",
        available: built !== null,
        complete: built !== null,
        total: built ? kitItemsTotal(built.kitItems) : null,
        item_count: built ? built.kitItems.length : null,
        covered_categories: built
          ? REQUIRED_KIT_CATEGORIES
          : await this.countStockCoveredCategories(organizationId, input, roofType),
        required_categories: REQUIRED_KIT_CATEGORIES,
      });
    }
    sources.push(...supplierSources);

    return { sources };
  }

  async listKitAlternatives(
    input: GenerateKitInput,
    category: KitSwapCategory,
    opts?: { includeOtherSources?: boolean; organizationId?: string }
  ): Promise<KitAlternativesResult> {
    const roofType = input.roof_type || DEFAULT_ROOF_TYPE;
    const source: KitProductSource = input.stock_owner_org_id
      ? { stockOwnerOrgId: input.stock_owner_org_id }
      : { supplierId: input.supplier_id };

    const candidates = await this.findSwapCandidates(input.preferred_brand, source, category);

    const alternatives = await Promise.all(
      candidates.map(async (candidate): Promise<KitAlternativeOption> => {
        const pinnedInput: GenerateKitInput = {
          ...input,
          ...(category === "module"
            ? { pinned_module_id: candidate.id }
            : { pinned_inverter_id: candidate.id }),
        };
        const built = await this.buildKit(pinnedInput, roofType, source);
        if (!built) {
          return {
            product_id: candidate.id,
            product_name: candidate.name,
            brand_name: candidate.brandName,
            unit_price: candidate.price,
            compatible: false,
            reason:
              category === "module"
                ? "Nenhum inversor desta origem fecha o dimensionamento com este módulo."
                : "Este inversor não fecha o dimensionamento com os módulos desta origem.",
          };
        }
        return this.toCompatibleAlternative(candidate, built, category);
      })
    );

    alternatives.sort((a, b) => {
      if (a.compatible !== b.compatible) return a.compatible ? -1 : 1;
      return (a.kit_total ?? Number.MAX_SAFE_INTEGER) - (b.kit_total ?? Number.MAX_SAFE_INTEGER);
    });

    if (!opts?.includeOtherSources) {
      return { category, alternatives };
    }

    const currentSupplierId = input.stock_owner_org_id ? undefined : input.supplier_id;
    const suppliers = await this.prisma.supplier.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    const otherSourceEntries: Array<{
      source: KitProductSource;
      source_type: "own_stock" | "supplier";
      supplier_id?: string;
      supplier_name?: string;
    }> = suppliers
      .filter((s) => s.id !== currentSupplierId)
      .map((s) => ({
        source: { supplierId: s.id },
        source_type: "supplier" as const,
        supplier_id: s.id,
        supplier_name: s.name,
      }));
    if (opts.organizationId && !input.stock_owner_org_id) {
      otherSourceEntries.push({
        source: { stockOwnerOrgId: opts.organizationId },
        source_type: "own_stock",
      });
    }

    const crossBase: GenerateKitInput = {
      ...input,
      pinned_module_id: undefined,
      pinned_inverter_id: undefined,
    };
    const nested = await Promise.all(
      otherSourceEntries.map(async (entry) => {
        const entryCandidates = await this.findSwapCandidates(
          input.preferred_brand,
          entry.source,
          category
        );
        const rows = await Promise.all(
          entryCandidates.map(async (candidate): Promise<KitCrossSourceAlternative | null> => {
            const pinnedInput: GenerateKitInput = {
              ...crossBase,
              ...(category === "module"
                ? { pinned_module_id: candidate.id }
                : { pinned_inverter_id: candidate.id }),
            };
            const built = await this.buildKit(pinnedInput, roofType, entry.source);
            if (!built) return null;
            return {
              ...this.toCompatibleAlternative(candidate, built, category),
              source_type: entry.source_type,
              supplier_id: entry.supplier_id,
              supplier_name: entry.supplier_name,
            };
          })
        );
        return rows.filter((r): r is KitCrossSourceAlternative => r !== null);
      })
    );
    const otherSources = nested
      .flat()
      .sort(
        (a, b) =>
          (a.kit_total ?? Number.MAX_SAFE_INTEGER) - (b.kit_total ?? Number.MAX_SAFE_INTEGER)
      );

    return { category, alternatives, other_sources: otherSources };
  }

  private async findSwapCandidates(
    preferredBrand: string | undefined,
    source: KitProductSource,
    category: KitSwapCategory
  ) {
    if (category === "module") {
      return this.productRepo.findActiveModules(preferredBrand, source);
    }
    const [stringInverters, microInverters] = await Promise.all([
      this.productRepo.findActiveStringInverters(source),
      this.productRepo.findActiveMicroInverters(source),
    ]);
    return [...stringInverters, ...microInverters];
  }

  private toCompatibleAlternative(
    candidate: { id: string; name: string; brandName: string; price: number },
    built: BuiltKit,
    category: KitSwapCategory
  ): KitAlternativeOption {
    const line = category === "module" ? built.kitItems[0]! : built.kitItems[1]!;
    const stringSummary = isStringSizingResult(built.sizingResult)
      ? `${built.sizingResult.string_configuration.string_count} strings de ${built.sizingResult.string_configuration.modules_per_string} módulos`
      : `${built.kitItems[0]!.quantity} módulos com microinversor`;
    return {
      product_id: candidate.id,
      product_name: candidate.name,
      brand_name: candidate.brandName,
      unit_price: candidate.price,
      compatible: true,
      quantity: line.quantity,
      kit_total: kitItemsTotal(built.kitItems),
      system_power_kw: built.systemPowerKw,
      string_summary: stringSummary,
    };
  }

  private async countStockCoveredCategories(
    orgId: string,
    input: GenerateKitInput,
    roofType: string
  ): Promise<number> {
    const source: KitProductSource = { stockOwnerOrgId: orgId };
    const [modules, stringInverters, microInverters, structureKit, dcCable, connector] =
      await Promise.all([
        this.productRepo.findActiveModules(input.preferred_brand, source),
        this.productRepo.findActiveStringInverters(source),
        this.productRepo.findActiveMicroInverters(source),
        this.productRepo.findStructureKitByRoofType(roofType, source),
        this.productRepo.findDcCableBySection(DC_CABLE_SECTION_MM2, source),
        this.productRepo.findConnectorByType("mc4", source),
      ]);
    let covered = 0;
    if (modules.length > 0) covered++;
    if (stringInverters.length > 0 || microInverters.length > 0) covered++;
    if (structureKit) covered++;
    if (dcCable) covered++;
    if (connector) covered++;
    return covered;
  }

  private async buildKit(
    input: GenerateKitInput,
    roofType: string,
    source: KitProductSource
  ): Promise<BuiltKit | null> {
    const requireComplete = Boolean(source.stockOwnerOrgId);

    const [allModules, allStringInverters, allMicroInverters] = await Promise.all([
      this.productRepo.findActiveModules(input.preferred_brand, source),
      this.productRepo.findActiveStringInverters(source),
      this.productRepo.findActiveMicroInverters(source),
    ]);
    const modules = input.pinned_module_id
      ? allModules.filter((m) => m.id === input.pinned_module_id)
      : allModules;
    const stringInverters = input.pinned_inverter_id
      ? allStringInverters.filter((i) => i.id === input.pinned_inverter_id)
      : allStringInverters;
    const microInverters = input.pinned_inverter_id
      ? allMicroInverters.filter((i) => i.id === input.pinned_inverter_id)
      : allMicroInverters;
    if (modules.length === 0) return null;

    const sizingResult = sizeSolarSystem({
      system_kw: input.system_kw,
      preferred_module_brand: input.preferred_brand,
      modules,
      stringInverters,
      microInverters,
    });
    if (!sizingResult) return null;

    const kitItems: KitItemLine[] = [];
    kitItems.push({
      product_id: sizingResult.module.id,
      product_name: sizingResult.module.name,
      brand_name: sizingResult.module.brandName,
      quantity: sizingResult.module_quantity,
      unit_price: sizingResult.module.price,
    });

    const inverterQuantity = isStringSizingResult(sizingResult)
      ? 1
      : sizingResult.microinverter_quantity;
    kitItems.push({
      product_id: sizingResult.inverter.id,
      product_name: sizingResult.inverter.name,
      brand_name: sizingResult.inverter.brandName,
      quantity: inverterQuantity,
      unit_price: sizingResult.inverter.price,
    });

    const stringCount = isStringSizingResult(sizingResult)
      ? sizingResult.string_configuration.string_count
      : sizingResult.module_quantity;
    const dcCableMeters = stringCount * 20 * 2;

    const [structureKit, dcCable, connector] = await Promise.all([
      this.productRepo.findStructureKitByRoofType(roofType, source),
      this.productRepo.findDcCableBySection(DC_CABLE_SECTION_MM2, source),
      this.productRepo.findConnectorByType("mc4", source),
    ]);

    if (requireComplete && (!structureKit || !dcCable || !connector)) return null;

    if (structureKit) {
      kitItems.push({
        product_id: structureKit.id,
        product_name: structureKit.name,
        brand_name: structureKit.brandName,
        quantity: 1,
        unit_price: structureKit.price,
      });
    }
    if (dcCable) {
      kitItems.push({
        product_id: dcCable.id,
        product_name: dcCable.name,
        brand_name: dcCable.brandName,
        quantity: Math.ceil(dcCableMeters),
        unit_price: dcCable.price,
      });
    }
    if (connector) {
      kitItems.push({
        product_id: connector.id,
        product_name: connector.name,
        brand_name: connector.brandName,
        quantity: stringCount,
        unit_price: connector.price,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const moduleSpecs = sizingResult.module.specs as any;
    const systemPowerKw = Number((sizingResult.module_quantity * moduleSpecs.power_w) / 1000);

    if (source.stockOwnerOrgId) {
      const availability = await this.productRepo.getStockAvailability(
        source.stockOwnerOrgId,
        kitItems.map((i) => i.product_id)
      );
      const enough = kitItems.every((i) => (availability.get(i.product_id) ?? 0) >= i.quantity);
      if (!enough) return null;
    }

    return { kitItems, systemPowerKw, sizingResult };
  }
}
