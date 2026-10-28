/* eslint-disable @typescript-eslint/no-explicit-any */

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `/api/proxy${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errorMsg = `Erro na requisição (${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson.message) {
        errorMsg = Array.isArray(errJson.message) ? errJson.message.join(", ") : errJson.message;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export async function convertProposalToSale(proposalId: string): Promise<any> {
  return apiFetch(`/sales/convert/${encodeURIComponent(proposalId)}`, {
    method: "POST",
  });
}

export async function listSales(params?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: any[]; total: number; page: number; totalPages: number }> {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.status) q.set("status", params.status);
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));

  const queryStr = q.toString() ? `?${q.toString()}` : "";
  return apiFetch(`/sales${queryStr}`);
}

export async function getSaleById(id: string): Promise<any> {
  return apiFetch(`/sales/${encodeURIComponent(id)}`);
}

export async function updateSale(id: string, dto: Record<string, any>): Promise<any> {
  return apiFetch(`/sales/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(dto),
  });
}

export async function generateSaleDocument(
  id: string,
  documentType: "CONTRATO_PF" | "CONTRATO_PJ" | "PROCURACAO_PF" | "PROCURACAO_PJ"
): Promise<any> {
  return apiFetch(`/sales/${encodeURIComponent(id)}/documents/generate`, {
    method: "POST",
    body: JSON.stringify({ documentType }),
  });
}

export async function getSaleDocumentForEditor(
  saleId: string,
  docId: string
): Promise<{
  id: string;
  saleId: string;
  templateType: string;
  title: string;
  contentHtml: string;
  status: string;
  isSigned: boolean;
  publicToken: string;
  originalPdfUrl?: string;
  updatedAt?: string;
}> {
  return apiFetch(
    `/sales/${encodeURIComponent(saleId)}/documents/${encodeURIComponent(docId)}/editor`
  );
}

export async function updateSaleDocumentContent(
  saleId: string,
  docId: string,
  contentHtml: string
): Promise<any> {
  return apiFetch(
    `/sales/${encodeURIComponent(saleId)}/documents/${encodeURIComponent(docId)}/content`,
    {
      method: "PATCH",
      body: JSON.stringify({ contentHtml }),
    }
  );
}

export async function deleteSaleDocument(saleId: string, docId: string): Promise<any> {
  return apiFetch(`/sales/${encodeURIComponent(saleId)}/documents/${encodeURIComponent(docId)}`, {
    method: "DELETE",
  });
}

// Funções públicas de assinatura
export async function getPublicDocument(token: string): Promise<any> {
  return apiFetch(`/public/documents/${encodeURIComponent(token)}`);
}

export async function requestPublicOtp(
  token: string,
  cpf: string
): Promise<{ success: boolean; message: string; emailMasked: string }> {
  return apiFetch(`/public/documents/${encodeURIComponent(token)}/request-otp`, {
    method: "POST",
    body: JSON.stringify({ cpf }),
  });
}

export async function verifyPublicOtp(token: string, code: string): Promise<{ verified: boolean }> {
  return apiFetch(`/public/documents/${encodeURIComponent(token)}/verify-otp`, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function signPublicDocument(
  token: string,
  data: { signatureImage: string; signerName: string; signerCpf?: string }
): Promise<{ signed: boolean; signedAt: string; signedPdfHash: string }> {
  return apiFetch(`/public/documents/${encodeURIComponent(token)}/sign`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
