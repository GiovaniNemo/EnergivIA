import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { ProposalEquipmentService } from "./proposal-equipment.service";

@Controller("proposals")
@UseGuards(UnifiedAuthGuard)
export class ProposalEquipmentController {
  constructor(private readonly service: ProposalEquipmentService) {}

  @Get(":id/equipment")
  getEquipment(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.getEquipmentContext(tenantId, id);
  }

  @Get(":id/equipment/distributors")
  listDistributors(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.listAvailableDistributors(tenantId, id);
  }

  @Get(":id/equipment/availability")
  getAvailability(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Query("distributorId") distributorId: string
  ) {
    return this.service.getItemsAvailability(tenantId, id, distributorId);
  }

  @Get(":id/equipment/freight")
  listFreightRules(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Query("distributorId") distributorId: string
  ) {
    return this.service.listFreightRulesForDistributor(tenantId, id, distributorId);
  }

  @Get(":id/equipment/options")
  listOptions(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Query("distributorId") distributorId: string,
    @Query("category") categoryName: string,
    @Query("search") search?: string
  ) {
    return this.service.listEquipmentOptions(tenantId, id, distributorId, categoryName, search);
  }

  @Patch(":id/kit-items")
  updateKitItems(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body()
    body: {
      distributorId: string;
      items: Array<{ productId: string; quantity: number }>;
      freightState?: string | null;
    }
  ) {
    return this.service.updateKitItems(tenantId, id, body);
  }
}
