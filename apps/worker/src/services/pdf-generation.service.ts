import puppeteer, { type PDFOptions } from "puppeteer";

export interface GeneratePdfFromHtmlInput {
  html: string;
  timeoutMs?: number;
}

const DEFAULT_PDF_OPTIONS: PDFOptions = {
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
};

export class PdfGenerationService {
  async generatePdfFromHtml(input: GeneratePdfFromHtmlInput): Promise<Buffer> {
    const html = String(input.html ?? "").trim();
    if (!html) {
      throw new Error("PDF generation requires a non-empty HTML string.");
    }
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, {
        waitUntil: "networkidle0",
        timeout: input.timeoutMs ?? 45_000,
      });
      const pdf = await page.pdf(DEFAULT_PDF_OPTIONS);
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  async processNext(): Promise<void> {
    return Promise.resolve();
  }
}
