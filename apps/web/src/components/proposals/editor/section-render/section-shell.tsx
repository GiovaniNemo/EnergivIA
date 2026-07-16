import type { CSSProperties, ReactNode } from "react";
import type { ProposalSection } from "../types";
import { SECTION_TYPES_OWN_TITLE } from "../section-fields";
import type { PreviewRenderVariables } from "./types";

interface SectionShellProps {
  section: ProposalSection;
  subtitleSize: number;
  vars: PreviewRenderVariables;
  defaults?: {
    textColor?: string;
    backgroundColor?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
  children: ReactNode;
}

function replaceVariablesServerSafe(html: string, values: Record<string, string | number>): string {
  return html.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
    const resolved = values[key.trim()];
    return resolved === undefined || resolved === null ? "" : String(resolved);
  });
}

type ResolvedAlignment = {
  horizontal: "left" | "center" | "right";
  vertical: "top" | "middle" | "bottom";
};

function resolveAlignment(value: unknown): ResolvedAlignment {
  const alignment = String(value ?? "left");
  switch (alignment) {
    case "left":
      return { horizontal: "left", vertical: "middle" };
    case "center":
      return { horizontal: "center", vertical: "middle" };
    case "right":
      return { horizontal: "right", vertical: "middle" };
    case "top-left":
      return { horizontal: "left", vertical: "top" };
    case "top-center":
      return { horizontal: "center", vertical: "top" };
    case "top-right":
      return { horizontal: "right", vertical: "top" };
    case "middle-left":
      return { horizontal: "left", vertical: "middle" };
    case "middle-center":
      return { horizontal: "center", vertical: "middle" };
    case "middle-right":
      return { horizontal: "right", vertical: "middle" };
    case "bottom-left":
      return { horizontal: "left", vertical: "bottom" };
    case "bottom-center":
      return { horizontal: "center", vertical: "bottom" };
    case "bottom-right":
      return { horizontal: "right", vertical: "bottom" };
    default:
      return { horizontal: "left", vertical: "middle" };
  }
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function resolveDisplayAssetUrl(value: string | undefined): string | undefined {
  if (!value) return value;
  const raw = value.trim();
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    const isPresignedPutUrl =
      parsed.searchParams.has("X-Amz-Algorithm") && parsed.searchParams.get("x-id") === "PutObject";
    if (!isPresignedPutUrl) return raw;
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return raw;
  }
}

function toOverlayOpacity(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  if (numeric > 1) return Math.max(0, Math.min(1, numeric / 100));
  return Math.max(0, Math.min(1, numeric));
}

function toSectionMinHeightPx(value: unknown): number {
  const numeric = Number(value);
  const safePercent = Number.isFinite(numeric) ? Math.max(100, Math.min(300, numeric)) : 100;
  const baseHeightPx = 250;
  return Math.round((baseHeightPx * safePercent) / 100);
}

function toRgbTriplet(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim();
  const hex = normalized.startsWith("#") ? normalized.slice(1) : normalized;
  const expanded =
    hex.length === 3
      ? hex
          .split("")
          .map((chunk) => `${chunk}${chunk}`)
          .join("")
      : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return undefined;
  const parsed = Number.parseInt(expanded, 16);
  const r = (parsed >> 16) & 255;
  const g = (parsed >> 8) & 255;
  const b = parsed & 255;
  return `${r} ${g} ${b}`;
}

