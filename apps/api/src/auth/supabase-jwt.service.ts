import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  createSupabaseJwtVerifier,
  type VerifiedSupabaseIdentity,
} from "./supabase-jwt-verifier";

@Injectable()
export class SupabaseJwtService {
  private verifier: ReturnType<typeof createSupabaseJwtVerifier> | null = null;

  async verify(token: string): Promise<VerifiedSupabaseIdentity> {
    const verifier = this.getVerifier();

    try {
      return await verifier(token);
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }

  private getVerifier(): ReturnType<typeof createSupabaseJwtVerifier> {
    if (this.verifier) {
      return this.verifier;
    }

    const issuer = process.env.SUPABASE_JWT_ISSUER?.trim();

    if (!issuer) {
      throw new ServiceUnavailableException(
        "Authentication service is not configured",
      );
    }

    try {
      this.verifier = createSupabaseJwtVerifier({ issuer });
      return this.verifier;
    } catch {
      throw new ServiceUnavailableException(
        "Authentication service is not configured",
      );
    }
  }
}
