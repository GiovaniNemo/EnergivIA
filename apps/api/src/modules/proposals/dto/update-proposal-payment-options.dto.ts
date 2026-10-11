import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";

export class PaymentCashOptionDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPct?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountBrl?: number | null;

  @IsNumber()
  @Min(0)
  finalAmount!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  methods?: string[];

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class PaymentCreditCardOptionDto {
  @IsBoolean()
  enabled!: boolean;

  @IsNumber()
  @Min(1)
  @Max(24)
  maxInstallments!: number;

  @IsNumber()
  @Min(0)
  installmentAmount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number | null;

  @IsOptional()
  @IsString()
  taxDescription?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class PaymentFinancingOptionDto {
  @IsBoolean()
  enabled!: boolean;

  @IsNumber()
  @Min(1)
  @Max(180)
  installments!: number;

  @IsNumber()
  @Min(0)
  installmentAmount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  downPaymentBrl?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  graceDays?: number | null;

  @IsOptional()
  @IsString()
  bankName?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class UpdateProposalPaymentOptionsDto {
  @ValidateNested()
  @Type(() => PaymentCashOptionDto)
  cash!: PaymentCashOptionDto;

  @ValidateNested()
  @Type(() => PaymentCreditCardOptionDto)
  creditCard!: PaymentCreditCardOptionDto;

  @ValidateNested()
  @Type(() => PaymentFinancingOptionDto)
  financing!: PaymentFinancingOptionDto;
}
