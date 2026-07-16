import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

const dsn = process.env["SENTRY_DSN"];
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env["NODE_ENV"] ?? "development",
    release: process.env["SENTRY_RELEASE"] ?? process.env["RAILWAY_GIT_COMMIT_SHA"],
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: Number(process.env["SENTRY_TRACES_SAMPLE_RATE"] ?? 0.1),
    profilesSampleRate: Number(process.env["SENTRY_PROFILES_SAMPLE_RATE"] ?? 0.1),
    sendDefaultPii: false,
    serverName: "worker",
  });
}
