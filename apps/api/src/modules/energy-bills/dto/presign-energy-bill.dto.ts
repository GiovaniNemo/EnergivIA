import { IsIn, IsString, MaxLength } from "class-validator";

const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",
] as const;

export class PresignEnergyBillDto {
  @IsString()
  @MaxLength(512)
  fileName!: string;

  @IsIn([...ALLOWED_CONTENT_TYPES])
  contentType!: (typeof ALLOWED_CONTENT_TYPES)[number];
}
