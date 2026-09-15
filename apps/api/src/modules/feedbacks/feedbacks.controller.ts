import { Body, Controller, Get, Post, UseGuards, Headers } from "@nestjs/common";
import { FeedbacksService } from "./feedbacks.service";
import { CreateFeedbackDto } from "./dto/create-feedback.dto";
import { SkipTrialLock } from "../../common/decorators/skip-trial-lock.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { OptionalTenantId } from "../../common/decorators/tenant-id.decorator";
import type { JwtPayload } from "@energivia/types";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";

@Controller(["feedbacks", "api/feedbacks"])
export class FeedbacksController {
  constructor(private readonly feedbacksService: FeedbacksService) {}

  @Post()
  @Public()
  @SkipTrialLock()
  @UseGuards(UnifiedAuthGuard)
  create(
    @Body() dto: CreateFeedbackDto,
    @CurrentUser() user?: JwtPayload,
    @OptionalTenantId() tenantId?: string,
    @Headers("x-organization-id") headerOrgId?: string
  ) {
    const effectiveTenantId = tenantId || headerOrgId || dto.tenantId;
    return this.feedbacksService.create(dto, user, effectiveTenantId);
  }

  @Get("summary")
  @Public()
  @SkipTrialLock()
  @UseGuards(UnifiedAuthGuard)
  getMetricsSummary() {
    return this.feedbacksService.getMetricsSummary();
  }
}
