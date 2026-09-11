import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from "@nestjs/common";
import type { JwtPayload } from "@energivia/types";
import { LeadsService } from "./leads.service";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CreateLeadDto } from "./dto/create-lead.dto";
import { UpdateLeadDto } from "./dto/update-lead.dto";
import { QueryLeadsDto } from "./dto/query-leads.dto";
import { AppendLeadActivityDto } from "./dto/append-lead-activity.dto";

@Controller("leads")
@UseGuards(UnifiedAuthGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateLeadDto,
    @CurrentUser() user?: JwtPayload
  ) {
    return this.leadsService.create(tenantId, dto, user);
  }

  @Get("stats")
  stats(@TenantId() tenantId: string, @CurrentUser() user?: JwtPayload) {
    return this.leadsService.getDashboardStats(tenantId, user);
  }

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query() query: QueryLeadsDto,
    @CurrentUser() user?: JwtPayload
  ) {
    return this.leadsService.findAll(tenantId, query, user);
  }

  @Get(":id/activity")
  listActivity(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.leadsService.listActivity(tenantId, id);
  }

  @Post(":id/activity")
  appendActivity(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: AppendLeadActivityDto
  ) {
    return this.leadsService.appendActivity(tenantId, id, dto);
  }

  @Get(":id")
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.leadsService.findOne(tenantId, id);
  }

  @Put(":id")
  update(@TenantId() tenantId: string, @Param("id") id: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.update(tenantId, id, dto);
  }

  @Delete(":id")
  async remove(@TenantId() tenantId: string, @Param("id") id: string) {
    await this.leadsService.remove(tenantId, id);
    return { success: true };
  }
}
