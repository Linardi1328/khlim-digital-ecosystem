export interface AuthenticatedUserContext {
  id: string;
  authProviderSubject: string;
  email: string | null;
  preferredLocale: string;
  roles: string[];
}

export interface AuthenticatedRequest {
  headers: {
    authorization?: string | string[];
  };
  params?: Record<string, string | undefined>;
  authenticatedUser?: AuthenticatedUserContext;
}
