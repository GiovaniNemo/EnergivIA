import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { IngestImageDto } from "./dto/ingest-image.dto";

@Injectable()
export class ImageIngestService {
  private readonly region: string;
  private readonly bucketName: string;
  private readonly cdnBaseUrl?: string;
  private readonly s3: S3Client;

  constructor(private readonly config: ConfigService) {
    this.region = this.config.get<string>("AWS_REGION") ?? "";
    this.bucketName = this.config.get<string>("S3_BUCKET_NAME") ?? "";
    this.cdnBaseUrl = this.config.get<string>("S3_CDN_BASE_URL")?.replace(/\/$/, "");
    this.s3 = new S3Client({ region: this.region || undefined });
  }

  async ingest(dto: IngestImageDto): Promise<{ url: string; key: string }> {
    if (!this.region || !this.bucketName) {
      throw new BadRequestException(
        "Configure as variáveis de ambiente AWS_REGION e S3_BUCKET_NAME."
      );
    }
    if (!/^https?:\/\//.test(dto.url)) {
      throw new BadRequestException("URL de origem inválida.");
    }

    const response = await fetch(dto.url);
    if (!response.ok) {
      throw new BadRequestException("Não foi possível baixar a imagem de origem.");
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      throw new BadRequestException("A URL de origem não é uma imagem.");
    }
    const inputBuffer = Buffer.from(await response.arrayBuffer());
    const outputBuffer = await sharp(inputBuffer)
      .resize(1600, 900, { fit: "cover", position: "attention" })
      .webp({ quality: 80 })
      .toBuffer();

    const key = `covers/generated/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.webp`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: outputBuffer,
        ContentType: "image/webp",
        CacheControl: "public,max-age=31536000,immutable",
        Metadata: {
          source: dto.source,
        },
      })
    );
    return {
      key,
      url: this.buildFileUrl(key),
    };
  }

  private buildFileUrl(key: string): string {
    if (this.cdnBaseUrl) return `${this.cdnBaseUrl}/${key}`;
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
