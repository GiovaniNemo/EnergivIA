import { IsOptional, IsString, IsNumber, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class QueryRadarDto {
  @IsOptional()
  @IsString()
  uf?: string;

  @IsOptional()
  @IsString()
  cityId?: string;

  @IsOptional()
  @IsString()
  cityName?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsString()
  classType?: "ALL" | "RESIDENTIAL" | "COMMERCIAL" | "INDUSTRIAL" | "RURAL";

  @IsOptional()
  @IsString()
  opportunityType?: "ALL" | "UPGRADE_BATTERY" | "NEW_NEIGHBORS" | "RECENT";

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minKwp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxKwp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(50)
  radiusKm?: number;
}

export class ConvertRadarLeadDto {
  @IsString()
  installationId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  uf?: string;

  @IsOptional()
  @IsString()
  systemPowerKwp?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
