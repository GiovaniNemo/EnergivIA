import type { ProposalTemplateConfig } from "@energivia/shared-types";
import type { ProposalDocumentJson } from "@/components/proposals/editor/types";
import {
  captureTemplateThumbnail,
  isLikelyInvalidThumbnailDataUrl,
  resolvePersistableThumbnailUrl,
} from "@/components/proposals/editor/proposal-template-editor-orchestrator-helpers";
import { proposalDocumentJsonToTemplateConfig } from "@/lib/proposal-document-to-template-config";

export async function proposalDocumentJsonToTemplateConfigWithThumbnail(
  document: ProposalDocumentJson,
  title: string,
  organizationId: string | undefined,
  options?: { businessSegmentId?: string }
): Promise<ProposalTemplateConfig> {
  let thumbnailUrl: string | undefined;
  if (organizationId) {
    const raw = await captureTemplateThumbnail(null, title, document);
    const captured = isLikelyInvalidThumbnailDataUrl(raw) ? undefined : raw;
    thumbnailUrl = await resolvePersistableThumbnailUrl(captured, undefined, organizationId);
  }
  return proposalDocumentJsonToTemplateConfig(document, thumbnailUrl, options);
}
