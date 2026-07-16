import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class BulkDistributorProductRowDto {
  @IsString()
  product_name!: string;

  @IsString()
  brand!: string;

  @IsOptional()
  @IsString()
  distributor_sku?: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lead_time_days?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  moq?: number;
}

export class BulkDistributorProductsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkDistributorProductRowDto)
  rows!: BulkDistributorProductRowDto[];
}
