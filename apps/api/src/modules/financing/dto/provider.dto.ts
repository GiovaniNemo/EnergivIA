import { IsBoolean, IsEnum, IsObject, IsOptional, IsString, MinLength } from "class-validator";
import { FinancingProviderMode } from "@prisma/client";

export class CreateFinancingProviderDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(2)
  slug!: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsEnum(FinancingProviderMode)
  mode!: FinancingProviderMode;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  supportsPF?: boolean;

  @IsOptional()
  @IsBoolean()
  supportsPJ?: boolean;

  @IsOptional()
  @IsObject()
  apiConfig?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  docsRequired?: Record<"PF" | "PJ", string[]>;
}

export class UpdateFinancingProviderDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsEnum(FinancingProviderMode) mode?: FinancingProviderMode;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsBoolean() supportsPF?: boolean;
  @IsOptional() @IsBoolean() supportsPJ?: boolean;
  @IsOptional() @IsObject() apiConfig?: Record<string, unknown>;
  @IsOptional() @IsObject() docsRequired?: Record<"PF" | "PJ", string[]>;
}
