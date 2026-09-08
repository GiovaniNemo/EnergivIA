/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WebhooksDispatcherService, signWebhookPayload } from "../webhooks-dispatcher.service";

describe("WebhooksDispatcherService", () => {
  let service: WebhooksDispatcherService;
  let mockPrisma: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockPrisma = {};
    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === "ENTERPRISE_WEBHOOK_URL") return "https://api.empresa-solar.com/webhook";
        if (key === "ENTERPRISE_WEBHOOK_SECRET") return "test-secret-12345";
        return null;
      }),
    };

    service = new WebhooksDispatcherService(mockPrisma, mockConfigService);
    vi.restoreAllMocks();
  });

  describe("signWebhookPayload (HMAC SHA-256)", () => {
    it("generates deterministic hex signature with secret", () => {
      const payload = JSON.stringify({ hello: "world" });
      const secret = "my-secret-key";
      const sig1 = signWebhookPayload(payload, secret);
      const sig2 = signWebhookPayload(payload, secret);

      expect(sig1).toBe(sig2);
      expect(sig1).toHaveLength(64); // SHA-256 hex string is 64 characters
    });

    it("changes signature if payload or secret differs", () => {
      const sigA = signWebhookPayload("abc", "secret1");
      const sigB = signWebhookPayload("abc", "secret2");
      const sigC = signWebhookPayload("xyz", "secret1");

      expect(sigA).not.toBe(sigB);
      expect(sigA).not.toBe(sigC);
    });
  });

  describe("dispatch", () => {
    it("returns delivered: false when no webhook URL is configured", async () => {
      mockConfigService.get.mockReturnValue(null);

      const res = await service.dispatch("tenant-1", "proposal.created", {
        proposalId: "p-1",
      });

      expect(res.delivered).toBe(false);
      expect(res.deliveryId).toBeDefined();
    });

    it("successfully sends HTTP POST with HMAC headers when endpoint is configured", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      global.fetch = mockFetch;

      const res = await service.dispatch("tenant-1", "proposal.accepted", {
        proposalId: "prop-999",
        valueBrl: 45000,
      });

      expect(res.delivered).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const firstCall = mockFetch.mock.calls[0] as [string, RequestInit];
      const [url, options] = firstCall;
      expect(url).toBe("https://api.empresa-solar.com/webhook");
      expect(options.method).toBe("POST");
      expect((options.headers as Record<string, string>)["X-Energivia-Event"]).toBe(
        "proposal.accepted"
      );
      expect((options.headers as Record<string, string>)["X-Energivia-Signature"]).toMatch(
        /^sha256=[a-f0-9]{64}$/
      );

      const body = JSON.parse(options.body as string);
      expect(body.event).toBe("proposal.accepted");
      expect(body.tenantId).toBe("tenant-1");
      expect(body.data.proposalId).toBe("prop-999");
    });

    it("handles remote 500 errors gracefully without throwing", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });
      global.fetch = mockFetch;

      const res = await service.dispatch("tenant-1", "proposal.sent", {
        proposalId: "p-fail",
      });

      expect(res.delivered).toBe(false);
    });

    it("handles network failure or timeout gracefully without crashing application", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Connection refused"));
      global.fetch = mockFetch;

      const res = await service.dispatch("tenant-1", "deal.stage_changed", {
        dealId: "d-1",
      });

      expect(res.delivered).toBe(false);
    });
  });
});
