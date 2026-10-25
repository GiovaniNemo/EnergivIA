/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrganizationsService } from "../organizations.service";

describe("OrganizationsService - Brand Tiers for Micro & Hybrid", () => {
  let service: OrganizationsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      tenant: {
        update: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      proposalTemplate: {
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn(),
      },
      organizationMember: {
        findFirst: vi.fn().mockResolvedValue({ role: "OWNER" }),
      },
    };
    service = new OrganizationsService(mockPrisma);
  });

  it("should update organization with microInverterBrandTiers and hybridInverterBrandTiers", async () => {
    const existingOrg = {
      id: "org-1",
      name: "Solar Empresa",
      settings: {},
    };
    mockPrisma.tenant.findUnique.mockResolvedValue(existingOrg);
    mockPrisma.tenant.update.mockImplementation(async ({ data }: any) => {
      return {
        id: "org-1",
        name: data.name ?? existingOrg.name,
        settings: data.settings,
      };
    });

    const updateDto = {
      microInverterBrandTiers: {
        standard: ["NEP", "SAJ"],
        elite: ["Growatt", "Deye"],
        premium: ["GoodWe", "Hoymiles"],
        priority: "Hoymiles",
      },
      hybridInverterBrandTiers: {
        standard: ["Deye"],
        elite: ["GoodWe"],
        premium: ["Huawei"],
        priority: "GoodWe",
      },
    };

    const result = await service.update("org-1", "user-1", updateDto as any);

    expect(result.microInverterBrandTiers).toEqual(updateDto.microInverterBrandTiers);
    expect(result.hybridInverterBrandTiers).toEqual(updateDto.hybridInverterBrandTiers);
    expect(result.preferredMicroInverterBrands).toEqual([
      "Hoymiles",
      "NEP",
      "SAJ",
      "Growatt",
      "Deye",
      "GoodWe",
    ]);
    expect(result.preferredHybridInverterBrands).toEqual(["GoodWe", "Deye", "Huawei"]);
  });
});
