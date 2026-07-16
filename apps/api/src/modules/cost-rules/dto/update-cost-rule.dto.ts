import { PartialType } from "@nestjs/mapped-types";
import { CreateCostRuleDto } from "./create-cost-rule.dto";

export class UpdateCostRuleDto extends PartialType(CreateCostRuleDto) {}
