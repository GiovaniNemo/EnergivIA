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

interface SplitProps {
  content: CoverContent;
  style: Required<CoverStyle>;
  typography: CoverTypographySizes;
  topBranding?: ReactNode;
  contentBranding?: ReactNode;
  footerBranding?: ReactNode;
}

export function Split({
  content,
  style,
  typography,
  topBranding,
  contentBranding,
  footerBranding,
}: SplitProps): JSX.Element {
  const minHeightPx = Math.round(250 * (style.coverHeight / 100));
  const spacingScale = Math.max(1, Math.min(1.8, style.coverHeight / 100));
  const sidePaddingPx = Math.round(24 * spacingScale);
  const topPaddingPx = Math.max(8, Math.round(12 * spacingScale));
  const outerGapPx = Math.round(12 * spacingScale);
  const innerGapPx = Math.round(12 * spacingScale);
  const resolvedAlignment = resolveCoverAlignment(style.alignment);
  const textAlign =
    resolvedAlignment.horizontal === "center"
      ? "text-center items-center"
      : resolvedAlignment.horizontal === "right"
        ? "text-right items-end"
        : "text-left items-start";
  const justifyClass =
    resolvedAlignment.vertical === "top"
      ? "justify-start"
      : resolvedAlignment.vertical === "bottom"
        ? "justify-end"
        : "justify-center";
  const brandingAlignClass =
    resolvedAlignment.horizontal === "center"
      ? "mx-auto"
      : resolvedAlignment.horizontal === "right"
        ? "ml-auto"
        : "";
  const hasImage = Boolean(style.backgroundImage);

  return (
    <section
      className="grid min-h-[250px] gap-0 overflow-hidden md:grid-cols-2"
      style={{
        minHeight: `${minHeightPx}px`,
        backgroundColor: style.backgroundColor,
        color: style.textColor,
      }}
    >
      <div
        className={`flex flex-col ${textAlign}`}
        style={{
          gap: `${outerGapPx}px`,
          paddingTop: `${topPaddingPx}px`,
          paddingRight: `${sidePaddingPx}px`,
          paddingBottom: `${sidePaddingPx}px`,
          paddingLeft: `${sidePaddingPx}px`,
        }}
      >
        {topBranding ? <div className={brandingAlignClass}>{topBranding}</div> : null}
        <div
          className={`flex flex-1 flex-col ${justifyClass} ${textAlign}`}
          style={{ gap: `${innerGapPx}px` }}
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
        {footerBranding ? <div className="mt-auto w-full">{footerBranding}</div> : null}
      </div>
      <div
        className="relative min-h-[200px]"
        style={
          hasImage
            ? {
                backgroundImage: `url(${style.backgroundImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {
                backgroundColor: style.backgroundColor,
              }
        }
      >
        <div
          className="absolute inset-0"
          style={{ backgroundColor: style.overlayColor, opacity: style.overlayOpacity }}
        />
      </div>
    </section>
  );
}
