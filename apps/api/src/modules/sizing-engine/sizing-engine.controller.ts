import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { SizingEngineService, type SizingInput } from "./sizing-engine.service";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { TenantId } from "../../common/decorators/tenant-id.decorator";

@Controller("leads/:leadId/sizing")
@UseGuards(UnifiedAuthGuard)
export class SizingEngineController {
  constructor(private readonly sizingEngine: SizingEngineService) {}

  @Post("calculate")
  calculate(@Body() body: SizingInput) {
    return this.sizingEngine.calculate(body);
  }

  @Post()
  create(
    @TenantId() tenantId: string,
    @Param("leadId") leadId: string,
    @Body() body: { input: SizingInput; energyBillId?: string; name?: string }
  ) {
    return this.sizingEngine.createSizing(
      tenantId,
      leadId,
      body.energyBillId ?? null,
      body.input,
      body.name
    );
  }

  @Get()
  findByLead(@TenantId() tenantId: string, @Param("leadId") leadId: string) {
    return this.sizingEngine.findByLead(tenantId, leadId);
  }
}
