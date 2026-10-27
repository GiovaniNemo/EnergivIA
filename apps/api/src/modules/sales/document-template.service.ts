import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { DocumentType } from "@prisma/client";
import { PdfRendererService } from "../proposals/pdf-renderer.service";
import { CONTRACT_PF_TEMPLATE } from "./templates/contract-pf.template";
import { POWER_OF_ATTORNEY_PF_TEMPLATE } from "./templates/power-of-attorney-pf.template";

@Injectable()
export class DocumentTemplateService {
  private readonly logger = new Logger(DocumentTemplateService.name);

  constructor(private readonly pdfRenderer: PdfRendererService) {}

  /**
   * Substitui tags dinâmicas {{tag}} no texto do template
   */
  replaceTags(template: string, data: Record<string, string | number | undefined | null>): string {
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
      const val = data[key];
      if (val === undefined || val === null || val === "") {
        return "—";
      }
      return String(val);
    });
  }

  /**
   * Constrói o HTML final do documento a partir do tipo e dados
   */
  buildDocumentHtml(
    type: DocumentType,
    data: Record<string, string | number | undefined | null>
  ): string {
    let rawTemplate = "";

    switch (type) {
      case DocumentType.CONTRATO_PF:
      case DocumentType.CONTRATO_PJ:
        rawTemplate = CONTRACT_PF_TEMPLATE;
        break;
      case DocumentType.PROCURACAO_PF:
      case DocumentType.PROCURACAO_PJ:
        rawTemplate = POWER_OF_ATTORNEY_PF_TEMPLATE;
        break;
      default:
        throw new BadRequestException(`Tipo de documento não suportado: ${type}`);
    }

    return this.replaceTags(rawTemplate, data);
  }

  /**
   * Renderiza o HTML em PDF via Chromium e computa o hash criptográfico SHA-256
   */
  async generatePdfWithHash(html: string): Promise<{ pdfBuffer: Buffer; sha256Hash: string }> {
    const pdfBuffer = await this.pdfRenderer.renderHtmlPdf(html);
    const sha256Hash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");

    return {
      pdfBuffer,
      sha256Hash,
    };
  }

  getStorageDir(): string {
    const dir = path.resolve(process.cwd(), "uploads", "sales-documents");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  savePdfToDisk(fileName: string, buffer: Buffer): string {
    const dir = this.getStorageDir();
    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  getPdfFromDisk(fileName: string): Buffer | null {
    const dir = this.getStorageDir();
    const filePath = path.join(dir, fileName);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
    return null;
  }
}
