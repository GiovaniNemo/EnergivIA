import { Controller, Get, Post, Body, UseGuards, Inject } from "@nestjs/common";
import { SystemSettingsService } from "./system-settings.service";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";
import { Public } from "../../common/decorators/public.decorator";

@Controller("system-settings")
export class SystemSettingsController {
  constructor(
    @Inject(SystemSettingsService)
    private readonly systemSettingsService: SystemSettingsService
  ) {}

  @Public()
  @Get("branding")
  getBranding() {
    return this.systemSettingsService.getBranding();
  }

  @UseGuards(UnifiedAuthGuard)
  @Post("branding")
  setBranding(@Body() body: { brandLogoUrl: string; whatsappLogoUrl: string }) {
    return this.systemSettingsService.setBranding(body.brandLogoUrl, body.whatsappLogoUrl);
  }
}
