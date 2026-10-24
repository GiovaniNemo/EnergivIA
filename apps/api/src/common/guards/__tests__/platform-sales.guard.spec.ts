/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from "vitest";
import { ForbiddenException, ExecutionContext } from "@nestjs/common";
import { PlatformSalesGuard } from "../platform-sales.guard";

describe("PlatformSalesGuard", () => {
  let guard: PlatformSalesGuard;

  beforeEach(() => {
    guard = new PlatformSalesGuard();
    delete process.env["PLATFORM_ADMIN_EMAILS"];
  });

  const createMockContext = (user: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  it("should allow access for users with role PLATFORM_SALES", () => {
    const context = createMockContext({
      id: "user-sdr-1",
      email: "vendedor@empresa.com",
      role: "PLATFORM_SALES",
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it("should allow access for users with role PLATFORM (Super Admin)", () => {
    const context = createMockContext({
      id: "admin-1",
      email: "qualquer@admin.com",
      role: "PLATFORM",
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it("should allow access for platform admin emails even if role is not PLATFORM_SALES", () => {
    const context = createMockContext({
      id: "admin-giovani",
      email: "sgiovanimendes@gmail.com",
      role: "OWNER",
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it("should throw ForbiddenException for tenant regular users (SALES, ADMIN, OWNER)", () => {
    const contextSales = createMockContext({
      id: "tenant-sales-1",
      email: "integrador@solar.com",
      role: "SALES",
    });

    expect(() => guard.canActivate(contextSales)).toThrow(ForbiddenException);

    const contextAdmin = createMockContext({
      id: "tenant-admin-1",
      email: "integrador-admin@solar.com",
      role: "ADMIN",
    });

    expect(() => guard.canActivate(contextAdmin)).toThrow(ForbiddenException);
  });

  it("should throw ForbiddenException when user is undefined or missing role", () => {
    const context = createMockContext(undefined);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
