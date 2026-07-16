import { createHmac, randomUUID, timingSafeEqual } from "crypto";

const TOKEN_SECRET =
  process.env["THUMBNAIL_RENDER_SECRET"] ??
  process.env["AUTH0_SECRET"] ??
  "dev-thumbnail-render-secret";

export function encodeThumbnailPayload(payload: object): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeThumbnailPayload<T>(encoded: string): T | null {
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function signThumbnailPayload(encodedPayload: string): string {
  return createHmac("sha256", TOKEN_SECRET).update(encodedPayload).digest("base64url");
}

export function verifyThumbnailPayload(encodedPayload: string, signature: string): boolean {
  try {
    const expected = signThumbnailPayload(encodedPayload);
    const expectedBuf = Buffer.from(expected);
    const actualBuf = Buffer.from(signature);
    if (expectedBuf.length !== actualBuf.length) return false;
    return timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}

export function createThumbnailRenderSessionId(): string {
  return randomUUID();
}
