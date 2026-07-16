import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { OrgOwnerOrAdminGuard } from "../../common/guards/org-owner-or-admin.guard";
import { ProposalTemplateBlueprintsService } from "./proposal-template-blueprints.service";
import { CreateProposalTemplateBlueprintDto } from "./dto/create-proposal-template-blueprint.dto";
import { UpdateProposalTemplateBlueprintDto } from "./dto/update-proposal-template-blueprint.dto";

@Controller("admin/template-blueprints")
@UseGuards(UnifiedAuthGuard, OrgOwnerOrAdminGuard)
export class AdminProposalTemplateBlueprintsController {
  constructor(private readonly blueprintsService: ProposalTemplateBlueprintsService) {}

  @Get()
  adminList() {
    return this.blueprintsService.adminList();
  }

  @Get(":id")
  adminFindOne(@Param("id") id: string) {
    return this.blueprintsService.adminFindOne(id);
  }

  @Post()
  adminCreate(@Body() dto: CreateProposalTemplateBlueprintDto) {
    return this.blueprintsService.create(dto);
  }

  @Patch(":id")
  adminUpdate(@Param("id") id: string, @Body() dto: UpdateProposalTemplateBlueprintDto) {
    return this.blueprintsService.update(id, dto);
  }

  @Delete(":id")
  async adminRemove(@Param("id") id: string) {
    await this.blueprintsService.remove(id);
    return { ok: true };
  }
}
