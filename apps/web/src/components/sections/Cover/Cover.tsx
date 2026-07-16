"use client";

import { CardOverlay } from "./variants/CardOverlay";
import { FullImage } from "./variants/FullImage";
import { Minimal } from "./variants/Minimal";
import { Split } from "./variants/Split";
import { HeroCinematic } from "./variants/HeroCinematic";
import { EditorialPoster } from "./variants/EditorialPoster";
import { SplitEditorial } from "./variants/SplitEditorial";
import { GlassCard } from "./variants/GlassCard";
import { DataHero } from "./variants/DataHero";
import {
  type CoverContent,
  type CoverOrganization,
  type CoverStyle,
  type CoverTypographySizes,
  type CoverVariant,
  mergeCoverData,
  resolveCoverTypography,
} from "./cover-utils";
import type { JSX } from "react";

export type CoverProps = {
  variant: CoverVariant;
  content?: CoverContent;
  style?: CoverStyle;
  organization: CoverOrganization;
  typography?: CoverTypographySizes | null;
  showSectionDivider?: boolean;
};

function getBrandingAlignClasses(align: string | undefined): {
  item: string;
  text: string;
} {
  if (align === "center") {
    return { item: "self-center", text: "text-center" };
  }
  if (align === "right") {
    return { item: "self-end", text: "text-right" };
  }
  return { item: "self-start", text: "text-left" };
}

function coverLogoBoxMetrics(
  placement: "header" | "content" | "footer",
  sizePercent: number
): { heightPx: number; maxWidthPx: number } {
  const s = sizePercent / 100;
  switch (placement) {
    case "header":
      return { heightPx: Math.round(40 * s), maxWidthPx: Math.round(160 * s) };
    case "content":
      return { heightPx: Math.round(32 * s), maxWidthPx: Math.round(130 * s) };
    default:
      return { heightPx: Math.round(28 * s), maxWidthPx: Math.round(120 * s) };
  }
}

function normalizeVariant(variant: string): CoverVariant {
  if (
    variant === "full-image" ||
    variant === "split" ||
    variant === "minimal" ||
    variant === "card-overlay" ||
    variant === "hero-cinematic" ||
    variant === "editorial-poster" ||
    variant === "split-editorial" ||
    variant === "glass-card" ||
    variant === "data-hero"
  ) {
    return variant;
  }
  if (variant === "default") return "hero-cinematic";
  return "hero-cinematic";
}

