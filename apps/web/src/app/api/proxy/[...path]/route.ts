import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

const BACKEND_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/api";
const AUTH0_AUDIENCE = process.env["AUTH0_AUDIENCE"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, await params, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, await params, "POST");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, await params, "PATCH");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, await params, "PUT");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, await params, "DELETE");
}

async function proxy(request: NextRequest, params: { path: string[] }, method: string) {
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let accessToken: string;

  // Busca obrigatoriamente o Access Token (JWT de API)
  try {
    const result = await auth0.getAccessToken(
      AUTH0_AUDIENCE ? { audience: AUTH0_AUDIENCE } : undefined
    );

    if (!result?.token) {
      throw new Error("Token retornado está vazio");
    }

    accessToken = result.token;
  } catch (error) {
    console.error("Erro ao obter Access Token no Proxy:", error);
    return NextResponse.json(
      {
        error: "No access token for API",
        code: "ACCESS_TOKEN_UNAVAILABLE",
        hint: "Verifique se o AUTH0_AUDIENCE está configurado e faça Logout / Login para renovar a sessão.",
      },
      { status: 401 }
    );
  }

  const path = params.path?.join("/") ?? "";
  const url = new URL(path, `${BACKEND_URL}/`);
  request.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));

  const orgId =
    request.headers.get("x-organization-id") ??
    request.cookies.get("energivia-organization-id")?.value ??
    "";

  const isSseStream =
    (method === "GET" && path === "notifications/stream") ||
    (method === "POST" && path === "chat/messages/stream");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };

  if (method !== "GET") {
    headers["Content-Type"] = "application/json";
  }
  if (isSseStream) {
    headers["Accept"] = "text/event-stream";
  }
  if (orgId) headers["X-Organization-Id"] = orgId;

  const body = method !== "GET" ? await request.text() : undefined;
  const res = await fetch(url.toString(), { method, headers, body });

  if (isSseStream) {
    const contentType = res.headers.get("Content-Type") ?? "text/event-stream";
    const outHeaders = new Headers({
      "Content-Type": contentType,
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    const accel = res.headers.get("X-Accel-Buffering");
    if (accel) outHeaders.set("X-Accel-Buffering", accel);
    return new NextResponse(res.body, { status: res.status, headers: outHeaders });
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
