import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, MinLength } from "class-validator";
import { FinancingApplicationStatus } from "@prisma/client";

export class CreateApplicationDto {
  @IsString()
  @MinLength(1)
  selectedOfferId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateApplicationDto {
  @IsOptional() @IsString() assignedUserId?: string | null;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() externalReference?: string;

  @IsOptional() @IsNumber() @Min(0) approvedAmount?: number;
  @IsOptional() @IsInt() @Min(1) approvedTerm?: number;
  @IsOptional() @IsNumber() @Min(0) approvedRate?: number;
  @IsOptional() @IsNumber() @Min(0) approvedCet?: number;

  @IsOptional() @IsInt() expectedVersion?: number;
}

export class TransitionStatusDto {
  @IsEnum(FinancingApplicationStatus)
  to!: FinancingApplicationStatus;

  @IsOptional() @IsString() reason?: string;

  @IsOptional() @IsInt() expectedVersion?: number;
}
