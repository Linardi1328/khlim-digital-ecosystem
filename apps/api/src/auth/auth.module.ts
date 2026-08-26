import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { IdentityModule } from "../identity/identity.module";
import { AuthenticatedUserGuard } from "./authenticated-user.guard";
import { AuthorizationGuard } from "./authorization.guard";
import { SupabaseJwtService } from "./supabase-jwt.service";

@Module({
  imports: [IdentityModule],
  providers: [
    SupabaseJwtService,
    {
      provide: APP_GUARD,
      useClass: AuthenticatedUserGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthorizationGuard,
    },
  ],
})
export class AuthModule {}
