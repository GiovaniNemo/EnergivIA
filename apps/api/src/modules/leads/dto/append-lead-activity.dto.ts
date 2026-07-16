import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

export class AppendLeadActivityDto {
  @IsIn(["NOTE", "CALL"])
  kind!: "NOTE" | "CALL";

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  text!: string;
}
