import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class SearchImagesDto {
  @IsString()
  @MinLength(3)
  @MaxLength(240)
  query!: string;

  @IsIn(["landscape"])
  orientation!: "landscape";

  @IsOptional()
  @IsIn(["photo", "illustration"])
  style?: "photo" | "illustration";
}
