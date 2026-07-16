import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";
import { FinancingPersonType } from "@prisma/client";

export class CreateFinancingSimulationDto {
  @IsString()
  @MinLength(1)
  leadId!: string;

  @IsOptional()
  @IsString()
  dealId?: string;

  @IsString()
  @MinLength(1)
  customerName!: string;

  @IsOptional()
  @IsString()
  cpfCnpj?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(FinancingPersonType)
  personType?: FinancingPersonType;

  @IsNumber()
  @Min(1000)
  @Max(2_000_000)
  projectAmount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  downPayment?: number;

  @IsInt()
  @Min(6)
  @Max(240)
  requestedTerm!: number;
}
