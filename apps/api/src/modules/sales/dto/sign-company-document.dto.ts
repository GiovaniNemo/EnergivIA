import { IsBoolean, IsOptional, IsString } from "class-validator";

export class SignCompanyDocumentDto {
  @IsOptional()
  @IsString()
  signatureImage?: string;

  @IsOptional()
  @IsString()
  signerName?: string;

  @IsOptional()
  @IsString()
  signerCpf?: string;

  @IsOptional()
  @IsBoolean()
  saveAsDefault?: boolean;
}

export class UpdateTenantSignatureDto {
  @IsOptional()
  @IsString()
  representativeName?: string;

  @IsOptional()
  @IsString()
  representativeCpf?: string;

  @IsOptional()
  @IsString()
  representativeSignature?: string;
}
