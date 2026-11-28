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
  isRevalidating: boolean;
  authTransitionSeq: number;
  workspaceEpoch: number;
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

function normalizedRolesKey(roles: readonly StaffRole[]): string {
  return [...new Set(roles)].sort().join(",");
}

export function isSameVerifiedAuthorizationContext(
  prev: AdminUser | null,
  prevRole: StaffRole | null,
  next: AdminUser,
  nextRole: StaffRole,
): boolean {
  if (!prev || !prevRole) return false;
  return (
    prev.id === next.id &&
    (prev.organizationId ?? null) === (next.organizationId ?? null) &&
    prevRole === nextRole &&
    Boolean(prev.mfaSatisfied ?? prev.mfaEnabled) ===
      Boolean(next.mfaSatisfied ?? next.mfaEnabled) &&
    (prev.authenticatorAssuranceLevel ?? null) ===
      (next.authenticatorAssuranceLevel ?? null) &&
    normalizedRolesKey(prev.roles) === normalizedRolesKey(next.roles)
  );
}

/**
 * Pure, testable fail-closed controller for real (non-demo) admin staff
 * authentication transitions.
 *
 * Guarantees:
 * 1. During cross-tab credential changes or explicit session revalidation when a
 *    verified session already exists, the controller enters a fail-closed
 *    `isRevalidating: true` state immediately (incrementing `authTransitionSeq`
 *    to abort/invalidate all in-flight reads & mutations, blocking access via
 *    `isAuthenticated = false`, `mfaSatisfied = false`, `hasRole() = false`,
 *    and hiding/disabling the workspace via `AdminShell`).
 * 2. Only when the server `/admin/session` response confirms the EXACT same
 *    user, organization, effective roles, active role, and MFA/AAL context does
 *    `workspaceEpoch` remain unchanged so unsaved work resumes safely.
 * 3. On verification failure, logout, missing session, or ANY change to user,
 *    organization, roles, role, or MFA context, `workspaceEpoch` increments and
 *    the previous workspace is destroyed.
 * 4. Every async success, failure, and `finally` handler is guarded by a
 *    monotonic `sessionLoadSeq`, preventing superseded failures from clearing
 *    or overwriting a newer valid session.
 */
