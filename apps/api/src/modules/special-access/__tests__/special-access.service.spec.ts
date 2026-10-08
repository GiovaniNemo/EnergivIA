import { describe, it, expect, beforeEach, vi } from "vitest";
import { SpecialAccessService } from "../special-access.service";
import { getTenantPlanDetails } from "../../../common/utils/plan-limits";

describe("SpecialAccessService Suite", () => {
  let service: SpecialAccessService;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      systemSetting: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      user: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      tenant: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      tenantWhatsappInboundPhone: {
        findFirst: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    service = new SpecialAccessService(mockPrisma);
    process.env["COMPLIMENTARY_ACCESS_EMAILS"] = "marketing@energivia.com.br,parceiro@teste.com";
  });

  describe("Authorization & Recognition", () => {
    it("should authorize an email configured in COMPLIMENTARY_ACCESS_EMAILS", async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);

      const isAuth = await service.isEmailAuthorized("marketing@energivia.com.br");
      expect(isAuth).toBe(true);
    });

    it("should authorize an email added directly via database setting", async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue({
        key: "special_access_list",
        value: JSON.stringify([
          { email: "novo.marketing@empresa.com", status: "ACTIVE", source: "MANUAL" },
        ]),
      });

      const isAuth = await service.isEmailAuthorized("novo.marketing@empresa.com");
      expect(isAuth).toBe(true);
    });

    it("should DENY access if email was explicitly revoked in DB even if still present in env var", async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue({
        key: "special_access_list",
        value: JSON.stringify([
          { email: "marketing@energivia.com.br", status: "REVOKED", source: "ENV" },
        ]),
      });

      const isAuth = await service.isEmailAuthorized("marketing@energivia.com.br");
      expect(isAuth).toBe(false);
    });

    it("should deny access to any unlisted email", async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);

      const isAuth = await service.isEmailAuthorized("estranho@outro.com");
      expect(isAuth).toBe(false);
    });
  });

  describe("Single Kill-Switch Revocation", () => {
    it("should revoke access, delete WhatsApp number and mark tenant as revoked", async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);
      mockPrisma.systemSetting.upsert.mockResolvedValue({
        key: "special_access_list",
        value: "{}",
      });

      mockPrisma.user.findFirst.mockResolvedValue({
        id: "user-123",
        email: "marketing@energivia.com.br",
        tenantId: "tenant-marketing-1",
        tenant: { id: "tenant-marketing-1", settings: {} },
      });

      await service.revokeSpecialAccess("marketing@energivia.com.br");

      // Verificação do expurgo de WhatsApp
      expect(mockPrisma.tenantWhatsappInboundPhone.deleteMany).toHaveBeenCalledWith({
        where: { organizationId: "tenant-marketing-1" },
      });

      // Verificação da atualização do Tenant
      expect(mockPrisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "tenant-marketing-1" },
          data: expect.objectContaining({
            settings: expect.objectContaining({
              specialAccessActive: false,
              specialAccessRevoked: true,
            }),
          }),
        })
      );
    });
  });

  describe("Plan Limits Integration with Special Access", () => {
    it("should grant Plus tier and unlimited proposals when special access is active", () => {
      const tenant = {
        id: "tenant-marketing-1",
        createdAt: new Date("2026-01-01"),
        settings: { specialAccessActive: true, specialAccessRevoked: false },
        subscription: null,
      };

      const planDetails = getTenantPlanDetails(tenant);
      expect(planDetails.isTrial).toBe(false);
      expect(planDetails.tier).toBe("PLUS");
      expect(planDetails.features.hasWhatsappBot).toBe(true);
      expect(planDetails.features.maxProposalsPerMonth).toBeNull();
    });

    it("should lock to expired trial when special access is revoked", () => {
      const tenant = {
        id: "tenant-marketing-1",
        createdAt: new Date("2026-01-01"),
        settings: { specialAccessActive: false, specialAccessRevoked: true },
        subscription: null,
      };

      const planDetails = getTenantPlanDetails(tenant);
      expect(planDetails.isTrial).toBe(true);
      expect(planDetails.trialExpired).toBe(true);
      expect(planDetails.tier).toBe("TRIAL");
    });
  });
});
