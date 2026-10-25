/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrandsService } from "../brands.service";

describe("BrandsService - getDistributorAvailable", () => {
  let service: BrandsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      distributorProduct: {
        findMany: vi.fn(),
      },
      product: {
        findMany: vi.fn(),
      },
    };
    service = new BrandsService(mockPrisma);
  });

  it("should return distinct active brands for modules, inverters, microInverters, and hybridInverters from distributor products", async () => {
    mockPrisma.distributorProduct.findMany.mockResolvedValue([
      {
        product: {
          brand: { name: "Astronergy" },
          category: { name: "module" },
        },
      },
      {
        product: {
          brand: { name: "Sungrow" },
          category: { name: "inverter" },
        },
      },
      {
        product: {
          brand: { name: "DEYE" },
          category: { name: "microinverter" },
        },
      },
      {
        product: {
          brand: { name: "Hoymiles" },
          category: { name: "microinverter" },
        },
      },
      {
        product: {
          brand: { name: "DEYE" },
          category: { name: "hybrid_inverter" },
        },
      },
      {
        product: {
          brand: { name: "Solis" },
          category: { name: "hybrid_inverter" },
        },
      },
      {
        product: {
          brand: { name: "Romagnole" },
          category: { name: "structure_kit" },
        },
      },
    ]);

    const res = await service.getDistributorAvailable();

    expect(res).toBeDefined();
    expect(res.modules).toContain("Astronergy");
    expect(res.inverters).toContain("Sungrow");
    expect(res.microInverters).toEqual(["DEYE", "Hoymiles"]);
    expect(res.hybridInverters).toEqual(["DEYE", "Solis"]);
  });
});
