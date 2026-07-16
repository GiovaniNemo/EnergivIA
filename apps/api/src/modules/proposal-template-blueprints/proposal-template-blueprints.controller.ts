import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { ProposalTemplateBlueprintsService } from "./proposal-template-blueprints.service";

@Controller("template-blueprints")
@UseGuards(UnifiedAuthGuard)
export class ProposalTemplateBlueprintsController {
  constructor(private readonly blueprintsService: ProposalTemplateBlueprintsService) {}

  @Get()
  listPublished() {
    return this.blueprintsService.listPublished();
  }

  @Get(":id")
  findPublishedById(@Param("id") id: string) {
    return this.blueprintsService.findPublishedById(id);
  }
}
