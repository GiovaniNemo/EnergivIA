import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateWhatsappInboundPhoneDto {
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;
}
