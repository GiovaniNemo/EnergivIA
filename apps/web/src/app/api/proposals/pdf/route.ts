import puppeteer from "puppeteer";
import { NextResponse } from "next/server";
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

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0", timeout: 45_000 });
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
