import { IsString, MaxLength, MinLength } from "class-validator";

export class IngestImageDto {
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  url!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  source!: string;
}
