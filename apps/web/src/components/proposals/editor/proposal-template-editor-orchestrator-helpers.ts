import { arrayMove } from "@dnd-kit/sortable";
import type { Product } from "@/lib/admin-api";
import { uploadProposalTemplateImage } from "@/lib/proposal-templates-api";
import { TEMPLATE_THUMBNAIL_DATA_URL_KEY } from "@/lib/proposal-document-to-template-config";
import {
  getSectionVariantOptions,
  SECTION_DEFAULT_FIELDS,
  SECTION_TYPE_LABELS,
} from "./section-fields";
import type {
  TemplateAssistantOperation,
  TemplateAssistantSuggestion,
  ProposalTemplateConfig,
} from "@energivia/shared-types";
import type { ProposalDocumentJson, ProposalSection } from "./types";
import { createBaseDocument } from "./utils";

export function summarizeRichText(value: string | undefined, max = 90): string {
  if (!value) return "";
  const plain = value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return "";
  return plain.length > max ? `${plain.slice(0, max)}...` : plain;
}

export function toShortValue(value: unknown): string {
  if (typeof value === "string") return summarizeRichText(value, 70) || "-";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null || value === undefined) return "-";
  return summarizeRichText(JSON.stringify(value), 70) || "-";
}

export function getSuggestionPrimarySectionId(
  suggestion: TemplateAssistantSuggestion
): string | null {
  for (const operation of suggestion.operations) {
    if (
      operation.kind === "update_section" ||
      operation.kind === "remove_section" ||
      operation.kind === "set_section_visibility" ||
      operation.kind === "reorder_section"
    ) {
      return operation.sectionId;
    }
  }
  return null;
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function computeDiagnosticProjectedCosts(
  monthlyBill: number,
  taxaReajusteAnual?: string
): {
  gastoAnual: number;
  custo5: number;
  custo10: number;
} {
  const annualCost = monthlyBill * 12;
  const increaseRate = Math.max(0, Math.min(0.2, Number(taxaReajusteAnual ?? "8") / 100));
  const projectYears = (years: number) => {
    let total = 0;
    let currentAnnual = annualCost;
    for (let year = 0; year < years; year += 1) {
      total += currentAnnual;
      currentAnnual *= 1 + increaseRate;
    }
    return Math.round(total);
  };
  return {
    gastoAnual: Math.round(annualCost),
    custo5: projectYears(5),
    custo10: projectYears(10),
  };
}

export function applyOperationOnDocumentPreview(
  doc: ProposalDocumentJson,
  operation: TemplateAssistantOperation
): ProposalDocumentJson {
  if (operation.kind === "update_template_title") return doc;
  if (operation.kind === "add_section") {
    const validSectionTypes = new Set(Object.keys(SECTION_TYPE_LABELS));
    if (!validSectionTypes.has(operation.sectionType)) return doc;
    const type = operation.sectionType as ProposalSection["type"];
    const section: ProposalSection = {
      id: `assistant-preview-${type}-${doc.sections.length + 1}`,
      type,
      variant:
        type === "cover" ? "full-image" : (getSectionVariantOptions(type)[0]?.value ?? "default"),
      title: operation.title ?? SECTION_TYPE_LABELS[type],
      hidden: false,
      content: operation.content ?? "<p>Pré-visualização de seção proposta pela IA.</p>",
      fields: { ...SECTION_DEFAULT_FIELDS[type], ...(operation.fieldsPatch ?? {}) },
    };
    return { ...doc, sections: [...doc.sections, section] };
  }
  if (operation.kind === "remove_section") {
    return {
      ...doc,
      sections: doc.sections.filter((section) => section.id !== operation.sectionId),
    };
  }
  if (operation.kind === "set_section_visibility") {
    return {
      ...doc,
      sections: doc.sections.map((section) =>
        section.id === operation.sectionId ? { ...section, hidden: operation.hidden } : section
      ),
    };
  }
  if (operation.kind === "reorder_section") {
    const fromIndex = doc.sections.findIndex((section) => section.id === operation.sectionId);
    if (fromIndex < 0) return doc;
    const boundedTo = Math.max(0, Math.min(operation.toIndex, doc.sections.length - 1));
    return { ...doc, sections: arrayMove(doc.sections, fromIndex, boundedTo) };
  }
  if (operation.kind === "update_section") {
    return {
      ...doc,
      sections: doc.sections.map((section) => {
        if (section.id !== operation.sectionId) return section;
        return {
          ...section,
          ...(operation.content !== undefined ? { content: operation.content } : {}),
          fields: { ...section.fields, ...(operation.fieldsPatch ?? {}) },
        };
      }),
    };
  }
  return doc;
}

export function buildVariablesSnapshotForFieldAi(
  variables: Record<string, unknown>,
  maxEntries = 50
): Record<string, string> {
  const out: Record<string, string> = {};
  let n = 0;
  for (const [k, v] of Object.entries(variables)) {
    if (n >= maxEntries) break;
    const safeKey = k.replace(/[^\w-]/g, "").slice(0, 64);
    if (!safeKey) continue;
    out[safeKey] = String(v ?? "").slice(0, 500);
    n += 1;
  }
  return out;
}

export function validateTemplateBeforeCriticalAction(document: ProposalDocumentJson): string[] {
  const issues: string[] = [];
  if (!document.sections.some((section) => section.type === "cover")) {
    issues.push("Template sem seção de capa.");
  }
  for (const section of document.sections) {
    if (!section.title.trim()) issues.push(`Seção sem título (${section.type}).`);
    if (section.type === "cta") {
      const url = String(section.fields["buttonUrl"] ?? section.fields["url"] ?? "").trim();
      if (!url) issues.push("Seção CTA sem URL configurada.");
    }
  }
  return issues;
}

export function serializeSolutionBenefitsForAi(fields: Record<string, unknown>): string {
  const raw = fields["benefits"];
  if (!Array.isArray(raw)) return "[]";
  try {
    return JSON.stringify(raw);
  } catch {
    return "[]";
  }
}

export function renderSectionHtml(
  section: ProposalSection,
  _productCatalogById?: Record<string, Product>,
  _branding?: ProposalDocumentJson["styles"]["branding"],
  _proposalVariables?: ProposalDocumentJson["variables"]
): string {
  return String(section.content ?? "<p>Use os campos da seção para configurar este bloco.</p>");
}

export function extractTemplateThumbnail(config: ProposalTemplateConfig): string | undefined {
  const maybeStyles = config.editor?.styles;
  if (!maybeStyles || typeof maybeStyles !== "object") return undefined;
  const raw = (maybeStyles as Record<string, unknown>)[TEMPLATE_THUMBNAIL_DATA_URL_KEY];
  if (typeof raw !== "string") return undefined;
  const value = raw.trim();
  if (!value) return undefined;
  if (value.startsWith("data:image/")) return value;
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) return value;
  return undefined;
}

