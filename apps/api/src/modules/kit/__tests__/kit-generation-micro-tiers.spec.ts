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
        .mockResolvedValue([mockMicroNep, mockMicroDeye, mockMicroGoodwe]),
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

  it("should distribute distinct microinverter brands across Standard, Elite and Premium by default without repeating GoodWe in all 3", async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ settings: {} });

    const res = await service.generateDistributorTiers(
      {
        system_kw: 6,
        inverter_type: "microinverter",
      },
      "org-1"
    );

    expect(res.tiers).toHaveLength(3);
    const brands = res.tiers.map((t) => t.inverter_brand);
    // Deve conter mais de uma marca diferente (não pode ser [GoodWe, GoodWe, GoodWe])
    const uniqueBrands = new Set(brands);
    expect(uniqueBrands.size).toBeGreaterThanOrEqual(2);
  });
});
