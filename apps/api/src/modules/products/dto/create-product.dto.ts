import { IsString, IsBoolean, IsObject, IsOptional } from "class-validator";

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsString()
  brand_id!: string;

  @IsString()
  category_id!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean = true;

  @IsObject()
  specs!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  image_url?: string;
}
