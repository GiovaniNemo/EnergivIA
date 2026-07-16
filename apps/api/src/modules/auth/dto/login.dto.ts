import { IsEmail, IsString, MinLength, IsOptional } from "class-validator";

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: "A senha deve ter pelo menos 8 caracteres." })
  password!: string;

  @IsOptional()
  @IsString()
  tenantId?: string;
}
