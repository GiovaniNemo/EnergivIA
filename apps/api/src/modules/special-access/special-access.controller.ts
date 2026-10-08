import { Controller, Get, Post, Body, UseGuards, BadRequestException } from "@nestjs/common";
import { SpecialAccessService } from "./special-access.service";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { PlatformAdminGuard } from "../../common/guards/platform-admin.guard";
import { SkipTrialLock } from "../../common/decorators/skip-trial-lock.decorator";

@Controller(["admin/special-access", "api/admin/special-access"])
@UseGuards(UnifiedAuthGuard, PlatformAdminGuard)
@SkipTrialLock()
export class SpecialAccessController {
  constructor(private readonly specialAccessService: SpecialAccessService) {}

  @Get()
  async list() {
    return this.specialAccessService.listAll();
  }

  @Post("add")
  async add(@Body() body: { email: string; notes?: string }) {
    if (!body?.email || !body.email.includes("@")) {
      throw new BadRequestException("E-mail inválido.");
    }
    return this.specialAccessService.addSpecialAccess(body.email, body.notes);
  }

  @Post("revoke")
  async revoke(@Body() body: { email: string }) {
    if (!body?.email) {
      throw new BadRequestException("E-mail não fornecido.");
    }
    await this.specialAccessService.revokeSpecialAccess(body.email);
    return { success: true, message: "Acesso especial revogado com sucesso." };
  }

  @Post("restore")
  async restore(@Body() body: { email: string }) {
    if (!body?.email) {
      throw new BadRequestException("E-mail não fornecido.");
    }
    await this.specialAccessService.restoreSpecialAccess(body.email);
    return { success: true, message: "Acesso especial restaurado com sucesso." };
  }
}
