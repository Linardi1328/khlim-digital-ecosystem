"use client";

export interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: SupabaseUser;
}

export interface SupabaseGuardianRegistrationMetadata {
  displayName: string;
  preferredLocale: string;
}

export interface SupabaseSignUpResult {
  session: SupabaseSession | null;
  user: SupabaseUser | null;
  emailConfirmationOrSignInRequired: boolean;
}

export const SUPABASE_SESSION_STORAGE_KEY = "khlim_supabase_session";
const EXPIRY_SKEW_SECONDS = 60;
const KHLIM_REGISTRATION_INTENT_KEY = "khlim_registration_intent";
const KHLIM_GUARDIAN_DISPLAY_NAME_KEY = "khlim_guardian_display_name";
const KHLIM_PREFERRED_LOCALE_KEY = "khlim_preferred_locale";
let refreshPromise: Promise<SupabaseSession | null> | null = null;
let activeRefreshSeq = 0;
let sessionMutationEpoch = 0;

export class SupersededWebAuthOperationError extends Error {
  readonly code = "SUPERSEDED_WEB_AUTH_OPERATION";
  constructor(
    message = "Authentication operation was superseded by a newer session transition.",
  ) {
    super(message);
    this.name = "SupersededWebAuthOperationError";
  }
}

export function isSupersededWebAuthOperationError(error: unknown): boolean {
  return (
    error instanceof SupersededWebAuthOperationError ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "SUPERSEDED_WEB_AUTH_OPERATION")
  );
}

/**
 * Synchronously invalidates any in-flight refresh, login, or signup token writes
 * so superseded requests cannot overwrite or clear a newer session.
 */
export function invalidateWebSessionOperations(): number {
  sessionMutationEpoch += 1;
  activeRefreshSeq += 1;
  refreshPromise = null;
  return sessionMutationEpoch;
}

export function getWebSessionMutationEpoch(): number {
  return sessionMutationEpoch;
}

