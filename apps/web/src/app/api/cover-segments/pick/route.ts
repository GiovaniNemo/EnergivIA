import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif|svg)$/i;

const SAFE_SEGMENT = /^[a-z0-9_-]{1,64}$/;

function listImageFiles(dir: string): string[] {
  try {
    const names = fs.readdirSync(dir);
    return names
      .filter((n) => IMAGE_EXT.test(n) && !n.startsWith("."))
      .sort((a, b) => a.localeCompare(b, "en"));
  } catch {
    return [];
  }
}

function stablePickIndex(length: number, salt: string): number {
  if (length <= 0) return 0;
  let h = 2166136261;
  for (let i = 0; i < salt.length; i += 1) {
    h ^= salt.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % length;
}

function toPublicUrl(absoluteDir: string, fileName: string): string {
  const publicRoot = path.join(process.cwd(), "public");
  const rel = path.relative(publicRoot, path.join(absoluteDir, fileName));
  return `/${rel.split(path.sep).join("/")}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const segment = request.nextUrl.searchParams.get("segment")?.trim().toLowerCase() ?? "";
  const salt = request.nextUrl.searchParams.get("salt")?.trim() ?? "";

  if (!segment || !SAFE_SEGMENT.test(segment)) {
    return NextResponse.json({ error: "Parâmetro segment inválido." }, { status: 400 });
  }

  const root = path.join(process.cwd(), "public", "cover-segments");
  const segmentDir = path.join(root, segment);
  let files = listImageFiles(segmentDir);

  if (files.length === 0) {
    const fallbackDir = path.join(root, "_default");
    files = listImageFiles(fallbackDir);
    if (files.length > 0) {
      const idx = stablePickIndex(files.length, `${salt}:_default`);
      const chosen = files[idx];
      if (chosen) {
        return NextResponse.json({ url: toPublicUrl(fallbackDir, chosen), segment: "_default" });
      }
    }
    return NextResponse.json({
      url: "/cover-segments/_default/fallback.svg",
      segment: "_default",
      fallback: true,
    });
  }

  const idx = stablePickIndex(files.length, `${salt}:${segment}`);
  const chosen = files[idx];
  if (!chosen) {
    return NextResponse.json({
      url: "/cover-segments/_default/fallback.svg",
      segment: "_default",
      fallback: true,
    });
  }
  return NextResponse.json({ url: toPublicUrl(segmentDir, chosen), segment });
}
