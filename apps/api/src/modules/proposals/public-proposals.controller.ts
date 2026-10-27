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
import type { Response } from "express";
import { ProposalsService } from "./proposals.service";
import { ZapSignService } from "./zapsign.service";
import { Public } from "../../common/decorators/public.decorator";
import { RespondPublicProposalDto } from "./dto/respond-public-proposal.dto";

@Controller("public/proposals")
@Public()
export class PublicProposalsController {
  constructor(
    private readonly proposalsService: ProposalsService,
    private readonly zapsignService?: ZapSignService
  ) {}

  @Post("webhooks/zapsign")
  handleZapSignWebhook(@Body() payload: Record<string, unknown>) {
    return this.zapsignService?.handleWebhook(payload) ?? { processed: false };
  }

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

  @Get(":id/pdf")
  @Header("Content-Type", "application/pdf")
  @Header("Cache-Control", "no-store")
  async downloadPdf(@Param("id") id: string, @Res({ passthrough: true }) res: Response) {
    const { buffer, filename } = await this.proposalsService.generatePublicPdf(id);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return new StreamableFile(buffer);
  }

  @Post(":id/view")
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
  respondPublic(@Param("id") id: string, @Body() dto: RespondPublicProposalDto) {
    return this.proposalsService.respondPublicById(id, dto);
  }
}