function dataUrlToFile(dataUrl: string, fileName: string): File {
  const [meta, base64] = dataUrl.split(",", 2);
  if (!meta || !base64) throw new Error("Invalid data URL");
  const mimeMatch = meta.match(/^data:(.*?);base64$/i);
  const mime = mimeMatch?.[1] || "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], fileName, { type: mime });
}

export async function resolvePersistableThumbnailUrl(
  capturedThumbnailUrl: string | undefined,
  previousThumbnailUrl: string | undefined,
  organizationId?: string
): Promise<string | undefined> {
  if (!capturedThumbnailUrl) return previousThumbnailUrl;
  if (!capturedThumbnailUrl.startsWith("data:image/")) return capturedThumbnailUrl;
  if (!organizationId) return previousThumbnailUrl;
  try {
    const file = dataUrlToFile(capturedThumbnailUrl, `template-thumbnail-${Date.now()}.jpg`);
    return await uploadProposalTemplateImage(file, organizationId);
  } catch (error) {
    console.error("[template-thumbnail] upload failed", { error });
    return previousThumbnailUrl;
  }
}

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

async function captureTemplateThumbnailOnServer(
  title: string,
  documentState: ProposalDocumentJson
): Promise<string | undefined> {
  try {
    const response = await fetch("/api/proposals/thumbnail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        documentState,
      }),
    });
    if (!response.ok) return undefined;
    const payload = (await response.json().catch(() => null)) as { dataUrl?: string } | null;
    const dataUrl = payload?.dataUrl;
    return dataUrl && typeof dataUrl === "string" ? dataUrl : undefined;
  } catch {
    return undefined;
  }
}

export async function captureTemplateThumbnail(
  _target: HTMLElement | null,
  title: string,
  documentState: ProposalDocumentJson
): Promise<string | undefined> {
  return captureTemplateThumbnailOnServer(title, documentState);
}

export function isLikelyInvalidThumbnailDataUrl(dataUrl: string | undefined): boolean {
  if (!dataUrl) return true;
  const invalid = dataUrl.length < 2000;
  if (invalid) {
    console.warn("[thumbnail-capture] data URL too small", { dataUrlLength: dataUrl.length });
  }
  return invalid;
}

function resolveEditorSectionType(raw: string): ProposalSection["type"] {
  if (raw === "problem") return "diagnostic_energy";
  if (raw === "savings") return "economy_purchases";
  return raw in SECTION_DEFAULT_FIELDS ? (raw as ProposalSection["type"]) : "custom";
}

export function fromTemplateConfig(config: ProposalTemplateConfig): ProposalDocumentJson | null {
  if (!config.editor) return null;
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
