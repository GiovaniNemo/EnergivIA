import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { ProposalTemplatesService } from "./proposal-templates.service";
import { CreateProposalTemplateDto } from "./dto/create-proposal-template.dto";
import { UpdateProposalTemplateDto } from "./dto/update-proposal-template.dto";

@Controller("proposal-templates")
@UseGuards(UnifiedAuthGuard)
export class ProposalTemplatesController {
  constructor(private readonly templatesService: ProposalTemplatesService) {}

  @Get()
  list(@TenantId() tenantId: string) {
    return this.templatesService.list(tenantId);
  }

  @Get(":id")
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.templatesService.findOne(tenantId, id);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateProposalTemplateDto) {
    return this.templatesService.create(tenantId, dto);
  }

  @Patch(":id")
  update(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateProposalTemplateDto
  ) {
    return this.templatesService.update(tenantId, id, dto);
  }

  @Post(":id/duplicate")
  duplicate(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.templatesService.duplicate(tenantId, id);
  }

  @Post(":id/publish")
  publish(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.templatesService.publish(tenantId, id);
  }

  @Get(":id/revisions")
  listRevisions(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.templatesService.listRevisions(tenantId, id);
  }

  @Post(":id/revisions/:revisionId/restore")
  restoreRevision(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Param("revisionId") revisionId: string
  ) {
    return this.templatesService.restoreRevision(tenantId, id, revisionId);
  }

  @Post(":id/archive")
  archive(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.templatesService.archive(tenantId, id);
  }
}
