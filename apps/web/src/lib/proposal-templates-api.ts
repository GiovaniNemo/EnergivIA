import type { ProposalTemplateConfig } from "@energivia/shared-types";

async function apiProxy(
  method: string,
  path: string,
  body?: unknown,
  organizationId?: string
): Promise<Response> {
  const url = `/api/proxy${path}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (organizationId) headers["x-organization-id"] = organizationId;
  return fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
}

export type ProposalTemplateStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

function toPublicAssetUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const isPresignedS3Put =
      parsed.searchParams.has("X-Amz-Algorithm") && parsed.searchParams.get("x-id") === "PutObject";
    if (!isPresignedS3Put) return url;
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}

export interface ProposalTemplateEntity {
  id: string;
  name: string;
  description: string | null;
  status: ProposalTemplateStatus;
  version: number;
  isDefault: boolean;
  config: ProposalTemplateConfig;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalTemplateRevisionEntity {
  id: string;
  proposalTemplateId: string;
  tenantId: string;
  version: number;
  status: ProposalTemplateStatus;
  config: ProposalTemplateConfig;
  createdAt: string;
  publishedAt: string;
}

export async function listProposalTemplates(
  organizationId?: string
): Promise<ProposalTemplateEntity[]> {
  const res = await apiProxy("GET", "/proposal-templates", undefined, organizationId);
  if (!res.ok) throw new Error("Falha ao carregar templates");
  return res.json();
}

export async function createProposalTemplate(
  payload: {
    name: string;
    description?: string;
    config: ProposalTemplateConfig;
    isDefault?: boolean;
  },
  organizationId?: string
): Promise<ProposalTemplateEntity> {
  const res = await apiProxy("POST", "/proposal-templates", payload, organizationId);
  if (!res.ok) throw new Error("Falha ao criar template");
  return res.json();
}

export async function updateProposalTemplate(
  id: string,
  payload: Partial<{
    name: string;
    description: string;
    status: ProposalTemplateStatus;
    config: ProposalTemplateConfig;
    isDefault: boolean;
  }>,
  organizationId?: string
): Promise<ProposalTemplateEntity> {
  const res = await apiProxy("PATCH", `/proposal-templates/${id}`, payload, organizationId);
  if (!res.ok) throw new Error("Falha ao salvar template");
  return res.json();
}

export async function duplicateProposalTemplate(
  id: string,
  organizationId?: string
): Promise<ProposalTemplateEntity> {
  const res = await apiProxy(
    "POST",
    `/proposal-templates/${id}/duplicate`,
    undefined,
    organizationId
  );
  if (!res.ok) throw new Error("Falha ao duplicar template");
  return res.json();
}

export async function publishProposalTemplate(
  id: string,
  organizationId?: string
): Promise<ProposalTemplateEntity> {
  const res = await apiProxy(
    "POST",
    `/proposal-templates/${id}/publish`,
    undefined,
    organizationId
  );
  if (!res.ok) throw new Error("Falha ao publicar template");
  return res.json();
}

export async function archiveProposalTemplate(
  id: string,
  organizationId?: string
): Promise<ProposalTemplateEntity> {
  const res = await apiProxy(
    "POST",
    `/proposal-templates/${id}/archive`,
    undefined,
    organizationId
  );
  if (!res.ok) throw new Error("Falha ao excluir template");
  return res.json();
}

export async function listProposalTemplateRevisions(
  id: string,
  organizationId?: string
): Promise<ProposalTemplateRevisionEntity[]> {
  const res = await apiProxy(
    "GET",
    `/proposal-templates/${id}/revisions`,
    undefined,
    organizationId
  );
  if (!res.ok) throw new Error("Falha ao carregar histórico de versões");
  return res.json();
}

export async function restoreProposalTemplateRevision(
  id: string,
  revisionId: string,
  organizationId?: string
): Promise<ProposalTemplateEntity> {
  const res = await apiProxy(
    "POST",
    `/proposal-templates/${id}/revisions/${revisionId}/restore`,
    undefined,
    organizationId
  );
  if (!res.ok) throw new Error("Falha ao restaurar versão");
  return res.json();
}

export async function uploadProposalTemplateImage(
  file: File,
  organizationId?: string
): Promise<string> {
  const contentType = file.type.toLowerCase();
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowedTypes.has(contentType)) {
    throw new Error("Envie uma imagem JPG, PNG ou WEBP.");
  }

  const presignedRes = await apiProxy(
    "POST",
    "/uploads/presigned-url",
    {
      fileName: file.name,
      contentType: file.type,
      folder: "proposal_templates",
    },
    organizationId
  );
  if (!presignedRes.ok) {
    const err = await presignedRes.json().catch(() => ({}));
    throw new Error(err.message ?? "Falha ao gerar URL de upload da imagem.");
  }

  const presigned = (await presignedRes.json()) as { uploadUrl: string; fileUrl: string };
  const uploadRes = await fetch(presigned.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!uploadRes.ok) {
    const details = await uploadRes.text().catch(() => "");
    throw new Error(
      `Falha ao enviar imagem (${uploadRes.status})${details ? `: ${details.slice(0, 180)}` : "."}`
    );
  }

  const normalizedFileUrl = toPublicAssetUrl(presigned.fileUrl);
  if (normalizedFileUrl) return normalizedFileUrl;
  return toPublicAssetUrl(presigned.uploadUrl);
}
