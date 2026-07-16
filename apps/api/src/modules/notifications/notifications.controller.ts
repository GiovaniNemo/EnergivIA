import {
  Body,
  Controller,
  Get,
  Header,
  MessageEvent,
  Param,
  Patch,
  Post,
  Query,
  Sse,
  UseGuards,
} from "@nestjs/common";
import type { JwtPayload } from "@energivia/types";
import type { Observable } from "rxjs";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { OnboardingTemplateReadyDto } from "./dto/onboarding-template-ready.dto";
import { OnboardingTemplatesReadyDto } from "./dto/onboarding-templates-ready.dto";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(UnifiedAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query("unreadOnly") unreadOnly?: string,
    @Query("limit") limitRaw?: string
  ) {
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
    return this.notificationsService.listForUser(tenantId, user.sub, {
      unreadOnly: unreadOnly === "1" || unreadOnly === "true",
      limit: Number.isFinite(limit) ? limit : undefined,
    });
  }

  @Get("unread-count")
  unreadCount(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.notificationsService.countUnread(tenantId, user.sub).then((count) => ({ count }));
  }

  @Sse("stream")
  @Header("X-Accel-Buffering", "no")
  notificationStream(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Observable<MessageEvent> {
    return this.notificationsService.unreadCountSseStream(tenantId, user.sub);
  }

  @Post("read-all")
  markAllRead(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.notificationsService.markAllRead(tenantId, user.sub);
  }

  @Post("onboarding-templates-ready")
  onboardingTemplatesReady(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: OnboardingTemplatesReadyDto
  ) {
    return this.notificationsService
      .notifyOnboardingTemplatesReady(tenantId, user.sub, dto.templateCount)
      .then(() => ({ ok: true as const }));
  }

  @Post("onboarding-template-ready")
  onboardingTemplateReady(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: OnboardingTemplateReadyDto
  ) {
    return this.notificationsService
      .notifyOnboardingTemplateReady(tenantId, user.sub, {
        proposalTemplateId: dto.proposalTemplateId,
        templateName: dto.templateName,
        businessSegmentLabel: dto.businessSegmentLabel,
      })
      .then(() => ({ ok: true as const }));
  }

  @Patch(":id/read")
  markRead(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.notificationsService.markRead(tenantId, user.sub, id);
  }
}
