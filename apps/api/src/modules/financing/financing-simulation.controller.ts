import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import type { JwtPayload } from "@energivia/types";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { FinancingSimulationService } from "./financing-simulation.service";
import { CreateFinancingSimulationDto } from "./dto/create-simulation.dto";

@Controller("financing/simulations")
@UseGuards(UnifiedAuthGuard)
export class FinancingSimulationController {
  constructor(private readonly service: FinancingSimulationService) {}

  @Post()
  create(
    @TenantId() tenantId: string,
    @Req() req: Request & { user?: JwtPayload },
    @Body() body: CreateFinancingSimulationDto
  ) {
    const userId = req.user?.sub ?? null;
    return this.service.create(tenantId, userId, body);
  }

  @Get()
  list(
    @TenantId() tenantId: string,
    @Query("leadId") leadId?: string,
    @Query("dealId") dealId?: string,
    @Query("status") status?: string
  ) {
    return this.service.list(tenantId, { leadId, dealId, status });
  }

  @Get(":id")
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.findOne(tenantId, id);
  }
}
