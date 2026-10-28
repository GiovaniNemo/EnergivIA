import * as fs from "node:fs";
import { Injectable, Logger, BadRequestException, OnModuleDestroy } from "@nestjs/common";
import chromium from "@sparticuz/chromium";
import puppeteerCore, { type Browser, type PDFOptions } from "puppeteer-core";

export interface RenderPdfOptions {
  url: string;
  pdfOptions?: PDFOptions;
  timeoutMs?: number;
}

export interface RenderHtmlOptions {
  html: string;
  pdfOptions?: PDFOptions;
  timeoutMs?: number;
}

export interface RenderScreenshotOptions {
  url: string;
  selector?: string;
  timeoutMs?: number;
  width?: number;
  height?: number;
}

const DEFAULT_PDF_OPTIONS: PDFOptions = {
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
  margin: {
    top: "0mm",
    right: "0mm",
    bottom: "0mm",
    left: "0mm",
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
   * Spawns an isolated Chromium browser instance suited for the runtime platform.
   */
  private async createBrowser(): Promise<Browser> {
    const isLocal = process.platform === "win32" || process.platform === "darwin";

    if (isLocal) {
      const puppeteerLocal = await import("puppeteer");
      return (await puppeteerLocal.default.launch({
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
    }

    const envPath = process.env["PUPPETEER_EXECUTABLE_PATH"];
    const systemPath =
      envPath && fs.existsSync(envPath)
        ? envPath
        : fs.existsSync("/usr/bin/chromium-browser")
          ? "/usr/bin/chromium-browser"
          : fs.existsSync("/usr/bin/chromium")
            ? "/usr/bin/chromium"
            : undefined;

    const executablePath = systemPath || (await chromium.executablePath());

    return (await puppeteerCore.launch({
      args: [
        ...(systemPath ? [] : chromium.args),
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
        "--no-zygote",
      ],
      executablePath,
      headless: true,
    })) as unknown as Browser;
  }

  /**
   * Renders a given URL into a PDF Buffer safely.
   */
  async renderUrlToPdf(options: RenderPdfOptions): Promise<Buffer> {
    const cleanUrl = (options.url ?? "").trim();
    if (!cleanUrl) {
      throw new BadRequestException("URL para renderização de PDF não pode ser vazia.");
    }

    await this.acquirePermit();

    const startTime = Date.now();
    let browser: Browser | null = null;

    try {
      this.logger.log(
        `[PDF] Iniciando renderização para URL: ${cleanUrl} (Em execução: ${this.currentRunning}/${this.maxConcurrent})`
      );

      browser = await this.createBrowser();
      const page = await browser.newPage();
      const timeoutMs = options.timeoutMs ?? 30_000;

      // Viewport exato da proporção física A4 (210x297mm a 96DPI) com Retina 2x para nitidez máxima de imagens e fontes
      await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

      try {
        await page.goto(cleanUrl, {
          waitUntil: ["domcontentloaded", "networkidle2"],
          timeout: timeoutMs,
        });
      } catch (navErr) {
        this.logger.warn(
          `[PDF] navigation timeout (${timeoutMs}ms) ao carregar ${cleanUrl}, tentando domcontentloaded: ${String(navErr)}`
        );
        // Fallback: don't fail immediately if analytics or external trackers hold connections
        await page.goto(cleanUrl, {
          waitUntil: "domcontentloaded",
          timeout: 15_000,
        });
      }

      // Aguarda montagem visual do componente do preview e fontes
      await page
        .waitForSelector('[data-preview-scroll="true"]', { timeout: 15_000 })
        .catch(() => {});
      await page
        .evaluate(
          () =>
            (globalThis as unknown as { document?: { fonts?: { ready?: Promise<unknown> } } })
              .document?.fonts?.ready
        )
        .catch(() => {});

      // Delay de 2000ms para garantir carregamento assíncrono completo de imagens externas (S3), gráficos e renderizadores
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const pdfBuffer = await page.pdf(options.pdfOptions ?? DEFAULT_PDF_OPTIONS);
      const elapsed = Date.now() - startTime;
      this.logger.log(
        `[PDF] Sucesso gerando PDF (${elapsed}ms, tamanho: ${pdfBuffer.length} bytes)`
      );

      return Buffer.from(pdfBuffer);
    } catch (err) {
      this.logger.error(`[PDF] Falha ao renderizar PDF para ${cleanUrl}: ${String(err)}`);
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

  /**
   * Renders raw HTML string into a PDF Buffer safely.
   */
  async renderHtmlToPdf(options: RenderHtmlOptions): Promise<Buffer> {
    const cleanHtml = (options.html ?? "").trim();
    if (!cleanHtml) {
      throw new BadRequestException("HTML para renderização de PDF não pode ser vazio.");
    }

    await this.acquirePermit();

    const startTime = Date.now();
    let browser: Browser | null = null;

    try {
      this.logger.log(
        `[PDF] Iniciando renderização a partir de HTML (Tamanho: ${cleanHtml.length} chars, Em execução: ${this.currentRunning}/${this.maxConcurrent})`
      );

      browser = await this.createBrowser();
      const page = await browser.newPage();
      const timeoutMs = options.timeoutMs ?? 30_000;

      await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
      await page.setContent(cleanHtml, {
        waitUntil: ["domcontentloaded", "load"],
        timeout: timeoutMs,
      });
      await page.emulateMediaType("print");
      await page
        .evaluate(
          () =>
            (globalThis as unknown as { document?: { fonts?: { ready?: Promise<unknown> } } })
              .document?.fonts?.ready
        )
        .catch(() => {});

      const pdfBuffer = await page.pdf(options.pdfOptions ?? DEFAULT_PDF_OPTIONS);
      const elapsed = Date.now() - startTime;
      this.logger.log(
        `[PDF] Sucesso gerando PDF via HTML (${elapsed}ms, tamanho: ${pdfBuffer.length} bytes)`
      );

      return Buffer.from(pdfBuffer);
    } catch (err) {
      this.logger.error(`[PDF] Falha ao renderizar PDF a partir de HTML: ${String(err)}`);
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

  /**
   * Captures a screenshot from a target URL and returns a JPEG Data URL string.
   */
  async renderScreenshot(options: RenderScreenshotOptions): Promise<{ dataUrl: string }> {
    const cleanUrl = (options.url ?? "").trim();
    if (!cleanUrl) {
      throw new BadRequestException("URL para captura de thumbnail não pode ser vazia.");
    }

    await this.acquirePermit();

    const startTime = Date.now();
    let browser: Browser | null = null;

    try {
      this.logger.log(
        `[Thumbnail] Iniciando captura para URL: ${cleanUrl} (Em execução: ${this.currentRunning}/${this.maxConcurrent})`
      );

      browser = await this.createBrowser();
      const page = await browser.newPage();
      const timeoutMs = options.timeoutMs ?? 30_000;
      const width = options.width ?? 1200;
      const height = options.height ?? 1800;

      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.goto(cleanUrl, {
        waitUntil: ["domcontentloaded", "networkidle2"],
        timeout: timeoutMs,
      });
      await page.emulateMediaType("print");

      let imageBuffer: Buffer;
      if (options.selector) {
        await page.waitForSelector(options.selector, { timeout: 15_000 }).catch(() => {});
        const element = await page.$(options.selector);
        if (element) {
          const box = await element.boundingBox();
          if (box) {
            const a4Ratio = Math.sqrt(2);
            const clipHeight = Math.min(box.height, box.width * a4Ratio);
            imageBuffer = (await page.screenshot({
              type: "jpeg",
              quality: 75,
              clip: {
                x: Math.max(0, box.x),
                y: Math.max(0, box.y),
                width: Math.max(1, box.width),
                height: Math.max(1, clipHeight),
              },
            })) as Buffer;
          } else {
            imageBuffer = (await page.screenshot({ type: "jpeg", quality: 75 })) as Buffer;
          }
        } else {
          imageBuffer = (await page.screenshot({ type: "jpeg", quality: 75 })) as Buffer;
        }
      } else {
        imageBuffer = (await page.screenshot({ type: "jpeg", quality: 75 })) as Buffer;
      }

      const elapsed = Date.now() - startTime;
      const dataUrl = `data:image/jpeg;base64,${Buffer.from(imageBuffer).toString("base64")}`;
      this.logger.log(
        `[Thumbnail] Sucesso capturando thumbnail (${elapsed}ms, tamanho: ${imageBuffer.length} bytes)`
      );

      return { dataUrl };
    } catch (err) {
      this.logger.error(`[Thumbnail] Falha ao capturar thumbnail para ${cleanUrl}: ${String(err)}`);
      throw new BadRequestException("Não foi possível gerar thumbnail da proposta.");
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeErr) {
          this.logger.warn(`[Thumbnail] Erro ao fechar browser instance: ${String(closeErr)}`);
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
