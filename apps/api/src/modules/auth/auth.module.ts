import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { Auth0JwtStrategy } from "./strategies/auth0-jwt.strategy";
import { UsersModule } from "../users/users.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { UnifiedAuthGuard } from "../../common/guards/unified-auth.guard";

@Module({
  imports: [
    UsersModule,
    OrganizationsModule,
    PrismaModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const secret =
          config.get<string>("JWT_SECRET") ?? "DISABLED_LEGACY_LOGIN_SET_JWT_SECRET_TO_ENABLE";
        return {
          secret,
          signOptions: {
            expiresIn: config.get<string>("JWT_EXPIRES_IN", "7d"),
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, Auth0JwtStrategy, UnifiedAuthGuard],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
