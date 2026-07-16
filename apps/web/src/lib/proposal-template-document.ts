import type { ProposalTemplateConfig } from "@energivia/shared-types";
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

export function templateConfigToPreviewDocument(
  config: ProposalTemplateConfig
): ProposalDocumentJson {
  if (!config.editor) return createBaseDocument("Proposta", ["Capa"]);
  const sections = config.editor.sections.map((section) => {
    const rawType = String(section.type);
    const resolvedType = resolveEditorSectionType(rawType);
    const rawText =
      resolvedType === "introduction" || resolvedType === "custom"
        ? String((section.content as Record<string, unknown>)?.["text"] ?? "<p></p>")
        : "<p>Use os campos específicos da seção para configurar este bloco.</p>";
    const mergedContent =
      section.content && typeof section.content === "object"
        ? normalizeSectionFields(
            {
              ...SECTION_DEFAULT_FIELDS[resolvedType],
              ...(section.content as Record<string, unknown>),
            },
            resolvedType
          )
        : { ...SECTION_DEFAULT_FIELDS[resolvedType] };
    if (rawType === "savings" && resolvedType === "economy_purchases") {
      const c = mergedContent as Record<string, unknown>;
      if (!String(c["title"] ?? "").trim() && String(c["headline"] ?? "").trim()) {
        c["title"] = c["headline"];
      }
      if (!String(c["text"] ?? "").trim() && String(c["supportText"] ?? "").trim()) {
        c["text"] = `<p>${String(c["supportText"])}</p>`;
      }
    }
    return {
      id: section.id,
      type: resolvedType,
      variant:
        resolvedType === "cover" && section.variant === "default"
          ? "full-image"
          : resolvedType === "economy_purchases"
            ? "default"
            : section.variant,
      title: section.title,
      content: rawText,
      fields: mergedContent,
      hidden: section.visible === false,
    };
  });
  return {
    sections,
    styles:
      config.editor.styles && typeof config.editor.styles === "object"
        ? ({
            ...(config.editor.styles as unknown as ProposalDocumentJson["styles"]),
            branding: {
              ...((config.editor.styles as unknown as ProposalDocumentJson["styles"]).branding ??
                {}),
              logoUrl: normalizePutPresignedUrl(
                (config.editor.styles as unknown as ProposalDocumentJson["styles"]).branding
                  ?.logoUrl
              ) as string,
            },
            cover: {
              ...((config.editor.styles as unknown as ProposalDocumentJson["styles"]).cover ?? {}),
              imageUrl: normalizePutPresignedUrl(
                (config.editor.styles as unknown as ProposalDocumentJson["styles"]).cover?.imageUrl
              ) as string,
            },
          } as ProposalDocumentJson["styles"])
        : createBaseDocument("Template", ["Capa"]).styles,
    variables: config.editor.variables as ProposalDocumentJson["variables"],
  };
}
