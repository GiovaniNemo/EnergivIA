import { Body, Controller, Post, UseGuards, Headers } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { SupportService } from "./support.service";
import { CreateSupportTicketDto } from "./dto/create-support-ticket.dto";
import { SkipTrialLock } from "../../common/decorators/skip-trial-lock.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { OptionalTenantId } from "../../common/decorators/tenant-id.decorator";
import type { JwtPayload } from "@energivia/types";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";

@Controller(["support", "api/support"])
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post("tickets")
  @Public()
  @SkipTrialLock()
  @UseGuards(UnifiedAuthGuard)
  @Throttle({ short: { limit: 1, ttl: 10_000 }, medium: { limit: 5, ttl: 60_000 } })
  createTicket(
    @Body() dto: CreateSupportTicketDto,
    @CurrentUser() user?: JwtPayload,
    @OptionalTenantId() tenantId?: string,
    @Headers("x-organization-id") headerOrgId?: string
  ) {
    const effectiveTenantId = tenantId || headerOrgId || dto.tenantId;
    return this.supportService.createTicket(dto, user, effectiveTenantId);
  }
}
