// Sentry — server side (Node runtime). Roda em todas requests handled
// pelo runtime nodejs do Next.js (route handlers, server components, etc).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn:
    process.env["SENTRY_DSN"] ??
    "https://fa7488b34496895a6a8316cc5d8abc7d@o4512181952315392.ingest.us.sentry.io/4512182047342592",
  environment: process.env["VERCEL_ENV"] ?? process.env["NODE_ENV"] ?? "development",
  release: process.env["SENTRY_RELEASE"] ?? process.env["VERCEL_GIT_COMMIT_SHA"],

  // 10% das traces — wizard defaulta pra 100% (estoura quota Sentry rápido em prod).
  tracesSampleRate: Number(process.env["SENTRY_TRACES_SAMPLE_RATE"] ?? 0.1),

  // LGPD: não enviar PII (IP, cookies, body) sem opt-in.
  // Wizard defaulta pra true.
  sendDefaultPii: false,

  // Envia console.log/warn/error pro Sentry como logs separados (beta).
  enableLogs: true,
});
