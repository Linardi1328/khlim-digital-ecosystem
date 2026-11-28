import { isFeatureNotAvailableError } from "@khlim/api-client";
import type {
  CreateManagedAthleteDto,
  ManagedAthlete,
  ManagedAthleteLinkItem,
} from "./types";

export class StaleAuthContextError extends Error {
  readonly code = "STALE_AUTH_CONTEXT";
  constructor() {
    super("Authentication context changed while the request was in flight.");
    this.name = "StaleAuthContextError";
  }
}

export function isStaleAuthContextError(
  error: unknown,
): error is StaleAuthContextError {
  return (
    error instanceof StaleAuthContextError ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "STALE_AUTH_CONTEXT")
  );
}

export function buildWebAuthContextKey(
  isAuthenticated: boolean,
  accountId: string | null | undefined,
): string {
  return isAuthenticated ? (accountId ?? "authenticated") : "anonymous";
}

export interface FamilySessionState {
  athleteLinks: ManagedAthleteLinkItem[];
  activeChild: ManagedAthlete | null;
  isLoading: boolean;
  isPortalFeatureDeferred: boolean;
}

export interface FamilyApiAdapter {
  listManagedAthletes(): Promise<ManagedAthleteLinkItem[]>;
  createManagedAthlete(
    dto: CreateManagedAthleteDto,
  ): Promise<{ athlete: ManagedAthlete }>;
}

/**
 * Pure, testable family-session state controller that isolates all async reads
 * and child-creation mutations across authentication-context transitions
 * (logout, login, or account switch).
 */
export class FamilySessionController {
  private authContextKey = "anonymous";
  private authGen = 0;
  private requestSeq = 0;
  private disposed = false;
  private state: FamilySessionState = {
    athleteLinks: [],
    activeChild: null,
    isLoading: false,
    isPortalFeatureDeferred: false,
  };

  private readonly api: FamilyApiAdapter;
  private readonly onStateChange: (next: FamilySessionState) => void;

  constructor(
    api: FamilyApiAdapter,
    onStateChange: (next: FamilySessionState) => void,
  ) {
    this.api = api;
    this.onStateChange = onStateChange;
  }

  getState(): FamilySessionState {
    return this.state;
  }

  getAuthGeneration(): number {
    return this.authGen;
  }

  private commit(patch: Partial<FamilySessionState>): void {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    this.onStateChange(this.state);
  }

  setActiveChild(child: ManagedAthlete | null): void {
    this.commit({ activeChild: child });
  }

  setAuthContext(nextKey: string): void {
    if (nextKey === this.authContextKey) return;
    this.authContextKey = nextKey;
    this.authGen += 1;
    this.requestSeq += 1;
    this.commit({
      athleteLinks: [],
      activeChild: null,
      isLoading: false,
      isPortalFeatureDeferred: false,
    });
  }

  dispose(): void {
    this.disposed = true;
    this.authGen += 1;
    this.requestSeq += 1;
  }

  async refreshFamily(options: {
    isAuthenticated: boolean;
    familyFeatureEnabled: boolean;
  }): Promise<void> {
    const authGen = this.authGen;
    const seq = ++this.requestSeq;
    const isCurrent = () =>
      !this.disposed && this.authGen === authGen && this.requestSeq === seq;

    if (!options.isAuthenticated) {
      this.commit({
        athleteLinks: [],
        activeChild: null,
        isPortalFeatureDeferred: false,
        isLoading: false,
      });
      return;
    }

    if (!options.familyFeatureEnabled || this.state.isPortalFeatureDeferred) {
      this.commit({
        athleteLinks: [],
        activeChild: null,
        isLoading: false,
      });
      return;
    }

    this.commit({ isLoading: true });
    try {
      const links = await this.api.listManagedAthletes();
      if (!isCurrent()) return;
      const athletes = links.map((link) => link.athlete);
      const current = this.state.activeChild;
      const preserved = current
        ? athletes.find((athlete) => athlete.id === current.id)
        : undefined;
      this.commit({
        athleteLinks: links,
        activeChild: preserved ?? athletes[0] ?? null,
      });
    } catch (caught) {
      if (!isCurrent()) return;
      this.commit({
        isPortalFeatureDeferred:
          this.state.isPortalFeatureDeferred ||
          isFeatureNotAvailableError(caught),
        athleteLinks: [],
        activeChild: null,
      });
    } finally {
      if (isCurrent()) {
        this.commit({ isLoading: false });
      }
    }
  }

  async addChild(
    dto: CreateManagedAthleteDto,
    options: { isAuthenticated: boolean; familyFeatureEnabled: boolean },
  ): Promise<ManagedAthlete> {
    const authGen = this.authGen;
    const isSameAuth = () => !this.disposed && this.authGen === authGen;

    try {
      const created = await this.api.createManagedAthlete(dto);
      if (!isSameAuth()) {
        throw new StaleAuthContextError();
      }
      await this.refreshFamily(options);
      if (!isSameAuth()) {
        throw new StaleAuthContextError();
      }
      this.commit({ activeChild: created.athlete });
      return created.athlete;
    } catch (caught) {
      if (!isSameAuth()) {
        throw new StaleAuthContextError();
      }
      if (isFeatureNotAvailableError(caught)) {
        this.commit({ isPortalFeatureDeferred: true });
      }
      throw caught;
    }
  }
}
