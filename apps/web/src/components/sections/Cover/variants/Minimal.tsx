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

interface MinimalProps {
  content: CoverContent;
  style: Required<CoverStyle>;
  typography: CoverTypographySizes;
  topBranding?: ReactNode;
  contentBranding?: ReactNode;
  footerBranding?: ReactNode;
}

export function Minimal({
  content,
  style,
  typography,
  topBranding,
  contentBranding,
  footerBranding,
}: MinimalProps): JSX.Element {
  const minHeightPx = Math.round(200 * (style.coverHeight / 100));
  const spacingScale = Math.max(1, Math.min(1.8, style.coverHeight / 100));
  const sectionPaddingPx = Math.round(24 * spacingScale);
  const contentGapPx = Math.round(12 * spacingScale);
  const resolvedAlignment = resolveCoverAlignment(style.alignment);
  const textAlign =
    resolvedAlignment.horizontal === "center"
      ? "text-center items-center"
      : resolvedAlignment.horizontal === "right"
        ? "text-right items-end"
        : "text-left items-start";
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

  return (
    <section
      className="relative flex min-h-[200px] flex-col overflow-hidden"
      style={{
        minHeight: `${minHeightPx}px`,
        backgroundColor: style.backgroundColor,
        color: style.textColor,
      }}
    >
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
          className={`flex w-[min(100%,640px)] flex-col ${textAlign}`}
          style={{ gap: `${contentGapPx}px` }}
        >
          {contentBranding ? <div className={brandingAlignClass}>{contentBranding}</div> : null}
          {content.highlight ? (
            <span
              data-editor-field-path="highlight"
              className="w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 font-semibold"
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
              className={`${COVER_SUBTITLE_RICH_CLASS} opacity-90`}
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
