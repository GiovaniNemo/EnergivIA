import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { FinancingPersonType } from "@prisma/client";

export class CreateRateTableDto {
  @IsString()
  providerId!: string;

  @IsOptional()
  @IsEnum(FinancingPersonType)
  personType?: FinancingPersonType;

  @IsNumber()
  @Min(0)
  minAmount!: number;

  @IsNumber()
  @Min(0)
  maxAmount!: number;

  @IsInt()
  @Min(1)
  minTerm!: number;

  @IsInt()
  @Min(1)
  maxTerm!: number;

  @IsNumber()
  @Min(0)
  monthlyRate!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  feeRate?: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  global?: boolean;
}

export class UpdateRateTableDto {
  @IsOptional() @IsEnum(FinancingPersonType) personType?: FinancingPersonType;
  @IsOptional() @IsNumber() @Min(0) minAmount?: number;
  @IsOptional() @IsNumber() @Min(0) maxAmount?: number;
  @IsOptional() @IsInt() @Min(1) minTerm?: number;
  @IsOptional() @IsInt() @Min(1) maxTerm?: number;
  @IsOptional() @IsNumber() @Min(0) monthlyRate?: number;
  @IsOptional() @IsNumber() @Min(0) feeRate?: number;
  @IsOptional() @IsDateString() validFrom?: string;
  @IsOptional() @IsDateString() validUntil?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
