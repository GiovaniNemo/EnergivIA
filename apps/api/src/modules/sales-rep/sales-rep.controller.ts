import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { SalesRepService, isPlatformSuperAdmin } from "./sales-rep.service";
import { CreateSalesActivityNoteDto, ListTenantsQueryDto } from "./dto/sales-rep.dto";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { PlatformSalesGuard } from "../../common/guards/platform-sales.guard";
import { SkipTrialLock } from "../../common/decorators/skip-trial-lock.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtPayload } from "@energivia/types";

@Controller(["sales-rep", "api/sales-rep"])
@UseGuards(UnifiedAuthGuard, PlatformSalesGuard)
@SkipTrialLock()
export class SalesRepController {
  constructor(private readonly salesRepService: SalesRepService) {}

  @Get("summary")
  getSummary(@CurrentUser() user: JwtPayload) {
    const isSuperAdmin = isPlatformSuperAdmin(user);
    return this.salesRepService.getDashboardSummary(user.sub, isSuperAdmin);
  }

  @Get("referral-link")
  getReferralLink(@CurrentUser() user: JwtPayload) {
    return this.salesRepService.getReferralLink(user.sub);
  }

  @Get("tenants")
  listTenants(@CurrentUser() user: JwtPayload, @Query() query: ListTenantsQueryDto) {
    const isSuperAdmin = isPlatformSuperAdmin(user);
    return this.salesRepService.listTenants(user.sub, isSuperAdmin, query);
  }

  @Get("tenants/:tenantId/notes")
  listNotes(@CurrentUser() user: JwtPayload, @Param("tenantId") tenantId: string) {
    const isSuperAdmin = isPlatformSuperAdmin(user);
    return this.salesRepService.listNotes(user.sub, tenantId, isSuperAdmin);
  }

  @Post("tenants/:tenantId/notes")
  addNote(
    @CurrentUser() user: JwtPayload,
    @Param("tenantId") tenantId: string,
    @Body() dto: CreateSalesActivityNoteDto
  ) {
    const isSuperAdmin = isPlatformSuperAdmin(user);
    return this.salesRepService.addNote(user.sub, tenantId, isSuperAdmin, dto);
  }
}
