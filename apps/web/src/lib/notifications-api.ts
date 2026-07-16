export const ENERGIVIA_NOTIFICATIONS_REFRESH_EVENT = "energivia:notifications-refresh";

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

export type UserNotificationDto = {
  id: string;
  type: string;
  title: string;
  message: string;
  linkPath: string;
  readAt: string | null;
  createdAt: string;
};

export async function listNotifications(
  organizationId: string | null,
  options?: { limit?: number; unreadOnly?: boolean }
): Promise<UserNotificationDto[]> {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.unreadOnly) params.set("unreadOnly", "1");
  const q = params.toString();
  const path = `/notifications${q ? `?${q}` : ""}`;
  const res = await apiProxy("GET", path, undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<UserNotificationDto[]>;
}

export async function getUnreadNotificationCount(organizationId: string | null): Promise<number> {
  const res = await apiProxy("GET", "/notifications/unread-count", undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  const body = (await res.json()) as { count?: number };
  return typeof body.count === "number" ? body.count : 0;
}

export async function markNotificationRead(
  organizationId: string | null,
  id: string
): Promise<void> {
  const res = await apiProxy("PATCH", `/notifications/${id}/read`, undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
}

export async function markAllNotificationsRead(organizationId: string | null): Promise<void> {
  const res = await apiProxy("POST", "/notifications/read-all", undefined, organizationId);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? `HTTP ${res.status}`);
  }
}

function parseApiErrorMessage(body: unknown, status: number): string {
  const o = body as { message?: string | string[] };
  if (Array.isArray(o.message)) return o.message.join(" ");
  if (typeof o.message === "string" && o.message.trim()) return o.message;
  return `HTTP ${status}`;
}

export async function notifyOnboardingTemplatesReady(
  organizationId: string | null,
  templateCount: number
): Promise<void> {
  const res = await apiProxy(
    "POST",
    "/notifications/onboarding-templates-ready",
    { templateCount },
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(parseApiErrorMessage(err, res.status));
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ENERGIVIA_NOTIFICATIONS_REFRESH_EVENT));
  }
}

export async function notifyOnboardingTemplateReady(
  organizationId: string | null,
  payload: {
    proposalTemplateId: string;
    templateName: string;
    businessSegmentLabel: string;
  }
): Promise<void> {
  const res = await apiProxy(
    "POST",
    "/notifications/onboarding-template-ready",
    payload,
    organizationId
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(parseApiErrorMessage(err, res.status));
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ENERGIVIA_NOTIFICATIONS_REFRESH_EVENT));
  }
}
