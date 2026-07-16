import { CostCalculationType, PercentageBase } from "@prisma/client";
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

export class CreateCostRuleDto {
  @IsString()
  @MinLength(1, { message: "Informe o nome do custo." })
  @MaxLength(120)
  name!: string;

  @IsEnum(CostCalculationType)
  calculationType!: CostCalculationType;

  @IsNumber()
  @Min(0)
  @Max(1_000_000_000)
  value!: number;

  @ValidateIf((o: CreateCostRuleDto) => o.calculationType === "PERCENTAGE")
  @IsOptional()
  @IsEnum(PercentageBase, { message: "Base do percentual inválida." })
  percentageBase?: PercentageBase | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minKwp?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxKwp?: number | null;
}
