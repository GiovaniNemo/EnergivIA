import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service";
import { IS_TRIAL_LOCK_SKIPPED } from "../decorators/skip-trial-lock.decorator";
import { IS_PUBLIC_KEY } from "../auth-public.metadata";
import { getTenantPlanDetails } from "../utils/plan-limits";

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

    // Permite todas as requisições GET (leitura livre do histórico)
    if (request.method === "GET") {
      return true;
    }

    const user = request.user;
    if (!user) return true; // Handled by auth guard

    if (user.role === "ADMIN" || user.role === "PLATFORM") {
      return true; // Admins and Platform bypass trial lock
    }

    if (!user.tenantId) {
      return true; // If no tenant, nothing to block
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });

    if (!tenant) return true;

    const planDetails = getTenantPlanDetails(tenant);

    if (planDetails.isTrial) {
      // Está em período Start (Trial)
      const count = await this.prisma.proposal.count({
        where: { tenantId: user.tenantId, deletedAt: null },
      });

      if (planDetails.trialExpired || count >= 20) {
        throw new ForbiddenException({
          message:
            "Limite do período de teste gratuito atingido (5 dias úteis ou 20 propostas). Assine um plano para continuar gerando propostas.",
          code: "TRIAL_LIMIT_REACHED",
          trialExpired: planDetails.trialExpired,
          proposalsCount: count,
          proposalsLimit: 20,
        });
      }
      return true;
    }

    // Assinatura ativa com limite de propostas por mês (ex: Plano Essencial = 50)
    const monthlyLimit = planDetails.features.maxProposalsPerMonth;
    if (monthlyLimit !== null && monthlyLimit !== undefined && monthlyLimit > 0) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const count = await this.prisma.proposal.count({
        where: {
          tenantId: user.tenantId,
          deletedAt: null,
          createdAt: { gte: startOfMonth },
        },
      });

      if (count >= monthlyLimit) {
        throw new ForbiddenException({
          message: `Limite mensal de ${monthlyLimit} propostas do seu plano atingido. Faça upgrade para o Plano Pro para gerar propostas ilimitadas.`,
          code: "PROPOSAL_LIMIT_REACHED",
          proposalsCount: count,
          proposalsLimit: monthlyLimit,
        });
      }
    }

    return true;
  }
}
