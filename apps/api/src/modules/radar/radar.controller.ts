import { Controller, Get, Post, Body, Query, UseGuards } from "@nestjs/common";
import { RadarService } from "./radar.service";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { QueryRadarDto, ConvertRadarLeadDto } from "./dto/radar.dto";

@Controller("radar")
@UseGuards(UnifiedAuthGuard)
export class RadarController {
  constructor(private readonly radarService: RadarService) {}

  @Get("installations")
  searchInstallations(@Query() query: QueryRadarDto) {
    return this.radarService.searchInstallations(query);
  }

  @Post("convert-lead")
  convertToLead(@TenantId() tenantId: string, @Body() dto: ConvertRadarLeadDto) {
    return this.radarService.convertToLead(tenantId, dto);
  }
}
