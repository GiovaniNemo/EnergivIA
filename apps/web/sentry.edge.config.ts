// Sentry — edge runtime (middleware, edge routes). Roda no Vercel Edge
// Functions e no equivalente local. Config separada porque o runtime
// não tem todo o Node API.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://41f1843579a370f78d94d2e0af692fc7@o4511504298278912.ingest.us.sentry.io/4511504396386304",
  environment: process.env["VERCEL_ENV"] ?? process.env["NODE_ENV"] ?? "development",
  release: process.env["SENTRY_RELEASE"] ?? process.env["VERCEL_GIT_COMMIT_SHA"],

  tracesSampleRate: Number(process.env["SENTRY_TRACES_SAMPLE_RATE"] ?? 0.1),
  sendDefaultPii: false,
  enableLogs: true,
});
