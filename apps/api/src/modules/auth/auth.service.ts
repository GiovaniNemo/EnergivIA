import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import type { JwtPayload, LoginResponse, UserRole } from "@energivia/types";
import { UsersService } from "../users/users.service";
import type { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService
  ) {}

  async validateUser(
    email: string,
    password: string,
    tenantId: string
  ): Promise<JwtPayload | null> {
    const user = await this.usersService.findByEmailAndTenant(email, tenantId);
    if (!user?.password || user.tenantId == null) return null;
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;
    return {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role as UserRole,
    };
  }

  async login(dto: LoginDto): Promise<LoginResponse> {
    const tenantId = dto.tenantId
      ? await this.usersService.ensureTenantExists(dto.tenantId)
      : undefined;

    const payload = await this.validateUser(dto.email, dto.password, tenantId ?? "");
    if (!payload) {
      throw new UnauthorizedException("E-mail ou senha inválidos.");
    }

    const expiresIn = process.env["JWT_EXPIRES_IN"] ?? "7d";
    const expiresInSeconds = this.parseExpiresIn(expiresIn);
    const accessToken = this.jwtService.sign(payload, { expiresIn });

    const user = await this.usersService.findByIdInternal(payload.sub);

    return {
      accessToken,
      expiresIn: expiresInSeconds,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        tenantId: user.tenantId ?? "",
      },
    };
  }

  async getProfile(userId: string) {
    return this.usersService.findByIdInternal(userId);
  }

  async updateProfile(userId: string, data: { name?: string; picture?: string | null }) {
    return this.usersService.updateOwnProfile(userId, data);
  }

  private parseExpiresIn(value: string): number {
    const match = value.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60;
    const [, num, unit] = match;
    const n = parseInt(num ?? "7", 10);
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return n * (multipliers[unit ?? "d"] ?? 86400);
  }
}
