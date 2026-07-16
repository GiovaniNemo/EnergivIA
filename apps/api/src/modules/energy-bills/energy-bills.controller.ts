import { Controller, Get, Post, Body, Param, Delete, UseGuards } from "@nestjs/common";
import { EnergyBillsService } from "./energy-bills.service";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { PresignEnergyBillDto } from "./dto/presign-energy-bill.dto";
import { CreateEnergyBillDto } from "./dto/create-energy-bill.dto";

@Controller("leads/:leadId/energy-bills")
@UseGuards(UnifiedAuthGuard)
export class EnergyBillsController {
  constructor(private readonly energyBillsService: EnergyBillsService) {}

  @Post("presign")
  presign(
    @TenantId() tenantId: string,
    @Param("leadId") leadId: string,
    @Body() body: PresignEnergyBillDto
  ) {
    return this.energyBillsService.createPresignedUploadUrl(tenantId, leadId, body);
  }

  @Post()
  create(
    @TenantId() tenantId: string,
    @Param("leadId") leadId: string,
    @Body() body: CreateEnergyBillDto
  ) {
    return this.energyBillsService.create(tenantId, leadId, {
      fileUrl: body.fileUrl,
      fileName: body.fileName,
      provider: body.provider,
    });
  }

  @Get()
  findByLead(@TenantId() tenantId: string, @Param("leadId") leadId: string) {
    return this.energyBillsService.findByLead(tenantId, leadId);
  }

  @Get(":id")
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.energyBillsService.findOne(tenantId, id);
  }

  @Delete(":id")
  remove(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.energyBillsService.softDelete(tenantId, id);
  }
}
