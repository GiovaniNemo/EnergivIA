import { Type } from "class-transformer";
import { IsInt, Max, Min } from "class-validator";

export class OnboardingTemplatesReadyDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  templateCount!: number;
}
