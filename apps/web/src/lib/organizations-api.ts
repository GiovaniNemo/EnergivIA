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

export interface Organization {
  id: string;
  name: string;
  logoUrl?: string | null;
  cnpj?: string | null;
  createdAt: string;
  role?: string;
  membershipId?: string;
}

export interface MeResponse {
  id: string;
  email: string;
  name: string;
  picture?: string | null;
  role?: string;
  tenantId?: string | null;
  organizations?: Organization[];
  currentOrganizationId?: string | null;
}

export class MeRequestError extends Error {
  readonly status: number;
  readonly hint?: string;
  readonly code?: string;

  constructor(message: string, status: number, options?: { hint?: string; code?: string }) {
    super(message);
    this.name = "MeRequestError";
    this.status = status;
    this.hint = options?.hint;
    this.code = options?.code;
  }
}

export interface Member {
  id: string;
  userId: string | null;
  email: string | null;
  name: string | null;
  picture: string | null;
  role: string;
  status: string;
  invitedAt: string;
  joinedAt: string | null;
  invitedBy: string | null;
}

export async function getMe(organizationId?: string): Promise<MeResponse> {
  const params = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : "";
  const res = await fetch(`/api/me${params}`, { credentials: "include" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text || `Falha ao carregar perfil (${res.status})`;
    let hint: string | undefined;
    let code: string | undefined;
    try {
      const body = JSON.parse(text) as {
        error?: string;
        message?: string;
        hint?: string;
        code?: string;
      };
      message = body.error ?? body.message ?? message;
      hint = body.hint;
      code = body.code;
    } catch {}
    throw new MeRequestError(message, res.status, { hint, code });
  }
  return res.json();
}

export async function updateMyProfile(data: {
  name?: string;
  picture?: string | null;
}): Promise<MeResponse> {
  const res = await apiProxy("PATCH", "/auth/me", data);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Falha ao salvar o perfil.");
  }
  return res.json();
}

export async function uploadUserAvatar(file: File): Promise<string> {
  const presignedRes = await apiProxy("POST", "/uploads/presigned-url", {
    fileName: file.name,
    contentType: file.type,
    folder: "avatars",
  });
  if (!presignedRes.ok) {
    const err = await presignedRes.json().catch(() => ({}));
    throw new Error(err.message ?? "Falha ao gerar URL de upload do avatar.");
  }

  const presigned = (await presignedRes.json()) as { uploadUrl: string; fileUrl: string };
  const uploadRes = await fetch(presigned.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!uploadRes.ok) {
    throw new Error(`Falha ao enviar o avatar (${uploadRes.status}).`);
  }

  return presigned.fileUrl;
}

export async function createOrganization(data: {
  name: string;
  logoUrl?: string;
  cnpj?: string;
  templateBusinessSegment?: string;
  templateRegion?: string;
  templateValueProposition?: string;
  templateTone?: string;
}): Promise<Organization> {
  const res = await apiProxy("POST", "/organizations", data);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Falha ao criar organização.");
  }
  return res.json();
}

export async function uploadOrganizationLogo(file: File): Promise<string> {
  const contentType = file.type.toLowerCase();
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowedTypes.has(contentType)) {
    throw new Error("Envie uma imagem JPG, PNG ou WEBP.");
  }

  const presignedRes = await apiProxy("POST", "/uploads/presigned-url", {
    fileName: file.name,
    contentType: file.type,
    folder: "organizations",
  });
  if (!presignedRes.ok) {
    const err = await presignedRes.json().catch(() => ({}));
    throw new Error(err.message ?? "Falha ao gerar URL de upload da logo.");
  }

  const presigned = (await presignedRes.json()) as { uploadUrl: string; fileUrl: string };
  const uploadRes = await fetch(presigned.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!uploadRes.ok) {
    throw new Error(`Falha ao enviar logo (${uploadRes.status}).`);
  }

  return presigned.fileUrl;
}

export async function listOrganizations(): Promise<Organization[]> {
  const res = await apiProxy("GET", "/organizations");
  if (!res.ok) throw new Error("Falha ao listar organizações.");
  return res.json();
}

export async function getOrganization(id: string, organizationId?: string): Promise<Organization> {
  const res = await apiProxy("GET", `/organizations/${id}`, undefined, organizationId);
  if (!res.ok) throw new Error("Falha ao carregar organização.");
  return res.json();
}

export async function updateOrganization(
  id: string,
  data: {
    name?: string;
    logoUrl?: string;
    cnpj?: string;
    templateBusinessSegment?: string;
    templateRegion?: string;
    templateValueProposition?: string;
    templateTone?: string;
  },
  organizationId?: string
): Promise<Organization> {
  const res = await apiProxy("PATCH", `/organizations/${id}`, data, organizationId);
  if (!res.ok) throw new Error("Falha ao atualizar organização.");
  return res.json();
}

export async function getMembers(organizationId: string): Promise<Member[]> {
  const res = await apiProxy(
    "GET",
    `/organizations/${organizationId}/members`,
    undefined,
    organizationId
  );
  if (!res.ok) throw new Error("Falha ao carregar membros.");
  return res.json();
}

export async function inviteMember(
  organizationId: string,
  data: { email: string; role: string }
): Promise<{ id: string }> {
  const res = await apiProxy(
    "POST",
    `/organizations/${organizationId}/invite`,
    data,
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Falha ao enviar convite.");
  }
  return res.json();
}

export async function updateMemberRole(
  organizationId: string,
  memberId: string,
  role: string
): Promise<unknown> {
  const res = await apiProxy(
    "PATCH",
    `/organizations/${organizationId}/members/${memberId}`,
    { role },
    organizationId
  );
  if (!res.ok) throw new Error("Falha ao atualizar função.");
  return res.json();
}

export async function removeMember(organizationId: string, memberId: string): Promise<void> {
  const res = await apiProxy(
    "DELETE",
    `/organizations/${organizationId}/members/${memberId}`,
    undefined,
    organizationId
  );
  if (!res.ok) throw new Error("Falha ao remover membro.");
}

export interface WhatsappInboundPhoneRow {
  id: string;
  phoneDigits: string;
  label: string | null;
  createdAt: string;
}

export async function listWhatsappInboundPhones(
  organizationId: string
): Promise<WhatsappInboundPhoneRow[]> {
  const res = await apiProxy(
    "GET",
    `/organizations/${organizationId}/whatsapp-inbound-phones`,
    undefined,
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Falha ao listar telefones.");
  }
  return res.json();
}

export async function addWhatsappInboundPhone(
  organizationId: string,
  body: { phone: string; label?: string }
): Promise<WhatsappInboundPhoneRow> {
  const res = await apiProxy(
    "POST",
    `/organizations/${organizationId}/whatsapp-inbound-phones`,
    body,
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Falha ao adicionar telefone.");
  }
  return res.json();
}

export async function removeWhatsappInboundPhone(
  organizationId: string,
  phoneId: string
): Promise<void> {
  const res = await apiProxy(
    "DELETE",
    `/organizations/${organizationId}/whatsapp-inbound-phones/${phoneId}`,
    undefined,
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Falha ao remover telefone.");
  }
}
