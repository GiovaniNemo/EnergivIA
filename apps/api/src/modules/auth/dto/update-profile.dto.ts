import { IsOptional, IsString, MaxLength, MinLength, ValidateIf } from "class-validator";
import { Transform } from "class-transformer";

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @ValidateIf((o: UpdateProfileDto) => o.picture !== null)
  @IsString()
  picture?: string | null;
}
