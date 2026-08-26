import "./instrument";
import "reflect-metadata";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { createOpenApiDocument } from "./openapi";

async function exportOpenApi(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("v1");

  const document = createOpenApiDocument(app);
  const outputPath = resolve(process.cwd(), "../../openapi/khlim-v1.json");

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
  await app.close();
}

void exportOpenApi();
