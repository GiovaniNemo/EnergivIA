import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import type { JwtPayload } from "@energivia/types";

const DEFAULT_PLATFORM_ADMIN_EMAILS = [
  "sgiovanimendes@gmail.com",
  "contato@energivia.com.br",
  "admin@energivia.com.br",
];

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    if (user?.role === "PLATFORM") {
      return true;
    }

    const envEmails = (process.env["PLATFORM_ADMIN_EMAILS"] ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const allowedEmails = envEmails.length > 0 ? envEmails : DEFAULT_PLATFORM_ADMIN_EMAILS;
    const userEmail = (user?.email ?? "").toLowerCase().trim();

    if (userEmail && allowedEmails.includes(userEmail)) {
      return true;
    }

    throw new ForbiddenException(
      "Apenas operadores da plataforma Energivia podem acessar este recurso."
    );
  }
}
