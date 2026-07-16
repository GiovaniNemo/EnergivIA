import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

const BACKEND_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/api";
const AUTH0_AUDIENCE = process.env["AUTH0_AUDIENCE"];

function isConnectionRefused(err: unknown): boolean {
  let cur: unknown = err;
  const seen = new Set<unknown>();
  for (let i = 0; i < 5 && cur && typeof cur === "object" && !seen.has(cur); i += 1) {
    seen.add(cur);
    const o = cur as Record<string, unknown>;
    if (o["code"] === "ECONNREFUSED") return true;
    if (typeof o["message"] === "string" && /ECONNREFUSED/i.test(o["message"])) return true;
    const errors = o["errors"];
    if (Array.isArray(errors)) {
      for (const sub of errors) {
        if (isConnectionRefused(sub)) return true;
      }
    }
    cur = o["cause"];
  }
  return false;
}

export async function GET(request: NextRequest) {
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let accessToken: string;
  if (AUTH0_AUDIENCE) {
    try {
      const result = await auth0.getAccessToken({ audience: AUTH0_AUDIENCE });
      accessToken = result.token;
    } catch {
      return NextResponse.json(
        {
          error: "No access token for API",
          code: "ACCESS_TOKEN_UNAVAILABLE",
          hint: "In Auth0, authorize your app for the API (User Access). Then log out and log in again.",
        },
        { status: 401 }
      );
    }
  } else {
    const idToken = (session as { tokenSet?: { idToken?: string } }).tokenSet?.idToken;
    if (!idToken) {
      return NextResponse.json(
        { error: "No ID token available", code: "ID_TOKEN_UNAVAILABLE" },
        { status: 503 }
      );
    }
    accessToken = idToken;
  }

  const orgId =
    request.headers.get("x-organization-id") ??
    request.cookies.get("energivia-organization-id")?.value ??
    new URL(request.url).searchParams.get("organizationId") ??
    "";

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  if (orgId) headers["X-Organization-Id"] = orgId;

  const url = `${BACKEND_URL.replace(/\/$/, "")}/auth/me`;
  let res: Response;
  let staleOrgCleared = false;
  try {
    res = await fetch(url, { headers });
    if (res.status === 401 && orgId) {
      res = await fetch(url, { headers: { Authorization: headers["Authorization"]! } });
      staleOrgCleared = res.ok;
    }
  } catch (e) {
    const isConnRefused = isConnectionRefused(e);
    return NextResponse.json(
      {
        error: "Backend API unreachable",
        code: isConnRefused ? "API_CONNECTION_REFUSED" : "API_FETCH_FAILED",
        hint: isConnRefused
          ? `Start the Nest API (e.g. pnpm --filter @energivia/api dev) so it listens on the same host as NEXT_PUBLIC_API_URL (${BACKEND_URL}).`
          : "Check NEXT_PUBLIC_API_URL and network; see server logs for details.",
        targetUrl: url,
      },
      { status: 503 }
    );
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }
  const response = NextResponse.json(data);
  if (staleOrgCleared) {
    response.cookies.set("energivia-organization-id", "", { maxAge: 0, path: "/" });
  }
  return response;
}
