import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  ALLOWED_DOCUMENT_CONTENT_TYPES,
  ALLOWED_IMAGE_CONTENT_TYPES,
  buildS3ObjectKey,
  createS3ClientForPresign,
  createS3GetUrl,
  presignedPutObjectUrlOptions,
} from "../../common/s3/s3.util";
import type { CreatePresignedUrlDto } from "./dto/create-presigned-url.dto";

@Injectable()
export class UploadsService {
  private readonly region: string;
  private readonly bucketName: string;
  private readonly cdnBaseUrl?: string;
  private readonly s3: S3Client;

  constructor(private readonly config: ConfigService) {
    this.region = this.config.get<string>("AWS_REGION") ?? "";
    this.bucketName = this.config.get<string>("S3_BUCKET_NAME") ?? this.config.get<string>("AWS_S3_BUCKET") ?? "";
    this.cdnBaseUrl = this.config.get<string>("S3_CDN_BASE_URL")?.replace(/\/$/, "");
    this.s3 = createS3ClientForPresign(this.region || undefined);
  }

  async createPresignedUrl(
    dto: CreatePresignedUrlDto
  ): Promise<{ uploadUrl: string; fileUrl: string }> {
    if (!this.region || !this.bucketName) {
      throw new BadRequestException(
        "Configure as variáveis de ambiente AWS_REGION e S3_BUCKET_NAME."
      );
    }

    const allowedByFolder =
      dto.folder === "financing_documents"
        ? {
            set: ALLOWED_DOCUMENT_CONTENT_TYPES,
            message: "Tipo de arquivo não suportado. Permitidos: pdf, jpg, jpeg, png, webp.",
          }
        : {
            set: ALLOWED_IMAGE_CONTENT_TYPES,
            message: "Tipo de arquivo não suportado. Permitidos: jpg, jpeg, png, webp.",
          };
    if (!allowedByFolder.set.has(dto.contentType.toLowerCase())) {
      throw new BadRequestException(allowedByFolder.message);
    }

    const key = buildS3ObjectKey({
      folder: dto.folder,
      fileName: dto.fileName,
      productCategory: dto.productCategory,
    });

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: dto.contentType,
      CacheControl: "public,max-age=31536000,immutable",
    });

    const uploadUrl = await getSignedUrl(this.s3, command, presignedPutObjectUrlOptions(60 * 5));
    const fileUrl = await this.buildFileUrl(key);
    return { uploadUrl, fileUrl };
  }

  private async buildFileUrl(key: string): Promise<string> {
    if (this.cdnBaseUrl) {
      return `${this.cdnBaseUrl}/${key}`;
    }
    return createS3GetUrl(this.s3, this.bucketName, key);
  }
}
