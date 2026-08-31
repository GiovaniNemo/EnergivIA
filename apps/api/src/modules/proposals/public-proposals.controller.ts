import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ProposalsService } from "./proposals.service";
import { Public } from "../../common/decorators/public.decorator";
import { RespondPublicProposalDto } from "./dto/respond-public-proposal.dto";

@Controller("public/proposals")
@Public()
export class PublicProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Get(":id")
  findPublic(@Param("id") id: string) {
    return this.proposalsService.findPublicById(id);
  }

  @Post(":id/respond")
  respondPublic(@Param("id") id: string, @Body() dto: RespondPublicProposalDto) {
    return this.proposalsService.respondPublicById(id, dto);
  }
}
