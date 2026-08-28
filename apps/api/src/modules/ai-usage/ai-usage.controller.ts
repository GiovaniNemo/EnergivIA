import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AiUsageService } from "./ai-usage.service";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { AiFeature } from "@prisma/client";

@Controller(["ai-usage", "api/ai-usage"])
@UseGuards(UnifiedAuthGuard)
export class AiUsageController {
  constructor(private readonly aiUsageService: AiUsageService) {}

  @Get("admin/overview")
  async getAdminOverview(@Query("days") days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.aiUsageService.getAdminOverview(isNaN(daysNum) ? 30 : daysNum);
  }

  @Get("admin/logs")
  async getLogs(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("organizationId") organizationId?: string,
    @Query("feature") feature?: AiFeature,
    @Query("status") status?: string
  ) {
    return this.aiUsageService.getLogs({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 25,
      organizationId,
      feature,
      status,
    });
  }

  @Get("organization")
  async getOrganizationOverview(@TenantId() tenantId: string, @Query("days") days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    return this.aiUsageService.getTenantOverview(tenantId, isNaN(daysNum) ? 30 : daysNum);
  }
}