export function SectionShell({
  section,
  subtitleSize,
  vars,
  defaults,
  children,
}: SectionShellProps): JSX.Element {
  const fields = section.fields as Record<string, unknown>;
  const sectionEyebrowRaw = toOptionalString(fields["sectionEyebrow"]);
  const sectionEyebrow = sectionEyebrowRaw
    ? replaceVariablesServerSafe(
        sectionEyebrowRaw,
        vars as unknown as Record<string, string>
      ).trim()
    : "";
  const contentTitleRaw = toOptionalString(fields["title"]);
  const contentTitle = contentTitleRaw
    ? replaceVariablesServerSafe(contentTitleRaw, vars as unknown as Record<string, string>).trim()
    : "";
  const resolvedAlignment = resolveAlignment(fields["alignment"]);
  const textAlignClass =
    resolvedAlignment.horizontal === "center"
      ? "text-center"
      : resolvedAlignment.horizontal === "right"
        ? "text-right"
        : "text-left";
  const itemsClass =
    resolvedAlignment.horizontal === "center"
      ? "items-center"
      : resolvedAlignment.horizontal === "right"
        ? "items-end"
        : "items-start";
  const justifyClass =
    resolvedAlignment.vertical === "top"
      ? "justify-start"
      : resolvedAlignment.vertical === "bottom"
        ? "justify-end"
        : "justify-center";
  const textColor = toOptionalString(fields["textColor"]) ?? toOptionalString(defaults?.textColor);
  const primaryColor = toOptionalString(defaults?.primaryColor);
  const secondaryColor = toOptionalString(defaults?.secondaryColor);
  const backgroundImage = resolveDisplayAssetUrl(toOptionalString(fields["backgroundImage"]));
  const backgroundColor =
    toOptionalString(fields["backgroundColor"]) ?? toOptionalString(defaults?.backgroundColor);
  const overlayColor = toOptionalString(fields["overlayColor"]);
  const overlayOpacity = overlayColor ? toOverlayOpacity(fields["overlayOpacity"]) : 0;
  const sectionMinHeightPx = toSectionMinHeightPx(fields["coverHeight"]);
  const showSectionDivider = Boolean(fields["showSectionDivider"]);
  const themeBackgroundRgb = toRgbTriplet(toOptionalString(defaults?.backgroundColor));
  const contentStyle: CSSProperties & Record<string, string> = textColor
    ? { color: textColor }
    : {};
  if (primaryColor) contentStyle["--preview-primary-color"] = primaryColor;
  if (secondaryColor) contentStyle["--preview-secondary-color"] = secondaryColor;
  if (themeBackgroundRgb) contentStyle["--preview-background-rgb"] = themeBackgroundRgb;

  return (
    <section
      className="relative rounded-xl"
      style={{
        minHeight: `${sectionMinHeightPx}px`,
        backgroundColor,
        ...(backgroundImage
          ? {
              backgroundImage: `url(${backgroundImage})`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }
          : {}),
      }}
    >
      {overlayColor && overlayOpacity > 0 ? (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: overlayColor, opacity: overlayOpacity }}
        />
      ) : null}

      <div
        className={`relative z-10 flex min-h-full flex-col px-4 py-3 ${itemsClass} ${justifyClass}`}
      >
        <div className={`w-full ${textAlignClass}`} style={contentStyle}>
          {sectionEyebrow ? (
            <p
              data-editor-field-path="sectionEyebrow"
              className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: primaryColor ?? textColor }}
            >
              {sectionEyebrow}
            </p>
          ) : null}
          {contentTitle && !SECTION_TYPES_OWN_TITLE.has(section.type) ? (
            <h3
              data-editor-field-path="title"
              className="font-semibold"
              style={{ fontSize: `${subtitleSize}px` }}
            >
              {contentTitle}
            </h3>
          ) : null}
          <div
            className={
              sectionEyebrow || (contentTitle && !SECTION_TYPES_OWN_TITLE.has(section.type))
                ? "mt-2"
                : undefined
            }
          >
            {children}
          </div>
        </div>
      </div>
      {showSectionDivider ? (
        <div
          className="pointer-events-none absolute left-1/2 z-20 w-28 border-t-2 opacity-95"
          style={{
            borderColor: `color-mix(in srgb, ${primaryColor ?? "#22c55e"} 75%, transparent)`,
            bottom: "-14px",
            transform: "translateX(-50%)",
          }}
          aria-hidden
        />
      ) : null}
    </section>
  );
}
