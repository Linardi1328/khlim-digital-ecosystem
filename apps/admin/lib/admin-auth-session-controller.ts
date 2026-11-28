import type { AdminSession, AdminUser, StaffRole } from "./types";

const STAFF_ROLE_SET = new Set<StaffRole>([
  "SUPER_ADMIN",
  "MANAGEMENT",
  "FINANCE_ADMIN",
  "ACADEMY_ADMIN",
  "HEAD_COACH",
  "COACH",
  "EVENT_STAFF",
]);

const ROLE_PRIORITY: StaffRole[] = [
  "SUPER_ADMIN",
  "MANAGEMENT",
  "FINANCE_ADMIN",
  "ACADEMY_ADMIN",
  "HEAD_COACH",
  "COACH",
  "EVENT_STAFF",
];

export interface AdminAuthSessionState {
  user: AdminUser | null;
  role: StaffRole | null;
  isLoading: boolean;
  authError: string | null;
}

export interface AdminAuthSessionDeps {
  storageKey: string;
  restoreSession: () => Promise<{ access_token: string } | null>;
  getAdminSession: () => Promise<AdminSession>;
  signIn: (email: string, password: string) => Promise<unknown>;
  signOut: () => Promise<void>;
  invalidateSessionOperations: () => void;
}

export interface StorageChangeLike {
  key: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  isSameStorageArea?: boolean;
}

export function toStaffRoles(roles: string[]): StaffRole[] {
  return roles.filter((role): role is StaffRole =>
    STAFF_ROLE_SET.has(role as StaffRole),
  );
}

export function choosePrimaryRole(roles: StaffRole[]): StaffRole | null {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? roles[0] ?? null;
}

export function toAdminUser(session: AdminSession): AdminUser | null {
  const roles = toStaffRoles(session.roles);
  const role = choosePrimaryRole(roles);
  if (!role) return null;

  return {
    id: session.id,
    organizationId: session.organizationId ?? null,
    email: session.email ?? "",
    displayName: session.displayName,
    role,
    roles,
    mfaEnabled: session.mfaSatisfied,
    mfaSatisfied: session.mfaSatisfied,
    preferredLocale: session.preferredLocale,
    authenticatorAssuranceLevel: session.authenticatorAssuranceLevel,
  };
}

/**
 * Pure, testable fail-closed controller for real (non-demo) admin staff
 * authentication transitions.
 *
 * Guarantees:
 * 1. Relevant cross-tab storage changes, explicit refreshes, and sign-in
 *    transitions synchronously clear the previous authorized user/role and
 *    set `isLoading: true` BEFORE awaiting session restoration or `/admin/session`.
 * 2. Every async success, failure, and `finally` handler is guarded by a
 *    monotonic `sessionLoadSeq` generation, so a superseded request failure
 *    or completion can never overwrite or clear a newer valid session.
 * 3. Logout synchronously bumps the generation, invalidates pending token
 *    refresh operations, and clears auth state before awaiting remote sign-out.
 */
export class AdminAuthSessionController {
  private readonly deps: AdminAuthSessionDeps;
  private readonly onStateChange: (next: AdminAuthSessionState) => void;
  private state: AdminAuthSessionState;
  private sessionLoadSeq = 0;
  private disposed = false;
  private lastUserId: string | null = null;
  private lastOrganizationId: string | null = null;
  private lastPreferredRole: StaffRole | null = null;

  constructor(
    deps: AdminAuthSessionDeps,
    onStateChange: (next: AdminAuthSessionState) => void,
    initialState?: Partial<AdminAuthSessionState>,
  ) {
    this.deps = deps;
    this.onStateChange = onStateChange;
    this.state = {
      user: initialState?.user ?? null,
      role: initialState?.role ?? null,
      isLoading: initialState?.isLoading ?? true,
      authError: initialState?.authError ?? null,
    };
  }

  getState(): AdminAuthSessionState {
    return this.state;
  }

  getGeneration(): number {
    return this.sessionLoadSeq;
  }

  private commit(patch: Partial<AdminAuthSessionState>): void {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    this.onStateChange(this.state);
  }

  private isCurrent(seq: number): boolean {
    return !this.disposed && this.sessionLoadSeq === seq;
  }

  dispose(): void {
    this.disposed = true;
    this.sessionLoadSeq += 1;
  }

  setWorkViewRole(newRole: StaffRole): void {
    if (!this.state.user || !this.state.user.roles.includes(newRole)) return;
    this.lastPreferredRole = newRole;
    this.commit({
      role: newRole,
      user: { ...this.state.user, role: newRole },
    });
  }