function getSupabaseConfig(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (
    !url ||
    !anonKey ||
    url.includes("example.supabase.co") ||
    anonKey.startsWith("replace-with")
  ) {
    throw new Error(
      "Supabase Auth is not configured for this environment. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return { url, anonKey };
}

function readStoredSession(): SupabaseSession | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(SUPABASE_SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = normalizeSession(JSON.parse(raw));
    if (!parsed) {
      window.localStorage.removeItem(SUPABASE_SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    window.localStorage.removeItem(SUPABASE_SESSION_STORAGE_KEY);
    return null;
  }
}

function normalizeUser(payload: unknown): SupabaseUser | null {
  if (typeof payload !== "object" || payload === null) return null;

  const user = payload as Record<string, unknown>;
  if (typeof user.id !== "string" || user.id.trim().length === 0) return null;

  return {
    id: user.id,
    email: typeof user.email === "string" ? user.email : undefined,
    user_metadata:
      typeof user.user_metadata === "object" && user.user_metadata !== null
        ? (user.user_metadata as Record<string, unknown>)
        : undefined,
  };
}

function normalizeSession(payload: unknown): SupabaseSession | null {
  if (typeof payload !== "object" || payload === null) return null;

  const value = payload as Record<string, unknown>;
  if (
    typeof value.access_token !== "string" ||
    typeof value.refresh_token !== "string" ||
    typeof value.expires_in !== "number" ||
    !Number.isFinite(value.expires_in) ||
    typeof value.token_type !== "string"
  ) {
    return null;
  }

  const user = normalizeUser(value.user);
  if (!user) return null;

  return {
    access_token: value.access_token,
    refresh_token: value.refresh_token,
    expires_in: value.expires_in,
    expires_at:
      typeof value.expires_at === "number" && Number.isFinite(value.expires_at)
        ? value.expires_at
        : Math.floor(Date.now() / 1000) + value.expires_in,
    token_type: value.token_type,
    user,
  };
}

function storeSession(session: SupabaseSession | null): void {
  if (typeof window === "undefined") return;

  if (!session) {
    window.localStorage.removeItem(SUPABASE_SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    SUPABASE_SESSION_STORAGE_KEY,
    JSON.stringify(session),
  );
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function authRequest(
  path: string,
  init: RequestInit,
  accessToken?: string,
): Promise<unknown> {
  const { url, anonKey } = getSupabaseConfig();
  const headers = new Headers(init.headers);
  headers.set("apikey", anonKey);
  headers.set("content-type", "application/json");
  if (accessToken) {
    headers.set("authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${url}/auth/v1${path}`, {
    ...init,
    headers,
  });
  const body = await parseJson(response);

  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "msg" in body
        ? String((body as { msg: unknown }).msg)
        : typeof body === "object" && body !== null && "message" in body
          ? String((body as { message: unknown }).message)
          : `Supabase Auth request failed with status ${response.status}`;
    throw new Error(message);
  }

  return body;
}

export function clearStoredSession(): void {
  sessionMutationEpoch += 1;
  activeRefreshSeq += 1;
  refreshPromise = null;
  storeSession(null);
}

export function clearStoredSessionIfEpoch(expectedEpoch: number): void {
  if (sessionMutationEpoch !== expectedEpoch) return;
  clearStoredSession();
}

export function getGuardianRegistrationMetadata(
  user: SupabaseUser,
): SupabaseGuardianRegistrationMetadata | null {
  const metadata = user.user_metadata;
  if (!metadata || metadata[KHLIM_REGISTRATION_INTENT_KEY] !== "guardian") {
    return null;
  }

  const displayName = metadata[KHLIM_GUARDIAN_DISPLAY_NAME_KEY];
  const preferredLocale = metadata[KHLIM_PREFERRED_LOCALE_KEY];
  if (typeof displayName !== "string" || typeof preferredLocale !== "string") {
    return null;
  }

  const normalizedDisplayName = displayName.trim();
  const normalizedPreferredLocale = preferredLocale.trim();
  if (!normalizedDisplayName || !normalizedPreferredLocale) return null;

  return {
    displayName: normalizedDisplayName,
    preferredLocale: normalizedPreferredLocale,
  };
}

export async function refreshSupabaseSession(): Promise<SupabaseSession | null> {
  if (refreshPromise) return refreshPromise;

  const current = readStoredSession();
  if (!current?.refresh_token) {
    clearStoredSession();
    return null;
  }

  const opEpoch = sessionMutationEpoch;
  const startingUserId = current.user.id;
  const startingRefreshToken = current.refresh_token;
  const startingAccessToken = current.access_token;

  const isStillSameSession = (): boolean => {
    if (sessionMutationEpoch !== opEpoch) return false;
    const latest = readStoredSession();
    return (
      latest !== null &&
      latest.user.id === startingUserId &&
      latest.refresh_token === startingRefreshToken &&
      latest.access_token === startingAccessToken
    );
  };

  const refreshSeq = ++activeRefreshSeq;
  const currentPromise: Promise<SupabaseSession | null> = (async () => {
    try {
      const body = await authRequest("/token?grant_type=refresh_token", {
        method: "POST",
        body: JSON.stringify({ refresh_token: startingRefreshToken }),
      });
      if (!isStillSameSession()) {
        return null;
      }
      const session = normalizeSession(body);
      if (!session) {
        if (isStillSameSession()) {
          clearStoredSession();
        }
        return null;
      }
      if (!isStillSameSession()) {
        return null;
      }
      storeSession(session);
      return session;
    } catch (error) {
      if (isStillSameSession()) {
        clearStoredSession();
      }
      throw error;
    } finally {
      if (activeRefreshSeq === refreshSeq) {
        refreshPromise = null;
      }
    }
  })();

  refreshPromise = currentPromise;
  return currentPromise;
}

export async function restoreSupabaseSession(): Promise<SupabaseSession | null> {
  const session = readStoredSession();
  if (!session) return null;

  if (
    session.expires_at >
    Math.floor(Date.now() / 1000) + EXPIRY_SKEW_SECONDS
  ) {
    return session;
  }

  return refreshSupabaseSession();
}

export async function getValidAccessToken(): Promise<string | null> {
  const session = await restoreSupabaseSession();
  return session?.access_token ?? null;
}

export async function supabaseSignIn(
  email: string,
  password: string,
  expectedEpoch?: number,
): Promise<SupabaseSession> {
  const opEpoch = expectedEpoch ?? invalidateWebSessionOperations();
  const body = await authRequest("/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (sessionMutationEpoch !== opEpoch) {
    throw new SupersededWebAuthOperationError();
  }
  const session = normalizeSession(body);
  if (!session) throw new Error("Supabase did not return a valid session");
  if (sessionMutationEpoch !== opEpoch) {
    throw new SupersededWebAuthOperationError();
  }
  storeSession(session);
  return session;
}

export async function supabaseSignUp(
  email: string,
  password: string,
  metadata: SupabaseGuardianRegistrationMetadata,
  expectedEpoch?: number,
): Promise<SupabaseSignUpResult> {
  const opEpoch = expectedEpoch ?? invalidateWebSessionOperations();
  const body = await authRequest("/signup", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      data: {
        [KHLIM_REGISTRATION_INTENT_KEY]: "guardian",
        [KHLIM_GUARDIAN_DISPLAY_NAME_KEY]: metadata.displayName.trim(),
        [KHLIM_PREFERRED_LOCALE_KEY]: metadata.preferredLocale,
      },
    }),
  });
  if (sessionMutationEpoch !== opEpoch) {
    throw new SupersededWebAuthOperationError();
  }

  if (typeof body !== "object" || body === null) {
    throw new Error("Supabase returned an invalid registration response");
  }

  const value = body as Record<string, unknown>;
  const session = normalizeSession(body);
  const rawUser =
    typeof value.user === "object" && value.user !== null ? value.user : value;
  const user = normalizeUser(rawUser);

  if (session) {
    if (sessionMutationEpoch !== opEpoch) {
      throw new SupersededWebAuthOperationError();
    }
    storeSession(session);
  }

  return {
    session,
    user,
    emailConfirmationOrSignInRequired: session === null,
  };
}

export async function supabaseSignOut(): Promise<void> {
  const session = readStoredSession();
  // Synchronously wipe local storage & invalidate pending auth operations BEFORE
  // awaiting network logout so a subsequent login cannot be clobbered by finally.
  clearStoredSession();
  if (session?.access_token) {
    await authRequest(
      "/logout?scope=local",
      { method: "POST", body: JSON.stringify({}) },
      session.access_token,
    );
  }
}

export async function supabaseRecoverPassword(email: string): Promise<void> {
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/reset-password`
      : undefined;
  await authRequest("/recover", {
    method: "POST",
    body: JSON.stringify({ email, redirect_to: redirectTo }),
  });
}

export function restoreRecoverySessionFromUrl(): SupabaseSession | null {
  if (typeof window === "undefined" || !window.location.hash) return null;

  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  if (params.get("type") !== "recovery") return null;

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const expiresIn = Number(params.get("expires_in") || "0");
  const tokenType = params.get("token_type") || "bearer";
  if (
    !accessToken ||
    !refreshToken ||
    !Number.isFinite(expiresIn) ||
    expiresIn <= 0
  ) {
    return null;
  }

  const session: SupabaseSession = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    token_type: tokenType,
    user: { id: "recovery-session" },
  };
  storeSession(session);
  window.history.replaceState({}, document.title, window.location.pathname);
  return session;
}

export async function supabaseUpdatePassword(password: string): Promise<void> {
  const accessToken = await getValidAccessToken();
  if (!accessToken) throw new Error("Recovery session is missing or expired");

  await authRequest(
    "/user",
    {
      method: "PUT",
      body: JSON.stringify({ password }),
    },
    accessToken,
  );
}
