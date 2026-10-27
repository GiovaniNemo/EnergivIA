/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { SalesService } from "../sales.service";

describe("SalesService", () => {
  let service: SalesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      proposal: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      sale: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
    };

    service = new SalesService(mockPrisma);
  });

  describe("convertToSale", () => {
    it("should throw NotFoundException if proposal not found", async () => {
      mockPrisma.proposal.findFirst.mockResolvedValue(null);

      await expect(service.convertToSale("tenant-1", "prop-999")).rejects.toThrow(
        NotFoundException
      );
    });

    it("should return existing sale if already converted", async () => {
      const mockProposal = {
        id: "prop-123",
        tenantId: "tenant-1",
        sale: { id: "sale-existing", status: "AWAITING_ANALYSIS" },
        deal: { lead: { name: "Cliente Teste", cpfCnpj: "123.456.789-00" } },
        simulation: {
          result: { sizing: { recommendedPowerKw: 5.5 } },
          input: { investmentAmount: 22000 },
        },
      };
      mockPrisma.proposal.findFirst.mockResolvedValue(mockProposal);

      const result = await service.convertToSale("tenant-1", "prop-123");
      expect(result.id).toBe("sale-existing");
      expect(mockPrisma.sale.create).not.toHaveBeenCalled();
    });

    it("should create new Sale copying proposal and lead snapshot", async () => {
      const mockProposal = {
        id: "prop-123",
        tenantId: "tenant-1",
        dealId: "deal-1",
        sale: null,
        deal: {
          lead: {
            name: "João da Silva",
            whatsapp: "11999999999",
            email: "joao@email.com",
            cpfCnpj: "12345678900",
          },
        },
        simulation: {
          input: { investmentAmount: 25000, city: "Campinas", state: "SP" },
          result: { sizing: { recommendedPowerKw: 6.8 } },
        },
      };
      mockPrisma.proposal.findFirst.mockResolvedValue(mockProposal);
      mockPrisma.sale.findFirst.mockResolvedValue(null); // No previous sale for max number
      mockPrisma.sale.create.mockImplementation((args: any) =>
        Promise.resolve({ id: "sale-new", ...args.data })
      );

      const result = await service.convertToSale("tenant-1", "prop-123", {
        name: "Vendedor Alpha",
      });

      expect(mockPrisma.sale.create).toHaveBeenCalled();
      expect(result.systemPowerKwp).toBe(6.8);
      expect(result.investmentAmount).toBe(25000);
      expect(result.documentNumber).toBe("12345678900");
      expect(result.sellerName).toBe("Vendedor Alpha");
      expect(result.status).toBe("AWAITING_ANALYSIS");
    });
  });

  describe("getSaleById", () => {
    it("should return sale with relations", async () => {
      const mockSale = { id: "sale-1", tenantId: "tenant-1", documents: [] };
      mockPrisma.sale.findFirst.mockResolvedValue(mockSale);

      const result = await service.getSaleById("tenant-1", "sale-1");
      expect(result).toEqual(mockSale);
    });

    it("should throw NotFoundException if sale not found", async () => {
      mockPrisma.sale.findFirst.mockResolvedValue(null);

      await expect(service.getSaleById("tenant-1", "sale-unknown")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("updateSale", () => {
    it("should update sale fields successfully", async () => {
      const mockSale = { id: "sale-1", tenantId: "tenant-1" };
      mockPrisma.sale.findFirst.mockResolvedValue(mockSale);
      mockPrisma.sale.update.mockResolvedValue({ ...mockSale, consumerUnitNumber: "998877" });

      const updated = await service.updateSale("tenant-1", "sale-1", {
        consumerUnitNumber: "998877",
      });

      expect(updated.consumerUnitNumber).toBe("998877");
      expect(mockPrisma.sale.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "sale-1" },
          data: expect.objectContaining({ consumerUnitNumber: "998877" }),
        })
      );
    });
  });
});
