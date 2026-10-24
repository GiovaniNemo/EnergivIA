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
