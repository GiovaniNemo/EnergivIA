import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (process.env["NEXT_PUBLIC_APP_URL"] || "https://energivia.com.br").replace(
    /\/$/,
    ""
  );

  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/software-integrador-solar",
        "/simulacao-energia-solar",
        "/proposta-energia-solar",
        "/crm-energia-solar",
        "/termos-de-uso",
        "/privacidade",
      ],
      disallow: [
        "/admin/",
        "/api/",
        "/dashboard/",
        "/settings/",
        "/gestao/",
        "/proposta/",
        "/internal/",
        "/sentry-example-page/",
        "/success/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
