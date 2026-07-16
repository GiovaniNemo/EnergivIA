import { Controller, Get, UseGuards } from "@nestjs/common";
import { TenantsService } from "./tenants.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantId } from "../../common/decorators/tenant-id.decorator";

@Controller("tenants")
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get("current")
  current(@TenantId() tenantId: string) {
    return this.tenantsService.findById(tenantId);
  }
}
