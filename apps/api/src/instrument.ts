import * as Sentry from "@sentry/nestjs";

const dsn = process.env.SENTRY_DSN?.trim();

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment: process.env.KHLIM_ENV ?? "development",
  sendDefaultPii: false,
  tracesSampleRate: 0,
});
