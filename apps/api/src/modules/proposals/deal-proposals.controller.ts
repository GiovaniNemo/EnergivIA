import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { ProposalsService } from "./proposals.service";
import { CreateProposalDto } from "./dto/create-proposal.dto";

@Controller()
@UseGuards(UnifiedAuthGuard)
export class DealProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Post("deals/:dealId/proposals")
  create(
    @TenantId() tenantId: string,
    @Param("dealId") dealId: string,
    @Body() body: CreateProposalDto
  ) {
    return this.proposalsService.create(tenantId, {
      dealId,
      simulationId: body.simulationId,
      title: body.title,
      validUntil: new Date(body.validUntil),
      proposalTemplateId: body.proposalTemplateId,
      renderedData: body.renderedData,
      discountBrl: body.discountBrl,
    });
  }

  @Get("deals/:dealId/proposals")
  findByDeal(@TenantId() tenantId: string, @Param("dealId") dealId: string) {
    return this.proposalsService.findByDeal(tenantId, dealId);
  }
}
