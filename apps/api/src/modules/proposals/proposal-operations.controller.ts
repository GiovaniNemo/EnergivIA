import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Header,
  StreamableFile,
} from "@nestjs/common";
import type { JwtPayload } from "@energivia/types";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { OrgOwnerOrAdminGuard } from "../../common/guards/org-owner-or-admin.guard";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { ProposalsService } from "./proposals.service";

@Controller("proposals")
@UseGuards(UnifiedAuthGuard)
export class ProposalOperationsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Post("generate-ai-section")
  generateAiSection(@Body() body: { prompt: string; contextText?: string }) {
    return this.proposalsService.generateAiSection(body.prompt, body.contextText);
  }

  @Get()
  list(@TenantId() tenantId: string, @CurrentUser() user?: JwtPayload) {
    return this.proposalsService.list(tenantId, user?.role);
  }

  @Get(":id")
  findOne(@TenantId() tenantId: string, @Param("id") id: string, @CurrentUser() user?: JwtPayload) {
    return this.proposalsService.findOne(tenantId, id, user?.role);
  }

  @Get(":id/generate-pdf")
  @Header("Content-Type", "application/pdf")
  async generatePdf(@Param("id") id: string) {
    const buffer = await this.proposalsService.generatePdf(id);
    return new StreamableFile(buffer);
  }

  @Post(":id/send")
  send(@TenantId() tenantId: string, @Param("id") id: string, @Body() body: { pdfUrl: string }) {
    return this.proposalsService.updatePdfUrl(tenantId, id, body.pdfUrl);
  }

  @Patch(":id/discount")
  updateDiscount(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() body: { discountBrl: number | null },
    @CurrentUser() user?: JwtPayload
  ) {
    return this.proposalsService.updateDiscount(tenantId, id, body.discountBrl ?? null, user);
  }

  @Patch(":id/margin-override")
  @UseGuards(OrgOwnerOrAdminGuard)
  updateMarginOverride(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() body: { marginBrl: number },
    @CurrentUser() user?: JwtPayload
  ) {
    return this.proposalsService.updateMarginOverride(tenantId, id, body.marginBrl, user);
  }

  @Patch(":id/labor-override")
  @UseGuards(OrgOwnerOrAdminGuard)
  updateLaborOverride(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() body: { laborBrl: number },
    @CurrentUser() user?: JwtPayload
  ) {
    return this.proposalsService.updateLaborOverride(tenantId, id, body.laborBrl, user);
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
