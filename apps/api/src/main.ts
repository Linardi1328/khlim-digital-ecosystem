import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import { loadApiRuntimeConfig } from "./environment";
import { createStructuredLogger } from "./logger";
import { createOpenApiDocument } from "./openapi";

interface HeaderResponse {
  setHeader(name: string, value: string): void;
}

function getCorsAllowedOrigins(
  environment: NodeJS.ProcessEnv = process.env,
): string[] {
  return (environment.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => {
      const parsed = new URL(origin);
      if (parsed.origin !== origin.replace(/\/$/, "")) {
        throw new Error(`CORS origin must not include a path: ${origin}`);
      }
      return parsed.origin;
    });
}

function redactBootstrapErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  return message
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgresql://[redacted]@")
    .replace(
      /((?:password|secret|token|api[-_]?key|key)=)[^&\s]+/gi,
      "$1[redacted]",
    );
}

function writeBootstrapEvent(
  level: "info" | "fatal",
  event: string,
  metadata: Record<string, unknown> = {},
): void {
  const stream = level === "fatal" ? process.stderr : process.stdout;
  stream.write(
    `${JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service: "khlim-api",
      event,
      ...metadata,
    })}\n`,
  );
}

async function bootstrap() {
  writeBootstrapEvent("info", "api.bootstrap.start", {
    nodeEnv: process.env.NODE_ENV ?? null,
    deploymentEnv: process.env.KHLIM_ENV ?? null,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
    hasSupabaseJwtIssuer: Boolean(process.env.SUPABASE_JWT_ISSUER?.trim()),
  });

  const runtime = loadApiRuntimeConfig();
  writeBootstrapEvent("info", "api.bootstrap.runtime.loaded", {
    nodeEnv: runtime.nodeEnv,
    deploymentEnv: runtime.deploymentEnv,
    port: runtime.port,
  });

  await import("./instrument.js");
  const { AppModule } = await import("./app.module.js");

  const logger = createStructuredLogger({
    service: "khlim-api",
    deploymentEnv: runtime.deploymentEnv,
  });
  logger.info("api.bootstrap.nest.creating");

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    logger,
    rawBody: true,
  });
  logger.info("api.bootstrap.nest.created");

  app.setGlobalPrefix("v1");
  app.enableShutdownHooks();

  const expressApp = app.getHttpAdapter().getInstance() as {
    disable(name: string): void;
  };
  expressApp.disable("x-powered-by");

  app.use(
    (_request: unknown, response: HeaderResponse, next: () => void): void => {
      response.setHeader("X-Content-Type-Options", "nosniff");
      response.setHeader("X-Frame-Options", "DENY");
      response.setHeader("Referrer-Policy", "no-referrer");
      response.setHeader(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), payment=()",
      );
      response.setHeader("Cache-Control", "no-store");

      if (runtime.deploymentEnv === "production") {
        response.setHeader(
          "Content-Security-Policy",
          "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
        );
        response.setHeader("Strict-Transport-Security", "max-age=31536000");
      }

      next();
    },
  );

  const corsAllowedOrigins = getCorsAllowedOrigins();
  if (corsAllowedOrigins.length > 0) {
    app.enableCors({ origin: corsAllowedOrigins });
  }

  const apiDocsEnabled =
    runtime.deploymentEnv !== "production" ||
    process.env.KHLIM_API_DOCS_ENABLED === "1";
  if (apiDocsEnabled) {
    const document = createOpenApiDocument(app);
    SwaggerModule.setup("docs", app, document);
  }

  logger.info("api.bootstrap.listening", { port: runtime.port });
  await app.listen(runtime.port, "0.0.0.0");
  logger.info("api.started", {
    port: runtime.port,
    nodeEnv: runtime.nodeEnv,
  });
}

void bootstrap().catch((error: unknown) => {
  writeBootstrapEvent("fatal", "api.bootstrap.failed", {
    errorName: error instanceof Error ? error.name : "UnknownError",
    message: redactBootstrapErrorMessage(error),
  });
  throw error;
});
