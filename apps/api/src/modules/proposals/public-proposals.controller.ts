import { Controller, Get, Param } from "@nestjs/common";
import { ProposalsService } from "./proposals.service";
import { Public } from "../../common/decorators/public.decorator";

@Controller("public/proposals")
@Public()
export class PublicProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Get(":id")
  findPublic(@Param("id") id: string) {
    return this.proposalsService.findPublicById(id);
  }
}
