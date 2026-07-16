import { IsString, IsNumber, IsOptional, Min } from "class-validator";

export class CreateSupplierProductDto {
  @IsString()
  supplier_id!: string;

  @IsString()
  product_id!: string;

  @IsOptional()
  @IsString()
  supplier_sku?: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @Min(0)
  stock?: number = 0;

  @IsOptional()
  @Min(0)
  lead_time_days?: number;

  @IsOptional()
  @Min(1)
  minimum_order_quantity?: number = 1;
}
