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

import { getTenantPlanDetails } from "../../common/utils/plan-limits";

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
    let proposalsLimit: number | null = 20;
    let planTier = "TRIAL";
    let planName = "Plano Start";
    let planFeatures = null;
    let membersCount = 1;
    let membersLimit: number | null = 1;
    let customTemplatesCount = 0;
    let customTemplatesLimit: number | null = 0;
    let whatsappPhonesCount = 0;
    let whatsappPhonesLimit: number | null = 0;
    let hasProposalViewAlerts = false;
    let isProposalLimitReached = false;

    if (user.tenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: user.tenantId },
        include: {
          subscription: {
            include: { plan: true },
          },
        },
      });

      if (tenant) {
        const planDetails = getTenantPlanDetails(tenant);
        isTrial = planDetails.isTrial;
        trialDaysLeft = planDetails.trialDaysLeft;
        trialExpired = planDetails.trialExpired;
        planTier = planDetails.tier;
        planName = planDetails.planName;
        planFeatures = planDetails.features;
        proposalsLimit = planDetails.features.maxProposalsPerMonth ?? null;
        membersLimit = planDetails.features.maxTeamMembers ?? null;
        customTemplatesLimit = planDetails.features.maxCustomTemplates ?? null;
        whatsappPhonesLimit = planDetails.features.maxWhatsappNumbers ?? null;
        hasProposalViewAlerts = planDetails.features.hasProposalViewAlerts;

        // Contagem de membros
        membersCount = await this.prisma.organizationMember.count({
          where: {
            organizationId: user.tenantId,
            status: { in: ["ACCEPTED", "PENDING"] },
          },
        });

        // Contagem de templates customizados
        customTemplatesCount = await this.prisma.proposalTemplate.count({
          where: {
            tenantId: user.tenantId,
            deletedAt: null,
            status: { not: "ARCHIVED" },
          },
        });

        // Contagem de números de WhatsApp
        whatsappPhonesCount = await this.prisma.tenantWhatsappInboundPhone.count({
          where: { organizationId: user.tenantId },
        });

        // Contagem de propostas
        if (isTrial) {
          // No trial conta o total geral
          proposalsCount = await this.prisma.proposal.count({
            where: { tenantId: user.tenantId, deletedAt: null },
          });
          proposalsLimit = 20;
          isProposalLimitReached = proposalsCount >= 20;
        } else if (proposalsLimit !== null && proposalsLimit > 0) {
          // No Essencial com limite mensal, conta propostas criadas no mês atual (início do mês corrente)
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);

          proposalsCount = await this.prisma.proposal.count({
            where: {
              tenantId: user.tenantId,
              deletedAt: null,
              createdAt: { gte: startOfMonth },
            },
          });
          isProposalLimitReached = proposalsCount >= proposalsLimit;
        } else {
          // Pro / Plus ilimitado
          proposalsCount = await this.prisma.proposal.count({
            where: { tenantId: user.tenantId, deletedAt: null },
          });
          isProposalLimitReached = false;
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
      isTrialProposalLimitReached: isTrial ? isProposalLimitReached : false,
      isProposalLimitReached,
      isTrialLocked: false,
      planTier,
      planName,
      planFeatures,
      membersCount,
      membersLimit,
      customTemplatesCount,
      customTemplatesLimit,
      whatsappPhonesCount,
      whatsappPhonesLimit,
      hasProposalViewAlerts,
    };
  }

  @Patch("me")
  @UseGuards(UnifiedAuthGuard)
  @SkipTrialLock()
  async updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.sub, dto);
  }
}
