import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { DealsService } from "./deals.service";
import { CreateDealDto } from "./dto/create-deal.dto";

@Controller()
@UseGuards(UnifiedAuthGuard)
export class LeadDealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post("leads/:leadId/deals")
  create(
    @TenantId() tenantId: string,
    @Param("leadId") leadId: string,
    @Body() dto: CreateDealDto
  ) {
    return this.dealsService.create(tenantId, leadId, dto);
  }

  @Get("leads/:leadId/deals")
  findByLead(@TenantId() tenantId: string, @Param("leadId") leadId: string) {
    return this.dealsService.findByLead(tenantId, leadId);
  }
}
