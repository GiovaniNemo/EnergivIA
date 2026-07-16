import { IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { FinancingDocumentStatus } from "@prisma/client";

export class CreateDocumentDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  type!: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;
}

export class UpdateDocumentDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() fileUrl?: string;
  @IsOptional() @IsEnum(FinancingDocumentStatus) status?: FinancingDocumentStatus;
  @IsOptional() @IsString() reviewerNotes?: string;
}
