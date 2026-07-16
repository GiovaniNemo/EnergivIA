import { IsEnum, IsOptional, IsString, Matches } from "class-validator";

export const uploadFolders = [
  "products",
  "brands",
  "distributors",
  "organizations",
  "proposal_templates",
  "financing_documents",
] as const;
export type UploadFolder = (typeof uploadFolders)[number];

export class CreatePresignedUrlDto {
  @IsString()
  fileName!: string;

  @IsString()
  contentType!: string;

  @IsEnum(uploadFolders)
  folder!: UploadFolder;

  @IsOptional()
  @IsString()
  @Matches(/^(module|inverter|microinverter|structure_kit|dc_cable|connector)$/)
  productCategory?: string;
}
