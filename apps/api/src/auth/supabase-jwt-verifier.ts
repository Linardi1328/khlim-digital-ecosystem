import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export interface SupabaseJwtVerifierOptions {
  issuer: string;
  audience?: string;
}

export interface VerifiedSupabaseIdentity {
  subject: string;
  email?: string;
  payload: JWTPayload;
}

export function createSupabaseJwtVerifier(options: SupabaseJwtVerifierOptions) {
  const issuer = options.issuer.trim().replace(/\/+$/, "");

  if (!issuer) {
    throw new Error("Supabase JWT issuer is required");
  }

  const issuerUrl = new URL(issuer);

  if (issuerUrl.protocol !== "https:" && issuerUrl.hostname !== "localhost") {
    throw new Error("Supabase JWT issuer must use HTTPS outside localhost");
  }

  const jwks = createRemoteJWKSet(
    new URL(`${issuer}/.well-known/jwks.json`),
  );
  const audience = options.audience ?? "authenticated";

  return async function verifySupabaseJwt(
    token: string,
  ): Promise<VerifiedSupabaseIdentity> {
    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      audience,
    });

    if (!payload.sub) {
      throw new Error("Verified Supabase JWT is missing a subject");
    }

    return {
      subject: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      payload,
    };
  };
}
