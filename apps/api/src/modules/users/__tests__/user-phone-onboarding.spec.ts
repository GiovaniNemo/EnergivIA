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
    it("should sanitize and update user phone number", async () => {
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
  });
});
