import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import {
  CommissionBase,
  CommissionCalculationType,
  CommissionStatus,
  FinancingPersonType,
} from "@prisma/client";

export class CreateCommissionRuleDto {
  @IsString()
  providerId!: string;

  @IsOptional()
  @IsEnum(FinancingPersonType)
  personType?: FinancingPersonType;

  @IsEnum(CommissionCalculationType)
  calculationType!: CommissionCalculationType;

  @IsNumber()
  @Min(0)
  value!: number;

  @IsOptional()
  @IsEnum(CommissionBase)
  baseAmount?: CommissionBase;

  @IsOptional() @IsNumber() @Min(0) minAmount?: number;
  @IsOptional() @IsNumber() @Min(0) maxAmount?: number;
  @IsOptional() @IsDateString() validFrom?: string;
  @IsOptional() @IsDateString() validUntil?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateCommissionRuleDto {
  @IsOptional() @IsEnum(FinancingPersonType) personType?: FinancingPersonType;
  @IsOptional() @IsEnum(CommissionCalculationType) calculationType?: CommissionCalculationType;
  @IsOptional() @IsNumber() @Min(0) value?: number;
  @IsOptional() @IsEnum(CommissionBase) baseAmount?: CommissionBase;
  @IsOptional() @IsNumber() @Min(0) minAmount?: number;
  @IsOptional() @IsNumber() @Min(0) maxAmount?: number;
  @IsOptional() @IsDateString() validFrom?: string;
  @IsOptional() @IsDateString() validUntil?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateCommissionDto {
  @IsOptional() @IsEnum(CommissionStatus) status?: CommissionStatus;
  @IsOptional() @IsNumber() @Min(0) grossCommissionBrl?: number;
  @IsOptional() @IsDateString() paidAt?: string;
  @IsOptional() @IsString() notes?: string;
}
