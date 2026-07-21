import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  createS3ClientForPresign,
  createS3GetUrl,
  presignedPutObjectUrlOptions,
} from "../../common/s3/s3.util";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma, UtilityProvider } from "@prisma/client";
import { extname } from "node:path";
import { randomUUID } from "node:crypto";
import { assertLeadInTenant } from "../../common/assert-lead-in-tenant";
import { softDeleteWhere as soft } from "../../prisma/soft-delete";

const BILL_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
] as const;

@Injectable()
export class EnergyBillsService {
  private readonly logger = new Logger(EnergyBillsService.name);
  private readonly region: string;
  private readonly bucketName: string;
  private readonly s3: S3Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {
    this.region = this.config.get<string>("AWS_REGION") ?? "";
    this.bucketName =
      this.config.get<string>("S3_BUCKET_NAME") ?? this.config.get<string>("AWS_S3_BUCKET") ?? "";
    this.s3 = createS3ClientForPresign(this.region || undefined);
  }

  private parseBillText(text: string): {
    consumptionKwh?: number;
    totalAmount?: number;
    referenceMonth?: string;
    rawData?: Record<string, unknown>;
  } {
    const out: {
      consumptionKwh?: number;
      totalAmount?: number;
      referenceMonth?: string;
      rawData?: Record<string, unknown>;
    } = {};
    const t = (text || "").replace(/[\u00A0]/g, " ");
    // buscar consumo em kWh (ex: "350 kWh" ou "350kwh")
    const kwhMatch = t.match(/(\d{1,6}(?:[.,]\d{1,3})?)\s*(kwh|kw-h|kwh\/m[a-z]*)/i);
    if (kwhMatch && kwhMatch[1]) {
      const raw = String(kwhMatch[1]).replace(/\./g, "").replace(/,/, ".");
      const n = Number(raw);
      if (Number.isFinite(n)) out.consumptionKwh = Math.round(n);
    }
    // buscar valor em R$ (ex: R$ 123,45)
    const brlMatch = t.match(/r\$\s*(\d{1,3}(?:[\.\s]\d{3})*(?:,\d{2})?)/i);
    if (brlMatch && brlMatch[1]) {
      const raw = String(brlMatch[1]).replace(/\s/g, "").replace(/\./g, "").replace(/,/, ".");
      const n = Number(raw);
      if (Number.isFinite(n)) out.totalAmount = Number(n.toFixed(2));
    }
    // buscar referência/competência (MM/YYYY ou M/YYYY)
    const refMatch = t.match(
      /(compet[eê]ncia|refer[eê]ncia|referencia)[:\s]*([0-1]?\d\s*\/?\s*(?:20)?\d{2})/i
    );
    if (refMatch && refMatch[2]) {
      out.referenceMonth = String(refMatch[2]).replace(/\s/g, "").replace(/\//, "/");
    } else {
      const mmMatch = t.match(/(0[1-9]|1[0-2])\s*[\/-]\s*(20\d{2}|\d{2})/);
      if (mmMatch) out.referenceMonth = `${mmMatch[1]}/${mmMatch[2]}`;
    }
    out.rawData = { text: t };
    return out;
  }

  private async ensureLeadInTenant(tenantId: string, leadId: string): Promise<void> {
    await assertLeadInTenant(this.prisma, tenantId, leadId);
  }

  private normalizeBillExtension(fileName: string, contentType: string): string {
    const ext = extname(fileName).toLowerCase();
    const ct = contentType.toLowerCase();
    const byType: Record<string, string[]> = {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
    };
    const allowed = byType[ct];
    if (!allowed)
      throw new BadRequestException("Tipo de arquivo não suportado para conta de energia.");
    if (allowed.includes(ext)) return ext;
    return allowed[0]!;
  }

  async createPresignedUploadUrl(
    tenantId: string,
    leadId: string,
    data: { fileName: string; contentType: string }
  ): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
    if (!this.region || !this.bucketName) {
      throw new BadRequestException(
        "Configure as variáveis de ambiente AWS_REGION e S3_BUCKET_NAME."
      );
    }

    const ct = data.contentType.toLowerCase();
    if (!BILL_CONTENT_TYPES.includes(ct as (typeof BILL_CONTENT_TYPES)[number])) {
      throw new BadRequestException("Tipo de arquivo não suportado para conta de energia.");
    }

    await this.ensureLeadInTenant(tenantId, leadId);

    const extension = this.normalizeBillExtension(data.fileName, ct);
    const billId = randomUUID();
    const key = `uploads/bills/${tenantId}/${leadId}/${billId}${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: ct,
    });
    const uploadUrl = await getSignedUrl(this.s3, command, presignedPutObjectUrlOptions(60 * 5));
    const fileUrl = await createS3GetUrl(this.s3, this.bucketName, key);

    return { uploadUrl, fileUrl, key };
  }

  async create(
    tenantId: string,
    leadId: string,
    data: { fileUrl: string; fileName: string; provider?: UtilityProvider }
  ) {
    await this.ensureLeadInTenant(tenantId, leadId);

    const bill = await this.prisma.energyBill.create({
      data: {
        tenantId,
        leadId,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        provider: data.provider ?? "COPEL",
        extractionStatus: "PENDING",
      },
    });

    void this.runBillExtractionJob(bill.id, bill.fileUrl, bill.fileName).catch((err) => {
      this.logger.error(
        `Energy bill extraction job crashed billId=${bill.id}`,
        err instanceof Error ? err.stack : String(err)
      );
    });

    return bill;
  }

  private async runBillExtractionJob(
    billId: string,
    _fileUrl: string,
    fileName: string
  ): Promise<void> {
    this.logger.log(`Energy bill extraction start billId=${billId} fileName=${fileName}`);
    await this.prisma.energyBill.update({
      where: { id: billId },
      data: { extractionStatus: "PROCESSING", extractionError: null },
    });
    await this.setExtractionResult(billId, {
      extractedData: null,
      extractionError: "Extração automática indisponível.",
    });
  }

  async findByLead(tenantId: string, leadId: string) {
    return this.prisma.energyBill.findMany({
      where: { tenantId, leadId, ...soft },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(tenantId: string, id: string) {
    const bill = await this.prisma.energyBill.findFirst({
      where: { id, tenantId, ...soft },
      include: { lead: { select: { id: true, name: true, email: true } } },
    });
    if (!bill) throw new NotFoundException("Conta de energia não encontrada.");
    return bill;
  }

  async setExtractionResult(
    id: string,
    data: { extractedData: object | null; extractionError?: string }
  ) {
    return this.prisma.energyBill.update({
      where: { id },
      data: {
        extractedData: data.extractionError
          ? Prisma.DbNull
          : (data.extractedData as Prisma.InputJsonValue),
        extractionStatus: data.extractionError ? "FAILED" : "COMPLETED",
        extractionError: data.extractionError ?? null,
      },
    });
  }

  async softDelete(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.energyBill.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
