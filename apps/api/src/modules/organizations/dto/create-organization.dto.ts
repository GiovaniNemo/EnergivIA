import { IsString, IsOptional, MinLength, MaxLength, Matches } from "class-validator";

export class CreateOrganizationDto {
  @IsString()
  @MinLength(1, { message: "Nome é obrigatório" })
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(\d{14}|(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}))$/, {
    message: "CNPJ inválido",
  })
  cnpj?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  templateBusinessSegment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  templateRegion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  templateValueProposition?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  templateTone?: string;
}
