import { Controller, Get, Post, Body, Query, UseGuards, ForbiddenException } from "@nestjs/common";
import { RadarService } from "./radar.service";
import { PrismaService } from "../../prisma/prisma.service";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { JwtPayload } from "@energivia/types";
import { getTenantPlanDetails } from "../../common/utils/plan-limits";
import { QueryRadarDto, ConvertRadarLeadDto } from "./dto/radar.dto";

@Controller("radar")
@UseGuards(UnifiedAuthGuard)
export class RadarController {
  constructor(
    private readonly radarService: RadarService,
    private readonly prisma: PrismaService
  ) {}

  private async assertRadarAccess(tenantId: string, user?: JwtPayload) {
    if (user && (user.role === "ADMIN" || user.role === "PLATFORM")) {
      return;
    }
    if (!tenantId) {
      throw new ForbiddenException("Organização não identificada.");
    }
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });
    if (!tenant) {
      throw new ForbiddenException("Organização não encontrada.");
    }
    const planDetails = getTenantPlanDetails(tenant);
    if (!planDetails.features.hasRadarSolar) {
      throw new ForbiddenException({
        message:
          "O Radar Solar ANEEL não está incluso no seu plano atual. Faça upgrade para o Plano Pro para acessar o radar.",
        code: "RADAR_NOT_INCLUDED",
      });
    }
  }

  @Get("installations")
  async searchInstallations(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryRadarDto
  ) {
    await this.assertRadarAccess(tenantId, user);
    return this.radarService.searchInstallations(query);
  }

  @Post("convert-lead")
  async convertToLead(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ConvertRadarLeadDto
  ) {
    await this.assertRadarAccess(tenantId, user);
    return this.radarService.convertToLead(tenantId, dto);
  }
}
