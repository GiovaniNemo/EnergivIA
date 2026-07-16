import puppeteer from "puppeteer";
import { NextResponse } from "next/server";
import type { ProposalDocumentJson } from "@/components/proposals/editor/types";
import { createThumbnailRenderSessionId, signThumbnailPayload } from "@/lib/thumbnail-render-token";
import { setThumbnailRenderSession } from "@/lib/thumbnail-render-store";

export async function POST(request: Request): Promise<Response> {
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
    const baseUrl = process.env["APP_BASE_URL"] || requestUrl.origin;
    const renderUrl = new URL("/internal/template-thumbnail", baseUrl);
    renderUrl.searchParams.set("id", sessionId);
    renderUrl.searchParams.set("sig", sig);
    console.info("[thumbnail-api] render URL prepared", {
      sessionId,
      baseUrl,
      renderPath: renderUrl.pathname,
      hasSignature: Boolean(sig),
    });

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 1800, deviceScaleFactor: 1 });
      console.info("[thumbnail-api] puppeteer goto", { sessionId, url: renderUrl.toString() });
      await page.goto(renderUrl.toString(), { waitUntil: "networkidle0", timeout: 45_000 });
      console.info("[thumbnail-api] waiting capture selector", { sessionId });
      await page.waitForSelector("[data-preview-capture-target='true']", { timeout: 15_000 });
      const captureElement = await page.$("[data-preview-capture-target='true']");
      if (!captureElement) {
        console.error("[thumbnail-api] capture selector missing after wait", { sessionId });
        return NextResponse.json({ error: "Missing capture target in HTML" }, { status: 422 });
      }
      const box = await captureElement.boundingBox();
      if (!box) {
        console.error("[thumbnail-api] missing capture bounding box", { sessionId });
        return NextResponse.json({ error: "Missing capture bounding box" }, { status: 422 });
      }
      const a4Ratio = Math.sqrt(2);
      const clipHeight = Math.min(box.height, box.width * a4Ratio);
      const imageBuffer = (await page.screenshot({
        type: "jpeg",
        quality: 75,
        clip: {
          x: Math.max(0, box.x),
          y: Math.max(0, box.y),
          width: Math.max(1, box.width),
          height: Math.max(1, clipHeight),
        },
      })) as Buffer;
      const dataUrl = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;
      console.info("[thumbnail-api] screenshot success", {
        sessionId,
        bytes: imageBuffer.length,
        dataUrlLength: dataUrl.length,
        clip: {
          width: Math.round(box.width),
          height: Math.round(clipHeight),
        },
      });
      return NextResponse.json({ dataUrl }, { status: 200 });
    } finally {
      await browser.close();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate thumbnail";
    console.error("[thumbnail-api] failed", {
      errorMessage: message,
      error: error instanceof Error ? error.stack : error,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
