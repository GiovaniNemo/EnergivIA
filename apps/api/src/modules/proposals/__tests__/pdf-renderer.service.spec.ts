import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PdfRendererService } from "../pdf-renderer.service";

describe("PdfRendererService - Concurrency & Lifecycle", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should initialize with default concurrency of 2 when env is not set", () => {
    delete process.env["PDF_MAX_CONCURRENT_RENDERS"];
    const service = new PdfRendererService();
    const metrics = service.getMetrics();

    expect(metrics.maxConcurrent).toBe(2);
    expect(metrics.activeRenders).toBe(0);
    expect(metrics.queuedRenders).toBe(0);
  });

  it("should respect PDF_MAX_CONCURRENT_RENDERS environment configuration", () => {
    process.env["PDF_MAX_CONCURRENT_RENDERS"] = "4";
    const service = new PdfRendererService();
    const metrics = service.getMetrics();

    expect(metrics.maxConcurrent).toBe(4);
  });

  it("should fallback to 2 if environment value is invalid or negative", () => {
    process.env["PDF_MAX_CONCURRENT_RENDERS"] = "-5";
    const service = new PdfRendererService();
    expect(service.getMetrics().maxConcurrent).toBe(2);
  });
});
