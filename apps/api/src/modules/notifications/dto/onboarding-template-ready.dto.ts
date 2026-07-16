import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class OnboardingTemplateReadyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  proposalTemplateId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  templateName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  businessSegmentLabel!: string;
}
