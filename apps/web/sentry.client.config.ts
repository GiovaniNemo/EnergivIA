// Sentry — client side (Browser runtime). Roda no navegador dos clientes.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn:
    process.env["NEXT_PUBLIC_SENTRY_DSN"] ??
    process.env["SENTRY_DSN"] ??
    "https://fa7488b34496895a6a8316cc5d8abc7d@o4512181952315392.ingest.us.sentry.io/4512182047342592",
  environment: process.env["NEXT_PUBLIC_VERCEL_ENV"] ?? process.env["NODE_ENV"] ?? "development",
  release:
    process.env["NEXT_PUBLIC_SENTRY_RELEASE"] ?? process.env["NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA"],

  // Amostragem de performance controlada para o cliente
  tracesSampleRate: Number(process.env["NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE"] ?? 0.05),

  // LGPD: não enviar PII sensível sem consentimento
  sendDefaultPii: false,

  // Ignorar erros comuns causados por extensões de navegador ou WebViews antigas
  ignoreErrors: [
    "TypeError: Cannot read properties of undefined (reading 'getReader')",
    "scrollTo is not a function",
    "ResizeObserver loop completed with undelivered notifications",
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
  ],
});
