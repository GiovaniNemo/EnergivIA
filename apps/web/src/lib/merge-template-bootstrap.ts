"use client";

import { ensureCoverOverlayFromDocumentBackground } from "@/lib/ensure-cover-overlay";
import { createId } from "@/components/proposals/editor/utils";
import {
  SECTION_DEFAULT_FIELDS,
  SECTION_TYPES,
  SECTION_VARIANTS,
  resolveSectionVariant,
} from "@/components/proposals/editor/section-fields";
import type {
  FontFamily,
  PageWidth,
  ProposalDocumentJson,
  ProposalSection,
  SectionType,
  Spacing,
  TypographyPreset,
} from "@/components/proposals/editor/types";

export interface TemplateBootstrapApiStyles {
  branding: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
  };
  typography: {
    fontFamily: string;
    preset: string;
  };
  cover: {
    overlayColor: string;
    overlayOpacity: number;
    titleText: string;
  };
  layout: {
    pageWidth: string;
    spacing: string;
    borderRadius: number;
    shadowIntensity: number;
  };
}

export interface TemplateBootstrapApiSection {
  type: string;
  variant: string;
  title: string;
  content: string;
  fields: Record<string, unknown>;
}

export interface TemplateBootstrapApiResult {
  styles: TemplateBootstrapApiStyles;
  sections: TemplateBootstrapApiSection[];
}

const FONT_FAMILIES: FontFamily[] = ["Inter", "Roboto", "Open Sans", "Montserrat"];
const TYPO_PRESETS: TypographyPreset[] = ["small", "medium", "large"];

const PRESET_SIZES: Record<
  TypographyPreset,
  { titleSize: number; subtitleSize: number; bodySize: number }
> = {
  small: { titleSize: 26, subtitleSize: 17, bodySize: 13 },
  medium: { titleSize: 30, subtitleSize: 20, bodySize: 14 },
  large: { titleSize: 34, subtitleSize: 22, bodySize: 15 },
};

