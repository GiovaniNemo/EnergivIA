/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { KitGenerationService } from "../kit-generation.service";

describe("KitGenerationService - Microinverter & Hybrid Tiers", () => {
  let service: KitGenerationService;
  let mockPrisma: any;
  let mockProductRepo: any;

  const mockModule = {
    id: "mod-1",
    name: "Módulo DAH Solar 580W",
    brandName: "DAH Solar",
    price: 450,
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

  const mockMicroNep = {
    id: "micro-nep-1",
    name: "Microinversor NEP 2000W",
    brandName: "NEP",
    price: 2100,
    specs: {
      type: "micro",
      channels: 4,
      min_module_power: 400,
      max_module_power: 650,
      max_input_voltage: 60,
      max_input_current: 16,
      nominal_power_w: 2000,
    },
  };

  const mockMicroDeye = {
    id: "micro-deye-1",
    name: "Microinversor DEYE 2000W",
    brandName: "DEYE",
    price: 2300,
    specs: {
      type: "micro",
      channels: 4,
      min_module_power: 400,
      max_module_power: 650,
      max_input_voltage: 60,
      max_input_current: 16,
      nominal_power_w: 2000,
    },
  };

  const mockMicroGoodwe = {
    id: "micro-goodwe-1",
    name: "Microinversor GoodWe 2000W",
    brandName: "GoodWe",
    price: 2500,
    specs: {
      type: "micro",
      channels: 4,
      min_module_power: 400,
      max_module_power: 650,
      max_input_voltage: 60,
      max_input_current: 16,
      nominal_power_w: 2000,
    },
  };

  const mockMicroSaj = {
    id: "micro-saj-1",
    name: "Microinversor SAJ 2000W",
    brandName: "SAJ",
    price: 1950,
    specs: {
      type: "micro",
      channels: 4,
      min_module_power: 400,
      max_module_power: 650,
      max_input_voltage: 60,
      max_input_current: 16,
      nominal_power_w: 2000,
    },
  };

  const mockMicroGrowatt = {
    id: "micro-growatt-1",
    name: "Microinversor Growatt 2000W",
    brandName: "Growatt",
    price: 2200,
    specs: {
      type: "micro",
      channels: 4,
      min_module_power: 400,
      max_module_power: 650,
      max_input_voltage: 60,
      max_input_current: 16,
      nominal_power_w: 2000,
    },
  };

  const mockStructure = { id: "struct-1", name: "Estrutura Cerâmico", price: 200 };
  const mockCable = { id: "cable-1", name: "Cabo Solar 6mm", price: 5 };
  const mockConnector = { id: "conn-1", name: "Conector MC4", price: 15 };

  beforeEach(() => {
    mockPrisma = {
      tenant: { findUnique: vi.fn() },
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
      kit: { create: vi.fn().mockResolvedValue({ id: "kit-123" }) },
      kitItem: { createMany: vi.fn().mockResolvedValue({ count: 5 }) },
    };

    mockProductRepo = {
      findActiveModules: vi.fn().mockResolvedValue([mockModule]),
      findActiveStringInverters: vi.fn().mockResolvedValue([]),
      findActiveMicroInverters: vi
        .fn()
        .mockResolvedValue([
          mockMicroSaj,
          mockMicroGrowatt,
          mockMicroNep,
          mockMicroDeye,
          mockMicroGoodwe,
        ]),
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

  it("should respect tenant microInverterBrandTiers when generating microinverter tiers", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({
      settings: {
        microInverterBrandTiers: {
          standard: ["GoodWe"],
          elite: ["NEP"],
          premium: ["DEYE"],
          priority: null,
        },
      },
    });

    const res = await service.generateDistributorTiers(
      {
        system_kw: 6,
        inverter_type: "microinverter",
      },
      "org-1"
    );

    expect(res.tiers).toHaveLength(3);
    const [standard, elite, premium] = res.tiers;
    expect(standard.inverter_brand).toBe("GoodWe");
    expect(elite.inverter_brand).toBe("NEP");
    expect(premium.inverter_brand).toBe("DEYE");
  });

  it("should strictly quote SAJ for Standard, Growatt for Elite, and DEYE for Premium as configured by integrator in UI", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({
      settings: {
        microInverterBrandTiers: {
          standard: ["SAJ"],
          elite: ["Growatt", "GoodWe"],
          premium: ["DEYE", "NEP"],
          priority: "DEYE",
        },
      },
    });

    const res = await service.generateDistributorTiers(
      {
        system_kw: 6,
        inverter_type: "microinverter",
      },
      "org-1"
    );

    expect(res.tiers).toHaveLength(3);
    const [standard, elite, premium] = res.tiers;
    expect(standard.inverter_brand).toBe("SAJ");
    expect(elite.inverter_brand).toBe("Growatt");
    expect(premium.inverter_brand).toBe("DEYE");
  });

  it("should find the tier's configured brand across other distributors even if the initial baseline distributor only has GoodWe", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({
      settings: {
        microInverterBrandTiers: {
          standard: ["SAJ"],
          elite: ["Growatt", "GoodWe"],
          premium: ["DEYE", "NEP"],
          priority: "DEYE",
        },
      },
    });

    // Baseline distributor dist-1 only carries GoodWe, dist-2 carries SAJ, dist-3 carries DEYE & Growatt
    mockPrisma.distributor.findMany.mockResolvedValue([
      { id: "dist-1" },
      { id: "dist-2" },
      { id: "dist-3" },
    ]);

    mockProductRepo.findActiveMicroInverters.mockImplementation(async (source: any) => {
      if (source?.distributorId === "dist-1") return [mockMicroGoodwe];
      if (source?.distributorId === "dist-2") return [mockMicroSaj];
      if (source?.distributorId === "dist-3") return [mockMicroGrowatt, mockMicroDeye];
      return [mockMicroSaj, mockMicroGrowatt, mockMicroGoodwe, mockMicroDeye, mockMicroNep];
    });

    const res = await service.generateDistributorTiers(
      { system_kw: 6, inverter_type: "microinverter" },
      "org-1"
    );

    expect(res.tiers).toHaveLength(3);
    const [standard, elite, premium] = res.tiers;
    expect(standard.inverter_brand).toBe("SAJ");
    expect(["Growatt", "GoodWe"]).toContain(elite.inverter_brand);
    expect(premium.inverter_brand).toBe("DEYE");
  });

  it("should randomize and distribute distinct brands across all 3 tiers when no preferences are defined", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ settings: {} });

    mockProductRepo.findActiveMicroInverters.mockResolvedValue([
      mockMicroSaj,
      mockMicroGrowatt,
      mockMicroGoodwe,
      mockMicroDeye,
      mockMicroNep,
    ]);

    const res = await service.generateDistributorTiers(
      { system_kw: 6, inverter_type: "microinverter" },
      "org-1"
    );

    expect(res.tiers).toHaveLength(3);
    const [standard, elite, premium] = res.tiers;
    const brands = [standard.inverter_brand, elite.inverter_brand, premium.inverter_brand];
    const uniqueBrands = new Set(brands);
    expect(uniqueBrands.size).toBe(3);
  });
});
