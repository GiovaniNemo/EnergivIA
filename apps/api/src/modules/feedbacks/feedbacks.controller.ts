import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { FeedbacksService } from "./feedbacks.service";
import { CreateFeedbackDto } from "./dto/create-feedback.dto";
import { SkipTrialLock } from "../../common/decorators/skip-trial-lock.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import type { JwtPayload } from "@energivia/types";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";

@Controller("feedbacks")
export class FeedbacksController {
  constructor(private readonly feedbacksService: FeedbacksService) {}

  @Post()
  @Public()
  @SkipTrialLock()
  @UseGuards(UnifiedAuthGuard)
  create(
    @Body() dto: CreateFeedbackDto,
    @CurrentUser() user?: JwtPayload,
    @TenantId() tenantId?: string
  ) {
    return this.feedbacksService.create(dto, user, tenantId);
  }

  @Get("summary")
  @Public()
  @SkipTrialLock()
  @UseGuards(UnifiedAuthGuard)
  getMetricsSummary() {
    return this.feedbacksService.getMetricsSummary();
  }
}
