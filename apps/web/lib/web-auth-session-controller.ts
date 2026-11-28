import type { SupportedLocale } from "@khlim/i18n";
import {
  getGuardianRegistrationMetadata,
  SupersededWebAuthOperationError,
  type SupabaseGuardianRegistrationMetadata,
  type SupabaseSession,
  type SupabaseSignUpResult,
} from "./supabase-auth";
import type {
  AccountMeResponse,
  GuardianProfile,
  UpsertGuardianProfileDto,
} from "./types";

const DEFAULT_SUPPORTED_LOCALES = new Set<SupportedLocale>([
  "en",
  "ms",
  "zh-Hans",
]);

function defaultIsSupportedLocale(value: string): value is SupportedLocale {
  return DEFAULT_SUPPORTED_LOCALES.has(value as SupportedLocale);
}

export interface WebAuthSessionState {
  isAuthenticated: boolean;
  account: AccountMeResponse | null;
  guardianProfile: GuardianProfile | null;
  isLoading: boolean;
}

export interface WebLoginResult {
  guardianOnboardingRequired: boolean;
}

export interface WebRegistrationResult {
  authenticated: boolean;
  emailConfirmationOrSignInRequired: boolean;
}

export interface WebStorageChangeLike {
  key: string | null;
  isSameStorageArea?: boolean;
}

export interface WebAuthSessionDeps {
  storageKey: string;
  restoreSession: () => Promise<SupabaseSession | null>;
  getMe: () => Promise<AccountMeResponse>;
  updatePreferences: (dto: {
    preferredLocale: SupportedLocale;
  }) => Promise<unknown>;
  upsertGuardianProfile: (
    profile: UpsertGuardianProfileDto,
  ) => Promise<unknown>;
  signIn: (
    email: string,
    password: string,
    expectedEpoch?: number,
  ) => Promise<SupabaseSession>;
  signUp: (
    email: string,
    password: string,
    metadata: SupabaseGuardianRegistrationMetadata,
    expectedEpoch?: number,
  ) => Promise<SupabaseSignUpResult>;
  signOut: () => Promise<void>;
  invalidateSessionOperations: () => number;
  clearStoredSessionIfEpoch: (expectedEpoch: number) => void;
  isSupportedLocale?: (value: string) => value is SupportedLocale;
}

/**
 * Pure, testable generation-owned controller for Web guardian/family auth
 * operations (bootstrap, cross-tab storage transitions, login, register,
 * logout, refreshAccount, and updateGuardianProfile).
 *
 * Guarantees:
 * 1. Every auth transition claims a unique monotonic `authLoadSeq` and
 *    synchronously invalidates in-flight token storage operations via
 *    `invalidateSessionOperations()`.
 * 2. Every async success, catch, and finally handler checks `isCurrent(seq)`
 *    before mutating React state or clearing localStorage.
 * 3. Superseded bootstrap, login, register, refresh, or logout operations can
 *    never restore previous-account state or clear a newer valid session.
 */
export class WebAuthSessionController {
  private readonly deps: WebAuthSessionDeps;
  private readonly onStateChange: (next: WebAuthSessionState) => void;
  private state: WebAuthSessionState;
  private authLoadSeq = 0;
  private refreshSeq = 0;
  private activeTransitionSeq: number | null = null;
  private disposed = false;

  constructor(
    deps: WebAuthSessionDeps,
    onStateChange: (next: WebAuthSessionState) => void,
    initialState?: Partial<WebAuthSessionState>,
  ) {
    this.deps = deps;
    this.onStateChange = onStateChange;
    this.state = {
      isAuthenticated: initialState?.isAuthenticated ?? false,
      account: initialState?.account ?? null,
      guardianProfile: initialState?.guardianProfile ?? null,
      isLoading: initialState?.isLoading ?? true,
    };
  }

  getState(): WebAuthSessionState {
    return this.state;
  }

  getGeneration(): number {
    return this.authLoadSeq;
  }

  private isCurrent(seq: number): boolean {
    return !this.disposed && this.authLoadSeq === seq;
  }

  private commit(patch: Partial<WebAuthSessionState>): void {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    this.onStateChange(this.state);
  }

