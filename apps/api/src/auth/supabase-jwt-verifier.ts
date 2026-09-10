import type { JWTPayload } from "jose";

type JoseModule = typeof import("jose");
type RemoteJwkSet = ReturnType<JoseModule["createRemoteJWKSet"]>;

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

  const audience = options.audience ?? "authenticated";
  const jwksUrl = new URL(`${issuer}/.well-known/jwks.json`);
  let joseRuntime: Promise<JoseModule> | null = null;
  let jwks: RemoteJwkSet | null = null;

  function loadJose(): Promise<JoseModule> {
    joseRuntime ??= import("jose");
    return joseRuntime;
  }

  return async function verifySupabaseJwt(
    token: string,
  ): Promise<VerifiedSupabaseIdentity> {
    const { createRemoteJWKSet, jwtVerify } = await loadJose();
    jwks ??= createRemoteJWKSet(jwksUrl);

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
