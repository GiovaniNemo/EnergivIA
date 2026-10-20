/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/api";
const AUTH0_AUDIENCE = process.env["AUTH0_AUDIENCE"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    let token = "";
    let sessionUser: any = null;
    try {
      const session = await auth0.getSession();
      if (session?.user) {
        sessionUser = session.user;
        const tokenResult = await auth0.getAccessToken(
          AUTH0_AUDIENCE ? { audience: AUTH0_AUDIENCE } : undefined
        );
        token = tokenResult?.token ?? "";
      }
    } catch {
      // Ignored if session is cookie-only or public
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
      body.tenantId ??
      "";
    if (orgId) {
      headers["x-organization-id"] = orgId;
    }

    // Preenche dados do usuário autenticado se não vierem no formulário
    const payload = {
      ...body,
      name: body.name || sessionUser?.name || "Integrador",
      email: body.email || sessionUser?.email,
      tenantId: orgId || body.tenantId || undefined,
    };

    const cleanBackendUrl = BACKEND_URL.replace(/\/$/, "");
    let res = await fetch(`${cleanBackendUrl}/support/tickets`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!res.ok && res.status === 404 && cleanBackendUrl.endsWith("/api")) {
      const fallbackUrl = cleanBackendUrl.replace(/\/api$/, "");
      res = await fetch(`${fallbackUrl}/support/tickets`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
      });
    }

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, { status: 201 });
    }

    const errText = await res.text();
    console.error("Backend /support/tickets retornou erro:", res.status, errText);
    return NextResponse.json(
      { error: "Erro ao registrar chamado no servidor", details: errText },
      { status: res.status }
    );
  } catch (err: any) {
    console.error("Erro na rota /api/support/tickets:", err);
    return NextResponse.json(
      { error: "Erro interno ao processar chamado", message: err?.message },
      { status: 500 }
    );
  }
}
