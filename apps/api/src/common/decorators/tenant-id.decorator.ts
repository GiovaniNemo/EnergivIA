import { createParamDecorator, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import type { JwtPayload } from "@energivia/types";

export const TenantId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>();
  const user = request.user;
  if (!user?.tenantId) {
    throw new UnauthorizedException("Organização não identificada.");
  }
  return user.tenantId;
});

export const OptionalTenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>();
    return request.user?.tenantId ?? undefined;
  }
);
