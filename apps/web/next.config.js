/**
 * Security headers aplicados em TODA resposta do Next.
 *   - HSTS: força HTTPS (browser memoriza por 2 anos, inclui subdomínios)
 *   - X-Frame-Options: previne clickjacking (proposta pública pode ser iframe-ada, então usamos SAMEORIGIN)
 *   - X-Content-Type-Options: trava sniff de MIME
 *   - Referrer-Policy: vaza pouco referrer pra terceiros
 *   - Permissions-Policy: nega features sensíveis (microfone, camera, geolocation) por default
 *
 * CSP fica de fora por enquanto — requer auditoria das origens (Auth0, S3,
 * Vercel, etc) pra não quebrar nada. Ativar em commit separado.
 */
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@energivia/ui", "@energivia/utils", "@energivia/tokens"],
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.energivia.com.br",
      },
      {
        protocol: "https",
        hostname: "energivia.com.br",
      },
      {
        protocol: "https",
        hostname: "*.vercel.app",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

/**
 * Sentry wrapper — fica no-op se SENTRY_DSN/AUTH_TOKEN não estão setados.
 * Em CI/prod com tokens, o plugin faz source map upload pra stack traces legíveis.
 *
 * Combinação dos defaults do wizard + ajustes nossos:
 *   - org/project com fallback hardcoded (funciona sem env)
 *   - tunnelRoute pra driblar ad-blockers
 *   - hideSourceMaps + disableLogger (output mais limpo)
 *   - automaticVercelMonitors (Cron) + tree-shaking dos logs de debug (bundle menor)
 */
const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  org: process.env.SENTRY_ORG || "energivia",
  project: process.env.SENTRY_PROJECT || "energivia-web",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  tunnelRoute: "/monitoring",
  automaticVercelMonitors: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
