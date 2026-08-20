/* eslint-disable @typescript-eslint/no-explicit-any */
import { createBaseDocument } from "@/components/proposals/editor/utils";
import { SECTION_DEFAULT_FIELDS } from "@/components/proposals/editor/section-fields";
import type { ProposalDocumentJson, ProposalSection } from "@/components/proposals/editor/types";

function normalizePutPresignedUrl(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    const parsed = new URL(value);
    const isPresignedS3Put =
      parsed.searchParams.has("X-Amz-Algorithm") && parsed.searchParams.get("x-id") === "PutObject";
    if (!isPresignedS3Put) return value;
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return value;
  }
}

function normalizeSectionFields(
  fields: Record<string, unknown>,
  sectionType: ProposalSection["type"]
): Record<string, unknown> {
  const normalized = { ...fields };
  const imageKeys = new Set<string>(["image", "backgroundImage", "logo", "logoUrl"]);
  if (sectionType === "cover") imageKeys.add("backgroundImage");
  for (const key of imageKeys) {
    if (key in normalized) {
      normalized[key] = normalizePutPresignedUrl(normalized[key]);
    }
  }
  if (sectionType === "testimonials" && Array.isArray(normalized["items"])) {
    normalized["items"] = (normalized["items"] as Record<string, unknown>[]).map((row) => ({
      ...row,
      photo:
        typeof row["photo"] === "string" ? normalizePutPresignedUrl(row["photo"]) : row["photo"],
    }));
  }
  return normalized;
}

function resolveEditorSectionType(raw: string): ProposalSection["type"] {
  if (raw === "problem") return "diagnostic_energy";
  if (raw === "savings") return "economy_purchases";
  return raw in SECTION_DEFAULT_FIELDS ? (raw as ProposalSection["type"]) : "custom";
}

function mergeDefaultStyles(
  customStyles: unknown,
  theme?: unknown
): ProposalDocumentJson["styles"] {
  const base = createBaseDocument("Template", ["Capa"]).styles;
  const s = (customStyles && typeof customStyles === "object" ? customStyles : {}) as Record<
    string,
    any
  >;
  const th = (theme && typeof theme === "object" ? theme : {}) as Record<string, any>;

  return {
    branding: {
      ...base.branding,
      ...(s.branding || {}),
      primaryColor: s.branding?.primaryColor || th.primaryColor || base.branding.primaryColor,
      secondaryColor:
        s.branding?.secondaryColor || th.secondaryColor || base.branding.secondaryColor,
      backgroundColor: s.branding?.backgroundColor || base.branding.backgroundColor,
      textColor: s.branding?.textColor || base.branding.textColor,
      logoUrl: normalizePutPresignedUrl(
        s.branding?.logoUrl || th.logoUrl || base.branding.logoUrl
      ) as string,
    },
    typography: {
      ...base.typography,
      ...(s.typography || {}),
    },
    layout: {
      ...base.layout,
      ...(s.layout || {}),
    },
    cover: {
      ...base.cover,
      ...(s.cover || {}),
      imageUrl: normalizePutPresignedUrl(
        s.cover?.imageUrl || th.coverImageUrl || base.cover.imageUrl
      ) as string,
    },
    footer: {
      ...base.footer,
      ...(s.footer || {}),
    },
  };
}

export function templateConfigToPreviewDocument(config: unknown): ProposalDocumentJson {
  if (!config || typeof config !== "object") return createBaseDocument("Proposta", ["Capa"]);
  const anyConfig = config as Record<string, any>;

  const rawSections: Array<Record<string, any>> = Array.isArray(anyConfig["editor"]?.["sections"])
    ? anyConfig["editor"]["sections"]
    : Array.isArray(anyConfig["document"]?.["sections"])
      ? anyConfig["document"]["sections"]
      : Array.isArray(anyConfig["sections"])
        ? anyConfig["sections"].filter((s: any) => s.enabled !== false)
        : [];

  if (rawSections.length === 0) {
    return createBaseDocument("Proposta", ["Capa"]);
  }

  const customStyles =
    anyConfig["styles"] || anyConfig["editor"]?.["styles"] || anyConfig["document"]?.["styles"];
  const styles = mergeDefaultStyles(customStyles, anyConfig["theme"]);
  const variables = (anyConfig["variables"] ||
    anyConfig["editor"]?.["variables"] ||
    anyConfig["document"]?.["variables"] ||
    {}) as ProposalDocumentJson["variables"];

  const sections: ProposalDocumentJson["sections"] = rawSections.map((section, idx) => {
    const rawType = String(section["type"] || section["key"] || "custom");
    const resolvedType = resolveEditorSectionType(rawType);
    const existingFields =
      section["fields"] && typeof section["fields"] === "object"
        ? section["fields"]
        : section["content"] && typeof section["content"] === "object"
          ? section["content"]
          : {};

    const mergedContent = normalizeSectionFields(
      {
        ...SECTION_DEFAULT_FIELDS[resolvedType],
        ...existingFields,
      },
      resolvedType
    );

    if (rawType === "savings" && resolvedType === "economy_purchases") {
      const c = mergedContent as Record<string, unknown>;
      if (!String(c["title"] ?? "").trim() && String(c["headline"] ?? "").trim()) {
        c["title"] = c["headline"];
      }
      if (!String(c["text"] ?? "").trim() && String(c["supportText"] ?? "").trim()) {
        c["text"] = `<p>${String(c["supportText"])}</p>`;
      }
    }

    const rawText =
      resolvedType === "introduction" || resolvedType === "custom"
        ? String(existingFields["text"] ?? section["content"] ?? "<p></p>")
        : "<p>Use os campos específicos da seção para configurar este bloco.</p>";

    return {
      id: String(section["id"] || `sec_${idx}_${Math.random().toString(36).substring(2)}`),
      type: resolvedType,
      variant:
        resolvedType === "cover" && (section["variant"] === "default" || !section["variant"])
          ? ("full-image" as const)
          : resolvedType === "economy_purchases"
            ? ("default" as const)
            : section["variant"] || "default",
      title: String(section["title"] || ""),
      content: rawText,
      fields: mergedContent,
      hidden:
        section["hidden"] === true || section["enabled"] === false || section["visible"] === false,
    };
  });

  return {
    sections,
    styles,
    variables,
  };
}
