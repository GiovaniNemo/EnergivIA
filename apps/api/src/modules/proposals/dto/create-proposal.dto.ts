import { IsDateString, IsNumber, IsObject, IsOptional, IsString, Min } from "class-validator";

export class CreateProposalDto {
  @IsString()
  simulationId!: string;

  @IsString()
  title!: string;

  @IsDateString()
  validUntil!: string;

  @IsOptional()
  @IsString()
  proposalTemplateId?: string;

  @IsOptional()
  @IsObject()
  renderedData?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountBrl?: number;
}
