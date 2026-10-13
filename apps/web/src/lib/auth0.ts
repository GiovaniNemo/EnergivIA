import { Auth0Client, filterDefaultIdTokenClaims } from "@auth0/nextjs-auth0/server";
import { NextResponse } from "next/server";

const audience = process.env["AUTH0_AUDIENCE"];
const scope = process.env["AUTH0_SCOPE"] ?? "openid profile email";

const rawBaseUrl = process.env["APP_BASE_URL"];
const configuredUrls = rawBaseUrl
  ? rawBaseUrl
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : [];

// Permite todos os domínios canônicos e subdomínios da aplicação para correspondência dinâmica de host
const appBaseUrl: string[] = Array.from(
  new Set([
    "https://www.energivia.com.br",
    "https://energivia.com.br",
    "https://app.energivia.com",
    "http://localhost:3000",
    ...configuredUrls,
  ])
);

const PRESERVE_CLAIMS = ["https://energivia.com.br/role"];

export const auth0 = new Auth0Client({
  signInReturnToPath: "/painel",
  appBaseUrl,
  ...(audience ? { authorizationParameters: { audience, scope } } : {}),

  onCallback: async (error, ctx) => {
    if (error) {
      console.error("[auth0] Erro no callback de autenticação:", error.message || error);
      // Evita tela em branco crua com erro "The state parameter is invalid", redirecionando amigavelmente para login
      const fallbackUrl = new URL("/auth/login", ctx.appBaseUrl || "https://www.energivia.com.br");
      fallbackUrl.searchParams.set("error", "invalid_state");
      return NextResponse.redirect(fallbackUrl, 307);
    }
    const targetUrl = new URL(
      ctx.returnTo || "/painel",
      ctx.appBaseUrl || "https://www.energivia.com.br"
    );
    return NextResponse.redirect(targetUrl);
  },

  beforeSessionSaved: async (session) => {
    const original = session.user as unknown as Record<string, unknown>;
    const filtered = filterDefaultIdTokenClaims(original as never) as Record<string, unknown>;
    for (const claim of PRESERVE_CLAIMS) {
      if (original[claim] !== undefined) {
        filtered[claim] = original[claim];
      }
    }
    return { ...session, user: filtered as typeof session.user };
  },
});
