import { IsIn, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";

export class CreateEnergyBillDto {
  @IsUrl()
  fileUrl!: string;

  @IsString()
  @MaxLength(512)
  fileName!: string;

  @IsOptional()
  @IsIn(["COPEL", "OTHER"])
  provider?: "COPEL" | "OTHER";
}
