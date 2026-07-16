import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { FinancialSimulationService, type SimulationInput } from "./financial-simulation.service";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { TenantId } from "../../common/decorators/tenant-id.decorator";

@Controller("leads/:leadId/simulations")
@UseGuards(UnifiedAuthGuard)
export class FinancialSimulationController {
  constructor(private readonly service: FinancialSimulationService) {}

  @Post("simulate")
  simulate(@Body() body: SimulationInput) {
    return this.service.simulate(body);
  }

  @Post()
  create(
    @TenantId() tenantId: string,
    @Param("leadId") leadId: string,
    @Body() body: { input: SimulationInput; name?: string }
  ) {
    return this.service.create(tenantId, leadId, body.input, body.name);
  }

  @Get()
  findByLead(@TenantId() tenantId: string, @Param("leadId") leadId: string) {
    return this.service.findByLead(tenantId, leadId);
  }
}
