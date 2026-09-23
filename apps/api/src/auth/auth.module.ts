import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { FamilyModule } from "../family/family.module";
import { IdentityModule } from "../identity/identity.module";
import { OrganizationModule } from "../organization/organization.module";
import { AuthenticatedUserGuard } from "./authenticated-user.guard";
import { AuthorizationGuard } from "./authorization.guard";
import { SupabaseJwtService } from "./supabase-jwt.service";

@Module({
  imports: [IdentityModule, FamilyModule, OrganizationModule],
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
