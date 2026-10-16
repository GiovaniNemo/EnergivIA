import { NextResponse, NextRequest } from "next/server";
import type { ProposalDocumentJson } from "@/components/proposals/editor/types";
import { createThumbnailRenderSessionId, signThumbnailPayload } from "@/lib/thumbnail-render-token";
import { setThumbnailRenderSession } from "@/lib/thumbnail-render-store";
import { auth0 } from "@/lib/auth0";

const BACKEND_URL = (process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/api").replace(
  /\/$/,
  ""
);
const AUTH0_AUDIENCE = process.env["AUTH0_AUDIENCE"];

export async function POST(request: NextRequest): Promise<Response> {
  const session = await auth0.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let accessToken = "";
  try {
    const result = await auth0.getAccessToken(
      AUTH0_AUDIENCE ? { audience: AUTH0_AUDIENCE } : undefined
    );
    accessToken = result?.token ?? "";
  } catch (err) {
    console.warn("[thumbnail-api] Não foi possível obter Access Token via Auth0:", err);
  }

  try {
    const body = (await request.json()) as {
      title?: string;
      documentState?: ProposalDocumentJson;
    };
    const title = String(body.title ?? "template-preview").trim() || "template-preview";
    const documentState = body.documentState;
    if (!documentState) {
      console.error("[thumbnail-api] missing documentState");
      return NextResponse.json({ error: "Missing documentState" }, { status: 400 });
    }
    const sessionId = createThumbnailRenderSessionId();
    console.info("[thumbnail-api] creating render session", {
      sessionId,
      titleLength: title.length,
      sectionCount: documentState.sections?.length ?? 0,
    });
    setThumbnailRenderSession(sessionId, {
      title,
      documentState,
    });
    const sig = signThumbnailPayload(sessionId);
    const requestUrl = new URL(request.url);
    const baseUrl =
      process.env["NEXT_PUBLIC_APP_URL"] || process.env["APP_BASE_URL"] || requestUrl.origin;
    const renderUrl = new URL("/internal/template-thumbnail", baseUrl);
    renderUrl.searchParams.set("id", sessionId);
    renderUrl.searchParams.set("sig", sig);
    console.info("[thumbnail-api] render URL prepared, dispatching to NestJS API", {
      sessionId,
      baseUrl,
      renderPath: renderUrl.pathname,
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const apiRes = await fetch(`${BACKEND_URL}/proposals/render-thumbnail`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        url: renderUrl.toString(),
        selector: "[data-preview-capture-target='true']",
      }),
    });

    if (!apiRes.ok) {
      const err = (await apiRes.json().catch(() => ({}))) as { message?: string };
      throw new Error(err.message || `Erro da API ao renderizar thumbnail (HTTP ${apiRes.status})`);
    }

    const result = (await apiRes.json()) as { dataUrl: string };
    console.info("[thumbnail-api] screenshot success via API", {
      sessionId,
      dataUrlLength: result.dataUrl?.length ?? 0,
    });

    return NextResponse.json({ dataUrl: result.dataUrl }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate thumbnail";
    console.error("[thumbnail-api] failed", {
      errorMessage: message,
      error: error instanceof Error ? error.stack : error,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
