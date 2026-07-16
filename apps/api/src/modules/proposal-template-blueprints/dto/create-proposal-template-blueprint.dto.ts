import { IsBoolean, IsInt, IsObject, IsOptional, IsString, MinLength } from "class-validator";

export class CreateProposalTemplateBlueprintDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsObject()
  document!: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
