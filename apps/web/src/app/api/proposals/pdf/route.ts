import { NextResponse } from "next/server";
import {
  wrapProposalHtmlForPuppeteer,
  type ProposalPuppeteerBranding,
} from "@/lib/proposal-puppeteer-html";
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

export async function POST(request: Request): Promise<Response> {
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
    console.warn("[api/proposals/pdf] Não foi possível obter Access Token via Auth0:", err);
  }

  try {
    const body = (await request.json()) as {
      title?: string;
      bodyHtml?: string;
      branding?: ProposalPuppeteerBranding;
      extraHeadHtml?: string;
    };
    const title = String(body.title ?? "proposta-solar").trim() || "proposta-solar";
    const safeFilename = toSafeAsciiFilename(title);
    const bodyHtml = String(body.bodyHtml ?? "").trim();
    const branding = body.branding;
    const extraHeadHtml = String(body.extraHeadHtml ?? "");
    if (!bodyHtml) {
      return NextResponse.json({ error: "Missing bodyHtml" }, { status: 400 });
    }
    if (!branding) {
      return NextResponse.json({ error: "Missing branding" }, { status: 400 });
    }
    const html = wrapProposalHtmlForPuppeteer({
      documentTitle: title,
      bodyHtml,
      branding,
      extraHeadHtml,
    });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/pdf",
    };
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const apiRes = await fetch(`${BACKEND_URL}/proposals/render-html-pdf`, {
      method: "POST",
      headers,
      body: JSON.stringify({ html, title }),
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
    outHeaders.set("Content-Disposition", `attachment; filename="${safeFilename}.pdf"`);
    outHeaders.set("Cache-Control", "no-store");

    return new NextResponse(apiRes.body, {
      status: 200,
      headers: outHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
