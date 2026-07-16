import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://41f1843579a370f78d94d2e0af692fc7@o4511504298278912.ingest.us.sentry.io/4511504396386304",
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
