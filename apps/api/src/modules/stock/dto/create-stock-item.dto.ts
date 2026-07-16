import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateStockItemDto {
  @IsString()
  @MinLength(1, { message: "Informe o produto." })
  productId!: string;

  @IsInt({ message: "Quantidade deve ser um número inteiro." })
  @Min(0)
  @Max(1_000_000)
  quantity!: number;

  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  unitCost!: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  sku?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}
