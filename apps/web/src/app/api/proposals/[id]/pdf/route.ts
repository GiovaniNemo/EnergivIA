import { NextRequest, NextResponse } from "next/server";
import puppeteerCore from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import {
  wrapProposalHtmlForPuppeteer,
  proposalPuppeteerPdfOptions,
} from "@/lib/proposal-puppeteer-html";
import { templateConfigToPreviewDocument } from "@/lib/proposal-template-document";
import { mergePublicProposalVariables } from "@/lib/public-proposal-variables";
import type { PublicProposalPayload } from "@/lib/public-proposals-api";
import { auth0 } from "@/lib/auth0";
import { PreviewDocument } from "@/components/proposals/editor/preview-document";
import React from "react";

const BACKEND_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/api";

async function getBrowser() {
  const isLocal =
    process.env.NODE_ENV === "development" ||
    process.platform === "win32" ||
    process.platform === "darwin";

  if (isLocal) {
    const puppeteer = await import("puppeteer");
    return puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  const CHROMIUM_URL =
    "https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar";
  const executablePath = await chromium.executablePath(CHROMIUM_URL);
  return puppeteerCore.launch({
    args: chromium.args,
    executablePath,
    headless: true,
  });
}

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
  _request: NextRequest,
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

  try {
    const apiUrl = `${BACKEND_URL}/public/proposals/${id}`;
    const apiResponse = await fetch(apiUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!apiResponse.ok) {
      const err = await apiResponse.json().catch(() => ({})) as { message?: string };
      return NextResponse.json(
        { error: err.message ?? `Proposta não encontrada (HTTP ${apiResponse.status})` },
        { status: apiResponse.status }
      );
    }

    const payload = (await apiResponse.json()) as PublicProposalPayload;

    if (!payload.proposalTemplate?.config) {
      return NextResponse.json(
        { error: "Proposta sem template configurado." },
        { status: 400 }
      );
    }

    const documentState = templateConfigToPreviewDocument(payload.proposalTemplate.config);
    const mergedVariables = mergePublicProposalVariables(documentState.variables, payload);
    documentState.variables = mergedVariables;

    const editorStyles = payload.proposalTemplate?.config?.editor?.styles as Record<string, unknown> | undefined;
    const branding = editorStyles?.["branding"] as {
      primaryColor?: string;
      secondaryColor?: string;
      backgroundColor?: string;
      textColor?: string;
      fontFamily?: string;
    } | undefined;

    const ReactDomServer = await import("react-dom/server");
    const bodyHtml = ReactDomServer.renderToStaticMarkup(
      React.createElement(PreviewDocument, {
        title: payload.title ?? "Proposta Solar",
        documentState,
        mode: "pdf",
        publicLayout: false,
      })
    );

    const html = wrapProposalHtmlForPuppeteer({
      documentTitle: payload.title ?? "Proposta Solar",
      bodyHtml,
      branding: {
        primaryColor: branding?.primaryColor ?? "#059669",
        secondaryColor: branding?.secondaryColor ?? "#047857",
        backgroundColor: branding?.backgroundColor ?? "#ffffff",
        textColor: branding?.textColor ?? "#0f172a",
        fontFamily: branding?.fontFamily,
      },
      extraHeadHtml: `<script src="https://cdn.tailwindcss.com"></script>`
    });

    const browser = await getBrowser();
    try {
      const page = await browser.newPage();

      await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 45_000 });
      // Wait for Tailwind CDN to finish loading
      await page.waitForNetworkIdle({ timeout: 15_000 }).catch(() => { });
      const pdf = await page.pdf(proposalPuppeteerPdfOptions);

      const safeFilename = toSafeAsciiFilename(payload.title ?? "proposta-solar");

      return new Response(Buffer.from(pdf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${safeFilename}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("[api/proposals/[id]/pdf] Erro:", error);
    const message = error instanceof Error ? error.message : "Falha ao gerar PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
