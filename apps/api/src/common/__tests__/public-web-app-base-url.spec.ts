import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolvePublicWebAppBaseUrl, resolveAuthAppBaseUrl } from "../public-web-app-base-url";

describe("public-web-app-base-url resolution", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should default to http://localhost:3000 when no environment variables are set in development", () => {
    delete process.env["PUBLIC_PROPOSAL_SITE_URL"];
    delete process.env["FRONTEND_URL"];
    delete process.env["WEB_APP_URL"];
    delete process.env["APP_BASE_URL"];
    delete process.env["PUBLIC_WEB_APP_BASE_URL"];
    delete process.env["NEXT_PUBLIC_APP_URL"];
    delete process.env["NODE_ENV"];

    expect(resolvePublicWebAppBaseUrl()).toBe("http://localhost:3000");
  });

  it("should default to https://www.energivia.com.br in production when no environment variables are set", () => {
    delete process.env["PUBLIC_PROPOSAL_SITE_URL"];
    delete process.env["FRONTEND_URL"];
    delete process.env["WEB_APP_URL"];
    delete process.env["APP_BASE_URL"];
    delete process.env["PUBLIC_WEB_APP_BASE_URL"];
    delete process.env["NEXT_PUBLIC_APP_URL"];
    process.env["NODE_ENV"] = "production";

    expect(resolvePublicWebAppBaseUrl()).toBe("https://www.energivia.com.br");
    expect(resolveAuthAppBaseUrl()).toBe("https://app.energivia.com.br");
  });

  it("should prioritize PUBLIC_PROPOSAL_SITE_URL and strip trailing slashes", () => {
    process.env["PUBLIC_PROPOSAL_SITE_URL"] = "https://propostas.minhaempresa.com.br///";
    process.env["FRONTEND_URL"] = "https://app.minhaempresa.com.br";

    expect(resolvePublicWebAppBaseUrl()).toBe("https://propostas.minhaempresa.com.br");
  });

  it("should fallback to FRONTEND_URL if PUBLIC_PROPOSAL_SITE_URL is absent", () => {
    delete process.env["PUBLIC_PROPOSAL_SITE_URL"];
    process.env["FRONTEND_URL"] = "https://app.energivia.com.br";

    expect(resolvePublicWebAppBaseUrl()).toBe("https://app.energivia.com.br");
  });

  it("should resolve resolveAuthAppBaseUrl prioritizing APP_SUBDOMAIN_URL", () => {
    process.env["APP_SUBDOMAIN_URL"] = "https://auth.energivia.com.br/";
    expect(resolveAuthAppBaseUrl()).toBe("https://auth.energivia.com.br");
  });
});
