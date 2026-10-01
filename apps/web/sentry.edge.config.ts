// Sentry — edge runtime (middleware, edge routes). Roda no Vercel Edge
// Functions e no equivalente local. Config separada porque o runtime
// não tem todo o Node API.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn:
    process.env["SENTRY_DSN"] ??
    "https://fa7488b34496895a6a8316cc5d8abc7d@o4512181952315392.ingest.us.sentry.io/4512182047342592",
  environment: process.env["VERCEL_ENV"] ?? process.env["NODE_ENV"] ?? "development",
  release: process.env["SENTRY_RELEASE"] ?? process.env["VERCEL_GIT_COMMIT_SHA"],

  tracesSampleRate: Number(process.env["SENTRY_TRACES_SAMPLE_RATE"] ?? 0.1),
  sendDefaultPii: false,
  enableLogs: true,
});
