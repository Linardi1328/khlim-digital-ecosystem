import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle("KHLIM API")
    .setDescription("Shared API for the KHLIM Digital Sports Ecosystem")
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Supabase access token",
      },
      "supabase",
    )
    .build();

  return SwaggerModule.createDocument(app, config);
}
