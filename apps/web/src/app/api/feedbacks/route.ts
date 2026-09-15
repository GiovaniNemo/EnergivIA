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
      // Ignored if session is cookie-only
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Complementa dados do usuário logado se não vierem no body
    const payload = {
      ...body,
      userName: body.userName || sessionUser?.name,
      userEmail: body.userEmail || sessionUser?.email,
    };

    const res = await fetch(`${BACKEND_URL}/feedbacks`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, { status: 201 });
    }

    const errText = await res.text();
    console.error("Backend /feedbacks retornou erro:", res.status, errText);
    return NextResponse.json(
      { error: "Erro ao registrar feedback no servidor", details: errText },
      { status: res.status }
    );
  } catch (err: any) {
    console.error("Erro na rota /api/feedbacks:", err);
    return NextResponse.json(
      { error: "Erro interno ao processar feedback", message: err?.message },
      { status: 500 }
    );
  }
}

export async function GET() {
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
      // Ignored
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${BACKEND_URL}/feedbacks/summary`, {
      headers,
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (err) {
    console.error("Erro ao buscar resumo de feedbacks:", err);
  }

  return NextResponse.json({
    totalFeedbacks: 0,
    averageRating: 5.0,
    satisfactionRate: 100,
    starDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    channelDistribution: { web: 0, whatsapp: 0 },
    planDistribution: { trial: 0, paid: 0 },
    recentFeedbacks: [],
  });
}
