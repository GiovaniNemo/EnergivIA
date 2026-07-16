import * as Sentry from "@sentry/nestjs";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

const dsn =
  process.env["SENTRY_DSN"] ||
  "https://5a02c5a0dd91a301695d310d2ac77c59@o4511504298278912.ingest.us.sentry.io/4511504535846912";

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env["NODE_ENV"] ?? "development",
    release: process.env["SENTRY_RELEASE"] ?? process.env["RAILWAY_GIT_COMMIT_SHA"],
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: Number(process.env["SENTRY_TRACES_SAMPLE_RATE"] ?? 0.1),
    profilesSampleRate: Number(process.env["SENTRY_PROFILES_SAMPLE_RATE"] ?? 0.1),
    sendDefaultPii: false,
  });
}
