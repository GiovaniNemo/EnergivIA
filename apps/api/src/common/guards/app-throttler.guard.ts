import { Injectable, ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { Request } from "express";

interface AuthenticatedUserPayload {
  sub?: string;
  id?: string;
}

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  /**
   * Identifica o cliente para agrupamento de taxa de requisições:
   * 1. Usuário autenticado: agrupa por ID único (evita que múltiplos usuários na mesma rede/NAT se bloqueiem).
   * 2. Visitante público/não autenticado: extrai o IP real do cliente através de proxies reversos (Vercel, Next.js, Railway, Cloudflare).
   */
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const expressReq = req as unknown as Request & { user?: AuthenticatedUserPayload };

    if (expressReq.user?.sub) {
      return `usr_${expressReq.user.sub}`;
    }
    if (expressReq.user?.id) {
      return `usr_${expressReq.user.id}`;
    }

    const rawForwarded = expressReq.headers["x-forwarded-for"];
    if (typeof rawForwarded === "string" && rawForwarded.trim()) {
      const firstIp = rawForwarded.split(",")[0]?.trim();
      if (firstIp) return `ip_${firstIp}`;
    } else if (Array.isArray(rawForwarded) && rawForwarded.length > 0) {
      const firstIp = rawForwarded[0]?.split(",")[0]?.trim();
      if (firstIp) return `ip_${firstIp}`;
    }

    const realIp = expressReq.headers["x-real-ip"];
    if (typeof realIp === "string" && realIp.trim()) {
      return `ip_${realIp.trim()}`;
    }

    const socketIp = expressReq.ips?.length ? expressReq.ips[0] : expressReq.ip || "127.0.0.1";
    return `ip_${socketIp}`;
  }

  /**
   * Garante suporte universal a @SkipThrottle() tanto sem parâmetros (chave padrão 'default')
   * quanto específico por nome de throttler ('short', 'medium', 'long').
   */
  protected override async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const classRef = context.getClass();

    const skipDefault = this.reflector.getAllAndOverride<boolean>("THROTTLER:SKIPdefault", [
      handler,
      classRef,
    ]);
    if (skipDefault) {
      return true;
    }

    return super.shouldSkip(context);
  }

  /**
   * Mensagem amigável padronizada em português para o cliente final.
   */
  protected override async getErrorMessage(): Promise<string> {
    return "Muitas requisições em curto intervalo. Por segurança, aguarde alguns instantes antes de tentar novamente.";
  }
}
