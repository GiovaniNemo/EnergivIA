import { IsString, IsNumber, IsOptional, Min } from "class-validator";

export class UpdateDistributorProductDto {
  @IsOptional()
  @IsString()
  distributor_sku?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock_quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lead_time_days?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minimum_order_quantity?: number;
}
