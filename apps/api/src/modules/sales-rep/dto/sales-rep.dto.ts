import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateSalesActivityNoteDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsOptional()
  @IsString()
  stage?: string;
}

export class ListTenantsQueryDto {
  @IsOptional()
  @IsString()
  filter?: "all" | "trial" | "active" | "churn_risk";

  @IsOptional()
  @IsString()
  search?: string;
}

export class AuthorizeSalesRepDto {
  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  commissionRate?: number; // e.g. 10 or 0.10

  @IsOptional()
  @IsString()
  notes?: string;
}
