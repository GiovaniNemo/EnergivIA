import { IsArray, IsBoolean, IsString } from "class-validator";

export class BulkActiveDistributorProductsDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];

  @IsBoolean()
  active!: boolean;
}
