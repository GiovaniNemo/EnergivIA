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

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly organizationsService: OrganizationsService
  ) {}

  @Post("login")
  @Public()
  @Throttle({ medium: { ttl: 60_000, limit: 5 } })
  async login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(dto);
  }

  @Get("me")
  @UseGuards(UnifiedAuthGuard)
  async me(@CurrentUser() user: JwtPayload) {
    const profile = await this.authService.getProfile(user.sub);
    const organizations = await this.organizationsService.findAllForUser(user.sub);
    return {
      ...profile,
      role: user.role,
      organizations,
      currentOrganizationId: user.tenantId,
    };
  }

  @Patch("me")
  @UseGuards(UnifiedAuthGuard)
  async updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(user.sub, dto);
  }
}
