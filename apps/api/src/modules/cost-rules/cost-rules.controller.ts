import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtPayload } from "@energivia/types";
import { CostRulesService } from "./cost-rules.service";
import { CreateCostRuleDto } from "./dto/create-cost-rule.dto";
import { UpdateCostRuleDto } from "./dto/update-cost-rule.dto";

@Controller("cost-rules")
@UseGuards(UnifiedAuthGuard)
export class CostRulesController {
  constructor(private readonly costRules: CostRulesService) {}

  @Get()
  list(@TenantId() organizationId: string, @CurrentUser() user: JwtPayload) {
    return this.costRules.findAll(organizationId, user.sub);
  }

  @Post()
  create(
    @TenantId() organizationId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCostRuleDto
  ) {
    return this.costRules.create(organizationId, user.sub, dto);
  }

  @Put(":id")
  update(
    @TenantId() organizationId: string,
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateCostRuleDto
  ) {
    return this.costRules.update(organizationId, id, user.sub, dto);
  }

  @Delete(":id")
  remove(
    @TenantId() organizationId: string,
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.costRules.remove(organizationId, id, user.sub);
  }
}
