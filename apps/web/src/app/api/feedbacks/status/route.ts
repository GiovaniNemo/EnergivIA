/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/api";
const AUTH0_AUDIENCE = process.env["AUTH0_AUDIENCE"];

export async function GET(request: NextRequest) {
  try {
    let token = "";
    try {
      const session = await auth0.getSession();
      if (session?.user) {
        const tokenResult = await auth0.getAccessToken(
          AUTH0_AUDIENCE ? { audience: AUTH0_AUDIENCE } : undefined
        );
        token = tokenResult?.token ?? "";
      }
    } catch {
      // Ignorado se sessão sem token
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const orgId =
      request.headers.get("x-organization-id") ??
      request.cookies.get("energivia-organization-id")?.value ??
      "";
    if (orgId) {
      headers["x-organization-id"] = orgId;
    }

    const cleanBackendUrl = BACKEND_URL.replace(/\/$/, "");
    let res = await fetch(`${cleanBackendUrl}/feedbacks/status`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!res.ok && res.status === 404 && cleanBackendUrl.endsWith("/api")) {
      const fallbackUrl = cleanBackendUrl.replace(/\/api$/, "");
      res = await fetch(`${fallbackUrl}/feedbacks/status`, {
        method: "GET",
        headers,
        cache: "no-store",
      });
    }

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ hasSubmitted: false });
  } catch (err: any) {
    console.error("Erro ao consultar status de feedback:", err);
    return NextResponse.json({ hasSubmitted: false });
  }
}
