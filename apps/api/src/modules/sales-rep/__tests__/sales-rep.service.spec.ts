/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { SalesRepService } from "../sales-rep.service";

describe("SalesRepService", () => {
  let service: SalesRepService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      tenant: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
      },
      salesActivityNote: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      systemSetting: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
    };

    service = new SalesRepService(mockPrisma);
  });

  describe("getDashboardSummary", () => {
    it("should calculate KPIs for a sales rep with assigned tenants", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "rep-1",
        name: "Carlos SDR",
        referralCode: "carlos",
        commissionRate: 0.1,
      });

      const now = new Date();
      mockPrisma.tenant.findMany.mockResolvedValue([
        {
          id: "t-1",
          name: "Solar Alpha",
          createdAt: now,
          subscriptionPlan: null,
          subscription: null,
          _count: { proposals: 5 },
        },
        {
          id: "t-2",
          name: "Solar Beta",
          createdAt: now,
          subscriptionPlan: "PRO",
          subscription: { status: "active" },
          _count: { proposals: 12 },
        },
      ]);

      const result = await service.getDashboardSummary("rep-1", false);

      expect(mockPrisma.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ salesRepId: "rep-1" }),
        })
      );

      expect(result.totalTenants).toBe(2);
      expect(result.trialTenants).toBe(1);
      expect(result.activeTenants).toBe(1);
      expect(result.totalProposals).toBe(17);
      expect(result.referralCode).toBe("carlos");
      expect(result.referralLink).toContain("?ref=carlos");
      expect(result.commissionTiers).toEqual({
        firstMonth: 20,
        months2To12: 10,
        months13Plus: 5,
      });
      // 1 active tenant on 1st month (R$ 197/mo) with 20% = R$ 39.40
      expect(result.estimatedCommission).toBeCloseTo(39.4, 1);
    });

    it("should calculate tiered commission correctly based on tenant age", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "rep-tiered",
        commissionRate: 0.1,
      });

      const dayMs = 24 * 60 * 60 * 1000;
      const now = new Date();
      // Tenant 1: created 10 days ago -> 1st month (20% of 197 = 39.4)
      const t1Date = new Date(now.getTime() - 10 * dayMs);
      // Tenant 2: created 90 days ago (~3rd month) -> 2nd-12th month (10% of 197 = 19.7)
      const t2Date = new Date(now.getTime() - 90 * dayMs);
      // Tenant 3: created 450 days ago (~15th month) -> 13th+ month (5% of 197 = 9.85)
      const t3Date = new Date(now.getTime() - 450 * dayMs);

      mockPrisma.tenant.findMany.mockResolvedValue([
        {
          id: "t-1",
          createdAt: t1Date,
          subscriptionPlan: "PRO",
          subscription: { status: "active" },
          _count: { proposals: 2 },
        },
        {
          id: "t-2",
          createdAt: t2Date,
          subscriptionPlan: "PRO",
          subscription: { status: "active" },
          _count: { proposals: 5 },
        },
        {
          id: "t-3",
          createdAt: t3Date,
          subscriptionPlan: "PRO",
          subscription: { status: "active" },
          _count: { proposals: 8 },
        },
      ]);

      const result = await service.getDashboardSummary("rep-tiered", false);

      expect(result.totalTenants).toBe(3);
      expect(result.activeTenants).toBe(3);
      // Total estimated commission: 39.4 + 19.7 + 9.85 = 68.95
      expect(result.estimatedCommission).toBeCloseTo(68.95, 1);
    });

    it("should query all tenants when user is super admin", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "admin-1",
        referralCode: "admin",
        commissionRate: 0.1,
      });
      mockPrisma.tenant.findMany.mockResolvedValue([]);

      await service.getDashboardSummary("admin-1", true);

      expect(mockPrisma.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ salesRepId: "admin-1" }),
        })
      );
    });
  });

  describe("listTenants", () => {
    it("should list assigned tenants with health metrics and contacts", async () => {
      const now = new Date();
      mockPrisma.tenant.findMany.mockResolvedValue([
        {
          id: "t-1",
          name: "Sol Brasil",
          slug: "sol-brasil",
          createdAt: now,
          subscriptionPlan: null,
          subscription: null,
          salesRepId: "rep-1",
          referralCode: "carlos",
          whatsappInboundPhones: [{ id: "wp-1" }],
          _count: { proposals: 3, energyBills: 2 },
          creator: { name: "Marcos", email: "marcos@sol.com", phone: "11999999999" },
          salesNotes: [
            {
              id: "note-1",
              content: "Apresentação feita",
              stage: "DEMO",
              createdAt: now,
            },
          ],
        },
      ]);

      const result = await service.listTenants("rep-1", false, {});

      expect(result.length).toBe(1);
      expect(result[0].name).toBe("Sol Brasil");
      expect(result[0].proposalsCount).toBe(3);
      expect(result[0].billsCount).toBe(2);
      expect(result[0].hasWhatsappConnected).toBe(true);
      expect(result[0].lastNote?.content).toBe("Apresentação feita");
      expect(result[0].primaryContact?.email).toBe("marcos@sol.com");
    });
  });

  describe("addNote", () => {
    it("should add a sales activity note when tenant belongs to rep", async () => {
      mockPrisma.tenant.findFirst.mockResolvedValue({
        id: "t-1",
        salesRepId: "rep-1",
      });

      mockPrisma.salesActivityNote.create.mockResolvedValue({
        id: "note-100",
        tenantId: "t-1",
        salesRepId: "rep-1",
        content: "Cliente interessado no plano Pro",
        stage: "NEGOTIATING",
        createdAt: new Date(),
      });

      const note = await service.addNote("rep-1", "t-1", false, {
        content: "Cliente interessado no plano Pro",
        stage: "NEGOTIATING",
      });

      expect(note.id).toBe("note-100");
      expect(mockPrisma.salesActivityNote.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: "t-1",
          salesRepId: "rep-1",
          content: "Cliente interessado no plano Pro",
          stage: "NEGOTIATING",
        }),
      });
    });

    it("should throw ForbiddenException if tenant is assigned to another sales rep", async () => {
      mockPrisma.tenant.findFirst.mockResolvedValue({
        id: "t-1",
        salesRepId: "another-rep",
      });

      await expect(
        service.addNote("rep-1", "t-1", false, {
          content: "Nota",
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it("should allow super admin to add note to any tenant", async () => {
      mockPrisma.tenant.findFirst.mockResolvedValue({
        id: "t-1",
        salesRepId: "another-rep",
      });
      mockPrisma.salesActivityNote.create.mockResolvedValue({ id: "note-1" });

      const res = await service.addNote("admin-1", "t-1", true, { content: "Superadmin note" });
      expect(res.id).toBe("note-1");
    });
  });

  describe("getReferralLink", () => {
    it("should return referral link for user", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "rep-1",
        referralCode: "sdr-pedro",
      });

      const res = await service.getReferralLink("rep-1");
      expect(res.referralCode).toBe("sdr-pedro");
      expect(res.referralLink).toContain("/cadastro?ref=sdr-pedro");
    });

    it("should generate a fallback referral code if user doesn't have one", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "rep-2",
        name: "Ana Silva",
        referralCode: null,
      });

      mockPrisma.user.update.mockResolvedValue({
        id: "rep-2",
        referralCode: "ana-silva",
      });

      const res = await service.getReferralLink("rep-2");
      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(res.referralLink).toBeDefined();
    });
  });

  describe("Whitelist & Sales Rep Management", () => {
    it("should authorize a new sales rep and update existing user to PLATFORM_SALES", async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);
      mockPrisma.systemSetting.upsert.mockResolvedValue({});
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "user-123",
        name: "Marcos Paulo",
        email: "marcos@vendas.com",
        referralCode: null,
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.tenant.count.mockResolvedValue(0);

      const result = await service.authorizeSalesRep({
        email: "marcos@vendas.com",
        name: "Marcos Paulo",
        commissionRate: 15,
      });

      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: "sales_rep_whitelist" },
        })
      );

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-123" },
          data: expect.objectContaining({
            role: "PLATFORM_SALES",
            commissionRate: 0.15,
          }),
        })
      );

      expect(result.email).toBe("marcos@vendas.com");
      expect(result.status).toBe("ACTIVE");
      expect(result.isRegistered).toBe(true);
      expect(result.commissionTiers).toEqual({
        firstMonth: 20,
        months2To12: 15,
        months13Plus: 5,
      });
    });

    it("should authorize sales rep with custom commission tiers", async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);
      mockPrisma.systemSetting.upsert.mockResolvedValue({});
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await service.authorizeSalesRep({
        email: "especialista@vendas.com",
        name: "Especialista Top",
        commissionFirstMonth: 25,
        commissionMonths2To12: 12,
        commissionMonths13Plus: 7,
      });

      expect(result.commissionTiers).toEqual({
        firstMonth: 25,
        months2To12: 12,
        months13Plus: 7,
      });
    });

    it("should authorize a new sales rep before they register in the system", async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);
      mockPrisma.systemSetting.upsert.mockResolvedValue({});
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await service.authorizeSalesRep({
        email: "futuro.vendedor@gmail.com",
        name: "Futuro Vendedor",
        commissionRate: 10,
      });

      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();

      expect(result.email).toBe("futuro.vendedor@gmail.com");
      expect(result.status).toBe("ACTIVE");
      expect(result.isRegistered).toBe(false);
      expect(result.referralLink).toContain("/cadastro?ref=");
    });

    it("should reject invalid email format", async () => {
      await expect(
        service.authorizeSalesRep({
          email: "invalid-email",
        })
      ).rejects.toThrow("E-mail de vendedor inválido.");
    });

    it("should revoke sales rep and demote existing user from PLATFORM_SALES to SALES", async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue({
        value: JSON.stringify([
          {
            email: "marcos@vendas.com",
            status: "ACTIVE",
            commissionRate: 10,
            createdAt: new Date().toISOString(),
          },
        ]),
      });
      mockPrisma.systemSetting.upsert.mockResolvedValue({});
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "user-123",
        role: "PLATFORM_SALES",
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.revokeSalesRep("marcos@vendas.com");
      expect(result.success).toBe(true);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { role: "SALES" },
      });
    });

    it("should verify if email is authorized", async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue({
        value: JSON.stringify([
          { email: "ativo@vendas.com", status: "ACTIVE" },
          { email: "revogado@vendas.com", status: "REVOKED" },
        ]),
      });

      expect(await service.isEmailAuthorized("ativo@vendas.com")).toBe(true);
      expect(await service.isEmailAuthorized("revogado@vendas.com")).toBe(false);
      expect(await service.isEmailAuthorized("desconhecido@vendas.com")).toBe(false);
    });
  });
});
