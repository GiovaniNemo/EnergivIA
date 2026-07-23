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

const APP_HOST = normalizeHost(process.env["APP_AUTH_HOST"], "app.energivia.com.br");
const ADMIN_HOST = normalizeHost(process.env["APP_ADMIN_HOST"], "admin.energivia.com.br");
const ROOT_DOMAIN = normalizeHost(process.env["APP_ROOT_DOMAIN"], "energivia.com.br");
const LANDING_HOST = normalizeHost(process.env["APP_LANDING_HOST"], "www.energivia.com.br");

const PUBLIC_MARKETING_ROUTES = new Set([
  "/",
  "/proposta-energia-solar",
  "/simulacao-energia-solar",
  "/software-integrador-solar",
  "/crm-energia-solar",
  "/manifest.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
]);

const ADMIN_SURFACE_PREFIXES = ["/admin", "/plataforma"];

const ADMIN_LANDING_PATH = "/plataforma/financiamentos";

const ADMIN_LANDING_ALIASES = new Set(["/", "/painel"]);

const SHARED_PREFIXES = [
  "/api",
  "/auth",
  "/login",
  "/logout",
  "/_next",
  "/favicon",
  "/logo",
  "/landing",
  "/og",
];

const AUTH_DEPENDENT_PREFIXES = ["/auth", "/login", "/logout", "/api"];

const isPublicAssetPath = (pathname: string): boolean => {
  return (
    /\.(png|jpe?g|gif|svg|webp|avif|ico|bmp|mp4|webm|woff2?|ttf|eot|js|css|json|xml|txt)$/i.test(
      pathname
    ) ||
    pathname.startsWith("/landing/") ||
    pathname.startsWith("/og/")
  );
};

const isLocalHost = (host: string): boolean =>
  host.includes("localhost") || host.startsWith("127.0.0.1");

const isPublicMarketingRoute = (pathname: string): boolean => PUBLIC_MARKETING_ROUTES.has(pathname);

const isAdminSurfacePath = (pathname: string): boolean =>
  ADMIN_SURFACE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

const isSharedPath = (pathname: string): boolean =>
  SHARED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ||
  isPublicAssetPath(pathname);

const isAuthDependentPath = (pathname: string): boolean =>
  AUTH_DEPENDENT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

const PLATFORM_ROLE_CLAIM = "https://energivia.com.br/role";

const decodeJwtPayload = (jwt: string): Record<string, unknown> | null => {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const hasPlatformClaim = (claims: Record<string, unknown> | null): boolean => {
  if (!claims) return false;
  const value = claims[PLATFORM_ROLE_CLAIM];
  return typeof value === "string" && value.trim().toLowerCase() === "platform";
};

const isPlatformByEmail = (email: string | undefined): boolean => {
  if (!email) return false;
  const allowlist = (process.env["PLATFORM_ADMIN_EMAILS"] ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
};

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

  if (!isLocalHost(currentHost) && currentHost.endsWith(ROOT_DOMAIN)) {
    const isAppHost = currentHost === APP_HOST;
    const isAdminHost = currentHost === ADMIN_HOST;
    const isLandingHost = currentHost === LANDING_HOST;
    const shared = isSharedPath(pathname);
    const adminPath = isAdminSurfacePath(pathname);
    const marketingPath = isPublicMarketingRoute(pathname);

    if (isLandingHost && (marketingPath || isPublicAssetPath(pathname))) {
      return NextResponse.next();
    }

    if (isAuthDependentPath(pathname) && !isAppHost && !isAdminHost) {
      const url = request.nextUrl.clone();
      url.protocol = "https:";
      url.host = adminPath ? ADMIN_HOST : APP_HOST;
      log("redirect:auth-dep-to-app", {
        from: pathname,
        fromHost: currentHost,
        to: url.host,
      });
      return NextResponse.redirect(url, 307);
    }

    if (!shared) {
      if (isAdminHost && !adminPath) {
        const url = request.nextUrl.clone();
        if (ADMIN_LANDING_ALIASES.has(pathname)) {
          url.pathname = ADMIN_LANDING_PATH;
          log("redirect:admin-alias", { from: pathname, to: ADMIN_LANDING_PATH });
          return NextResponse.redirect(url, 307);
        }
        url.protocol = "https:";
        url.host = APP_HOST;
        log("redirect:admin-to-app", { from: pathname, host: APP_HOST });
        return NextResponse.redirect(url, 307);
      }

      if (isAppHost && adminPath) {
        const url = request.nextUrl.clone();
        url.protocol = "https:";
        url.host = ADMIN_HOST;
        log("redirect:app-to-admin", { from: pathname, host: ADMIN_HOST });
        return NextResponse.redirect(url, 307);
      }

      const shouldBeOnAppHost = !marketingPath && !isAppHost && !isAdminHost;
      if (shouldBeOnAppHost || (isLandingHost && !marketingPath)) {
        const url = request.nextUrl.clone();
        url.protocol = "https:";
        url.host = adminPath ? ADMIN_HOST : APP_HOST;
        log("redirect:landing-fallback", { from: pathname, to: url.host });
        return NextResponse.redirect(url, 307);
      }
    }
  }

  if (!isAuth0Configured()) {
    log("auth0-not-configured", {});
    return NextResponse.next();
  }

  const authResponse = await auth0.middleware(request);

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

  if (!isLocalHost(currentHost) && currentHost === ADMIN_HOST && !isSharedPath(pathname)) {
    try {
      const session = await auth0.getSession(request);
      log("role-gate:session", {
        hasSession: !!session,
        pathname,
      });
      if (session) {
        const sessionUser = session.user as Record<string, unknown>;
        const idToken = (session.tokenSet as { idToken?: string } | undefined)?.idToken;
        const idTokenClaims = idToken ? decodeJwtPayload(idToken) : null;

        const platformFromIdToken = hasPlatformClaim(idTokenClaims);
        const platformFromUser = hasPlatformClaim(sessionUser);
        const email =
          typeof sessionUser["email"] === "string" ? (sessionUser["email"] as string) : undefined;
        const platformFromEnv = isPlatformByEmail(email);
        const isPlatform = platformFromIdToken || platformFromUser || platformFromEnv;

        log("role-gate:decision", {
          isPlatform,
          platformFromIdToken,
          platformFromUser,
          platformFromEnv,
          hasIdToken: !!idToken,
          idTokenClaimKeys: idTokenClaims ? Object.keys(idTokenClaims).sort() : null,
          sessionUserKeys: Object.keys(sessionUser).sort(),
          email,
        });

        if (!isPlatform) {
          // Limpa 'https://' ou 'http://' caso já existam na variável APP_HOST
          const cleanHost = APP_HOST.replace(/^https?:\/\//, "");

          const kickUrl = new URL(`https://${cleanHost}/painel`);
          const kick = NextResponse.redirect(kickUrl, 307);
          kick.cookies.delete("__session");
          log("role-gate:kick", { to: kickUrl.toString() });
          return kick;
        }
      }
    } catch (err) {
      log("role-gate:error", { message: err instanceof Error ? err.message : String(err) });
    }
  }

  return authResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
