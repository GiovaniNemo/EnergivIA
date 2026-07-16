import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ error: "Missing url query param" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (!/^https?:$/.test(parsed.protocol) || isBlockedHostname(parsed.hostname)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 400 });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      method: "GET",
      cache: "force-cache",
      redirect: "follow",
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Failed to fetch source image" },
        { status: upstream.status }
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    const contentLength = upstream.headers.get("content-length");
    const cacheControl =
      upstream.headers.get("cache-control") ??
      "public, max-age=86400, stale-while-revalidate=604800";
    const body = await upstream.arrayBuffer();
    const response = new NextResponse(body, { status: 200 });
    response.headers.set("Content-Type", contentType);
    response.headers.set("Cache-Control", cacheControl);
    if (contentLength) response.headers.set("Content-Length", contentLength);
    return response;
  } catch {
    return NextResponse.json({ error: "Failed to fetch source image" }, { status: 502 });
  }
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) return true;
  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local")
  ) {
    return true;
  }

  if (isPrivateIPv4(normalized)) return true;
  if (isPrivateIPv6(normalized)) return true;
  return false;
}

function isPrivateIPv4(value: string): boolean {
  const parts = value.split(".");
  if (parts.length !== 4) return false;
  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) return false;
  const a = octets[0] ?? -1;
  const b = octets[1] ?? -1;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isPrivateIPv6(value: string): boolean {
  const normalized = value.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80")) return true;
  return false;
}
