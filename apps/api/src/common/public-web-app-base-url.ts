export function resolvePublicWebAppBaseUrl(): string {
  const candidates = [
    process.env["PUBLIC_PROPOSAL_SITE_URL"],
    process.env["FRONTEND_URL"],
    process.env["WEB_APP_URL"],
    process.env["APP_BASE_URL"],
  ];
  for (const raw of candidates) {
    if (typeof raw !== "string") continue;
    const t = raw.trim().replace(/\/+$/, "");
    if (/^https?:\/\//i.test(t)) return t;
  }
  return "http://localhost:3000";
}

export function resolveAuthAppBaseUrl(): string {
  const candidates = [process.env["APP_SUBDOMAIN_URL"], process.env["APP_BASE_URL"]];
  for (const raw of candidates) {
    if (typeof raw !== "string") continue;
    const t = raw.trim().replace(/\/+$/, "");
    if (/^https?:\/\//i.test(t)) return t;
  }
  return "http://localhost:3000";
}
