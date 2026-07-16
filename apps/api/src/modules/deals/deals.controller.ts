import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { DealsService } from "./deals.service";
import { UpdateDealDto } from "./dto/update-deal.dto";
import { DealFocusRequestDto } from "./dto/deal-focus.dto";

@Controller("deals")
@UseGuards(UnifiedAuthGuard)
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post("focus-suggestion")
  getFocusSuggestion(@Body() dto: DealFocusRequestDto) {
    return this.dealsService.getFocusSuggestion(dto.deals ?? []);
  }

  @Get(":id")
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.dealsService.findOne(tenantId, id);
  }

  @Patch(":id")
  update(@TenantId() tenantId: string, @Param("id") id: string, @Body() dto: UpdateDealDto) {
    return this.dealsService.update(tenantId, id, dto);
  }

  @Delete(":id")
  async remove(@TenantId() tenantId: string, @Param("id") id: string) {
    await this.dealsService.remove(tenantId, id);
    return { success: true };
  }
}
