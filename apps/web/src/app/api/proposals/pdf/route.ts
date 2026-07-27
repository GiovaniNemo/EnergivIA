import { NextResponse } from "next/server";
import puppeteerCore from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import {
  proposalPuppeteerPdfOptions,
  wrapProposalHtmlForPuppeteer,
  type ProposalPuppeteerBranding,
} from "@/lib/proposal-puppeteer-html";

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

  return puppeteerCore.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

export async function POST(request: Request): Promise<Response> {
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

    const browser = await getBrowser();
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 45_000 });
      const pdf = await page.pdf(proposalPuppeteerPdfOptions);
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
    const message = error instanceof Error ? error.message : "Failed to generate PDF";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