export class AdminAuthSessionController {
  private readonly deps: AdminAuthSessionDeps;
  private readonly onStateChange: (next: AdminAuthSessionState) => void;
  private state: AdminAuthSessionState;
  private sessionLoadSeq = 0;
  private disposed = false;
  private pendingRenewalBaseline: {
    user: AdminUser;
    role: StaffRole;
  } | null = null;
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
      isRevalidating: initialState?.isRevalidating ?? false,
      authTransitionSeq: initialState?.authTransitionSeq ?? 0,
      workspaceEpoch: initialState?.workspaceEpoch ?? 0,
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
    this.pendingRenewalBaseline = null;
  }

  setWorkViewRole(newRole: StaffRole): void {
    if (
      this.state.isLoading ||
      this.state.isRevalidating ||
      !this.state.user ||
      !this.state.user.roles.includes(newRole)
    ) {
      return;
    }
    this.lastPreferredRole = newRole;
    this.commit({
      role: newRole,
      user: { ...this.state.user, role: newRole },
    });
  }

  private destroyWorkspaceState(
    extra: Partial<AdminAuthSessionState> = {},
  ): void {
    this.pendingRenewalBaseline = null;
    this.lastUserId = null;
    this.lastOrganizationId = null;
    this.lastPreferredRole = null;
    this.commit({
      user: null,
      role: null,
      isRevalidating: false,
      workspaceEpoch: this.state.workspaceEpoch + 1,
      ...extra,
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
        this.destroyWorkspaceState({ authError: null });
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

      const baseline = this.pendingRenewalBaseline;
      const samePreferredContext =
        this.lastUserId === adminUser.id &&
        this.lastOrganizationId === (adminUser.organizationId ?? null);
      const nextRole =
        samePreferredContext &&
        this.lastPreferredRole &&
        adminUser.roles.includes(this.lastPreferredRole)
          ? this.lastPreferredRole
          : adminUser.role;

      const nextUser: AdminUser = { ...adminUser, role: nextRole };
      const preservesWorkspace =
        baseline !== null &&
        isSameVerifiedAuthorizationContext(
          baseline.user,
          baseline.role,
          nextUser,
          nextRole,
        );

      this.pendingRenewalBaseline = null;
      this.lastUserId = nextUser.id;
      this.lastOrganizationId = nextUser.organizationId ?? null;
      this.lastPreferredRole = nextRole;

      this.commit({
        user: nextUser,
        role: nextRole,
        isRevalidating: false,
        workspaceEpoch: preservesWorkspace
          ? this.state.workspaceEpoch
          : this.state.workspaceEpoch + 1,
        authError: null,
      });
    } catch (error) {
      if (!this.isCurrent(seq)) return;
      const message =
        error instanceof Error ? error.message : fallbackErrorMessage;
      this.destroyWorkspaceState({ authError: message });
      if (options.rethrow) {
        throw error;
      }
    } finally {
      if (manageLoading && this.isCurrent(seq)) {
        this.commit({ isLoading: false, isRevalidating: false });
      }
    }
  }

  bootstrap(): Promise<void> {
    const seq = ++this.sessionLoadSeq;
    this.pendingRenewalBaseline = null;
    this.commit({
      user: null,
      role: null,
      isLoading: true,
      isRevalidating: false,
      authTransitionSeq: this.state.authTransitionSeq + 1,
      authError: null,
    });
    return this.runSessionLoad(seq, "Staff session could not be restored.");
  }

  private beginRevalidation(
    fallbackErrorMessage: string,
    options: { rethrow?: boolean } = {},
  ): Promise<void> {
    this.deps.invalidateSessionOperations();
    const seq = ++this.sessionLoadSeq;

    // Preserve the current verified baseline ONLY in memory while hidden/non-interactive.
    // Never trust localStorage; if the user was not verified with MFA (or already cleared),
    // do not set a baseline and fail closed with a clean loading state.
    if (
      this.state.user &&
      this.state.role &&
      Boolean(this.state.user.mfaSatisfied ?? this.state.user.mfaEnabled) &&
      !this.pendingRenewalBaseline
    ) {
      this.pendingRenewalBaseline = {
        user: this.state.user,
        role: this.state.role,
      };
    }

    const canPotentiallyResume = this.pendingRenewalBaseline !== null;
    this.commit({
      user: null,
      role: null,
      isLoading: true,
      isRevalidating: canPotentiallyResume,
      authTransitionSeq: this.state.authTransitionSeq + 1,
      authError: null,
    });

    return this.runSessionLoad(seq, fallbackErrorMessage, options);
  }

  handleStorageChange(event: StorageChangeLike): Promise<void> | null {
    if (event.isSameStorageArea === false) return null;
    if (event.key !== null && event.key !== this.deps.storageKey) {
      return null;
    }

    return this.beginRevalidation("Staff session could not be restored.");
  }

  async signIn(email: string, password: string): Promise<void> {
    this.deps.invalidateSessionOperations();
    const seq = ++this.sessionLoadSeq;
    this.destroyWorkspaceState({
      isLoading: true,
      authTransitionSeq: this.state.authTransitionSeq + 1,
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
      this.destroyWorkspaceState({ authError: message });
      throw error;
    } finally {
      if (this.isCurrent(seq)) {
        this.commit({ isLoading: false, isRevalidating: false });
      }
    }
  }

  refreshSession(): Promise<void> {
    return this.beginRevalidation("Staff session refresh failed.", {
      rethrow: true,
    });
  }

  async logout(): Promise<void> {
    this.sessionLoadSeq += 1;
    this.deps.invalidateSessionOperations();
    this.destroyWorkspaceState({
      isLoading: false,
      authTransitionSeq: this.state.authTransitionSeq + 1,
      authError: null,
    });
    await this.deps.signOut().catch(() => undefined);
  }
}
