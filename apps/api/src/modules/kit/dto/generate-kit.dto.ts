import { IsNumber, IsString, IsOptional, IsBoolean, IsIn, Min, Max } from "class-validator";

export class GenerateKitDto {
  @IsNumber()
  @Min(0.5, { message: "A potência do sistema (system_kw) deve ser no mínimo 0,5." })
  @Max(1000, { message: "A potência do sistema (system_kw) deve ser no máximo 1000." })
  system_kw!: number;

  @IsString()
  roof_type!: string;

  @IsOptional()
  @IsString()
  preferred_brand?: string;

  @IsOptional()
  @IsString()
  supplier_id?: string;

  @IsOptional()
  @IsBoolean()
  own_stock?: boolean;

  @IsOptional()
  @IsString()
  pinned_module_id?: string;

  @IsOptional()
  @IsString()
  pinned_inverter_id?: string;
}

export class KitAlternativesDto extends GenerateKitDto {
  @IsIn(["module", "inverter"])
  category!: "module" | "inverter";

  @IsOptional()
  @IsBoolean()
  include_other_sources?: boolean;
}
