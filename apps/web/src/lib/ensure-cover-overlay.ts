import type { ProposalDocumentJson } from "@/components/proposals/editor/types";

const DEFAULT_BG = "#0B1220";

export function overlayOpacityPercentFromBackgroundHex(hex: string): number {
  const raw = hex.replace(/^#/, "").trim();
  let normalized = raw;
  if (raw.length === 3 && /^[0-9a-fA-F]{3}$/.test(raw)) {
    normalized = raw
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return 62;
  const n = Number.parseInt(normalized, 16);
  return 50 + (n % 26);
}

export function ensureCoverOverlayFromDocumentBackground(doc: ProposalDocumentJson): void {
  const bg = doc.styles.branding.backgroundColor?.trim() || DEFAULT_BG;
  const overlayPercent = overlayOpacityPercentFromBackgroundHex(bg);
  const cover = doc.sections.find((s) => s.type === "cover");
  if (cover) {
    cover.fields = {
      ...cover.fields,
      overlayColor: bg,
      overlayOpacity: overlayPercent,
    };
  }
  doc.styles.cover = {
    ...doc.styles.cover,
    overlayColor: bg,
    overlayOpacity: overlayPercent / 100,
  };
}