  private applyAccount(value: AccountMeResponse | null): void {
    this.commit({
      account: value,
      guardianProfile: value?.guardianProfile ?? null,
      isAuthenticated: Boolean(value),
    });
  }

  private beginTransition(): { seq: number; sessionEpoch: number } {
    const seq = ++this.authLoadSeq;
    this.refreshSeq += 1;
    this.activeTransitionSeq = seq;
    const sessionEpoch = this.deps.invalidateSessionOperations();
    return { seq, sessionEpoch };
  }

  private endTransition(seq: number): void {
    if (this.activeTransitionSeq === seq) {
      this.activeTransitionSeq = null;
    }
  }

  dispose(): void {
    this.disposed = true;
    this.authLoadSeq += 1;
    this.refreshSeq += 1;
    this.activeTransitionSeq = null;
  }

  private async finishPendingGuardianRegistration(
    seq: number,
    session: SupabaseSession,
    account: AccountMeResponse,
  ): Promise<{
    account: AccountMeResponse;
    guardianOnboardingRequired: boolean;
  }> {
    if (!this.isCurrent(seq)) {
      throw new SupersededWebAuthOperationError();
    }
    if (account.guardianProfile) {
      return { account, guardianOnboardingRequired: false };
    }

    const metadata = getGuardianRegistrationMetadata(session.user);
    const checkLocale = this.deps.isSupportedLocale ?? defaultIsSupportedLocale;
    if (!metadata || !checkLocale(metadata.preferredLocale)) {
      return { account, guardianOnboardingRequired: false };
    }

    await this.deps.updatePreferences({
      preferredLocale: metadata.preferredLocale,
    });
    if (!this.isCurrent(seq)) {
      throw new SupersededWebAuthOperationError();
    }

    await this.deps.upsertGuardianProfile({
      displayName: metadata.displayName,
    });
    if (!this.isCurrent(seq)) {
      throw new SupersededWebAuthOperationError();
    }

    const refreshed = await this.deps.getMe();
    if (!this.isCurrent(seq)) {
      throw new SupersededWebAuthOperationError();
    }

    return {
      account: refreshed,
      guardianOnboardingRequired: true,
    };
  }

  private async runStoredSessionLoad(seq: number): Promise<void> {
    this.commit({
      account: null,
      guardianProfile: null,
      isAuthenticated: false,
      isLoading: true,
    });

    try {
      const session = await this.deps.restoreSession();
      if (!this.isCurrent(seq)) return;
      if (!session) {
        this.applyAccount(null);
        return;
      }

      const value = await this.deps.getMe();
      if (!this.isCurrent(seq)) return;
      this.applyAccount(value);
    } catch {
      if (this.isCurrent(seq)) {
        this.applyAccount(null);
      }
    } finally {
      if (this.isCurrent(seq)) {
        this.endTransition(seq);
        this.commit({ isLoading: false });
      }
    }
  }

  bootstrap(): Promise<void> {
    const { seq } = this.beginTransition();
    return this.runStoredSessionLoad(seq);
  }

  handleStorageChange(event: WebStorageChangeLike): Promise<void> | null {
    if (event.isSameStorageArea === false) return null;
    if (event.key !== null && event.key !== this.deps.storageKey) {
      return null;
    }
    const { seq } = this.beginTransition();
    return this.runStoredSessionLoad(seq);
  }

  async refreshAccount(): Promise<AccountMeResponse | null> {
    if (
      this.disposed ||
      this.activeTransitionSeq !== null ||
      this.state.isLoading
    ) {
      return null;
    }
    const transitionSeq = this.authLoadSeq;
    const reqSeq = ++this.refreshSeq;
    try {
      const value = await this.deps.getMe();
      if (
        !this.isCurrent(transitionSeq) ||
        this.activeTransitionSeq !== null ||
        this.refreshSeq !== reqSeq
      ) {
        return null;
      }
      this.applyAccount(value);
      return value;
    } catch {
      if (
        !this.isCurrent(transitionSeq) ||
        this.activeTransitionSeq !== null ||
        this.refreshSeq !== reqSeq
      ) {
        return null;
      }
      this.applyAccount(null);
      return null;
    }
  }

