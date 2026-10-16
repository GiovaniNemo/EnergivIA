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

  it("should throw BadRequestException when renderHtmlToPdf is called with empty html", async () => {
    const service = new PdfRendererService();
    await expect(service.renderHtmlToPdf({ html: "   " })).rejects.toThrow(
      "HTML para renderização de PDF não pode ser vazio."
    );
  });

  it("should throw BadRequestException when renderUrlToPdf is called with empty url", async () => {
    const service = new PdfRendererService();
    await expect(service.renderUrlToPdf({ url: "   " })).rejects.toThrow(
      "URL para renderização de PDF não pode ser vazia."
    );
  });

  it("should throw BadRequestException when renderScreenshot is called with empty url", async () => {
    const service = new PdfRendererService();
    await expect(service.renderScreenshot({ url: "   " })).rejects.toThrow(
      "URL para captura de thumbnail não pode ser vazia."
    );
  });
});
