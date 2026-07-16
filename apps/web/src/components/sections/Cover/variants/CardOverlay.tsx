"use client";

import {
  COVER_SUBTITLE_RICH_CLASS,
  coverHighlightFontPx,
  coverSubtitleRichCssVars,
  resolveCoverAlignment,
  type CoverContent,
  type CoverStyle,
  type CoverTypographySizes,
} from "../cover-utils";
import type { ReactNode } from "react";

interface CardOverlayProps {
  content: CoverContent;
  style: Required<CoverStyle>;
  typography: CoverTypographySizes;
  topBranding?: ReactNode;
  contentBranding?: ReactNode;
  footerBranding?: ReactNode;
}

function toCardBackgroundColor(color: string): string {
  const normalized = color.trim();
  const hex = normalized.startsWith("#") ? normalized.slice(1) : normalized;
  const expanded =
    hex.length === 3
      ? hex
          .split("")
          .map((chunk) => `${chunk}${chunk}`)
          .join("")
      : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return normalized;
  const value = Number.parseInt(expanded, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, 0.70)`;
}

export function CardOverlay({
  content,
  style,
  typography,
  topBranding,
  contentBranding,
  footerBranding,
}: CardOverlayProps): JSX.Element {
  const minHeightPx = Math.round(250 * (style.coverHeight / 100));
  const spacingScale = Math.max(1, Math.min(1.8, style.coverHeight / 100));
  const sectionPaddingPx = Math.round(20 * spacingScale);
  const cardPaddingPx = Math.round(20 * spacingScale);
  const cardGapPx = Math.round(8 * spacingScale);
  const resolvedAlignment = resolveCoverAlignment(style.alignment);
  const alignClass =
    resolvedAlignment.horizontal === "center"
      ? "items-center text-center"
      : resolvedAlignment.horizontal === "right"
        ? "items-end text-right"
        : "items-start text-left";
  const verticalClass =
    resolvedAlignment.vertical === "top"
      ? "items-start"
      : resolvedAlignment.vertical === "bottom"
        ? "items-end"
        : "items-center";
  const brandingAlignClass =
    resolvedAlignment.horizontal === "center"
      ? "mx-auto"
      : resolvedAlignment.horizontal === "right"
        ? "ml-auto"
        : "";
  const placementClass = `${verticalClass} ${
    resolvedAlignment.horizontal === "center"
      ? "justify-items-center"
      : resolvedAlignment.horizontal === "right"
        ? "justify-items-end"
        : "justify-items-start"
  }`;
  const hasBackgroundImage = Boolean(style.backgroundImage);

  return (
    <section
      className="relative flex min-h-[250px] flex-col overflow-hidden"
      style={{
        minHeight: `${minHeightPx}px`,
        backgroundColor: style.backgroundColor,
        ...(hasBackgroundImage ? { backgroundImage: `url(${style.backgroundImage})` } : {}),
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor: style.overlayColor, opacity: style.overlayOpacity }}
      />
      {topBranding ? (
        <div className="absolute inset-x-0 top-0 z-20" style={{ padding: `${sectionPaddingPx}px` }}>
          {topBranding}
        </div>
      ) : null}
      {footerBranding ? (
        <div
          className="absolute inset-x-0 bottom-0 z-20"
          style={{ padding: `${sectionPaddingPx}px` }}
        >
          {footerBranding}
        </div>
      ) : null}
      <div
        className={`absolute inset-0 z-10 grid ${placementClass}`}
        style={{ padding: `${sectionPaddingPx}px` }}
      >
        <div
          className={`flex w-[min(100%,640px)] flex-col rounded-2xl border border-white/15 backdrop-blur-md ${alignClass}`}
          style={{
            color: style.textColor,
            backgroundColor: toCardBackgroundColor(style.backgroundColor),
            padding: `${cardPaddingPx}px`,
            gap: `${cardGapPx}px`,
          }}
        >
          {contentBranding ? <div className={brandingAlignClass}>{contentBranding}</div> : null}
          {content.highlight ? (
            <span
              data-editor-field-path="highlight"
              className="w-fit rounded-full bg-white/15 px-3 py-1 font-semibold"
              style={{ fontSize: `${coverHighlightFontPx(typography)}px` }}
            >
              {content.highlight}
            </span>
          ) : null}
          {content.title ? (
            <h2
              data-editor-field-path="title"
              className="font-semibold leading-tight"
              style={{ fontSize: `${typography.titleSize}px` }}
            >
              {content.title}
            </h2>
          ) : null}
          {content.subtitle ? (
            <div
              data-editor-field-path="subtitle"
              className={COVER_SUBTITLE_RICH_CLASS}
              style={{
                fontSize: `${typography.bodySize}px`,
                ...coverSubtitleRichCssVars(typography),
              }}
              dangerouslySetInnerHTML={{ __html: content.subtitle }}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
