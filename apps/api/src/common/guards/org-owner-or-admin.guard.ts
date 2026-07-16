import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import type { JwtPayload } from "@energivia/types";

@Injectable()
export class OrgOwnerOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const role = user?.role;
    if (role === "OWNER" || role === "ADMIN" || role === "PLATFORM") {
      return true;
    }
    throw new ForbiddenException(
      "Apenas proprietários e administradores da organização podem gerir este catálogo."
    );
  }
}
