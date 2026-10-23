import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/api";
const AUTH0_AUDIENCE = process.env["AUTH0_AUDIENCE"];

export async function GET() {
  try {
    const session = await auth0.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let accessToken = "";
    if (AUTH0_AUDIENCE) {
      try {
        const result = await auth0.getAccessToken({ audience: AUTH0_AUDIENCE });
        accessToken = result.token;
      } catch {
        const idToken = (session as { tokenSet?: { idToken?: string } }).tokenSet?.idToken;
        accessToken = idToken ?? "";
      }
    } else {
      const idToken = (session as { tokenSet?: { idToken?: string } }).tokenSet?.idToken;
      accessToken = idToken ?? "";
    }

    const cleanBackendUrl = BACKEND_URL.replace(/\/$/, "");

    const res = await fetch(`${cleanBackendUrl}/users/admin/activation-status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
