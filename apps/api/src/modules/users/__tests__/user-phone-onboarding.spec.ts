/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { UsersService } from "../users.service";

describe("UsersService - Onboarding Phone & Status Tracking", () => {
  let service: UsersService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      tenant: {
        findFirst: vi.fn(),
      },
    };

    service = new UsersService(mockPrisma);
  });

  describe("updateOnboardingContact", () => {
    it("should sanitize and update user phone number and set status to IN_PROGRESS", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "usr_123",
        email: "integrador@solar.com",
        name: "Carlos Integrador",
        phone: null,
      });

      mockPrisma.user.update.mockResolvedValue({
        id: "usr_123",
        phone: "11988887777",
        onboardingStatus: "IN_PROGRESS",
      });

      const result = await service.updateOnboardingContact("usr_123", {
        phone: "(11) 98888-7777",
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "usr_123" },
        data: {
          phone: "11988887777",
          onboardingStatus: "IN_PROGRESS",
          lastActiveAt: expect.any(Date),
        },
        select: expect.objectContaining({
          id: true,
          phone: true,
          onboardingStatus: true,
        }),
      });

      expect(result.phone).toBe("11988887777");
    });
  });

  describe("markOnboardingAbandoned", () => {
    it("should set onboardingStatus to ABANDONED and set timestamp", async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "usr_123",
        email: "integrador@solar.com",
        name: "Carlos Integrador",
        phone: "11988887777",
        onboardingStatus: "IN_PROGRESS",
        organizationMemberships: [],
      });

      mockPrisma.user.update.mockResolvedValue({
        id: "usr_123",
        email: "integrador@solar.com",
        name: "Carlos Integrador",
        phone: "11988887777",
        onboardingStatus: "ABANDONED",
        onboardingAbandonedAt: new Date(),
      });

      const result = await service.markOnboardingAbandoned("usr_123", {
        step: 1,
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "usr_123" },
        data: {
          onboardingStatus: "ABANDONED",
          onboardingAbandonedAt: expect.any(Date),
          lastActiveAt: expect.any(Date),
        },
      });

      expect(result.onboardingStatus).toBe("ABANDONED");
    });

    it("should not dispatch duplicate alert if user already had an alert sent within cooldown", async () => {
      const mockAdminAlerts = {
        notifyOnboardingAbandoned: vi.fn().mockResolvedValue(undefined),
      };
      const serviceWithAlerts = new UsersService(mockPrisma, mockAdminAlerts as any);

      // Usuário com alerta enviado há apenas 2 minutos
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: "usr_123",
        email: "integrador@solar.com",
        name: "Carlos Integrador",
        phone: "11988887777",
        onboardingStatus: "ABANDONED",
        onboardingAbandonedAt: twoMinutesAgo,
        organizationMemberships: [],
      });

      mockPrisma.user.update.mockResolvedValue({
        id: "usr_123",
        onboardingStatus: "ABANDONED",
      });

      const result = await serviceWithAlerts.markOnboardingAbandoned("usr_123", { step: 2 });

      expect(result.alertDispatched).toBe(false);
      expect(mockAdminAlerts.notifyOnboardingAbandoned).not.toHaveBeenCalled();
    });
  });

  describe("getActivationStatusList", () => {
    it("should classify abandoned, inactive, and active integrators", async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: "usr_abandoned",
          name: "Abandono Onboarding",
          email: "abandoned@test.com",
          phone: "11999991111",
          onboardingStatus: "ABANDONED",
          organizationMemberships: [],
          createdAt: new Date(),
        },
        {
          id: "usr_inactive",
          name: "Cadastrado Sem Propostas",
          email: "inactive@test.com",
          phone: "11999992222",
          onboardingStatus: "COMPLETED",
          organizationMemberships: [
            {
              organization: {
                id: "org_1",
                name: "Empresa Solar 1",
                _count: { proposals: 0 },
              },
            },
          ],
          createdAt: new Date(),
        },
        {
          id: "usr_active",
          name: "Integrador Ativo",
          email: "active@test.com",
          phone: "11999993333",
          onboardingStatus: "COMPLETED",
          organizationMemberships: [
            {
              organization: {
                id: "org_2",
                name: "Empresa Solar 2",
                _count: { proposals: 5 },
              },
            },
          ],
          createdAt: new Date(),
        },
      ]);

      const res = await service.getActivationStatusList();

      expect(res.summary.total).toBe(3);
      expect(res.summary.abandoned).toBe(1);
      expect(res.summary.registeredNoUsage).toBe(1);
      expect(res.summary.active).toBe(1);

      expect(res.items[0]?.activationStatus).toBe("ABANDONED_ONBOARDING");
      expect(res.items[1]?.activationStatus).toBe("REGISTERED_NO_USAGE");
      expect(res.items[2]?.activationStatus).toBe("ACTIVE");
    });
  });
});
