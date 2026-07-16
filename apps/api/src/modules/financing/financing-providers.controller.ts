import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { PlatformAdminGuard } from "../../common/guards/platform-admin.guard";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { FinancingProvidersService } from "./financing-providers.service";
import { CreateFinancingProviderDto, UpdateFinancingProviderDto } from "./dto/provider.dto";
import { CreateRateTableDto, UpdateRateTableDto } from "./dto/rate-table.dto";

@Controller("financing/providers")
@UseGuards(UnifiedAuthGuard)
export class FinancingProvidersController {
  constructor(private readonly service: FinancingProvidersService) {}

  @Get()
  list(@TenantId() tenantId: string) {
    return this.service.list(tenantId);
  }

  @Post()
  @UseGuards(PlatformAdminGuard)
  create(@Body() body: CreateFinancingProviderDto) {
    return this.service.create(body);
  }

  @Patch(":id")
  @UseGuards(PlatformAdminGuard)
  update(@Param("id") id: string, @Body() body: UpdateFinancingProviderDto) {
    return this.service.update(id, body);
  }

  @Post(":id/availability")
  @UseGuards(PlatformAdminGuard)
  toggle(@TenantId() tenantId: string, @Param("id") id: string, @Body() body: { active: boolean }) {
    return this.service.setTenantAvailability(tenantId, id, body.active);
  }

  @Get(":id/rate-tables")
  listRateTables(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.listRateTables(tenantId, id);
  }

  @Post("rate-tables")
  @UseGuards(PlatformAdminGuard)
  createRateTable(@TenantId() tenantId: string, @Body() body: CreateRateTableDto) {
    return this.service.createRateTable(tenantId, body);
  }

  @Patch("rate-tables/:id")
  @UseGuards(PlatformAdminGuard)
  updateRateTable(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() body: UpdateRateTableDto
  ) {
    return this.service.updateRateTable(tenantId, id, body);
  }

  @Delete("rate-tables/:id")
  @UseGuards(PlatformAdminGuard)
  deleteRateTable(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.deleteRateTable(tenantId, id);
  }
}
