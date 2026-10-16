import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

const BACKEND_URL = (process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/api").replace(
  /\/$/,
  ""
);
const AUTH0_AUDIENCE = process.env["AUTH0_AUDIENCE"];

function toSafeAsciiFilename(raw: string): string {
  const normalized = raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "");
  return normalized.toLowerCase() || "proposta-solar";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing proposal id" }, { status: 400 });
  }

  let accessToken = "";
  try {
    const result = await auth0.getAccessToken(
      AUTH0_AUDIENCE ? { audience: AUTH0_AUDIENCE } : undefined
    );
    accessToken = result?.token ?? "";
  } catch (err) {
    console.warn("[api/proposals/[id]/pdf] Não foi possível obter Access Token via Auth0:", err);
  }

  const orgId =
    request.headers.get("x-organization-id") ??
    request.cookies.get("energivia-organization-id")?.value ??
    "";

  try {
    const headers: Record<string, string> = {
      Accept: "application/pdf",
    };
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
    if (orgId) {
      headers["x-organization-id"] = orgId;
    }

    const apiUrl = `${BACKEND_URL}/proposals/${encodeURIComponent(id)}/generate-pdf`;
    const apiRes = await fetch(apiUrl, {
      method: "GET",
      headers,
    });

    if (!apiRes.ok) {
      let errMsg = `Falha ao gerar PDF na API (HTTP ${apiRes.status})`;
      try {
        const json = (await apiRes.json()) as { message?: string; error?: string };
        if (json?.message) errMsg = json.message;
        else if (json?.error) errMsg = json.error;
      } catch {
        const text = await apiRes.text().catch(() => "");
        if (text) errMsg = text;
      }
      return NextResponse.json({ error: errMsg }, { status: apiRes.status });
    }

    const outHeaders = new Headers(apiRes.headers);
    outHeaders.delete("content-encoding");
    outHeaders.delete("content-length");
    outHeaders.set("Content-Type", "application/pdf");
    outHeaders.set("Cache-Control", "no-store");

    if (!outHeaders.has("Content-Disposition")) {
      outHeaders.set(
        "Content-Disposition",
        `attachment; filename="${toSafeAsciiFilename(id)}.pdf"`
      );
    }

    return new NextResponse(apiRes.body, {
      status: 200,
      headers: outHeaders,
    });
  } catch (error) {
    console.error("[api/proposals/[id]/pdf] Erro ao delegar PDF para API:", error);
    const message = error instanceof Error ? error.message : "Falha ao gerar PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
