import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { ProposalsService } from "./proposals.service";

@Controller("proposals")
@UseGuards(UnifiedAuthGuard)
export class ProposalOperationsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Get()
  list(@TenantId() tenantId: string) {
    return this.proposalsService.list(tenantId);
  }

  @Get(":id")
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.proposalsService.findOne(tenantId, id);
  }

  @Post(":id/send")
  send(@TenantId() tenantId: string, @Param("id") id: string, @Body() body: { pdfUrl: string }) {
    return this.proposalsService.updatePdfUrl(tenantId, id, body.pdfUrl);
  }

  @Patch(":id/discount")
  updateDiscount(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() body: { discountBrl: number | null }
  ) {
    return this.proposalsService.updateDiscount(tenantId, id, body.discountBrl ?? null);
  }

  @Post(":id/template")
  setTemplate(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() body: { proposalTemplateId?: string | null }
  ) {
    return this.proposalsService.setTemplate(tenantId, id, body.proposalTemplateId ?? null);
  }

  @Delete(":id")
  remove(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.proposalsService.softDelete(tenantId, id);
  }
}
