import * as Sentry from "@sentry/nestjs";
import { scrubRegistrationEvent } from "./observability/registration-privacy";

const dsn = process.env.SENTRY_DSN?.trim();

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment: process.env.KHLIM_ENV ?? "development",
  sendDefaultPii: false,
  beforeSend: (event) => scrubRegistrationEvent(event),
  tracesSampleRate: 0,
});