  async login(email: string, password: string): Promise<WebLoginResult> {
    const { seq, sessionEpoch } = this.beginTransition();
    this.commit({
      account: null,
      guardianProfile: null,
      isAuthenticated: false,
      isLoading: true,
    });
    let supabaseSessionEstablished = false;

    try {
      const session = await this.deps.signIn(email, password, sessionEpoch);
      if (!this.isCurrent(seq)) {
        throw new SupersededWebAuthOperationError();
      }
      supabaseSessionEstablished = true;

      const account = await this.deps.getMe();
      if (!this.isCurrent(seq)) {
        throw new SupersededWebAuthOperationError();
      }

      const result = await this.finishPendingGuardianRegistration(
        seq,
        session,
        account,
      );
      if (!this.isCurrent(seq)) {
        throw new SupersededWebAuthOperationError();
      }

      this.applyAccount(result.account);
      return {
        guardianOnboardingRequired: result.guardianOnboardingRequired,
      };
    } catch (error) {
      if (this.isCurrent(seq)) {
        if (supabaseSessionEstablished) {
          this.deps.clearStoredSessionIfEpoch(sessionEpoch);
        }
        this.applyAccount(null);
      }
      throw error;
    } finally {
      if (this.isCurrent(seq)) {
        this.endTransition(seq);
        this.commit({ isLoading: false });
      }
    }
  }

  async register(
    email: string,
    password: string,
    fullName: string,
    preferredLocale: SupportedLocale = "en",
  ): Promise<WebRegistrationResult> {
    const { seq, sessionEpoch } = this.beginTransition();
    this.commit({
      account: null,
      guardianProfile: null,
      isAuthenticated: false,
      isLoading: true,
    });
    let supabaseSessionEstablished = false;

    try {
      const result = await this.deps.signUp(
        email,
        password,
        {
          displayName: fullName.trim(),
          preferredLocale,
        },
        sessionEpoch,
      );
      if (!this.isCurrent(seq)) {
        throw new SupersededWebAuthOperationError();
      }

      supabaseSessionEstablished = Boolean(result.session);
      if (!result.session) {
        this.applyAccount(null);
        return {
          authenticated: false,
          emailConfirmationOrSignInRequired:
            result.emailConfirmationOrSignInRequired,
        };
      }

      await this.deps.upsertGuardianProfile({
        displayName: fullName.trim(),
      });
      if (!this.isCurrent(seq)) {
        throw new SupersededWebAuthOperationError();
      }

      await this.deps.updatePreferences({ preferredLocale });
      if (!this.isCurrent(seq)) {
        throw new SupersededWebAuthOperationError();
      }

      const value = await this.deps.getMe();
      if (!this.isCurrent(seq)) {
        throw new SupersededWebAuthOperationError();
      }

      this.applyAccount(value);
      return {
        authenticated: true,
        emailConfirmationOrSignInRequired: false,
      };
    } catch (error) {
      if (this.isCurrent(seq)) {
        if (supabaseSessionEstablished) {
          this.deps.clearStoredSessionIfEpoch(sessionEpoch);
        }
        this.applyAccount(null);
      }
      throw error;
    } finally {
      if (this.isCurrent(seq)) {
        this.endTransition(seq);
        this.commit({ isLoading: false });
      }
    }
  }

  async logout(): Promise<void> {
    const { seq } = this.beginTransition();
    this.commit({
      account: null,
      guardianProfile: null,
      isAuthenticated: false,
      isLoading: true,
    });
    try {
      await this.deps.signOut();
    } finally {
      if (this.isCurrent(seq)) {
        this.endTransition(seq);
        this.commit({
          account: null,
          guardianProfile: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    }
  }

  async updateGuardianProfile(
    profile: UpsertGuardianProfileDto,
  ): Promise<void> {
    const seq = this.authLoadSeq;
    await this.deps.upsertGuardianProfile(profile);
    if (!this.isCurrent(seq) || this.activeTransitionSeq !== null) return;
    await this.refreshAccount();
  }
}
