import { Body, Controller, Get, Param, Post, Query, Headers } from "@nestjs/common";
import { ProposalsService } from "./proposals.service";
import { Public } from "../../common/decorators/public.decorator";
import { RespondPublicProposalDto } from "./dto/respond-public-proposal.dto";

@Controller("public/proposals")
@Public()
export class PublicProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Get(":id")
  findPublic(
    @Param("id") id: string,
    @Query("pdf") isPdfQuery?: string,
    @Headers("x-is-pdf") isPdfHeader?: string,
    @Headers("user-agent") userAgent?: string
  ) {
    const isPdf =
      isPdfQuery === "true" ||
      isPdfQuery === "1" ||
      isPdfHeader === "true" ||
      Boolean(userAgent && /HeadlessChrome|Puppeteer|wkhtmltopdf/i.test(userAgent));
    return this.proposalsService.findPublicById(id, { isPdf });
  }

  @Post(":id/view")
  trackView(
    @Param("id") id: string,
    @Query("pdf") isPdfQuery?: string,
    @Headers("x-is-pdf") isPdfHeader?: string,
    @Headers("user-agent") userAgent?: string
  ) {
    const isPdf =
      isPdfQuery === "true" ||
      isPdfQuery === "1" ||
      isPdfHeader === "true" ||
      Boolean(userAgent && /HeadlessChrome|Puppeteer|wkhtmltopdf/i.test(userAgent));
    return this.proposalsService.trackPublicProposalView(id, { isPdf, userAgent });
  }

  @Post(":id/respond")
  respondPublic(@Param("id") id: string, @Body() dto: RespondPublicProposalDto) {
    return this.proposalsService.respondPublicById(id, dto);
  }
}
