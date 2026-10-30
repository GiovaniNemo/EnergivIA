/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { AppThrottlerGuard } from "../app-throttler.guard";
import { Reflector } from "@nestjs/core";

describe("AppThrottlerGuard", () => {
  let guard: AppThrottlerGuard;
  let reflector: Reflector;
  let mockStorageService: any;

  beforeEach(() => {
    reflector = new Reflector();
    mockStorageService = {
      increment: vi.fn(),
    };

    const options = [
      { name: "short", ttl: 10_000, limit: 30 },
      { name: "medium", ttl: 60_000, limit: 120 },
    ];

    guard = new AppThrottlerGuard(options as any, mockStorageService, reflector);
  });

  describe("getTracker", () => {
    it("should track by user sub when user is authenticated", async () => {
      const req = {
        user: { sub: "auth0|usr_12345" },
        headers: { "x-forwarded-for": "203.0.113.195" },
        ip: "10.0.0.1",
      };

      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe("usr_auth0|usr_12345");
    });

    it("should track by user id when user has id and no sub", async () => {
      const req = {
        user: { id: "usr_abc" },
        headers: {},
        ip: "10.0.0.1",
      };

      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe("usr_usr_abc");
    });

    it("should extract first client IP from x-forwarded-for header when unauthenticated", async () => {
      const req = {
        headers: {
          "x-forwarded-for": "177.136.240.12, 10.0.0.5, 172.16.0.1",
        },
        ip: "10.0.0.5",
      };

      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe("ip_177.136.240.12");
    });

    it("should extract client IP from x-real-ip when x-forwarded-for is missing", async () => {
      const req = {
        headers: {
          "x-real-ip": "189.40.55.99",
        },
        ip: "127.0.0.1",
      };

      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe("ip_189.40.55.99");
    });

    it("should fall back to req.ip when no proxy headers are present", async () => {
      const req = {
        headers: {},
        ip: "192.168.1.100",
      };

      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe("ip_192.168.1.100");
    });

    it("should fall back to 127.0.0.1 when req.ip is undefined", async () => {
      const req = {
        headers: {},
      };

      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe("ip_127.0.0.1");
    });
  });

  describe("shouldSkip", () => {
    it("should skip when THROTTLER:SKIPdefault is set via @SkipThrottle()", async () => {
      vi.spyOn(reflector, "getAllAndOverride").mockImplementation((key: string) => {
        if (key === "THROTTLER:SKIPdefault") return true;
        return undefined;
      });

      const mockContext = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
      } as any;

      const skip = await (guard as any).shouldSkip(mockContext);
      expect(skip).toBe(true);
    });

    it("should not skip when no skip metadata is present", async () => {
      vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(undefined);

      const mockContext = {
        getHandler: vi.fn(),
        getClass: vi.fn(),
      } as any;

      const skip = await (guard as any).shouldSkip(mockContext);
      expect(skip).toBe(false);
    });
  });

  describe("getErrorMessage", () => {
    it("should return localized Portuguese rate limit message", async () => {
      const message = await (guard as any).getErrorMessage();
      expect(message).toBe(
        "Muitas requisições em curto intervalo. Por segurança, aguarde alguns instantes antes de tentar novamente."
      );
    });
  });
});
