import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export interface TicketAttachment {
  filename: string;
  contentType?: string;
  url?: string;
  base64?: string;
  sizeBytes?: number;
}

export type TicketCategory =
  | "dificuldade"
  | "melhoria"
  | "reclamacao"
  | "duvida"
  | "financeiro"
  | "outro";

export type TicketSeverity = "baixa" | "media" | "alta" | "critica";

export class CreateSupportTicketDto {
  @IsNotEmpty()
  @IsString()
  category!: TicketCategory;

  @IsOptional()
  @IsString()
  severity?: TicketSeverity;

  @IsNotEmpty()
  @IsString()
  subject!: string;

  @IsNotEmpty()
  @IsString()
  message!: string;

  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  userPlan?: string;

  @IsOptional()
  @IsArray()
  attachments?: TicketAttachment[];

  @IsOptional()
  metadata?: Record<string, unknown>;
}
