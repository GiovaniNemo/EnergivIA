import { Controller, Post, Body, Get, Patch, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import type { JwtPayload, LoginResponse } from "@energivia/types";
import { OrganizationsService } from "../organizations/organizations.service";
import { Public } from "../../common/decorators/public.decorator";
import { SkipTrialLock } from "../../common/decorators/skip-trial-lock.decorator";
import { PrismaService } from "../../prisma/prisma.service";

import { isTrialExpired, getTrialDaysLeft } from "../../common/utils/business-days";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly organizationsService: OrganizationsService,
    private readonly prisma: PrismaService
  ) {}

  @Post("login")
  @Public()
  @Throttle({ medium: { ttl: 60_000, limit: 5 } })
  async login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(dto);
  }

  @Get("me")
  @UseGuards(UnifiedAuthGuard)
  @SkipTrialLock()
  async me(@CurrentUser() user: JwtPayload) {
    const profile = await this.authService.getProfile(user.sub);
    const organizations = await this.organizationsService.findAllForUser(user.sub);

    let isTrial = false;
    let trialDaysLeft = 5;
    let trialExpired = false;
    let proposalsCount = 0;
    const proposalsLimit = 20;

    if (user.tenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: user.tenantId },
        include: { subscription: true },
      });

      if (tenant) {
        isTrial = !tenant.subscription || tenant.subscription.status !== "active";
        if (isTrial) {
          trialDaysLeft = getTrialDaysLeft(tenant.createdAt, 5);
          trialExpired = isTrialExpired(tenant.createdAt, 5);
          proposalsCount = await this.prisma.proposal.count({
            where: { tenantId: user.tenantId, deletedAt: null },
          });
        }
      }
    }

    return {
      ...profile,
      role: user.role,
      organizations,
      currentOrganizationId: user.tenantId,
      isTrial,
      trialDaysLeft,
      trialExpired,
      proposalsCount,
      proposalsLimit,
      isTrialProposalLimitReached: isTrial && proposalsCount >= proposalsLimit,
      isTrialLocked: false, // Sem trava agressiva de tela cheia
    };
  }

  @Patch("me")
  @UseGuards(UnifiedAuthGuard)
  @SkipTrialLock()
  async updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.sub, dto);
  }
}
