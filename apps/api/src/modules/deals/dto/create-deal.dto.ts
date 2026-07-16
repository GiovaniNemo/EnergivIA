import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";
import { DealLostReason, DealStage, DealTemperature } from "@prisma/client";

export class CreateDealDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsEnum(DealStage)
  stage?: DealStage;

  @IsOptional()
  @IsEnum(DealTemperature)
  temperature?: DealTemperature;

  @IsOptional()
  @IsDateString()
  lastContactAt?: string;

  @IsOptional()
  @IsDateString()
  nextActionAt?: string;

  @IsOptional()
  @IsString()
  nextActionType?: string;

  @IsOptional()
  @IsEnum(DealLostReason)
  lostReason?: DealLostReason;

  @IsOptional()
  @IsString()
  assignedUserId?: string;
}
