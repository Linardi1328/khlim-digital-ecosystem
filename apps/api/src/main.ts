import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { loadApiRuntimeConfig } from "./environment";

async function bootstrap() {
  const runtime = loadApiRuntimeConfig();
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
}

void bootstrap();
