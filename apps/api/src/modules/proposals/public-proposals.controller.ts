import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Headers,
  Header,
  Res,
  StreamableFile,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { ProposalsService } from "./proposals.service";
import { Public } from "../../common/decorators/public.decorator";
import { RespondPublicProposalDto } from "./dto/respond-public-proposal.dto";

@Controller("public/proposals")
@Public()
export class PublicProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Get(":id")
  @Throttle({ short: { limit: 10, ttl: 10_000 }, medium: { limit: 30, ttl: 60_000 } })
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

  @Get(":id/pdf")
  @Throttle({ short: { limit: 2, ttl: 10_000 }, medium: { limit: 10, ttl: 60_000 } })
  @Header("Content-Type", "application/pdf")
  @Header("Cache-Control", "no-store")
  async downloadPdf(@Param("id") id: string, @Res({ passthrough: true }) res: Response) {
    const { buffer, filename } = await this.proposalsService.generatePublicPdf(id);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return new StreamableFile(buffer);
  }

  @Post(":id/view")
  @Throttle({ short: { limit: 5, ttl: 10_000 }, medium: { limit: 20, ttl: 60_000 } })
  trackView(
    @Param("id") id: string,
    @Query("pdf") isPdfQuery?: string,
    @Query("preview") isPreviewQuery?: string,
    @Headers("x-is-pdf") isPdfHeader?: string,
    @Headers("user-agent") userAgent?: string
  ) {
    const isPdf =
      isPdfQuery === "true" ||
      isPdfQuery === "1" ||
      isPdfHeader === "true" ||
      Boolean(userAgent && /HeadlessChrome|Puppeteer|wkhtmltopdf/i.test(userAgent));
    const isPreview = isPreviewQuery === "true" || isPreviewQuery === "1";
    return this.proposalsService.trackPublicProposalView(id, { isPdf, isPreview, userAgent });
  }

  @Post(":id/respond")
  @Throttle({ short: { limit: 2, ttl: 10_000 }, medium: { limit: 10, ttl: 60_000 } })
  respondPublic(@Param("id") id: string, @Body() dto: RespondPublicProposalDto) {
    return this.proposalsService.respondPublicById(id, dto);
  }
}
