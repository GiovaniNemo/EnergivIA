import { Controller, Get, UseGuards, Param } from "@nestjs/common";
import type { JwtPayload } from "@energivia/types";
import { UsersService } from "./users.service";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@Controller("users")
@UseGuards(UnifiedAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  list(@TenantId() tenantId: string) {
    return this.usersService.findManyByTenant(tenantId);
  }

  @Get(":id")
  getOne(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.usersService.findByIdForMember(tenantId, user, id);
  }
}