  private async runSessionLoad(
    seq: number,
    fallbackErrorMessage: string,
    options: { rethrow?: boolean; manageLoading?: boolean } = {},
  ): Promise<void> {
    const manageLoading = options.manageLoading ?? true;
    try {
      const session = await this.deps.restoreSession();
      if (!this.isCurrent(seq)) return;

      if (!session) {
        this.lastUserId = null;
        this.lastOrganizationId = null;
        this.lastPreferredRole = null;
        this.commit({ user: null, role: null, authError: null });
        return;
      }

      const resolved = await this.deps.getAdminSession();
      if (!this.isCurrent(seq)) return;

      const adminUser = toAdminUser(resolved);
      if (!adminUser) {
        await this.deps.signOut().catch(() => undefined);
        if (!this.isCurrent(seq)) return;
        throw new Error("This account does not have KHLIM staff access.");
      }

      const sameContext =
        this.lastUserId === adminUser.id &&
        this.lastOrganizationId === (adminUser.organizationId ?? null);
      const nextRole =
        sameContext &&
        this.lastPreferredRole &&
        adminUser.roles.includes(this.lastPreferredRole)
          ? this.lastPreferredRole
          : adminUser.role;

      this.lastUserId = adminUser.id;
      this.lastOrganizationId = adminUser.organizationId ?? null;
      this.lastPreferredRole = nextRole;

      this.commit({
        user: { ...adminUser, role: nextRole },
        role: nextRole,
        authError: null,
      });
    } catch (error) {
      if (!this.isCurrent(seq)) return;
      this.lastUserId = null;
      this.lastOrganizationId = null;
      this.lastPreferredRole = null;
      const message =
        error instanceof Error ? error.message : fallbackErrorMessage;
      this.commit({
        user: null,
        role: null,
        authError: message,
      });
      if (options.rethrow) {
        throw error;
      }
    } finally {
      if (manageLoading && this.isCurrent(seq)) {
        this.commit({ isLoading: false });
      }
    }
  }

  bootstrap(): Promise<void> {
    const seq = ++this.sessionLoadSeq;
    this.commit({
      user: null,
      role: null,
      isLoading: true,
      authError: null,
    });
    return this.runSessionLoad(seq, "Staff session could not be restored.");
  }

  handleStorageChange(event: StorageChangeLike): Promise<void> | null {
    if (event.isSameStorageArea === false) return null;
    if (event.key !== null && event.key !== this.deps.storageKey) {
      return null;
    }

    // Fail closed immediately before awaiting restoration or /admin/session.
    this.deps.invalidateSessionOperations();
    const seq = ++this.sessionLoadSeq;
    this.commit({
      user: null,
      role: null,
      isLoading: true,
      authError: null,
    });
    return this.runSessionLoad(seq, "Staff session could not be restored.");
  }

  async signIn(email: string, password: string): Promise<void> {
    this.deps.invalidateSessionOperations();
    const seq = ++this.sessionLoadSeq;
    this.lastUserId = null;
    this.lastOrganizationId = null;
    this.lastPreferredRole = null;
    this.commit({
      user: null,
      role: null,
      isLoading: true,
      authError: null,
    });

    try {
      await this.deps.signIn(email.trim(), password);
      if (!this.isCurrent(seq)) return;
      await this.runSessionLoad(seq, "Staff sign-in failed.", {
        rethrow: true,
        manageLoading: false,
      });
    } catch (error) {
      if (!this.isCurrent(seq)) return;
      await this.deps.signOut().catch(() => undefined);
      if (!this.isCurrent(seq)) return;
      const message =
        error instanceof Error ? error.message : "Staff sign-in failed.";
      this.commit({
        user: null,
        role: null,
        authError: message,
      });
      throw error;
    } finally {
      if (this.isCurrent(seq)) {
        this.commit({ isLoading: false });
      }
    }
  }

  refreshSession(): Promise<void> {
    const seq = ++this.sessionLoadSeq;
    this.commit({
      user: null,
      role: null,
      isLoading: true,
      authError: null,
    });
    return this.runSessionLoad(seq, "Staff session refresh failed.", {
      rethrow: true,
    });
  }

  async logout(): Promise<void> {
    this.sessionLoadSeq += 1;
    this.lastUserId = null;
    this.lastOrganizationId = null;
    this.lastPreferredRole = null;
    this.deps.invalidateSessionOperations();
    this.commit({
      user: null,
      role: null,
      isLoading: false,
      authError: null,
    });
    await this.deps.signOut().catch(() => undefined);
  }
}
