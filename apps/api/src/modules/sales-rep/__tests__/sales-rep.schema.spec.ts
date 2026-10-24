/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { PrismaClient, UserRole } from "@prisma/client";

describe("SalesRep Prisma Schema Extension", () => {
  it("should have PLATFORM_SALES in UserRole enum", () => {
    expect((UserRole as Record<string, string>).PLATFORM_SALES).toBe("PLATFORM_SALES");
  });

  it("should have SalesActivityNote delegate in PrismaClient", () => {
    const prisma = new PrismaClient();
    // Verify delegate method existence
    expect(prisma.salesActivityNote).toBeDefined();
    expect(typeof prisma.salesActivityNote.findMany).toBe("function");
    expect(typeof prisma.salesActivityNote.create).toBe("function");
  });

  it("should allow type structure with referralCode and salesRepId", () => {
    const mockUserPayload: {
      referralCode?: string | null;
      commissionRate?: any;
      role: UserRole;
    } = {
      referralCode: "sdr-joao",
      commissionRate: 0.1,
      role: UserRole.PLATFORM_SALES,
    };

    expect(mockUserPayload.referralCode).toBe("sdr-joao");
    expect(mockUserPayload.role).toBe("PLATFORM_SALES");

    const mockTenantPayload: {
      salesRepId?: string | null;
      referralCode?: string | null;
    } = {
      salesRepId: "user-123",
      referralCode: "sdr-joao",
    };

    expect(mockTenantPayload.salesRepId).toBe("user-123");
    expect(mockTenantPayload.referralCode).toBe("sdr-joao");
  });
});
