"use client";

import type { CSSProperties } from "react";

export type CoverVariant =
  | "full-image"
  | "split"
  | "minimal"
  | "card-overlay"
  | "hero-cinematic"
  | "editorial-poster"
  | "split-editorial"
  | "glass-card"
  | "data-hero";
export type CoverAlignment =
  | "left"
  | "center"
  | "right"
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";
export type CoverBrandingAlignment = "left" | "center" | "right";

export interface CoverContent {
  title?: string;
  subtitle?: string;
  clientName?: string;
  highlight?: string;
  companyName?: string;
  showCompanyName?: boolean;
  companyNamePlacement?: "header" | "content" | "footer";
  companyNameAlign?: CoverBrandingAlignment;
  logo?: string;
  showLogo?: boolean;
  logoPlacement?: "header" | "content" | "footer";
  logoAlign?: CoverBrandingAlignment;
  logoSize?: number;
  date?: string;
  potenciaKwp?: string;
  geracaoMensal?: string;
  coberturaConsumo?: string;
  equivalenteArvores?: string;
}

export interface CoverStyle {
  backgroundImage?: string;
  coverHeight?: number;
  overlayColor?: string;
  overlayOpacity?: number;
  textColor?: string;
  alignment?: CoverAlignment;
  backgroundColor?: string;
}

export interface CoverOrganization {
  companyName?: string;
  logo?: string;
  primaryColor?: string;
}

export interface CoverTypographySizes {
  titleSize: number;
  subtitleSize: number;
  bodySize: number;
}

export const DEFAULT_COVER_TYPOGRAPHY: CoverTypographySizes = {
  titleSize: 36,
  subtitleSize: 24,
  bodySize: 16,
};

function sanitizeTypographyPx(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(10, Math.min(120, Math.round(n)));
}

export function resolveCoverTypography(
  input: Partial<CoverTypographySizes> | null | undefined
): CoverTypographySizes {
  return {
    titleSize: sanitizeTypographyPx(input?.titleSize, DEFAULT_COVER_TYPOGRAPHY.titleSize),
    subtitleSize: sanitizeTypographyPx(input?.subtitleSize, DEFAULT_COVER_TYPOGRAPHY.subtitleSize),
    bodySize: sanitizeTypographyPx(input?.bodySize, DEFAULT_COVER_TYPOGRAPHY.bodySize),
  };
}

export const COVER_SUBTITLE_RICH_CLASS =
  "w-full opacity-95 [&_p]:my-1.5 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-white/40 [&_blockquote]:pl-3 [&_blockquote]:italic [&_h1]:[font-size:var(--cover-sub-h1)] [&_h2]:[font-size:var(--cover-sub-h2)] [&_h3]:[font-size:var(--cover-sub-h3)]";

export function coverSubtitleRichCssVars(typo: CoverTypographySizes): CSSProperties {
  const h2 = Math.max(12, Math.round(typo.subtitleSize * 0.92));
  const h3 = Math.max(12, Math.round((typo.subtitleSize + typo.bodySize) / 2));
  return {
    ["--cover-sub-h1" as string]: `${typo.subtitleSize}px`,
    ["--cover-sub-h2" as string]: `${h2}px`,
    ["--cover-sub-h3" as string]: `${h3}px`,
  };
}

export function coverHighlightFontPx(typo: CoverTypographySizes): number {
  return Math.max(11, Math.round(typo.bodySize * 0.72));
}

export interface CoverSectionData {
  content?: CoverContent;
  style?: CoverStyle;
}

export interface MergedCoverData {
  content: CoverContent;
  style: Required<CoverStyle>;
}

export interface ResolvedCoverAlignment {
  horizontal: "left" | "center" | "right";
  vertical: "top" | "middle" | "bottom";
}

function sanitizeOpacity(value: number | undefined): number {
  if (value == null || Number.isNaN(value)) return 0;
  if (value > 1) return Math.max(0, Math.min(1, value / 100));
  return Math.max(0, Math.min(1, value));
}

function sanitizeCoverHeight(value: number | undefined): number {
  if (value == null || Number.isNaN(value)) return 100;
  return Math.max(100, Math.min(300, Math.round(value)));
}

function sanitizeLogoSize(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (value == null || Number.isNaN(n)) return 100;
  return Math.max(50, Math.min(200, Math.round(n)));
}

function nonEmpty(value: string | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? value : undefined;
}

export function mergeCoverData(
  section: CoverSectionData | undefined,
  organization: CoverOrganization
): MergedCoverData {
  const content = section?.content ?? {};
  const style = section?.style ?? {};

  return {
    content: {
      title: content.title,
      subtitle: content.subtitle,
      clientName: content.clientName,
      highlight: content.highlight,
      companyName: nonEmpty(content.companyName) ?? organization.companyName,
      showCompanyName: content.showCompanyName ?? true,
      companyNamePlacement: content.companyNamePlacement ?? "header",
      companyNameAlign: content.companyNameAlign ?? "center",
      logo: nonEmpty(content.logo) ?? organization.logo,
      showLogo: content.showLogo ?? true,
      logoPlacement: content.logoPlacement ?? "header",
      logoAlign: content.logoAlign ?? "left",
      logoSize: sanitizeLogoSize(content.logoSize),
      date: content.date,
      potenciaKwp: content.potenciaKwp,
      geracaoMensal: content.geracaoMensal,
      coberturaConsumo: content.coberturaConsumo,
      equivalenteArvores: content.equivalenteArvores,
    },
    style: {
      backgroundImage: style.backgroundImage ?? "",
      coverHeight: sanitizeCoverHeight(style.coverHeight),
      overlayColor: nonEmpty(style.overlayColor) ?? "",
      overlayOpacity: nonEmpty(style.overlayColor) ? sanitizeOpacity(style.overlayOpacity) : 0,
      textColor: style.textColor ?? "#ffffff",
      alignment: style.alignment ?? "center",
      backgroundColor: style.backgroundColor ?? organization.primaryColor ?? "#0f172a",
    },
  };
}

export function resolveCoverAlignment(
  alignment: CoverAlignment | undefined
): ResolvedCoverAlignment {
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
      return { horizontal: "center", vertical: "middle" };
  }
}
