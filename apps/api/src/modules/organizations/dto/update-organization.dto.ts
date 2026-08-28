import { IsString, IsOptional, MinLength, MaxLength, Matches } from "class-validator";

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

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

  @IsOptional()
  @IsString()
  @MaxLength(10)
  cep?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  street?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  complement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  neighborhood?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  state?: string;
}
