import { IsEmail, IsEnum } from "class-validator";
import { OrgRole } from "@prisma/client";

export class InviteMemberDto {
  @IsEmail({}, { message: "E-mail inválido" })
  email!: string;

  @IsEnum(OrgRole, { message: "Função inválida" })
  role!: OrgRole;
}
