import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service";
import { IS_TRIAL_LOCK_SKIPPED } from "../decorators/skip-trial-lock.decorator";
import { IS_PUBLIC_KEY } from "../auth-public.metadata";

@Injectable()
export class TrialLockGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const isSkipped = this.reflector.getAllAndOverride<boolean>(IS_TRIAL_LOCK_SKIPPED, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isSkipped) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return true; // Handled by auth guard

    if (user.role === "ADMIN" || user.role === "OWNER") {
      return true; // Admins and Owners bypass trial lock
    }

    if (!user.tenantId) {
      return true; // If no tenant, nothing to block
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      include: { subscription: true },
    });

    if (!tenant) return true;

    const now = new Date();
    const createdAt = tenant.createdAt;
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 7) {
      // 7 days expired. Check if there's an active subscription.
      const hasActiveSub = tenant.subscription && tenant.subscription.status === "active";
      if (!hasActiveSub) {
        throw new ForbiddenException({
          message: "Trial expired and no active subscription.",
          code: "TRIAL_EXPIRED",
        });
      }
    }

    return true;
  }
}
