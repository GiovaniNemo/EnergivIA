import { Injectable, BadRequestException } from "@nestjs/common";
import { ProductRepository, type KitProductSource } from "../../repositories/product.repository";
import { sizeSolarSystem } from "../../domain/solar-sizing/solar-sizing.service";
import type {
  GenerateKitInput,
  GenerateKitResult,
  KitAlternativeOption,
  KitAlternativesResult,
  KitItemLine,
  KitSourceOption,
  KitSourceOptionsResult,
  KitSwapCategory,
  DistributorTierKit,
  DistributorTiersResult,
} from "./types";
import { isStringSizingResult, type ProductWithSpecs } from "../../domain/solar-sizing/types";
import type { ModuleSpec, StringInverterSpec } from "../../domain/product-specs";
import { PrismaService } from "../../prisma/prisma.service";
import { Decimal } from "@prisma/client/runtime/library";
import { formatKitForWhatsApp } from "./whatsapp-formatter.service";
import * as crypto from "crypto";

const DC_CABLE_SECTION_MM2 = 6;
const DEFAULT_ROOF_TYPE = "ceramic";

const REQUIRED_KIT_CATEGORIES = 5;

function kitItemsTotal(items: KitItemLine[]): number {
  return Math.round(items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0) * 100) / 100;
}

export function checkIsTier1Module(
  brandName?: string | null,
  productName?: string | null,
  isTier1Flag?: boolean
): boolean {
  if (isTier1Flag) return true;
  const combined = `${brandName || ""} ${productName || ""}`.toLowerCase();
  return /canadian|longi|jinko|ja solar|trina|risen|astronergy|chint|byd|dah solar|dah\b|osda|talesun|sunova|seraphim|gcl|tw solar|tongwei|sine|tier\s*1/i.test(
    combined
  );
}

function extractTier1Flag(obj: unknown): boolean {
  if (!obj || typeof obj !== "object") return false;
  if ("specs" in obj && obj.specs && typeof obj.specs === "object") {
    const s = obj.specs as Record<string, unknown>;
    return Boolean(s["is_tier_1"]);
  }
  if ("is_tier_1" in obj) {
    return Boolean((obj as Record<string, unknown>)["is_tier_1"]);
  }
  return false;
}

type SizingResult = NonNullable<ReturnType<typeof sizeSolarSystem>>;

type BuiltKit = {
  kitItems: KitItemLine[];
  systemPowerKw: number;
  sizingResult: SizingResult;
};

@Injectable()
export class KitGenerationService {
  private readonly sourceResolutionCache = new Map<string, KitProductSource>();
  private readonly productDistributorCache = new Map<string, string | null>();

  constructor(
    private readonly productRepo: ProductRepository,
    private readonly prisma: PrismaService
  ) {}

  private async getDistributorIdForProduct(productId: string): Promise<string | null> {
    if (this.productDistributorCache.has(productId)) {
      return this.productDistributorCache.get(productId)!;
    }
    const offer = await this.prisma.distributorProduct.findFirst({
      where: {
        productId,
        active: true,
        distributor: { active: true },
      },
      select: { distributorId: true },
    });
    const distId = offer?.distributorId ?? null;
    this.productDistributorCache.set(productId, distId);
    return distId;
  }

  private async resolveSource(rawId?: string): Promise<KitProductSource> {
    if (!rawId) return {};
    const cached = this.sourceResolutionCache.get(rawId);
    if (cached) return cached;

    let res: KitProductSource;
    // 1. Tentar encontrar por ID na tabela Distributor
    const distById = await this.prisma.distributor.findUnique({
      where: { id: rawId },
      select: { id: true, name: true },
    });
    if (distById) {
      const supByName = await this.prisma.supplier.findFirst({
        where: { name: { equals: distById.name, mode: "insensitive" } },
        select: { id: true },
      });
      res = { distributorId: distById.id, supplierId: supByName?.id };
    } else {
      // 2. Tentar encontrar por ID na tabela Supplier
      const supById = await this.prisma.supplier.findUnique({
        where: { id: rawId },
        select: { id: true, name: true },
      });
      if (supById) {
        const distByName = await this.prisma.distributor.findFirst({
          where: { name: { equals: supById.name, mode: "insensitive" }, active: true },
          select: { id: true },
        });
        res = { supplierId: supById.id, distributorId: distByName?.id };
      } else {
        res = { supplierId: rawId, distributorId: rawId };
      }
    }

    this.sourceResolutionCache.set(rawId, res);
    return res;
  }

