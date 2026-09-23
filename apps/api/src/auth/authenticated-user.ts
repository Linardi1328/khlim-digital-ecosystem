export type AuthenticatorAssuranceLevel = "aal1" | "aal2" | null;

export interface AuthenticatedOrganizationContext {
  id: string;
  slug: string;
  name: string;
}

export interface AuthenticatedUserContext {
  id: string;
  authProviderSubject: string;
  email: string | null;
  preferredLocale: string;
  /**
   * Effective roles for the active organization context. Participant roles
   * remain platform-level while staff authority comes from organization roles.
   */
  roles: string[];
  /** Legacy/global assignments retained during the compatibility migration. */
  platformRoles?: string[];
  organizationRoles?: string[];
  organization?: AuthenticatedOrganizationContext;
  authenticatorAssuranceLevel: AuthenticatorAssuranceLevel;
}

export interface AuthenticatedRequest {
  headers: {
    authorization?: string | string[];
    "x-khlim-organization"?: string | string[];
  };
  params?: Record<string, string | undefined>;
  authenticatedUser?: AuthenticatedUserContext;
}
