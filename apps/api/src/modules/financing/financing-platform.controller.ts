import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { CommissionStatus, FinancingApplicationStatus } from "@prisma/client";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { PlatformAdminGuard } from "../../common/guards/platform-admin.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { FinancingCommissionRulesService } from "./financing-commission-rules.service";
import { FinancingCommissionsService } from "./financing-commissions.service";
import { FinancingSlaService } from "./financing-sla.service";
import {
  CreateCommissionRuleDto,
  UpdateCommissionDto,
  UpdateCommissionRuleDto,
} from "./dto/commission.dto";

@Controller("financing/platform")
@UseGuards(UnifiedAuthGuard, PlatformAdminGuard)
export class FinancingPlatformController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commissions: FinancingCommissionsService,
    private readonly commissionRules: FinancingCommissionRulesService,
    private readonly sla: FinancingSlaService
  ) {}

  @Get("applications")
  listApplications(
    @Query("status") status?: FinancingApplicationStatus,
    @Query("providerId") providerId?: string,
    @Query("tenantId") tenantId?: string
  ) {
    return this.prisma.financingApplication.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(providerId ? { providerId } : {}),
        ...(tenantId ? { tenantId } : {}),
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        provider: { select: { id: true, name: true, slug: true, mode: true } },
        selectedOffer: {
          select: {
            installmentValue: true,
            term: true,
            financedAmount: true,
            monthlyRate: true,
            cet: true,
          },
        },
        simulation: {
          select: { customerName: true, cpfCnpj: true, personType: true, leadId: true },
        },
        commission: { select: { id: true, status: true, grossCommissionBrl: true } },
        _count: { select: { documents: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });
  }

  @Get("kanban")
  async kanban() {
    const all = await this.listApplications();
    type Row = (typeof all)[number];
    const groups: Record<FinancingApplicationStatus, Row[]> = {
      CREATED: [],
      AWAITING_DOCUMENTS: [],
      DOCUMENTS_RECEIVED: [],
      SUBMITTED_TO_BANK: [],
      UNDER_REVIEW: [],
      PENDING: [],
      APPROVED: [],
      REJECTED: [],
      CONTRACT_SIGNED: [],
      CREDIT_RELEASED: [],
      COMPLETED: [],
    };
    for (const a of all) groups[a.status].push(a);
    return groups;
  }

  @Get("commissions")
  listCommissions(
    @Query("status") status?: CommissionStatus,
    @Query("providerId") providerId?: string,
    @Query("tenantId") tenantId?: string
  ) {
    return this.commissions.list({ status, providerId, tenantId });
  }

  @Get("commissions/revenue")
  revenue() {
    return this.commissions.revenueSummary();
  }

  @Patch("commissions/:id")
  updateCommission(@Param("id") id: string, @Body() body: UpdateCommissionDto) {
    return this.commissions.updateCommission(id, body);
  }

  @Post("sla-scan")
  runSlaScan() {
    return this.sla.runScan();
  }

  @Get("commission-rules")
  listRules(@Query("providerId") providerId?: string) {
    return this.commissionRules.list(providerId);
  }

  @Post("commission-rules")
  createRule(@Body() body: CreateCommissionRuleDto) {
    return this.commissionRules.create(body);
  }

  @Patch("commission-rules/:id")
  updateRule(@Param("id") id: string, @Body() body: UpdateCommissionRuleDto) {
    return this.commissionRules.update(id, body);
  }

  @Delete("commission-rules/:id")
  removeRule(@Param("id") id: string) {
    return this.commissionRules.remove(id);
  }
}
