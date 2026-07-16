import {
  DEFAULT_PROPOSAL_TEMPLATE_CONFIG,
  type ProposalEditorDocument,
  type ProposalTemplateConfig,
  type ProposalTemplateSectionKey,
} from "@energivia/shared-types";
import type { ProposalDocumentJson, ProposalSection } from "@/components/proposals/editor/types";

export const TEMPLATE_THUMBNAIL_DATA_URL_KEY = "__templateThumbnailDataUrl";

export const ONBOARDING_BUSINESS_SEGMENT_ID_KEY = "__onboardingBusinessSegmentId";

export function getOnboardingBusinessSegmentIdFromTemplateConfig(
  config: ProposalTemplateConfig | undefined
): string | undefined {
  const styles = config?.editor?.styles;
  if (!styles || typeof styles !== "object") return undefined;
  const raw = (styles as Record<string, unknown>)[ONBOARDING_BUSINESS_SEGMENT_ID_KEY];
  return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
}

export function proposalDocumentJsonToTemplateConfig(
  document: ProposalDocumentJson,
  thumbnailUrl?: string,
  options?: { businessSegmentId?: string }
): ProposalTemplateConfig {
  const toTemplateSectionKey = (type: ProposalSection["type"]): ProposalTemplateSectionKey => type;

  const sourceStyles = document.styles as unknown as Record<string, unknown>;
  const { [TEMPLATE_THUMBNAIL_DATA_URL_KEY]: _previousThumbnail, ...stylesWithoutThumbnail } =
    sourceStyles;
  const editorStyles = {
    ...stylesWithoutThumbnail,
    ...(thumbnailUrl ? { [TEMPLATE_THUMBNAIL_DATA_URL_KEY]: thumbnailUrl } : {}),
    ...(options?.businessSegmentId !== undefined
      ? { [ONBOARDING_BUSINESS_SEGMENT_ID_KEY]: options.businessSegmentId }
      : {}),
  };
  const editorVariables = Object.fromEntries(
    Object.entries(document.variables).map(([key, value]) => [key, String(value)])
  );
  const editor: ProposalEditorDocument = {
    sections: document.sections.map((section, index) => ({
      id: section.id,
      type: toTemplateSectionKey(section.type),
      variant: section.variant,
      order: index,
      title: section.title,
      content: section.fields,
      style: {},
      visible: !section.hidden,
    })),
    styles: editorStyles,
    variables: editorVariables,
  };
  return {
    ...DEFAULT_PROPOSAL_TEMPLATE_CONFIG,
    editor,
  };
}
