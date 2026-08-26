export type AuthenticatorAssuranceLevel = "aal1" | "aal2" | null;

export interface AuthenticatedUserContext {
  id: string;
  authProviderSubject: string;
  email: string | null;
  preferredLocale: string;
  roles: string[];
  authenticatorAssuranceLevel: AuthenticatorAssuranceLevel;
}

export interface AuthenticatedRequest {
  headers: {
    authorization?: string | string[];
  };
  params?: Record<string, string | undefined>;
  authenticatedUser?: AuthenticatedUserContext;
}
