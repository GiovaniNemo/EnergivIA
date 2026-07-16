import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsIn, IsNumber, IsString, ValidateNested } from "class-validator";

export class DealFocusItemDto {
  @IsString()
  id!: string;

  @IsString()
  clientName!: string;

  @IsString()
  stage!: string;

  @IsNumber()
  value!: number;

  @IsBoolean()
  isOverdue!: boolean;

  @IsNumber()
  hoursOverdue!: number;

  @IsNumber()
  daysSinceUpdate!: number;

  @IsIn(["none", "sent", "waiting", "viewed"])
  proposalStatus!: "none" | "sent" | "waiting" | "viewed";
}

export class DealFocusRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DealFocusItemDto)
  deals!: DealFocusItemDto[];
}

export interface DealFocusPriority {
  dealId: string;
  rank: number;
  reason: string;
  why?: string;
}

export interface DealFocusSuggestion {
  summary: string;
  priorities: DealFocusPriority[];
  pattern: string | null;
}
