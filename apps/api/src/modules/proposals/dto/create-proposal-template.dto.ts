import { IsBoolean, IsObject, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import type { ProposalTemplateConfig } from "@energivia/shared-types";

export class CreateProposalTemplateDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsObject()
  config?: ProposalTemplateConfig;
}
