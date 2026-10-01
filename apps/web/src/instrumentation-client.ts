import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn:
    process.env["NEXT_PUBLIC_SENTRY_DSN"] ??
    "https://fa7488b34496895a6a8316cc5d8abc7d@o4512181952315392.ingest.us.sentry.io/4512182047342592",
  environment: process.env["NEXT_PUBLIC_VERCEL_ENV"] ?? process.env["NODE_ENV"],
  release:
    process.env["NEXT_PUBLIC_SENTRY_RELEASE"] ?? process.env["NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA"],

  tracesSampleRate: 0.1,

  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.5,
  integrations: [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })],

  sendDefaultPii: false,

  enableLogs: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
