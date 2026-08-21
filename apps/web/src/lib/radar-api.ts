async function apiProxy(
  method: string,
  path: string,
  body?: unknown,
  organizationId?: string | null
): Promise<Response> {
  const url = `/api/proxy${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (organizationId) headers["x-organization-id"] = organizationId;
  return fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
}

export interface RadarSearchParams {
  uf?: string;
  cityName?: string;
  neighborhood?: string;
  classType?: string;
  opportunityType?: string;
}

export async function fetchRadarInstallations(
  params: RadarSearchParams,
  organizationId?: string | null
) {
  const q = new URLSearchParams();
  if (params.uf) q.set("uf", params.uf);
  if (params.cityName) q.set("cityName", params.cityName);
  if (params.neighborhood) q.set("neighborhood", params.neighborhood);
  if (params.classType && params.classType !== "ALL") q.set("classType", params.classType);
  if (params.opportunityType && params.opportunityType !== "ALL") {
    q.set("opportunityType", params.opportunityType);
  }

  const res = await apiProxy(
    "GET",
    `/radar/installations?${q.toString()}`,
    undefined,
    organizationId
  );
  if (!res.ok) {
    throw new Error("Falha ao buscar usinas no Radar Solar.");
  }
  return res.json();
}

export async function convertRadarToLead(
  payload: {
    installationId: string;
    name: string;
    whatsapp: string;
    neighborhood?: string;
    city?: string;
    uf?: string;
    systemPowerKwp?: string;
    notes?: string;
  },
  organizationId?: string | null
) {
  const res = await apiProxy("POST", "/radar/convert-lead", payload, organizationId);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Falha ao converter lead do radar.");
  }
  return res.json();
}
