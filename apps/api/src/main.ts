import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { loadApiRuntimeConfig } from "./environment";
import { createStructuredLogger } from "./logger";

async function bootstrap() {
  const runtime = loadApiRuntimeConfig();
  const logger = createStructuredLogger({
    deploymentEnv: runtime.deploymentEnv,
    service: "khlim-api",
  });
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.setGlobalPrefix("v1");
  app.enableShutdownHooks();

  const openApiConfig = new DocumentBuilder()
    .setTitle("KHLIM API")
    .setDescription("Shared API for the KHLIM Digital Sports Ecosystem")
    .setVersion("1.0")
    .build();

  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup("docs", app, document);

  await app.listen(runtime.port, "0.0.0.0");
  logger.info("api.started", {
    port: runtime.port,
    nodeEnv: runtime.nodeEnv,
  });
}

void bootstrap();
