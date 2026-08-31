import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export type ProposalDecisionType = "ACCEPT" | "REQUEST_CHANGES" | "REJECT";

export class RespondPublicProposalDto {
  @IsIn(["ACCEPT", "REQUEST_CHANGES", "REJECT"], {
    message: "A decisão deve ser ACCEPT, REQUEST_CHANGES ou REJECT",
  })
  decision!: ProposalDecisionType;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: "Os comentários devem ter no máximo 2000 caracteres" })
  comments?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: "O nome da assinatura deve ter no máximo 200 caracteres" })
  signatureName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: "O telefone/WhatsApp deve ter no máximo 50 caracteres" })
  contactWhatsapp?: string;
}
