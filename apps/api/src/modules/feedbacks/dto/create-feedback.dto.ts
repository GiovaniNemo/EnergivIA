import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateFeedbackDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  tags?: string[];

  @IsOptional()
  @IsString()
  channel?: string; // "web" | "whatsapp"

  @IsOptional()
  @IsString()
  userName?: string;

  @IsOptional()
  @IsString()
  userEmail?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
