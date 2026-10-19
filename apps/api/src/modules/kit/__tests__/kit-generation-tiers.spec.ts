/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { KitGenerationService } from "../kit-generation.service";

describe("KitGenerationService - Tier Brand Distribution Suite", () => {
  let service: KitGenerationService;
  let mockPrisma: any;
  let mockProductRepo: any;

  const mockAstronergyModule = {
    id: "mod-astronergy-1",
    name: "Módulo Astronergy 580W",
    brandName: "Astronergy",
    price: 460,
    specs: {
      power_w: 580,
      vmp: 42,
      imp: 13.8,
      voc: 50,
      isc: 14.5,
      efficiency: 0.22,
      max_system_voltage: 1500,
      width_mm: 1134,
      height_mm: 2278,
      is_tier_1: true,
    },
  };

  const mockLongiModule = {
    id: "mod-longi-1",
    name: "Módulo LONGi Solar 600W",
    brandName: "LONGi Solar",
    price: 490,
    specs: {
      power_w: 600,
      vmp: 44,
      imp: 13.6,
      voc: 52,
      isc: 14.3,
      efficiency: 0.225,
      max_system_voltage: 1500,
      width_mm: 1134,
      height_mm: 2382,
      is_tier_1: true,
    },
  };

  const mockJinkoModule = {
    id: "mod-jinko-1",
    name: "Módulo Jinko Solar 620W",
    brandName: "Jinko Solar",
    price: 530,
    specs: {
      power_w: 620,
      vmp: 45,
      imp: 13.8,
      voc: 53,
      isc: 14.4,
      efficiency: 0.23,
      max_system_voltage: 1500,
      width_mm: 1134,
      height_mm: 2465,
      is_tier_1: true,
    },
  };

  const mockGoodweInverter = {
    id: "inv-goodwe-1",
    name: "Inversor GoodWe 5kW 220V",
    brandName: "GoodWe",
    price: 4200,
    specs: {
      type: "string",
      nominal_power_w: 5000,
      max_dc_power: 7500,
      max_dc_voltage: 600,
      mppt_voltage_min: 100,
      mppt_voltage_max: 550,
      max_input_current: 16,
      mppt_count: 2,
      max_strings_per_mppt: 1,
      recommended_dc_ac_ratio_min: 1.0,
      recommended_dc_ac_ratio_max: 1.5,
    },
  };

  const mockGrowattInverter = {
    id: "inv-growatt-1",
    name: "Inversor Growatt 5kW 220V",
    brandName: "Growatt",
    price: 4400,
    specs: {
      type: "string",
      nominal_power_w: 5000,
      max_dc_power: 7500,
      max_dc_voltage: 600,
      mppt_voltage_min: 100,
      mppt_voltage_max: 550,
      max_input_current: 16,
      mppt_count: 2,
      max_strings_per_mppt: 1,
      recommended_dc_ac_ratio_min: 1.0,
      recommended_dc_ac_ratio_max: 1.5,
    },
  };

  const mockSolplanetInverter = {
    id: "inv-solplanet-1",
    name: "Inversor Solplanet 5kW 220V",
    brandName: "Solplanet",
    price: 4800,
    specs: {
      type: "string",
      nominal_power_w: 5000,
      max_dc_power: 7500,
      max_dc_voltage: 600,
      mppt_voltage_min: 100,
      mppt_voltage_max: 550,
      max_input_current: 16,
      mppt_count: 2,
      max_strings_per_mppt: 1,
      recommended_dc_ac_ratio_min: 1.0,
      recommended_dc_ac_ratio_max: 1.5,
    },
  };

  const mockStructure = {
    id: "struct-1",
    name: "Estrutura Cerâmico",
    price: 200,
  };

  const mockCable = {
    id: "cable-1",
    name: "Cabo Solar 6mm",
    price: 5,
  };

  const mockConnector = {
    id: "conn-1",
    name: "Conector MC4",
    price: 15,
  };

  beforeEach(() => {
    mockPrisma = {
      tenant: {
        findUnique: vi.fn(),
      },
      distributor: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      supplier: {
        findUnique: vi.fn().mockResolvedValue(null),
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      distributorProduct: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      kit: {
        create: vi.fn().mockResolvedValue({ id: "kit-123" }),
      },
      kitItem: {
        createMany: vi.fn().mockResolvedValue({ count: 5 }),
      },
    };

    mockProductRepo = {
      findActiveModules: vi
        .fn()
        .mockResolvedValue([mockAstronergyModule, mockLongiModule, mockJinkoModule]),
      findActiveStringInverters: vi
        .fn()
        .mockResolvedValue([mockGoodweInverter, mockGrowattInverter, mockSolplanetInverter]),
      findActiveMicroInverters: vi.fn().mockResolvedValue([]),
      findActiveHybridInverters: vi.fn().mockResolvedValue([]),
      findActiveOffGridInverters: vi.fn().mockResolvedValue([]),
      findStructureKitsByRoofType: vi.fn().mockResolvedValue([mockStructure]),
      findDcCablesBySection: vi.fn().mockResolvedValue([mockCable]),
      findConnectorByType: vi.fn().mockResolvedValue(mockConnector),
      findProfile: vi.fn().mockResolvedValue(null),
      findStringBoxById: vi.fn().mockResolvedValue(null),
    };

    service = new KitGenerationService(mockProductRepo, mockPrisma);
  });

  it("should respect brand tiers without leaking the priority brand into other tiers", async () => {
    // Configuração idêntica à do integrador:
    // Standard: Astronergy / GoodWe
    // Elite: LONGi Solar [Principal] / Growatt [Principal]
    // Premium: Jinko Solar / Solplanet
    mockPrisma.tenant.findUnique.mockResolvedValue({
      settings: {
        moduleBrandTiers: {
          standard: ["Astronergy"],
          elite: ["LONGi Solar"],
          premium: ["Jinko Solar"],
          priority: "LONGi Solar",
        },
        inverterBrandTiers: {
          standard: ["GoodWe"],
          elite: ["Growatt"],
          premium: ["Solplanet"],
          priority: "Growatt",
        },
      },
    });

    const result = await service.generateDistributorTiers(
      { system_kw: 5, roof_type: "ceramic" },
      "org-1"
    );

    expect(result.tiers).toHaveLength(3);

    const standardTier = result.tiers.find((t) => t.tier_id === "economic");
    const eliteTier = result.tiers.find((t) => t.tier_id === "cost_benefit");
    const premiumTier = result.tiers.find((t) => t.tier_id === "premium");

    expect(standardTier).toBeDefined();
    expect(eliteTier).toBeDefined();
    expect(premiumTier).toBeDefined();

    // Standard DEVE ter Astronergy e GoodWe (não pode receber LONGi ou Growatt)
    expect(standardTier?.module_brand).toBe("Astronergy");
    expect(standardTier?.inverter_brand).toBe("GoodWe");

    // Elite DEVE ter a marca prioritária (LONGi Solar e Growatt)
    expect(eliteTier?.module_brand).toBe("LONGi Solar");
    expect(eliteTier?.inverter_brand).toBe("Growatt");

    // Premium DEVE ter Jinko Solar e Solplanet (não pode receber LONGi ou Growatt)
    expect(premiumTier?.module_brand).toBe("Jinko Solar");
    expect(premiumTier?.inverter_brand).toBe("Solplanet");
  });

  it("should prioritize priority brand WITHIN its own quadrant when multiple brands exist", async () => {
    // Elite com Growatt [Principal] e SAJ como secundária
    const mockSajInverter = {
      id: "inv-saj-1",
      name: "Inversor SAJ 5kW 220V",
      brandName: "SAJ",
      price: 4300,
      specs: { ...mockGrowattInverter.specs },
    };

    mockProductRepo.findActiveStringInverters.mockResolvedValue([
      mockGoodweInverter,
      mockSajInverter,
      mockGrowattInverter,
      mockSolplanetInverter,
    ]);

    mockPrisma.tenant.findUnique.mockResolvedValue({
      settings: {
        moduleBrandTiers: {
          standard: ["Astronergy"],
          elite: ["LONGi Solar"],
          premium: ["Jinko Solar"],
          priority: "LONGi Solar",
        },
        inverterBrandTiers: {
          standard: ["GoodWe"],
          elite: ["SAJ", "Growatt"], // Growatt é priority mas listado depois
          premium: ["Solplanet"],
          priority: "Growatt",
        },
      },
    });

    const result = await service.generateDistributorTiers(
      { system_kw: 5, roof_type: "ceramic" },
      "org-1"
    );

    const eliteTier = result.tiers.find((t) => t.tier_id === "cost_benefit");
    // Como Growatt é prioritária no quadrante Elite, ela vem na frente de SAJ
    expect(eliteTier?.inverter_brand).toBe("Growatt");
  });

  it("should provide well-distributed tiers even when no brand tiers are configured", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({
      settings: {},
    });

    const result = await service.generateDistributorTiers(
      { system_kw: 5, roof_type: "ceramic" },
      "org-1"
    );

    expect(result.tiers).toHaveLength(3);
    const standardTier = result.tiers.find((t) => t.tier_id === "economic");
    const eliteTier = result.tiers.find((t) => t.tier_id === "cost_benefit");
    const premiumTier = result.tiers.find((t) => t.tier_id === "premium");

    expect(standardTier).toBeDefined();
    expect(eliteTier).toBeDefined();
    expect(premiumTier).toBeDefined();

    // Standard deve pegar a opção com menor custo por Watt
    expect(standardTier?.module_brand).toBe("Astronergy");
    // Premium deve pegar o módulo de maior potência / topo de linha
    expect(premiumTier?.module_brand).toBe("Jinko Solar");
  });

  it("should select single inverters of compatible rating (e.g. 10kW) instead of multiple 3kW inverters for a 10kWp plant", async () => {
    const mockSolplanet3k = {
      id: "inv-solplanet-3k",
      name: "Inversor Solplanet 3kW 220V",
      brandName: "Solplanet",
      price: 1500,
      specs: {
        type: "string",
        nominal_power_w: 3000,
        max_dc_power: 4500,
        max_dc_voltage: 550,
        mppt_count: 1,
        max_strings_per_mppt: 1,
        mppt_voltage_min: 80,
        mppt_voltage_max: 500,
        max_input_current: 16,
        recommended_dc_ac_ratio_min: 1.0,
        recommended_dc_ac_ratio_max: 1.5,
      },
    };

    const mockSolplanet10k = {
      id: "inv-solplanet-10k",
      name: "Inversor Solplanet 10kW 220V",
      brandName: "Solplanet",
      price: 3800,
      specs: {
        type: "string",
        nominal_power_w: 10000,
        max_dc_power: 15000,
        max_dc_voltage: 600,
        mppt_count: 3,
        max_strings_per_mppt: 1,
        mppt_voltage_min: 100,
        mppt_voltage_max: 550,
        max_input_current: 16,
        recommended_dc_ac_ratio_min: 1.0,
        recommended_dc_ac_ratio_max: 1.5,
      },
    };

    const mockGoodwe10k = {
      id: "inv-goodwe-10k",
      name: "Inversor GoodWe 10kW 220V",
      brandName: "GoodWe",
      price: 3900,
      specs: {
        type: "string",
        nominal_power_w: 10000,
        max_dc_power: 15000,
        max_dc_voltage: 600,
        mppt_count: 3,
        max_strings_per_mppt: 1,
        mppt_voltage_min: 100,
        mppt_voltage_max: 550,
        max_input_current: 16,
        recommended_dc_ac_ratio_min: 1.0,
        recommended_dc_ac_ratio_max: 1.5,
      },
    };

    mockProductRepo.findActiveStringInverters.mockResolvedValue([
      mockSolplanet3k,
      mockSolplanet10k,
      mockGoodwe10k,
    ]);

    mockPrisma.tenant.findUnique.mockResolvedValue({
      settings: {},
    });

    const result = await service.generateDistributorTiers(
      { system_kw: 10, roof_type: "ceramic" },
      "org-1"
    );

    expect(result.tiers).toHaveLength(3);
    for (const tier of result.tiers) {
      expect(tier.inverter_qty).toBe(1);
      expect(tier.inverter_power_kw).toBeGreaterThanOrEqual(7);
      expect(tier.inverter_power_kw).toBeLessThanOrEqual(12);
    }
  });
});
