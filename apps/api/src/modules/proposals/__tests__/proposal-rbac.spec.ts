/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { ProposalsService } from "../proposals.service";
import type { JwtPayload } from "@energivia/types";

describe("Proposals RBAC & Commercial Protection", () => {
  let service: ProposalsService;
  let mockPrisma: any;
  let mockNotifications: any;
  let mockLeadActivityLog: any;
  let mockStockReservation: any;
  let mockPdfRenderer: any;

  const sampleProposal = {
    id: "prop-123",
    tenantId: "tenant-abc",
    title: "Proposta Solar Comercial",
    status: "DRAFT",
    validUntil: new Date("2026-12-31"),
    pdfUrl: null,
    createdAt: new Date(),
    dealId: "deal-456",
    deal: {
      leadId: "lead-789",
      lead: { name: "Empresa Solar Teste" },
    },
    proposalTemplate: {
      id: "tpl-1",
      name: "Modelo Padrão",
      config: {},
    },
    simulation: {
      input: { investmentAmount: 50000 },
    },
    renderedData: {
      integrator: {
        version: 1,
        kitItems: [
          {
            productId: "k1",
            productName: "Painel 550W",
            brandName: "Canadian Solar",
            quantity: 20,
            unitPrice: 1500,
            lineTotal: 30000,
          },
        ],
        equipmentSubtotalBrl: 30000,
        quotedSaleBrl: 50000,
        computedSaleFromCostRulesBrl: 50000,
        projectCostLines: [
          {
            name: "Margem Essencial",
            calculationType: "FIXED",
            value: 15000,
            appliedAmountBrl: 15000,
            source: "system_default",
          },
          {
            name: "Mão de Obra",
            calculationType: "FIXED",
            value: 5000,
            appliedAmountBrl: 5000,
            source: "system_default",
          },
        ],
      },
    },
  };

  beforeEach(() => {
    mockPrisma = {
      proposal: {
        findMany: vi.fn().mockResolvedValue([sampleProposal]),
        findFirst: vi.fn().mockResolvedValue(sampleProposal),
        update: vi.fn().mockImplementation(({ data }) => ({
          ...sampleProposal,
          ...data,
        })),
      },
      deal: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      simulation: {
        findFirst: vi.fn(),
      },
      proposalTemplate: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      proposalTemplateBlueprint: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      product: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    mockNotifications = {
      handlePublicProposalView: vi.fn(),
      handlePublicProposalResponse: vi.fn(),
    };

    mockLeadActivityLog = {
      append: vi.fn().mockResolvedValue({ id: "activity-1" }),
    };

    mockStockReservation = {};
    mockPdfRenderer = {};

    service = new ProposalsService(
      mockPrisma,
      mockNotifications,
      mockLeadActivityLog,
      mockStockReservation,
      mockPdfRenderer
    );
  });

  describe("list proposals RBAC cost protection", () => {
    it("exposes equipment cost and margin to ADMIN", async () => {
      const result = await service.list("tenant-abc", "ADMIN");
      expect(result).toHaveLength(1);
      const row = result[0]!;
      expect(row.equipmentSubtotalBrl).toBe(30000);
      expect(row.marginBrl).toBe(20000); // 50000 - 30000
      expect(row.quotedValueBrl).toBe(50000);
    });

    it("redacts equipment cost and margin from SALES and VIEWER", async () => {
      const salesResult = await service.list("tenant-abc", "SALES");
      const salesRow = salesResult[0]!;
      expect(salesRow.equipmentSubtotalBrl).toBeNull();
      expect(salesRow.marginBrl).toBeNull();
      expect(salesRow.quotedValueBrl).toBe(50000);

      const viewerResult = await service.list("tenant-abc", "VIEWER");
      const viewerRow = viewerResult[0]!;
      expect(viewerRow.equipmentSubtotalBrl).toBeNull();
      expect(viewerRow.marginBrl).toBeNull();
    });
  });

  describe("findOne proposal details RBAC", () => {
    it("provides full project cost lines and equipment costs to ADMIN", async () => {
      const result = await service.findOne("tenant-abc", "prop-123", "ADMIN");
      const integrator = (result.renderedData as any).integrator;
      expect(integrator.equipmentSubtotalBrl).toBe(30000);
      expect(integrator.projectCostLines).toHaveLength(2);
      expect(integrator.computedSaleFromCostRulesBrl).toBe(50000);
    });

    it("sanitizes sensitive cost lines from SALES role", async () => {
      const result = await service.findOne("tenant-abc", "prop-123", "SALES");
      const integrator = (result.renderedData as any).integrator;
      expect(integrator.equipmentSubtotalBrl).toBeUndefined();
      expect(integrator.projectCostLines).toBeUndefined();
      expect(integrator.computedSaleFromCostRulesBrl).toBeUndefined();
      // Quoted price and kit items remain intact for sales presentation
      expect(integrator.quotedSaleBrl).toBe(50000);
      expect(integrator.kitItems).toHaveLength(1);
    });
  });

  describe("Commercial Discount Approval Limit (5% cap for sales)", () => {
    const salesUser: JwtPayload = {
      sub: "usr-sales",
      email: "vendedor@empresa.com",
      role: "SALES",
      organizationId: "tenant-abc",
    } as any;

    const adminUser: JwtPayload = {
      sub: "usr-admin",
      email: "diretor@empresa.com",
      role: "ADMIN",
      organizationId: "tenant-abc",
    } as any;

    it("permits sales to apply a discount within 5% limit", async () => {
      // 50,000 * 5% = 2,500. R$ 2,000 is allowed.
      const res = await service.updateDiscount("tenant-abc", "prop-123", 2000, salesUser);
      expect(res.discountBrl).toBe(2000);
      expect(mockLeadActivityLog.append).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "tenant-abc",
          leadId: "lead-789",
          kind: "NOTE_ADDED",
          meta: expect.objectContaining({
            discountBrl: 2000,
            updatedByUserId: "usr-sales",
            updatedByUserRole: "SALES",
          }),
        })
      );
    });

    it("blocks sales from applying a discount exceeding 5%", async () => {
      // 50,000 * 5% = 2,500. R$ 2,501 must be blocked.
      await expect(
        service.updateDiscount("tenant-abc", "prop-123", 2501, salesUser)
      ).rejects.toThrow(ForbiddenException);
      expect(mockLeadActivityLog.append).not.toHaveBeenCalled();
    });

    it("allows ADMIN to apply discounts exceeding 5%", async () => {
      // 50,000 * 10% = 5,000. Admin can approve.
      const res = await service.updateDiscount("tenant-abc", "prop-123", 5000, adminUser);
      expect(res.discountBrl).toBe(5000);
      expect(mockLeadActivityLog.append).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            discountBrl: 5000,
            updatedByUserId: "usr-admin",
            updatedByUserRole: "ADMIN",
          }),
        })
      );
    });
  });

  describe("Margin & Labor Overrides RBAC", () => {
    const salesUser: JwtPayload = {
      sub: "usr-sales",
      email: "vendedor@empresa.com",
      role: "SALES",
      organizationId: "tenant-abc",
    } as any;

    const adminUser: JwtPayload = {
      sub: "usr-admin",
      email: "diretor@empresa.com",
      role: "ADMIN",
      organizationId: "tenant-abc",
    } as any;

    it("blocks SALES from modifying margin override", async () => {
      await expect(
        service.updateMarginOverride("tenant-abc", "prop-123", 12000, salesUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it("allows ADMIN to modify margin override and logs audit activity", async () => {
      const res = await service.updateMarginOverride("tenant-abc", "prop-123", 18000, adminUser);
      expect(res.id).toBe("prop-123");
      expect(mockLeadActivityLog.append).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "tenant-abc",
          leadId: "lead-789",
          label: expect.stringContaining("Margem comercial ajustada"),
          meta: expect.objectContaining({
            marginBrl: 18000,
            updatedByUserId: "usr-admin",
          }),
        })
      );
    });

    it("blocks SALES from modifying labor override", async () => {
      await expect(
        service.updateLaborOverride("tenant-abc", "prop-123", 4000, salesUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it("allows ADMIN to modify labor override and logs audit activity", async () => {
      const res = await service.updateLaborOverride("tenant-abc", "prop-123", 6000, adminUser);
      expect(res.id).toBe("prop-123");
      expect(mockLeadActivityLog.append).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "tenant-abc",
          leadId: "lead-789",
          label: expect.stringContaining("Custo de mão de obra ajustado"),
          meta: expect.objectContaining({
            laborBrl: 6000,
            updatedByUserId: "usr-admin",
          }),
        })
      );
    });
  });

  describe("findPublicById and trackPublicProposalView", () => {
    it("does NOT call handlePublicProposalView by default on read (safe for SSR & link unfurls)", async () => {
      mockNotifications.handlePublicProposalView.mockClear();
      await service.findPublicById("prop-123");
      expect(mockNotifications.handlePublicProposalView).not.toHaveBeenCalled();
    });

    it("calls handlePublicProposalView when trackView is true and isPdf is false", async () => {
      mockNotifications.handlePublicProposalView.mockClear();
      await service.findPublicById("prop-123", { trackView: true });
      expect(mockNotifications.handlePublicProposalView).toHaveBeenCalledWith("prop-123");
    });

    it("does NOT call handlePublicProposalView when isPdf is true even if trackView is true", async () => {
      mockNotifications.handlePublicProposalView.mockClear();
      await service.findPublicById("prop-123", { isPdf: true, trackView: true });
      expect(mockNotifications.handlePublicProposalView).not.toHaveBeenCalled();
    });

    it("trackPublicProposalView ignores bots and crawlers (e.g. WhatsApp, Facebook)", async () => {
      mockNotifications.handlePublicProposalView.mockClear();
      const res = await service.trackPublicProposalView("prop-123", {
        userAgent: "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      });
      expect(res.tracked).toBe(false);
      expect(res.reason).toBe("bot_ignored");
      expect(mockNotifications.handlePublicProposalView).not.toHaveBeenCalled();

      const waRes = await service.trackPublicProposalView("prop-123", {
        userAgent: "WhatsApp/2.23.20.76 i",
      });
      expect(waRes.tracked).toBe(false);
      expect(mockNotifications.handlePublicProposalView).not.toHaveBeenCalled();
    });

    it("trackPublicProposalView suppresses tracking when isPdf is true", async () => {
      mockNotifications.handlePublicProposalView.mockClear();
      const res = await service.trackPublicProposalView("prop-123", { isPdf: true });
      expect(res.tracked).toBe(false);
      expect(res.reason).toBe("pdf_suppressed");
      expect(mockNotifications.handlePublicProposalView).not.toHaveBeenCalled();
    });

    it("trackPublicProposalView calls handlePublicProposalView for real user browser", async () => {
      mockNotifications.handlePublicProposalView.mockClear();
      const res = await service.trackPublicProposalView("prop-123", {
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      });
      expect(res.tracked).toBe(true);
      expect(mockNotifications.handlePublicProposalView).toHaveBeenCalledWith("prop-123");
    });
  });
});
