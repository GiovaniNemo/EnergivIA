import { Injectable, Logger, BadRequestException, OnModuleDestroy } from "@nestjs/common";
import chromium from "@sparticuz/chromium";
import puppeteerCore, { type Browser, type PDFOptions } from "puppeteer-core";

export interface RenderPdfOptions {
  url: string;
  pdfOptions?: PDFOptions;
  timeoutMs?: number;
}

const DEFAULT_PDF_OPTIONS: PDFOptions = {
  format: "A4",
  printBackground: true,
  margin: {
    top: "10mm",
    right: "10mm",
    bottom: "10mm",
    left: "10mm",
  },
};

/**
 * Enterprise PDF Rendering Service with concurrency control and resource isolation.
 * Prevents API crashes caused by uncontrolled parallel Chromium instances.
 */
@Injectable()
export class PdfRendererService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfRendererService.name);
  private readonly maxConcurrent: number;
  private currentRunning = 0;
  private readonly queue: Array<() => void> = [];

  constructor() {
    const parsedMax = Number(process.env["PDF_MAX_CONCURRENT_RENDERS"] ?? 2);
    this.maxConcurrent = Number.isFinite(parsedMax) && parsedMax > 0 ? parsedMax : 2;
    this.logger.log(
      `PdfRendererService inicializado com concorrência máxima: ${this.maxConcurrent}`
    );
  }

  async onModuleDestroy() {
    this.queue.length = 0;
  }

  /**
   * Acquires a concurrency permit before rendering.
   */
  private async acquirePermit(): Promise<void> {
    if (this.currentRunning < this.maxConcurrent) {
      this.currentRunning++;
      return;
    }

    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.currentRunning++;
        resolve();
      });
    });
  }

  /**
   * Releases a concurrency permit after rendering finishes.
   */
  private releasePermit(): void {
    this.currentRunning = Math.max(0, this.currentRunning - 1);
    const next = this.queue.shift();
    if (next) {
      next();
    }
  }

  /**
   * Renders a given URL into a PDF Buffer safely.
   */
  async renderUrlToPdf(options: RenderPdfOptions): Promise<Buffer> {
    await this.acquirePermit();

    const startTime = Date.now();
    let browser: Browser | null = null;

    try {
      this.logger.log(
        `[PDF] Iniciando renderização para URL: ${options.url} (Em execução: ${this.currentRunning}/${this.maxConcurrent})`
      );

      const isLocal = process.platform === "win32" || process.platform === "darwin";

      if (isLocal) {
        const puppeteerLocal = await import("puppeteer");
        browser = (await puppeteerLocal.default.launch({
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--no-zygote",
            "--single-process",
          ],
        })) as unknown as Browser;
      } else {
        browser = (await puppeteerCore.launch({
          args: [
            ...chromium.args,
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
          ],
          executablePath: await chromium.executablePath(),
          headless: true,
        })) as unknown as Browser;
      }

      const page = await browser.newPage();
      const timeoutMs = options.timeoutMs ?? 30_000;

      // Set viewport suitable for A4 printable previews
      await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 1 });

      try {
        await page.goto(options.url, {
          waitUntil: "networkidle0",
          timeout: timeoutMs,
        });
      } catch (navErr) {
        this.logger.warn(
          `[PDF] networkidle0 timeout (${timeoutMs}ms) ao carregar ${options.url}, tentando domcontentloaded: ${String(navErr)}`
        );
        // Fallback: don't fail immediately if analytics or external trackers hold connections
        await page.goto(options.url, {
          waitUntil: "domcontentloaded",
          timeout: 10_000,
        });
      }

      const pdfBuffer = await page.pdf(options.pdfOptions ?? DEFAULT_PDF_OPTIONS);
      const elapsed = Date.now() - startTime;
      this.logger.log(
        `[PDF] Sucesso gerando PDF (${elapsed}ms, tamanho: ${pdfBuffer.length} bytes)`
      );

      return Buffer.from(pdfBuffer);
    } catch (err) {
      this.logger.error(`[PDF] Falha ao renderizar PDF para ${options.url}: ${String(err)}`);
      throw new BadRequestException("Não foi possível gerar o PDF da proposta comercial.");
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeErr) {
          this.logger.warn(`[PDF] Erro ao fechar browser instance: ${String(closeErr)}`);
        }
      }
      this.releasePermit();
    }
  }

  getMetrics() {
    return {
      activeRenders: this.currentRunning,
      queuedRenders: this.queue.length,
      maxConcurrent: this.maxConcurrent,
    };
  }
}
