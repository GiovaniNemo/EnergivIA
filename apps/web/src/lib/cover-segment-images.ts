export const FALLBACK_COVER_IMAGE_URL = "/cover-segments/_default/fallback.svg";

export async function resolveCoverImageUrlForOnboarding(
  segmentId: string,
  salt: string
): Promise<string> {
  const params = new URLSearchParams({ segment: segmentId, salt });
  try {
    const res = await fetch(`/api/cover-segments/pick?${params.toString()}`);
    if (!res.ok) return FALLBACK_COVER_IMAGE_URL;
    const data = (await res.json()) as { url?: string | null };
    const url = typeof data.url === "string" ? data.url.trim() : "";
    if (url.startsWith("/")) return url;
    return FALLBACK_COVER_IMAGE_URL;
  } catch {
    return FALLBACK_COVER_IMAGE_URL;
  }
}
