import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import type { JwtPayload } from "@energivia/types";

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    if (user?.role === "PLATFORM") {
      return true;
    }
    throw new ForbiddenException(
      "Apenas operadores da plataforma Energivia podem acessar este recurso."
    );
  }
}
