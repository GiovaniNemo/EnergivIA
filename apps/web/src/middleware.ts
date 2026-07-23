import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isAuth0Configured } from "@/lib/auth0-config";
import { auth0 } from "@/lib/auth0";

const normalizeHost = (value: string | undefined, fallback: string): string => {
  const host = (value ?? fallback)
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");
  return host || fallback;
};

const ROOT_DOMAIN = normalizeHost(process.env["APP_ROOT_DOMAIN"], "energivia.com.br");
const LANDING_HOST = normalizeHost(process.env["APP_LANDING_HOST"], "www.energivia.com.br");

const isLocalHost = (host: string): boolean =>
  host.includes("localhost") || host.startsWith("127.0.0.1");

const DEBUG_AUTH = process.env["DEBUG_AUTH_MIDDLEWARE"] === "1";
const log = (event: string, payload: Record<string, unknown> = {}): void => {
  if (!DEBUG_AUTH) return;
  console.log(`[mw] ${event}`, JSON.stringify(payload));
};

export async function middleware(request: NextRequest) {
  const hostHeader = request.headers.get("host") ?? "";
  const currentHost = hostHeader.split(":")[0]?.toLowerCase() ?? "";
  const pathname = request.nextUrl.pathname;
  log("entry", { host: currentHost, pathname });

  // Normaliza o domínio sem www para redirecionar de forma limpa para o LANDING_HOST principal (www)
  if (!isLocalHost(currentHost) && currentHost === ROOT_DOMAIN) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = LANDING_HOST;
    log("redirect:root-to-landing", { fromHost: currentHost, to: LANDING_HOST });
    return NextResponse.redirect(url, 307);
  }

  if (!isAuth0Configured()) {
    log("auth0-not-configured", {});
    return NextResponse.next();
  }

  const authResponse = await auth0.middleware(request);

  // Se o usuário estiver na raiz e já autenticado, envia para o painel
  if (pathname === "/") {
    try {
      const session = await auth0.getSession(request);
      if (session) {
        const url = request.nextUrl.clone();
        url.pathname = "/painel";
        url.search = "";
        log("redirect:landing-authed-to-painel", { host: currentHost });
        return NextResponse.redirect(url, 307);
      }
    } catch (err) {
      log("landing-session:error", {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Permite acesso irrestrito às rotas de admin/plataforma para qualquer usuário logado
  return authResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
