import "./instrument";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { loadApiRuntimeConfig } from "./environment";
import { createStructuredLogger } from "./logger";
import { createOpenApiDocument } from "./openapi";

function getCorsAllowedOrigins(environment: NodeJS.ProcessEnv = process.env): string[] {
  return (environment.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const runtime = loadApiRuntimeConfig();
  const logger = createStructuredLogger({
    service: "khlim-api",
    deploymentEnv: runtime.deploymentEnv,
  });
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    logger,
    rawBody: true,
  });

  app.setGlobalPrefix("v1");
  app.enableShutdownHooks();

  const corsAllowedOrigins = getCorsAllowedOrigins();
  if (corsAllowedOrigins.length > 0) {
    app.enableCors({ origin: corsAllowedOrigins });
  }

  const document = createOpenApiDocument(app);
  SwaggerModule.setup("docs", app, document);

  await app.listen(runtime.port, "0.0.0.0");
  logger.info("api.started", {
    port: runtime.port,
    nodeEnv: runtime.nodeEnv,
  });
}

void bootstrap();