  async generateSolarKit(
    input: GenerateKitInput,
    organizationId?: string
  ): Promise<GenerateKitResult> {
    const roofType = input.roof_type || DEFAULT_ROOF_TYPE;
    const wantStock = Boolean(input.stock_owner_org_id);

    let preferredModuleBrands: string[] = [];
    let preferredInverterBrands: string[] = [];
    const orgToLoad = organizationId || input.stock_owner_org_id;
    if (orgToLoad) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: orgToLoad },
        select: { settings: true },
      });
      const settings = (tenant?.settings as Record<string, unknown>) || {};
      if (Array.isArray(settings["preferredModuleBrands"])) {
        preferredModuleBrands = (settings["preferredModuleBrands"] as string[])
          .map((s) => String(s).toLowerCase().trim())
          .filter(Boolean);
      }
      if (Array.isArray(settings["preferredInverterBrands"])) {
        preferredInverterBrands = (settings["preferredInverterBrands"] as string[])
          .map((s) => String(s).toLowerCase().trim())
          .filter(Boolean);
      }
    }

    let built: BuiltKit | null = null;
    let usedOwnStock = false;

    if (wantStock && input.stock_owner_org_id) {
      built = await this.buildKit(
        input,
        roofType,
        { stockOwnerOrgId: input.stock_owner_org_id },
        preferredModuleBrands,
        preferredInverterBrands
      );
      if (built) usedOwnStock = true;
    }

    const resolvedSource = await this.resolveSource(input.supplier_id);

    if (!built) {
      built = await this.buildKit(
        input,
        roofType,
        resolvedSource,
        preferredModuleBrands,
        preferredInverterBrands
      );
    }

    if (!built && input.preferred_brand) {
      // Fallback: Tenta novamente com outras marcas ativas disponíveis para não deixar o cliente sem cotação
      const fallbackInput = { ...input, preferred_brand: undefined };
      built = await this.buildKit(
        fallbackInput,
        roofType,
        resolvedSource,
        preferredModuleBrands,
        preferredInverterBrands
      );
    }

    // Fallback em distribuidores ativos caso a fonte primária não tenha fechado o kit
    if (!built) {
      const activeDistributors = await this.prisma.distributor.findMany({
        where: { active: true },
        select: { id: true },
      });
      for (const dist of activeDistributors) {
        built = await this.buildKit(
          input,
          roofType,
          { distributorId: dist.id },
          preferredModuleBrands,
          preferredInverterBrands
        );
        if (built) break;
        if (input.preferred_brand) {
          built = await this.buildKit(
            { ...input, preferred_brand: undefined },
            roofType,
            { distributorId: dist.id },
            preferredModuleBrands,
            preferredInverterBrands
          );
          if (built) break;
        }
      }
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

    return this.persistKitResult(built, usedOwnStock);
  }

  private async persistKitResult(
    built: BuiltKit,
    usedOwnStock: boolean,
    persist = false
  ): Promise<GenerateKitResult> {
    let kitId: string = crypto.randomUUID();
    if (persist) {
      try {
        const kit = await this.prisma.kit.create({
          data: { systemPowerKw: new Decimal(built.systemPowerKw) },
        });
        kitId = kit.id;
        await this.prisma.kitItem.createMany({
          data: built.kitItems.map((item) => ({
            kitId: kit.id,
            productId: item.product_id,
            quantity: item.quantity,
          })),
        });
      } catch (err) {
        // Fallback gracefully without failing the calculation
        console.warn("[persistKitResult] Skipped DB persist:", err);
      }
    }

    return {
      kit_id: kitId,
      system_power_kw: built.systemPowerKw,
      own_stock_used: usedOwnStock,
      modules: {
        ...built.kitItems[0]!,
        is_tier_1: checkIsTier1Module(
          built.kitItems[0]?.brand_name || built.sizingResult.module.brandName,
          built.kitItems[0]?.product_name || built.sizingResult.module.name,
          extractTier1Flag(built.sizingResult.module)
        ),
      },
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

  async generateDistributorTiers(
    input: GenerateKitInput,
    organizationId?: string
  ): Promise<DistributorTiersResult> {
    const roofType = input.roof_type || DEFAULT_ROOF_TYPE;
    const wantStock = Boolean(input.stock_owner_org_id);
    let resolvedSource = await this.resolveSource(input.supplier_id);
    let source: KitProductSource =
      wantStock && organizationId ? { stockOwnerOrgId: organizationId } : resolvedSource;

    let preferredModuleBrands: string[] = [];
    let preferredInverterBrands: string[] = [];
    let moduleTiersConfig: {
      standard?: string[];
      elite?: string[];
      premium?: string[];
      priority?: string | null;
    } | null = null;
    let inverterTiersConfig: {
      standard?: string[];
      elite?: string[];
      premium?: string[];
      priority?: string | null;
    } | null = null;

    if (organizationId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: organizationId },
        select: { settings: true },
      });
      const settings = (tenant?.settings as Record<string, unknown>) || {};
      if (Array.isArray(settings["preferredModuleBrands"])) {
        preferredModuleBrands = (settings["preferredModuleBrands"] as string[])
          .map((s) => String(s).toLowerCase().trim())
          .filter(Boolean);
      }
      if (Array.isArray(settings["preferredInverterBrands"])) {
        preferredInverterBrands = (settings["preferredInverterBrands"] as string[])
          .map((s) => String(s).toLowerCase().trim())
          .filter(Boolean);
      }
      if (settings["moduleBrandTiers"] && typeof settings["moduleBrandTiers"] === "object") {
        moduleTiersConfig = settings["moduleBrandTiers"] as {
          standard?: string[];
          elite?: string[];
          premium?: string[];
          priority?: string | null;
        };
      }
      if (settings["inverterBrandTiers"] && typeof settings["inverterBrandTiers"] === "object") {
        inverterTiersConfig = settings["inverterBrandTiers"] as {
          standard?: string[];
          elite?: string[];
          premium?: string[];
          priority?: string | null;
        };
      }
    }

    // 1. Build default base kit first as baseline
    let baseBuilt: BuiltKit | null = null;
    let usedOwnStock = false;

    if (wantStock && organizationId) {
      baseBuilt = await this.buildKit(
        input,
        roofType,
        { stockOwnerOrgId: organizationId },
        preferredModuleBrands,
        preferredInverterBrands
      );
      if (baseBuilt) usedOwnStock = true;
    }

    if (!baseBuilt) {
      baseBuilt = await this.buildKit(
        input,
        roofType,
        source,
        preferredModuleBrands,
        preferredInverterBrands
      );
    }

    if (!baseBuilt && input.preferred_brand) {
      // Fallback: se a marca solicitada não fechou o kit base, tenta sem a restrição para garantir os tiers
      const fallbackInput = { ...input, preferred_brand: undefined };
      baseBuilt = await this.buildKit(
        fallbackInput,
        roofType,
        source,
        preferredModuleBrands,
        preferredInverterBrands
      );
    }

    // Fallback dinâmico nos distribuidores ativos se ainda não fechou
    if (!baseBuilt) {
      const activeDistributors = await this.prisma.distributor.findMany({
        where: { active: true },
        select: { id: true },
      });
      for (const dist of activeDistributors) {
        baseBuilt = await this.buildKit(
          input,
          roofType,
          { distributorId: dist.id },
          preferredModuleBrands,
          preferredInverterBrands
        );
        if (baseBuilt) {
          source = { distributorId: dist.id };
          break;
        }
        if (input.preferred_brand) {
          baseBuilt = await this.buildKit(
            { ...input, preferred_brand: undefined },
            roofType,
            { distributorId: dist.id },
            preferredModuleBrands,
            preferredInverterBrands
          );
          if (baseBuilt) {
            source = { distributorId: dist.id };
            break;
          }
        }
      }
    }

    if (!baseBuilt) {
      throw new BadRequestException(
        "Não foi possível montar os kits: catálogo sem módulo/inversor compatível." +
          (input.preferred_brand ? ` (marca "${input.preferred_brand}")` : "")
      );
    }

    // 2. Fetch all modules and inverters from active catalog (permite misturar módulos e inversores de todos os distribuidores ativos)
    const equipmentSource: KitProductSource =
      wantStock && organizationId ? { stockOwnerOrgId: organizationId } : {};

    const [allModules, allStringInverters, allMicroInverters, allHybridInverters] =
      await Promise.all([
        this.productRepo.findActiveModules(undefined, equipmentSource),
        this.productRepo.findActiveStringInverters(equipmentSource),
        this.productRepo.findActiveMicroInverters(equipmentSource),
        this.productRepo.findActiveHybridInverters(equipmentSource),
      ]);

    // Rank modules by price per watt, prioritizing preferred brands first
    const modulesWithPower = allModules.map((m) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const powerW = Number((m.specs as any)?.power_w) || 585;
      const pricePerW = m.price / powerW;
      return { module: m, powerW, pricePerW };
    });
    modulesWithPower.sort((a, b) => {
      const aBrand = (a.module.brandName || "").toLowerCase().trim();
      const bBrand = (b.module.brandName || "").toLowerCase().trim();

      // 1ª prioridade: marca solicitada explicitamente na simulação
      if (input.preferred_brand) {
        const prefLower = input.preferred_brand.toLowerCase().trim();
        const aExact = aBrand === prefLower;
        const bExact = bBrand === prefLower;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
      }

      // 2ª prioridade: marcas preferidas configuradas no perfil do integrador (prioritária primeiro, depois fallback)
      const aIdx = preferredModuleBrands.findIndex((p) => aBrand.includes(p) || p.includes(aBrand));
      const bIdx = preferredModuleBrands.findIndex((p) => bBrand.includes(p) || p.includes(bBrand));
      const aRank = aIdx === -1 ? 9999 : aIdx;
      const bRank = bIdx === -1 ? 9999 : bIdx;
      if (aRank !== bRank) return aRank - bRank;

      // 3ª prioridade: menor preço por Watt
      return a.pricePerW - b.pricePerW;
    });

    const getInverterPowerKw = (inv: ProductWithSpecs<StringInverterSpec>): number => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const specs = inv.specs as any;
      if (specs && typeof specs.nominal_power_w === "number" && specs.nominal_power_w > 0) {
        return specs.nominal_power_w / 1000;
      }
      const match = inv.name.match(/(\d+(?:[.,]\d+)?)\s*(?:kw|k)\b/i);
      if (match && match[1]) return parseFloat(match[1].replace(",", "."));
      return 5;
    };

    const minInvPowerKw =
      input.system_kw >= 200
        ? 40
        : input.system_kw >= 80
          ? 20
          : input.system_kw >= 35
            ? 10
            : input.system_kw >= 15
              ? 5
              : 1;

    const scaleCompatibleString = allStringInverters.filter(
      (inv) => getInverterPowerKw(inv) >= minInvPowerKw
    );
    const effectiveStringInverters =
      scaleCompatibleString.length > 0 ? scaleCompatibleString : allStringInverters;

    const calcInverterUnitsNeeded = (inv: ProductWithSpecs<StringInverterSpec>): number => {
      const p = getInverterPowerKw(inv);
      if (p <= 0) return 9999;
      return Math.ceil(input.system_kw / (p * 1.35));
    };

    const sortStringInverters = (inverters: ProductWithSpecs<StringInverterSpec>[]) => {
      const maxAutoN = input.system_kw >= 200 ? 6 : 4;
      return [...inverters].sort((a, b) => {
        // 1ª prioridade: unidades coerentes para o porte (modelos que precisam de <= maxAutoN unidades têm preferência absoluta)
        const aUnits = calcInverterUnitsNeeded(a);
        const bUnits = calcInverterUnitsNeeded(b);
        const aScaleOk = aUnits <= maxAutoN ? 1 : 0;
        const bScaleOk = bUnits <= maxAutoN ? 1 : 0;
        if (aScaleOk !== bScaleOk) return bScaleOk - aScaleOk;

        // 2ª prioridade: marcas preferidas configuradas
        const aBrand = (a.brandName || "").toLowerCase().trim();
        const bBrand = (b.brandName || "").toLowerCase().trim();
        const aIdx = preferredInverterBrands.findIndex(
          (p) => aBrand.includes(p) || p.includes(aBrand)
        );
        const bIdx = preferredInverterBrands.findIndex(
          (p) => bBrand.includes(p) || p.includes(bBrand)
        );
        const aRank = aIdx === -1 ? 9999 : aIdx;
        const bRank = bIdx === -1 ? 9999 : bIdx;
        if (aRank !== bRank) return aRank - bRank;

        // 3ª prioridade: menor quantidade de unidades
        if (aUnits !== bUnits) return aUnits - bUnits;

        return a.price - b.price;
      });
    };

    const sortOtherInverters = <T extends { brandName: string; price: number }>(
      inverters: T[]
    ): T[] => {
      return [...inverters].sort((a, b) => {
        const aBrand = (a.brandName || "").toLowerCase().trim();
        const bBrand = (b.brandName || "").toLowerCase().trim();
        const aIdx = preferredInverterBrands.findIndex(
          (p) => aBrand.includes(p) || p.includes(aBrand)
        );
        const bIdx = preferredInverterBrands.findIndex(
          (p) => bBrand.includes(p) || p.includes(bBrand)
        );
        const aRank = aIdx === -1 ? 9999 : aIdx;
        const bRank = bIdx === -1 ? 9999 : bIdx;
        if (aRank !== bRank) return aRank - bRank;
        return a.price - b.price;
      });
    };

    const sortedString = sortStringInverters(effectiveStringInverters);
    const sortedMicro = sortOtherInverters(allMicroInverters);
    const sortedHybrid = sortOtherInverters(allHybridInverters);

    // Module candidates fallback
    const economicCandidateModule = modulesWithPower[0]?.module;
    const premiumCandidateModule =
      modulesWithPower.length > 1
        ? modulesWithPower[modulesWithPower.length - 1]?.module
        : modulesWithPower[0]?.module;
    const costBenefitCandidateModule =
      modulesWithPower.length > 2
        ? modulesWithPower[Math.floor(modulesWithPower.length / 2)]?.module
        : modulesWithPower.length > 1
          ? modulesWithPower[1]?.module
          : modulesWithPower[0]?.module;

    const findModuleForBrands = (
      brands: string[] | undefined,
      defaultCandidate?: ProductWithSpecs<ModuleSpec>
    ) => {
      if (brands && brands.length > 0) {
        const bLowers = brands.map((b) => b.toLowerCase().trim()).filter(Boolean);
        const match = modulesWithPower.find((m) => {
          const mBrand = (m.module.brandName || "").toLowerCase().trim();
          return bLowers.some((b) => mBrand.includes(b) || b.includes(mBrand));
        });
        if (match) return match.module;
      }
      return defaultCandidate;
    };

    const findInverterForBrands = (brands: string[] | undefined, defaultId?: string) => {
      if (brands && brands.length > 0) {
        const bLowers = brands.map((b) => b.toLowerCase().trim()).filter(Boolean);
        const match = sortedString.find((i) => {
          const iBrand = (i.brandName || "").toLowerCase().trim();
          return bLowers.some((b) => iBrand.includes(b) || b.includes(iBrand));
        });
        if (match) return match.id;
      }
      return defaultId;
    };

    // Helper to safely build or fallback
    const tryBuild = async (pinned: {
      moduleId?: string;
      inverterId?: string;
      inverterType?: "string" | "microinverter" | "hybrid" | "off_grid";
    }): Promise<BuiltKit> => {
      const trialInput: GenerateKitInput = {
        ...input,
        ...(pinned.moduleId ? { pinned_module_id: pinned.moduleId } : {}),
        ...(pinned.inverterId ? { pinned_inverter_id: pinned.inverterId } : {}),
        ...(pinned.inverterType ? { inverter_type: pinned.inverterType } : {}),
      };
      let res = await this.buildKit(
        trialInput,
        roofType,
        source,
        preferredModuleBrands,
        preferredInverterBrands
      );
      if (
        !res &&
        pinned.inverterId &&
        sortedString[0]?.id &&
        pinned.inverterId !== sortedString[0].id
      ) {
        const retryInput: GenerateKitInput = {
          ...trialInput,
          pinned_inverter_id: sortedString[0].id,
        };
        res = await this.buildKit(
          retryInput,
          roofType,
          source,
          preferredModuleBrands,
          preferredInverterBrands
        );
      }
      return res || baseBuilt!;
    };

    // 3. Assemble Economic kit (Standard)
    const pinnedModule = input.pinned_module_id
      ? allModules.find((m) => m.id === input.pinned_module_id)
      : undefined;
    const pinnedInverterId = input.pinned_inverter_id;

    const economicModule =
      pinnedModule || findModuleForBrands(moduleTiersConfig?.standard, economicCandidateModule);
    const economicInverterId =
      pinnedInverterId ||
      (input.inverter_type === "microinverter"
        ? sortedMicro[0]?.id
        : input.inverter_type === "hybrid"
          ? sortedHybrid[0]?.id
          : findInverterForBrands(inverterTiersConfig?.standard, sortedString[0]?.id));

    let economicBuilt: BuiltKit | null = null;
    if (economicModule) {
      economicBuilt = await tryBuild({
        moduleId: economicModule.id,
        inverterId: economicInverterId,
        inverterType: input.inverter_type || "string",
      });
    }
    if (!economicBuilt) economicBuilt = baseBuilt;

    // 4. Assemble Cost-Benefit kit (Elite)
    const eliteModBrands = moduleTiersConfig?.priority
      ? [moduleTiersConfig.priority, ...(moduleTiersConfig.elite || [])]
      : moduleTiersConfig?.elite;
    const eliteInvBrands = inverterTiersConfig?.priority
      ? [inverterTiersConfig.priority, ...(inverterTiersConfig.elite || [])]
      : inverterTiersConfig?.elite;

    const costBenefitModule =
      pinnedModule ||
      findModuleForBrands(
        eliteModBrands,
        costBenefitCandidateModule && costBenefitCandidateModule.id !== economicCandidateModule?.id
          ? costBenefitCandidateModule
          : modulesWithPower[Math.min(1, modulesWithPower.length - 1)]?.module
      );
    const costBenefitInverterId =
      pinnedInverterId ||
      findInverterForBrands(
        eliteInvBrands,
        sortedString.length > 1
          ? sortedString[Math.floor(sortedString.length / 2)]?.id
          : sortedString[0]?.id
      );

    let costBenefitBuilt: BuiltKit | null = null;
    if (costBenefitModule) {
      costBenefitBuilt = await tryBuild({
        moduleId: costBenefitModule.id,
        inverterId: costBenefitInverterId,
        inverterType: input.inverter_type,
      });
    }
    if (!costBenefitBuilt) costBenefitBuilt = baseBuilt;

    // 5. Assemble Premium kit
    const premiumModule =
      pinnedModule ||
      findModuleForBrands(
        moduleTiersConfig?.premium,
        premiumCandidateModule || modulesWithPower[modulesWithPower.length - 1]?.module
      );
    const premiumInverterId =
      pinnedInverterId || findInverterForBrands(inverterTiersConfig?.premium, sortedString[0]?.id);

    let premiumBuilt: BuiltKit | null = null;
    const requestedInverterType = input.inverter_type;

    if (requestedInverterType === "microinverter") {
      if (sortedMicro.length > 0) {
        premiumBuilt = await tryBuild({
          moduleId: premiumModule?.id,
          inverterId: sortedMicro[0]?.id,
          inverterType: "microinverter",
        });
      }
    } else if (requestedInverterType === "hybrid") {
      if (sortedHybrid.length > 0) {
        premiumBuilt = await tryBuild({
          moduleId: premiumModule?.id,
          inverterId: sortedHybrid[0]?.id,
          inverterType: "hybrid",
        });
      }
    } else {
      premiumBuilt = await tryBuild({
        moduleId: premiumModule?.id,
        inverterId: premiumInverterId,
        inverterType: "string",
      });
    }
    if (!premiumBuilt) premiumBuilt = baseBuilt;

    const buildTierKit = async (
      tierId: "economic" | "cost_benefit" | "premium",
      name: string,
      badge: string,
      tagline: string,
      built: BuiltKit
    ): Promise<DistributorTierKit> => {
      const kitResult = await this.persistKitResult(built, usedOwnStock, false);
      const equipmentTotal = kitItemsTotal(built.kitItems);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const moduleSpecs = built.sizingResult.module.specs as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inverterSpecs = built.sizingResult.inverter.specs as any;
      const invModelName =
        built.kitItems[1]?.product_name || built.sizingResult.inverter.name || "";
      let singleInvPowerKw = Number(inverterSpecs.nominal_power_w) / 1000;
      if (!Number.isFinite(singleInvPowerKw) || singleInvPowerKw <= 0) {
        const match = invModelName.match(/\b(\d+(?:[.,]\d+)?)\s*(?:kw|k)\b/i);
        if (match && match[1]) {
          singleInvPowerKw = parseFloat(match[1].replace(",", "."));
        } else if (inverterSpecs.max_dc_power) {
          singleInvPowerKw =
            Math.round((Number(inverterSpecs.max_dc_power) / 1.5 / 1000) * 10) / 10;
        } else {
          singleInvPowerKw = 3.0;
        }
      }
      const invPowerKw = Math.round(singleInvPowerKw * 10) / 10;

      return {
        tier_id: tierId,
        name,
        badge,
        tagline,
        kit_result: kitResult,
        whatsapp_message: formatKitForWhatsApp(kitResult),
        equipment_total: equipmentTotal,
        rate_per_kwp: Math.round(equipmentTotal / Math.max(0.1, built.systemPowerKw)),
        inverter_brand: built.kitItems[1]?.brand_name || built.sizingResult.inverter.brandName,
        inverter_model: built.kitItems[1]?.product_name || built.sizingResult.inverter.name,
        inverter_power_kw: invPowerKw,
        inverter_qty: built.kitItems[1]?.quantity || 1,
        module_brand: built.kitItems[0]?.brand_name || built.sizingResult.module.brandName,
        module_model: built.kitItems[0]?.product_name || built.sizingResult.module.name,
        module_qty: built.kitItems[0]?.quantity || built.sizingResult.module_quantity,
        module_power_w: Number(moduleSpecs.power_w) || 585,
        module_is_tier_1: checkIsTier1Module(
          built.kitItems[0]?.brand_name || built.sizingResult.module.brandName,
          built.kitItems[0]?.product_name || built.sizingResult.module.name,
          Boolean(moduleSpecs?.is_tier_1)
        ),
        estimated_monthly_generation_kwh: Math.round(
          built.systemPowerKw *
            (input.monthly_generation_factor ||
              (input.monthly_yield && input.monthly_yield > 40 ? input.monthly_yield : 130))
        ),
      };
    };

    const [economicTier, costBenefitTier, premiumTier] = await Promise.all([
      buildTierKit(
        "economic",
        "Standard",
        "Preço Mais Baixo",
        "Menor investimento em equipamentos com boa performance",
        economicBuilt
      ),
      buildTierKit(
        "cost_benefit",
        "Elite",
        "Mais Vendido",
        "Melhor equilíbrio entre preço, tecnologia e durabilidade",
        costBenefitBuilt
      ),
      buildTierKit(
        "premium",
        "Premium",
        "Alta Eficiência",
        "Tecnologia de ponta, marcas Tier 1 globais e garantia estendida",
        premiumBuilt
      ),
    ]);

    return {
      tiers: [economicTier, costBenefitTier, premiumTier],
    };
  }

  async listKitSourceOptions(
    input: GenerateKitInput,
    organizationId?: string
  ): Promise<KitSourceOptionsResult> {
    const roofType = input.roof_type || DEFAULT_ROOF_TYPE;

    const suppliers = await this.prisma.supplier.findMany({ select: { id: true, name: true } });
    const distributors = await this.prisma.distributor.findMany({
      where: { active: true },
      select: { id: true, name: true },
    });

    const originMap = new Map<
      string,
      { name: string; supplierId?: string; distributorId?: string }
    >();
    for (const s of suppliers) {
      originMap.set(s.name.trim().toLowerCase(), { name: s.name.trim(), supplierId: s.id });
    }
    for (const d of distributors) {
      const key = d.name.trim().toLowerCase();
      const existing = originMap.get(key);
      if (existing) {
        existing.distributorId = d.id;
      } else {
        originMap.set(key, { name: d.name.trim(), distributorId: d.id });
      }
    }
    const allOrigins = Array.from(originMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    const supplierSources: KitSourceOption[] = await Promise.all(
      allOrigins.map(async (origin) => {
        const built = await this.buildKit(input, roofType, {
          supplierId: origin.supplierId,
          distributorId: origin.distributorId,
        });
        return {
          type: "supplier" as const,
          supplier_id: origin.distributorId || origin.supplierId,
          supplier_name: origin.name,
          available: built !== null,
          complete: built !== null && built.kitItems.length >= REQUIRED_KIT_CATEGORIES,
          total: built ? kitItemsTotal(built.kitItems) : null,
          item_count: built ? built.kitItems.length : null,
        };
      })
    );

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

    const currentInverterId = input.pinned_inverter_id;
    const currentModuleId = input.pinned_module_id;

    let targetInverterType = input.inverter_type;
    if (category === "inverter" && !targetInverterType) {
      if (currentInverterId) {
        const [microList, hybridList, offGridList] = await Promise.all([
          this.productRepo.findActiveMicroInverters(),
          this.productRepo.findActiveHybridInverters(),
          this.productRepo.findActiveOffGridInverters(),
        ]);
        if (microList.some((m) => m.id === currentInverterId)) {
          targetInverterType = "microinverter";
        } else if (hybridList.some((h) => h.id === currentInverterId)) {
          targetInverterType = "hybrid";
        } else if (offGridList.some((o) => o.id === currentInverterId)) {
          targetInverterType = "off_grid";
        } else {
          targetInverterType = "string";
        }
      } else if (input.system_kw && input.system_kw > 15) {
        targetInverterType = "string";
      }
    }

    // Busca todos os candidatos ativos do catálogo geral para permitir troca entre distribuidores
    const candidates = await this.findSwapCandidates(
      undefined,
      input.stock_owner_org_id ? { stockOwnerOrgId: input.stock_owner_org_id } : {},
      category,
      targetInverterType,
      input.system_kw
    );

    // Mapeia o distribuidor de cada candidato para exibir na listagem
    const candidateIds = candidates.map((c) => c.id);
    const distOffers = await this.prisma.distributorProduct.findMany({
      where: {
        productId: { in: candidateIds },
        active: true,
        distributor: { active: true },
      },
      include: {
        distributor: { select: { id: true, name: true } },
      },
      orderBy: { price: "asc" },
    });

    const distMap = new Map<string, { distributorId: string; distributorName: string }>();
    for (const d of distOffers) {
      if (!distMap.has(d.productId)) {
        distMap.set(d.productId, {
          distributorId: d.distributorId,
          distributorName: d.distributor?.name || "Distribuidor",
        });
      }
    }

    const alternatives = await Promise.all(
      candidates.map(async (candidate): Promise<KitAlternativeOption> => {
        const distInfo = distMap.get(candidate.id);
        const pinnedInput: GenerateKitInput = {
          ...input,
          ...(targetInverterType ? { inverter_type: targetInverterType } : {}),
          ...(category === "module"
            ? {
                pinned_module_id: candidate.id,
                ...(currentInverterId ? { pinned_inverter_id: currentInverterId } : {}),
              }
            : {
                pinned_inverter_id: candidate.id,
                ...(currentModuleId ? { pinned_module_id: currentModuleId } : {}),
              }),
        };

        // Permite dimensionamento misto de inversores e módulos entre distribuidores
        const built = await this.buildKit(pinnedInput, roofType, {});
        if (!built) {
          return {
            product_id: candidate.id,
            product_name: candidate.name,
            brand_name: candidate.brandName,
            unit_price: candidate.price,
            compatible: false,
            reason:
              category === "module"
                ? "Incompatível com o inversor atual (tensão, corrente ou faixa MPPT fora da especificação técnica)."
                : "Incompatível com o módulo atual (tensão, corrente ou faixa MPPT fora da especificação técnica).",
            datasheet_url: candidate.datasheetUrl,
            is_tier_1:
              category === "module"
                ? checkIsTier1Module(
                    candidate.brandName,
                    candidate.name,
                    extractTier1Flag(candidate)
                  )
                : undefined,
            distributor_id: distInfo?.distributorId,
            distributor_name:
              distInfo?.distributorName ||
              (candidate as unknown as { distributorName?: string }).distributorName ||
              (input.stock_owner_org_id ? "Meu Estoque" : "Distribuidor"),
          };
        }

        const alt = this.toCompatibleAlternative(candidate, built, category);
        return {
          ...alt,
          distributor_id: distInfo?.distributorId,
          distributor_name:
            distInfo?.distributorName ||
            (candidate as unknown as { distributorName?: string }).distributorName ||
            (input.stock_owner_org_id ? "Meu Estoque" : "Distribuidor"),
        };
      })
    );

    let preferredBrands: string[] = [];
    if (opts?.organizationId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: opts.organizationId },
        select: { settings: true },
      });
      const settings = (tenant?.settings as Record<string, unknown>) || {};
      const key = category === "module" ? "preferredModuleBrands" : "preferredInverterBrands";
      if (Array.isArray(settings[key])) {
        preferredBrands = (settings[key] as string[])
          .map((s) => String(s).toLowerCase().trim())
          .filter(Boolean);
      }
    }

    alternatives.sort((a, b) => {
      if (a.compatible !== b.compatible) return a.compatible ? -1 : 1;
      const aBrand = (a.brand_name || "").toLowerCase().trim();
      const bBrand = (b.brand_name || "").toLowerCase().trim();
      const aPref = preferredBrands.some((p) => aBrand.includes(p) || p.includes(aBrand));
      const bPref = preferredBrands.some((p) => bBrand.includes(p) || p.includes(bBrand));
      if (aPref && !bPref) return -1;
      if (!aPref && bPref) return 1;
      return (a.unit_price ?? 0) - (b.unit_price ?? 0);
    });

    return { category, alternatives, other_sources: [] };
  }

  private async findSwapCandidates(
    preferredBrand: string | undefined,
    source: KitProductSource,
    category: KitSwapCategory,
    inverterType?: "string" | "microinverter" | "hybrid" | "off_grid",
    systemKw?: number
  ) {
    if (category === "module") {
      return this.productRepo.findActiveModules(preferredBrand, source);
    }
    if (inverterType === "string") {
      return this.productRepo.findActiveStringInverters(source);
    }
    if (inverterType === "microinverter") {
      return this.productRepo.findActiveMicroInverters(source);
    }
    if (inverterType === "hybrid") {
      return this.productRepo.findActiveHybridInverters(source);
    }
    if (inverterType === "off_grid") {
      return this.productRepo.findActiveOffGridInverters(source);
    }

    if (systemKw && systemKw > 15) {
      return this.productRepo.findActiveStringInverters(source);
    }

    const [stringInverters, microInverters, hybridInverters, offGridInverters] = await Promise.all([
      this.productRepo.findActiveStringInverters(source),
      this.productRepo.findActiveMicroInverters(source),
      this.productRepo.findActiveHybridInverters(source),
      this.productRepo.findActiveOffGridInverters(source),
    ]);
    return [...stringInverters, ...microInverters, ...hybridInverters, ...offGridInverters];
  }

  private toCompatibleAlternative(
    candidate: {
      id: string;
      name: string;
      brandName: string;
      price: number;
      datasheetUrl?: string | null;
    },
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
      datasheet_url: candidate.datasheetUrl,
      is_tier_1:
        category === "module"
          ? checkIsTier1Module(
              candidate.brandName || built.sizingResult.module.brandName,
              candidate.name || built.sizingResult.module.name,
              extractTier1Flag(candidate) || extractTier1Flag(built.sizingResult.module)
            )
          : undefined,
    };
  }

  private async countStockCoveredCategories(
    orgId: string,
    input: GenerateKitInput,
    roofType: string
  ): Promise<number> {
    const source: KitProductSource = { stockOwnerOrgId: orgId };
    const [
      modules,
      stringInverters,
      microInverters,
      hybridInverters,
      structureKits,
      dcCables,
      connector,
    ] = await Promise.all([
      this.productRepo.findActiveModules(input.preferred_brand, source),
      this.productRepo.findActiveStringInverters(source),
      this.productRepo.findActiveMicroInverters(source),
      this.productRepo.findActiveHybridInverters(source),
      this.productRepo.findStructureKitsByRoofType(roofType, source),
      this.productRepo.findDcCablesBySection(DC_CABLE_SECTION_MM2, source),
      this.productRepo.findConnectorByType("mc4", source),
    ]);
    let covered = 0;
    if (modules.length > 0) covered++;
    if (stringInverters.length > 0 || microInverters.length > 0 || hybridInverters.length > 0)
      covered++;
    if (structureKits.length > 0) covered++;
    if (dcCables.length > 0) covered++;
    if (connector) covered++;
    return covered;
  }

  private async buildKit(
    input: GenerateKitInput,
    roofType: string,
    source: KitProductSource,
    preferredModuleBrands: string[] = [],
    preferredInverterBrands: string[] = []
  ): Promise<BuiltKit | null> {
    const [
      allModules,
      allStringInverters,
      allMicroInverters,
      allHybridInverters,
      allOffGridInverters,
    ] = await Promise.all([
      this.productRepo.findActiveModules(undefined, source),
      this.productRepo.findActiveStringInverters(source),
      this.productRepo.findActiveMicroInverters(source),
      this.productRepo.findActiveHybridInverters(source),
      this.productRepo.findActiveOffGridInverters(source),
    ]);

    // Se houver módulo fixado de outro distribuidor/origem, garante que ele seja carregado
    if (input.pinned_module_id && !allModules.some((m) => m.id === input.pinned_module_id)) {
      const globalMods = await this.productRepo.findActiveModules(undefined, {});
      const pMod = globalMods.find((m) => m.id === input.pinned_module_id);
      if (pMod) allModules.push(pMod);
    }

    // Se houver inversor fixado de outro distribuidor/origem, garante que ele seja carregado
    if (
      input.pinned_inverter_id &&
      !allStringInverters.some((i) => i.id === input.pinned_inverter_id) &&
      !allMicroInverters.some((i) => i.id === input.pinned_inverter_id) &&
      !allHybridInverters.some((i) => i.id === input.pinned_inverter_id) &&
      !allOffGridInverters.some((i) => i.id === input.pinned_inverter_id)
    ) {
      const [gString, gMicro, gHybrid, gOffGrid] = await Promise.all([
        this.productRepo.findActiveStringInverters({}),
        this.productRepo.findActiveMicroInverters({}),
        this.productRepo.findActiveHybridInverters({}),
        this.productRepo.findActiveOffGridInverters({}),
      ]);
      const pStr = gString.find((i) => i.id === input.pinned_inverter_id);
      if (pStr) allStringInverters.push(pStr);
      const pMic = gMicro.find((i) => i.id === input.pinned_inverter_id);
      if (pMic) allMicroInverters.push(pMic);
      const pHyb = gHybrid.find((i) => i.id === input.pinned_inverter_id);
      if (pHyb) allHybridInverters.push(pHyb);
      const pOff = gOffGrid.find((i) => i.id === input.pinned_inverter_id);
      if (pOff) allOffGridInverters.push(pOff);
    }

    const modules = input.pinned_module_id
      ? allModules.filter((m) => m.id === input.pinned_module_id)
      : allModules;

    const getPrefRank = (brand: string, prefs: string[]) => {
      if (prefs.length === 0) return 0;
      const bLower = brand.toLowerCase().trim();
      const idx = prefs.findIndex(
        (p) => bLower.includes(p.toLowerCase()) || p.toLowerCase().includes(bLower)
      );
      return idx === -1 ? 9999 : idx;
    };

    // Prioritize modules: 1º marca solicitada, 2º marcas preferidas da organização (prioritária primeiro, depois fallback), 3º melhor preço
    if (!input.pinned_module_id) {
      modules.sort((a, b) => {
        if (input.preferred_brand) {
          const prefLower = input.preferred_brand.toLowerCase().trim();
          const aExact = a.brandName.toLowerCase().trim() === prefLower ? 1 : 0;
          const bExact = b.brandName.toLowerCase().trim() === prefLower ? 1 : 0;
          if (aExact !== bExact) return bExact - aExact;
        }
        if (preferredModuleBrands.length > 0) {
          const aRank = getPrefRank(a.brandName, preferredModuleBrands);
          const bRank = getPrefRank(b.brandName, preferredModuleBrands);
          if (aRank !== bRank) return aRank - bRank;
        }
        return (Number(a.price) || 0) - (Number(b.price) || 0);
      });
    }

    // Convert hybrid and offgrid inverters to compatible string inverter specs for sizing engine
    const adaptedHybridInverters = allHybridInverters.map((h) => ({
      ...h,
      specs: {
        type: "string" as const,
        nominal_power_w: h.specs.nominal_power_w,
        max_dc_voltage: h.specs.max_dc_voltage,
        mppt_count: h.specs.mppt_count || 2,
        max_strings_per_mppt: h.specs.max_strings_per_mppt || 2,
        mppt_voltage_min: h.specs.mppt_voltage_min || 120,
        mppt_voltage_max: h.specs.mppt_voltage_max || 550,
        max_input_current: h.specs.max_input_current || 16,
        max_dc_power: h.specs.max_dc_power || h.specs.nominal_power_w * 1.3,
        recommended_dc_ac_ratio_min: 1.0,
        recommended_dc_ac_ratio_max: 1.5,
      },
    }));

    const adaptedOffGridInverters = allOffGridInverters.map((o) => ({
      ...o,
      specs: {
        type: "string" as const,
        nominal_power_w: o.specs.nominal_power_w,
        max_dc_voltage: o.specs.max_dc_voltage || 500,
        mppt_count: 1,
        max_strings_per_mppt: 1,
        mppt_voltage_min: o.specs.mppt_voltage_min || 60,
        mppt_voltage_max: o.specs.mppt_voltage_max || 450,
        max_input_current: 18,
        max_dc_power: o.specs.max_pv_power_w || o.specs.nominal_power_w * 1.3,
        recommended_dc_ac_ratio_min: 1.0,
        recommended_dc_ac_ratio_max: 1.5,
      },
    }));

    let stringInverters = [...allStringInverters];
    let microInverters = [...allMicroInverters];

    if (input.pinned_inverter_id) {
      stringInverters = stringInverters.filter((i) => i.id === input.pinned_inverter_id);
      microInverters = microInverters.filter((i) => i.id === input.pinned_inverter_id);
      const pinnedHybrid = adaptedHybridInverters.filter((i) => i.id === input.pinned_inverter_id);
      if (pinnedHybrid.length > 0) {
        stringInverters = pinnedHybrid;
        microInverters = [];
      }
      const pinnedOffGrid = adaptedOffGridInverters.filter(
        (i) => i.id === input.pinned_inverter_id
      );
      if (pinnedOffGrid.length > 0) {
        stringInverters = pinnedOffGrid;
        microInverters = [];
      }
    } else if (input.inverter_type === "string") {
      microInverters = [];
    } else if (input.inverter_type === "microinverter") {
      stringInverters = [];
    } else if (input.inverter_type === "hybrid") {
      stringInverters = adaptedHybridInverters;
      microInverters = [];
    } else if (input.inverter_type === "off_grid") {
      stringInverters = adaptedOffGridInverters;
      microInverters = [];
    }

    // Trava de escala técnica: usinas de médio/grande porte nunca devem considerar
    // inversores residenciais pequenos no dimensionamento automático
    if (!input.target_inverter_qty && !input.pinned_inverter_id) {
      const minInvPowerKw =
        input.system_kw >= 200
          ? 40
          : input.system_kw >= 80
            ? 20
            : input.system_kw >= 35
              ? 10
              : input.system_kw >= 15
                ? 5
                : 1;
      const scaled = stringInverters.filter((inv) => {
        const pKw =
          (inv.specs.nominal_power_w ? inv.specs.nominal_power_w / 1000 : 0) ||
          inv.specs.max_dc_power / 1.3 / 1000;
        return pKw >= minInvPowerKw;
      });
      if (scaled.length > 0) {
        stringInverters = scaled;
      }
    }

    if (input.grid_topology && input.grid_topology !== "auto" && input.grid_topology !== "any") {
      const topTarget = input.grid_topology;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matchesTopo = (specs: any) => {
        const top = String(specs?.grid_topology || "").toLowerCase();
        const std = String(specs?.grid_standard || "").toUpperCase();
        const volt = String(
          specs?.output_voltage_v || specs?.ac_output_voltage || ""
        ).toLowerCase();

        const isMono220 =
          top === "mono_220" ||
          std === "EU" ||
          volt.includes("220") ||
          volt.includes("230") ||
          (!top.includes("tri") && !std.includes("TRI"));

        const isTri380 =
          top === "tri_380" || std === "TRI_380" || volt.includes("380") || volt.includes("400");

        const isTri220 =
          top === "tri_220" ||
          std === "TRI_220" ||
          volt.includes("220/127") ||
          (volt.includes("220") && (top.includes("tri") || std.includes("TRI")));

        const isSplitPhase =
          top === "biphasic_127_220" ||
          std === "US" ||
          volt.includes("127/220") ||
          volt.includes("bif");

        if (topTarget === "mono_220") {
          return isMono220;
        }
        if (topTarget === "biphasic_127_220") {
          // Em rede bifásica 127/220V: inversor string on-grid 220V liga Fase-Fase; inversores híbridos aceitam split-phase ou 220V
          return isSplitPhase || isMono220;
        }
        if (topTarget === "tri_220") {
          // Em rede trifásica 220V: aceita inversores Trifásicos 220V E TAMBÉM inversores Monofásicos 220V (ligação Fase-Fase)
          return isTri220 || isMono220;
        }
        if (topTarget === "tri_380") {
          // Em rede trifásica 380V: aceita inversores Trifásicos 380V E TAMBÉM inversores Monofásicos 220V (ligação Fase-Neutro)
          return isTri380 || isMono220;
        }
        return true;
      };
      const filteredString = stringInverters.filter((i) => matchesTopo(i.specs));
      if (filteredString.length > 0) stringInverters = filteredString;
      const filteredMicro = microInverters.filter((i) => matchesTopo(i.specs));
      if (filteredMicro.length > 0) microInverters = filteredMicro;
    }

    if (modules.length === 0) {
      console.log(
        `[buildKit] ${source.supplierId || source.distributorId || source.stockOwnerOrgId}: No modules found`
      );
      return null;
    }

    const sizingResult = sizeSolarSystem({
      system_kw: input.system_kw,
      preferred_module_brand: input.preferred_brand,
      preferred_inverter_brands: preferredInverterBrands,
      target_inverter_qty: input.target_inverter_qty,
      modules,
      stringInverters,
      microInverters,
    });
    if (!sizingResult) {
      console.log(
        `[buildKit] ${source.supplierId || source.distributorId || source.stockOwnerOrgId}: sizing failed`
      );
      return null;
    }

    const kitItems: KitItemLine[] = [];
    kitItems.push({
      product_id: sizingResult.module.id,
      product_name: sizingResult.module.name,
      brand_name: sizingResult.module.brandName,
      quantity: sizingResult.module_quantity,
      unit_price: sizingResult.module.price,
      datasheet_url: sizingResult.module.datasheetUrl,
      distributor_id: sizingResult.module.distributorId,
      distributor_name: sizingResult.module.distributorName,
    });

    const inverterQuantity = isStringSizingResult(sizingResult)
      ? sizingResult.inverter_quantity || 1
      : sizingResult.microinverter_quantity;
    kitItems.push({
      product_id: sizingResult.inverter.id,
      product_name: sizingResult.inverter.name,
      brand_name: sizingResult.inverter.brandName,
      quantity: inverterQuantity,
      unit_price: sizingResult.inverter.price,
      datasheet_url: sizingResult.inverter.datasheetUrl,
      distributor_id: sizingResult.inverter.distributorId,
      distributor_name: sizingResult.inverter.distributorName,
    });

    const stringCount = isStringSizingResult(sizingResult)
      ? sizingResult.string_configuration.string_count
      : sizingResult.module_quantity;
    const dcCableMeters = stringCount * 20 * 2;

    const isNoStructure =
      roofType === "none" || roofType === "sem_estrutura" || roofType === "sem estrutura";

    // Garante que todos os componentes BOS (cabos, estruturas, conectores) pertençam
    // rigorosamente ao mesmo distribuidor/fornecedor (o restante que não pode misturar)
    let bosSource: KitProductSource = source;
    if (!bosSource.distributorId && !bosSource.supplierId && !bosSource.stockOwnerOrgId) {
      if (sizingResult.inverter.distributorId) {
        bosSource = { distributorId: sizingResult.inverter.distributorId };
      } else if (sizingResult.module.distributorId) {
        bosSource = { distributorId: sizingResult.module.distributorId };
      } else {
        const invDistId = await this.getDistributorIdForProduct(sizingResult.inverter.id);
        if (invDistId) {
          bosSource = { distributorId: invDistId };
        } else {
          const modDistId = await this.getDistributorIdForProduct(sizingResult.module.id);
          if (modDistId) {
            bosSource = { distributorId: modDistId };
          }
        }
      }
    }

    let structureKits = isNoStructure
      ? []
      : await this.productRepo.findStructureKitsByRoofType(roofType, bosSource);
    let dcCables = await this.productRepo.findDcCablesBySection(DC_CABLE_SECTION_MM2, bosSource);
    let connector = await this.productRepo.findConnectorByType("mc4", bosSource);

    // Fallback de BOS: se o distribuidor atual não tem estruturas cadastradas para esse telhado,
    // busca do distribuidor do inversor ou do módulo para garantir kit completo
    if (!isNoStructure && structureKits.length === 0) {
      const altDistId = sizingResult.inverter.distributorId || sizingResult.module.distributorId;
      if (altDistId && altDistId !== bosSource.distributorId) {
        const altBosSource: KitProductSource = { distributorId: altDistId };
        const altStructures = await this.productRepo.findStructureKitsByRoofType(
          roofType,
          altBosSource
        );
        if (altStructures.length > 0) {
          structureKits = altStructures;
          bosSource = altBosSource;
          dcCables = await this.productRepo.findDcCablesBySection(DC_CABLE_SECTION_MM2, bosSource);
          connector = await this.productRepo.findConnectorByType("mc4", bosSource);
        }
      }
    }

    let stringBox = null;
    if (
      input.string_box_id &&
      input.string_box_id !== "none" &&
      input.string_box_id !== "sem_string_box"
    ) {
      if (input.string_box_id === "auto" && isStringSizingResult(sizingResult)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mpptCount = (sizingResult.inverter.specs as any)?.mppt_count || 1;
        stringBox = await this.productRepo.findRecommendedStringBox(
          stringCount,
          mpptCount,
          bosSource
        );
      } else {
        stringBox = await this.productRepo.findStringBoxById(input.string_box_id, bosSource);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modulePower = (sizingResult.module.specs as any).power_w || 0;
    const profileLength = modulePower >= 700 ? 2.75 : 2.4;
    const profile = isNoStructure
      ? null
      : await this.productRepo.findProfile(profileLength, roofType, bosSource);

    // We no longer fail the kit if structures or cables are missing.
    // They will just be omitted from the kit if they don't exist in stock.

    let addedStructureKits: { maxMods: number; quantity: number }[] = [];

    if (structureKits.length > 0) {
      let remainingModules = sizingResult.module_quantity;
      for (const kit of structureKits) {
        if (remainingModules <= 0) break;
        const maxMods = kit.maxModules || 1;

        // Se for o último kit (o menor disponível), pegamos o que sobrou arredondando pra cima.
        // Se não, pegamos o máximo que cabe neste kit.
        const isSmallestKit = kit === structureKits[structureKits.length - 1];

        const quantity = isSmallestKit
          ? Math.ceil(remainingModules / maxMods)
          : Math.floor(remainingModules / maxMods);

        if (quantity > 0) {
          kitItems.push({
            product_id: kit.id,
            product_name: kit.name,
            brand_name: kit.brandName,
            quantity: quantity,
            unit_price: kit.price,
          });
          addedStructureKits.push({ maxMods, quantity });
          remainingModules -= quantity * maxMods;
        }
      }
    }
    if (dcCables && dcCables.length > 0) {
      const metersPerColor = Math.max(10, Math.ceil(dcCableMeters / 2));

      // Seleção inteligente do rolo ideal: prioriza rolos comerciais padrão (<= 200m)
      // mais próximos da metragem necessária, evitando bobinas industriais gigantescas de 2.000m
      const pickCableForLength = (
        cables: typeof dcCables,
        color: "red" | "black",
        neededMeters: number
      ) => {
        const matching = cables.filter((c) => c.color === color);
        if (matching.length === 0) return null;
        matching.sort((a, b) => {
          const aRoll = a.roll_length_m || 25;
          const bRoll = b.roll_length_m || 25;
          const aIsNormal = aRoll <= 200;
          const bIsNormal = bRoll <= 200;
          if (aIsNormal && !bIsNormal) return -1;
          if (!aIsNormal && bIsNormal) return 1;

          const aCovers = aRoll >= neededMeters;
          const bCovers = bRoll >= neededMeters;
          if (aCovers && !bCovers) return -1;
          if (!aCovers && bCovers) return 1;
          return aRoll - bRoll;
        });
        return matching[0];
      };

      const redCable = pickCableForLength(dcCables, "red", metersPerColor);
      const blackCable = pickCableForLength(dcCables, "black", metersPerColor);

      if (redCable && blackCable) {
        kitItems.push({
          product_id: redCable.id,
          product_name: redCable.name,
          brand_name: redCable.brandName,
          quantity: Math.ceil(metersPerColor / (redCable.roll_length_m || 25)),
          unit_price: redCable.price,
        });
        kitItems.push({
          product_id: blackCable.id,
          product_name: blackCable.name,
          brand_name: blackCable.brandName,
          quantity: Math.ceil(metersPerColor / (blackCable.roll_length_m || 25)),
          unit_price: blackCable.price,
        });
      } else {
        // Fallback para usar o primeiro cabo encontrado
        kitItems.push({
          product_id: dcCables[0]!.id,
          product_name: dcCables[0]!.name,
          brand_name: dcCables[0]!.brandName,
          quantity: Math.ceil(dcCableMeters / (dcCables[0]!.roll_length_m || 25)),
          unit_price: dcCables[0]!.price,
        });
      }
    }
    if (connector) {
      kitItems.push({
        product_id: connector.id,
        product_name: connector.name,
        brand_name: connector.brandName,
        // 4 conectores (pares) por string é um padrão seguro que cobre
        // a ida para a string box e da string box para o inversor, com sobra.
        quantity: stringCount * 4,
        unit_price: connector.price,
      });
    }
    if (profile) {
      const moduleQty = sizingResult.module_quantity;
      let profileQty = 0;

      if (roofType === "metal") {
        for (const added of addedStructureKits) {
          if (added.maxMods === 4) {
            profileQty += added.quantity * 10;
          } else if (added.maxMods === 2) {
            profileQty += added.quantity * 5;
          } else {
            // Fallback if they have other sizes
            profileQty += added.quantity * Math.ceil(added.maxMods * 2.5);
          }
        }
        if (moduleQty % 2 !== 0) profileQty += 1;
      } else if (roofType === "ground") {
        // Para solo, deixamos a quantidade como o padrao (ou a criterio do integrador)
        // O usuário informou que quer deixar à disposição, colocaremos 1 como aviso e ele ajusta
        profileQty = 1;
      } else {
        profileQty = moduleQty % 2 === 0 ? moduleQty : moduleQty + 1;
      }

      if (profileQty > 0) {
        kitItems.push({
          product_id: profile.id,
          product_name: profile.name,
          brand_name: profile.brandName,
          quantity: profileQty,
          unit_price: profile.price,
        });
      }
    }
    if (stringBox) {
      kitItems.push({
        product_id: stringBox.id,
        product_name: stringBox.name,
        brand_name: stringBox.brandName,
        quantity: isStringSizingResult(sizingResult) ? 1 : 0, // Apenas se usar inversor string
        unit_price: stringBox.price,
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
