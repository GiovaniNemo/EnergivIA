import { Auth0Client, filterDefaultIdTokenClaims } from "@auth0/nextjs-auth0/server";

const audience = process.env["AUTH0_AUDIENCE"];
const scope = process.env["AUTH0_SCOPE"] ?? "openid profile email";

const rawBaseUrl = process.env["APP_BASE_URL"] || "http://localhost:3000";
const appBaseUrl: string | string[] = rawBaseUrl.includes(",")
  ? rawBaseUrl
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : rawBaseUrl;

const PRESERVE_CLAIMS = ["https://energivia.com.br/role"];

export const auth0 = new Auth0Client({
  signInReturnToPath: "/painel",
  appBaseUrl,
  ...(audience ? { authorizationParameters: { audience, scope } } : {}),

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
