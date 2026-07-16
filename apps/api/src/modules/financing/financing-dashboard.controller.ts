import { Controller, Get, UseGuards } from "@nestjs/common";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { FinancingDashboardService } from "./financing-dashboard.service";

@Controller("financing/dashboard")
@UseGuards(UnifiedAuthGuard)
export class FinancingDashboardController {
  constructor(private readonly service: FinancingDashboardService) {}

  @Get()
  summary(@TenantId() tenantId: string) {
    return this.service.summary(tenantId);
  }
}