function deepMergeFields(
  defaults: Record<string, unknown>,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...defaults };
  for (const [k, v] of Object.entries(incoming)) {
    if (
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      out[k] &&
      typeof out[k] === "object" &&
      !Array.isArray(out[k])
    ) {
      out[k] = deepMergeFields(out[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function isSectionType(value: string): value is SectionType {
  return (SECTION_TYPES as readonly string[]).includes(value);
}

function safeVariant(type: SectionType, variant: string): string {
  const resolved = resolveSectionVariant(type, variant);
  const allowed = SECTION_VARIANTS[type];
  if (allowed?.includes(resolved)) return resolved;
  return allowed?.[0] ?? "default";
}

function normalizeFontFamily(value: string): FontFamily {
  return FONT_FAMILIES.includes(value as FontFamily) ? (value as FontFamily) : "Inter";
}

function normalizePreset(value: string): TypographyPreset {
  return TYPO_PRESETS.includes(value as TypographyPreset) ? (value as TypographyPreset) : "medium";
}

const LOG_PREFIX = "[merge-template-bootstrap]";

function debugBootstrap(message: string, data?: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "development") return;
  if (data) {
    console.debug(LOG_PREFIX, message, data);
  } else {
    console.debug(LOG_PREFIX, message);
  }
}

function buildSection(raw: TemplateBootstrapApiSection): ProposalSection {
  const type: SectionType = isSectionType(raw.type) ? raw.type : "custom";
  const variant = safeVariant(type, raw.variant);
  const defaults = structuredClone(SECTION_DEFAULT_FIELDS[type] ?? SECTION_DEFAULT_FIELDS.custom);
  const mergedFields = deepMergeFields(defaults, raw.fields ?? {});

  let content = raw.content?.trim() ? raw.content : "";
  const fieldText = typeof mergedFields["text"] === "string" ? mergedFields["text"].trim() : "";
  const rawContentLen = raw.content?.trim()?.length ?? 0;
  const rawFieldsObj = raw.fields ?? {};
  const rawFieldsKeys = Object.keys(rawFieldsObj);

  if (!content && fieldText) content = fieldText;
  if (!content) content = "<p></p>";

  if (type !== "cover") {
    mergedFields["text"] = content;
  }

  const apiSentInnerTitle =
    typeof rawFieldsObj["title"] === "string" && String(rawFieldsObj["title"]).trim().length > 0;
  if (type !== "cover") {
    const inner =
      typeof mergedFields["title"] === "string" ? String(mergedFields["title"]).trim() : "";
    if (!inner && !apiSentInnerTitle && raw.title?.trim()) {
      mergedFields["title"] = raw.title.trim().slice(0, 300);
    }
  }

  debugBootstrap(`buildSection type=${type}`, {
    variant,
    title: (raw.title || "").slice(0, 60),
    rawContentLen,
    finalContentLen: content.length,
    fieldTextLen: typeof mergedFields["text"] === "string" ? mergedFields["text"].length : 0,
    rawFieldKeys: rawFieldsKeys.slice(0, 16),
  });

  return {
    id: createId(),
    type,
    variant,
    title: raw.title || type,
    hidden: false,
    content,
    fields: mergedFields,
  };
}

export interface TemplateBootstrapAnchors {
  coverImageUrl: string;
  logoUrl: string;
  organizationName?: string;
  audienceLabel: string;
}

export function mergeTemplateBootstrapIntoDocument(
  base: ProposalDocumentJson,
  bootstrap: TemplateBootstrapApiResult,
  anchors: TemplateBootstrapAnchors
): ProposalDocumentJson {
  debugBootstrap("merge entrada", {
    sectionsIn: bootstrap.sections.length,
    brandingPrimary: bootstrap.styles?.branding?.primaryColor,
  });

  const doc = structuredClone(base);
  const { styles: st } = bootstrap;

  const fontFamily = normalizeFontFamily(st.typography.fontFamily);
  const preset = normalizePreset(st.typography.preset);
  const sizes = PRESET_SIZES[preset];

  doc.styles.branding = {
    ...doc.styles.branding,
    ...st.branding,
    logoUrl: anchors.logoUrl || doc.styles.branding.logoUrl,
  };
  doc.styles.typography = {
    ...doc.styles.typography,
    fontFamily,
    preset,
    ...sizes,
  };
  const pageWidths: PageWidth[] = ["narrow", "medium", "wide"];
  const spacings: Spacing[] = ["compact", "normal", "relaxed"];
  const pageWidth = pageWidths.includes(st.layout.pageWidth as PageWidth)
    ? (st.layout.pageWidth as PageWidth)
    : doc.styles.layout.pageWidth;
  const spacing = spacings.includes(st.layout.spacing as Spacing)
    ? (st.layout.spacing as Spacing)
    : doc.styles.layout.spacing;

  doc.styles.layout = {
    ...doc.styles.layout,
    pageWidth,
    spacing,
    borderRadius: st.layout.borderRadius,
    shadowIntensity: st.layout.shadowIntensity,
  };
  doc.styles.cover = {
    ...doc.styles.cover,
    overlayColor: st.cover.overlayColor,
    overlayOpacity: st.cover.overlayOpacity,
    titleText: st.cover.titleText,
    imageUrl: anchors.coverImageUrl,
  };
  doc.styles.footer = {
    ...doc.styles.footer,
    ...(anchors.organizationName ? { companyName: anchors.organizationName } : {}),
  };

  doc.variables = {
    ...doc.variables,
    publico_alvo: anchors.audienceLabel,
    ...(anchors.organizationName ? { nome_empresa: anchors.organizationName } : {}),
  };

  doc.sections = bootstrap.sections.map((s) => buildSection(s));

  const cover = doc.sections.find((sec) => sec.type === "cover");
  if (cover) {
    const logoApplied = Boolean((anchors.logoUrl || (cover.fields["logo"] as string) || "").trim());
    cover.fields = {
      ...cover.fields,
      backgroundImage: anchors.coverImageUrl,
      logo: anchors.logoUrl || (cover.fields["logo"] as string) || "",
      ...(logoApplied ? { showCompanyName: false } : {}),
    };
  }

  ensureCoverOverlayFromDocumentBackground(doc);

  debugBootstrap("merge saída", {
    sectionsOut: doc.sections.length,
    types: doc.sections.map((s) => s.type).join(","),
    firstContentLens: doc.sections.slice(0, 4).map((s) => ({
      type: s.type,
      len: s.content.length,
      fieldTextLen: typeof s.fields["text"] === "string" ? s.fields["text"].length : 0,
    })),
  });

  return doc;
}
