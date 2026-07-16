import type { ProposalDocumentJson } from "@/components/proposals/editor/types";

export type BlueprintDocumentInput = Record<string, unknown>;

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

async function parseError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { message?: string | string[] };
  if (Array.isArray(data.message)) return data.message.join(", ");
  if (typeof data.message === "string") return data.message;
  return `Request failed (${res.status})`;
}

export interface TemplateBlueprintSummary {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
}

export interface TemplateBlueprintDetail extends TemplateBlueprintSummary {
  document: ProposalDocumentJson;
}

export interface TemplateBlueprintAdminRow extends TemplateBlueprintSummary {
  slug: string | null;
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateBlueprintAdminDetail extends TemplateBlueprintAdminRow {
  document: ProposalDocumentJson;
}

export async function listPublishedTemplateBlueprints(
  organizationId: string
): Promise<TemplateBlueprintSummary[]> {
  const res = await apiProxy("GET", "/template-blueprints", undefined, organizationId);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getTemplateBlueprint(
  id: string,
  organizationId: string
): Promise<TemplateBlueprintDetail> {
  const res = await apiProxy("GET", `/template-blueprints/${id}`, undefined, organizationId);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function adminListTemplateBlueprints(
  organizationId: string
): Promise<TemplateBlueprintAdminRow[]> {
  const res = await apiProxy("GET", "/admin/template-blueprints", undefined, organizationId);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function adminGetTemplateBlueprint(
  id: string,
  organizationId: string
): Promise<TemplateBlueprintAdminDetail> {
  const res = await apiProxy("GET", `/admin/template-blueprints/${id}`, undefined, organizationId);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export type CreateTemplateBlueprintPayload = {
  name: string;
  slug?: string;
  description?: string;
  thumbnailUrl?: string;
  document: BlueprintDocumentInput;
  published?: boolean;
  sortOrder?: number;
};

export type UpdateTemplateBlueprintPayload = Partial<CreateTemplateBlueprintPayload>;

export async function adminCreateTemplateBlueprint(
  organizationId: string,
  payload: CreateTemplateBlueprintPayload
): Promise<TemplateBlueprintAdminDetail> {
  const res = await apiProxy("POST", "/admin/template-blueprints", payload, organizationId);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function adminUpdateTemplateBlueprint(
  organizationId: string,
  id: string,
  payload: UpdateTemplateBlueprintPayload
): Promise<TemplateBlueprintAdminDetail> {
  const res = await apiProxy("PATCH", `/admin/template-blueprints/${id}`, payload, organizationId);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function adminDeleteTemplateBlueprint(
  organizationId: string,
  id: string
): Promise<void> {
  const res = await apiProxy(
    "DELETE",
    `/admin/template-blueprints/${id}`,
    undefined,
    organizationId
  );
  if (!res.ok) throw new Error(await parseError(res));
}