export function Cover({
  variant,
  content,
  style,
  organization,
  typography,
  showSectionDivider = false,
}: CoverProps): JSX.Element {
  const merged = mergeCoverData({ content, style }, organization);
  const resolvedTypography = resolveCoverTypography(typography);
  const resolvedVariant = normalizeVariant(variant);
  const resolvedStyle =
    resolvedVariant === "minimal"
      ? {
          ...merged.style,
          backgroundImage: "",
        }
      : merged.style;

  const headerLogo =
    merged.content.showLogo && merged.content.logoPlacement === "header" ? merged.content.logo : "";
  const headerCompanyName =
    merged.content.showCompanyName && merged.content.companyNamePlacement === "header"
      ? merged.content.companyName
      : "";
  const contentLogo =
    merged.content.showLogo && merged.content.logoPlacement === "content"
      ? merged.content.logo
      : "";
  const contentCompanyName =
    merged.content.showCompanyName && merged.content.companyNamePlacement === "content"
      ? merged.content.companyName
      : "";
  const footerLogo =
    merged.content.showLogo && merged.content.logoPlacement === "footer" ? merged.content.logo : "";
  const footerCompanyName =
    merged.content.showCompanyName && merged.content.companyNamePlacement === "footer"
      ? merged.content.companyName
      : "";
  const companyAlign = getBrandingAlignClasses(merged.content.companyNameAlign);
  const logoAlign = getBrandingAlignClasses(merged.content.logoAlign);
  const logoSizePct = merged.content.logoSize ?? 100;

  const pc = organization.primaryColor ?? "#22c55e";

  const renderVariant = (): JSX.Element => {
    if (resolvedVariant === "full-image") {
      return (
        <FullImage
          content={merged.content}
          style={resolvedStyle}
          typography={resolvedTypography}
          topBranding={headerBranding}
          contentBranding={contentBranding}
          footerBranding={footerBranding}
        />
      );
    }
    if (resolvedVariant === "split") {
      return (
        <Split
          content={merged.content}
          style={resolvedStyle}
          typography={resolvedTypography}
          topBranding={headerBranding}
          contentBranding={contentBranding}
          footerBranding={footerBranding}
        />
      );
    }
    if (resolvedVariant === "minimal") {
      return (
        <Minimal
          content={merged.content}
          style={resolvedStyle}
          typography={resolvedTypography}
          topBranding={headerBranding}
          contentBranding={contentBranding}
          footerBranding={footerBranding}
        />
      );
    }
    if (resolvedVariant === "hero-cinematic") {
      return (
        <HeroCinematic
          content={merged.content}
          style={resolvedStyle}
          typography={resolvedTypography}
          topBranding={headerBranding}
          footerBranding={footerBranding}
          primaryColor={pc}
        />
      );
    }
    if (resolvedVariant === "editorial-poster") {
      return (
        <EditorialPoster
          content={merged.content}
          style={resolvedStyle}
          typography={resolvedTypography}
          topBranding={headerBranding}
          footerBranding={footerBranding}
          primaryColor={pc}
        />
      );
    }
    if (resolvedVariant === "split-editorial") {
      return (
        <SplitEditorial
          content={merged.content}
          style={resolvedStyle}
          typography={resolvedTypography}
          topBranding={headerBranding}
          footerBranding={footerBranding}
          primaryColor={pc}
        />
      );
    }
    if (resolvedVariant === "glass-card") {
      return (
        <GlassCard
          content={merged.content}
          style={resolvedStyle}
          typography={resolvedTypography}
          topBranding={headerBranding}
          footerBranding={footerBranding}
          primaryColor={pc}
        />
      );
    }
    if (resolvedVariant === "data-hero") {
      return (
        <DataHero
          content={merged.content}
          style={resolvedStyle}
          typography={resolvedTypography}
          topBranding={headerBranding}
          footerBranding={footerBranding}
          primaryColor={pc}
        />
      );
    }
    return (
      <CardOverlay
        content={merged.content}
        style={resolvedStyle}
        typography={resolvedTypography}
        topBranding={headerBranding}
        contentBranding={contentBranding}
        footerBranding={footerBranding}
      />
    );
  };

  const headerLogoMetrics = coverLogoBoxMetrics("header", logoSizePct);

  const headerBranding =
    headerLogo || headerCompanyName ? (
      <div className="flex min-h-10 w-full flex-col gap-2">
        {headerLogo ? (
          <img
            data-editor-field-path="logo"
            src={headerLogo}
            alt="Logo da organização"
            style={{
              height: headerLogoMetrics.heightPx,
              maxWidth: headerLogoMetrics.maxWidthPx,
              width: "auto",
            }}
            className={`rounded object-contain ${logoAlign.item}`}
          />
        ) : null}
        {headerCompanyName ? (
          <p
            data-editor-field-path="showCompanyName"
            className={`text-sm font-semibold text-white/90 ${companyAlign.item} ${companyAlign.text}`}
          >
            {headerCompanyName}
          </p>
        ) : null}
      </div>
    ) : null;

  const contentLogoMetrics = coverLogoBoxMetrics("content", logoSizePct);

  const contentBranding =
    contentLogo || contentCompanyName ? (
      <div className="flex w-full flex-col gap-2 rounded-xl border border-white/15 bg-black/30 px-3 py-2 backdrop-blur-md">
        {contentLogo ? (
          <img
            data-editor-field-path="logo"
            src={contentLogo}
            alt="Logo da organização"
            style={{
              height: contentLogoMetrics.heightPx,
              maxWidth: contentLogoMetrics.maxWidthPx,
              width: "auto",
            }}
            className={`rounded object-contain ${logoAlign.item}`}
          />
        ) : null}
        {contentCompanyName ? (
          <p
            data-editor-field-path="showCompanyName"
            className={`text-xs font-semibold text-white/90 ${companyAlign.item} ${companyAlign.text}`}
          >
            {contentCompanyName}
          </p>
        ) : null}
      </div>
    ) : null;
  const footerLogoMetrics = coverLogoBoxMetrics("footer", logoSizePct);

  const footerBranding =
    footerLogo || footerCompanyName ? (
      <div className="flex w-full flex-col gap-2 pt-2">
        {footerLogo ? (
          <img
            data-editor-field-path="logo"
            src={footerLogo}
            alt="Logo da organização"
            style={{
              height: footerLogoMetrics.heightPx,
              maxWidth: footerLogoMetrics.maxWidthPx,
              width: "auto",
            }}
            className={`rounded object-contain ${logoAlign.item}`}
          />
        ) : null}
        {footerCompanyName ? (
          <p
            data-editor-field-path="showCompanyName"
            className={`text-xs font-semibold text-white/85 ${companyAlign.item} ${companyAlign.text}`}
          >
            {footerCompanyName}
          </p>
        ) : null}
      </div>
    ) : null;

  return (
    <div className="relative">
      <div className="relative">{renderVariant()}</div>
      {showSectionDivider ? (
        <div
          className="pointer-events-none absolute left-1/2 z-20 w-28 border-t-2 opacity-95"
          style={{
            borderColor: `color-mix(in srgb, ${organization.primaryColor ?? "#22c55e"} 75%, transparent)`,
            bottom: "-14px",
            transform: "translateX(-50%)",
          }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
