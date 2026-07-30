import { IsString, IsOptional, IsArray } from "class-validator";

export class CreateBrandDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];
}
