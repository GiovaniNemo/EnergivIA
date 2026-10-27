import { IsEnum, IsOptional, IsString } from "class-validator";
import { CustomerType, SaleStatus } from "@prisma/client";

export class UpdateSaleDto {
  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  rgNumber?: string;

  @IsOptional()
  @IsString()
  rgIssuer?: string;

  @IsOptional()
  birthDate?: string | Date;

  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  profession?: string;

  @IsOptional()
  @IsString()
  legalRepresentativeName?: string;

  @IsOptional()
  @IsString()
  legalRepresentativeCpf?: string;

  @IsOptional()
  @IsString()
  installationAddress?: string;

  @IsOptional()
  @IsString()
  installationCity?: string;

  @IsOptional()
  @IsString()
  installationState?: string;

  @IsOptional()
  @IsString()
  installationZip?: string;

  @IsOptional()
  @IsString()
  distributionCompany?: string;

  @IsOptional()
  @IsString()
  consumerUnitNumber?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;
}
