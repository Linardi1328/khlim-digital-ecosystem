"use client";

export interface SupabaseUser {
  id: string;
  email?: string;
}

export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: SupabaseUser;
}

export interface SupabaseSignUpResult {
  session: SupabaseSession | null;
  user: SupabaseUser | null;
  emailConfirmationRequired: boolean;
}

export const SUPABASE_SESSION_STORAGE_KEY = "khlim_supabase_session";
const EXPIRY_SKEW_SECONDS = 60;
let refreshPromise: Promise<SupabaseSession | null> | null = null;

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
    return JSON.parse(raw) as SupabaseSession;
  } catch {
    window.localStorage.removeItem(SUPABASE_SESSION_STORAGE_KEY);
    return null;
  }
}

function normalizeSession(payload: unknown): SupabaseSession | null {
  if (typeof payload !== "object" || payload === null) return null;

  const value = payload as Record<string, unknown>;
  if (
    typeof value.access_token !== "string" ||
    typeof value.refresh_token !== "string" ||
    typeof value.expires_in !== "number" ||
    typeof value.token_type !== "string" ||
    typeof value.user !== "object" ||
    value.user === null
  ) {
    return null;
  }

  const user = value.user as Record<string, unknown>;
  if (typeof user.id !== "string") return null;

  return {
    access_token: value.access_token,
    refresh_token: value.refresh_token,
    expires_in: value.expires_in,
    expires_at:
      typeof value.expires_at === "number"
        ? value.expires_at
        : Math.floor(Date.now() / 1000) + value.expires_in,
    token_type: value.token_type,
    user: {
      id: user.id,
      email: typeof user.email === "string" ? user.email : undefined,
    },
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
  storeSession(null);
}

export async function refreshSupabaseSession(): Promise<SupabaseSession | null> {
  if (refreshPromise) return refreshPromise;

  const current = readStoredSession();
  if (!current?.refresh_token) {
    clearStoredSession();
    return null;
  }

  refreshPromise = (async () => {
    try {
      const body = await authRequest("/token?grant_type=refresh_token", {
        method: "POST",
        body: JSON.stringify({ refresh_token: current.refresh_token }),
      });
      const session = normalizeSession(body);
      if (!session) {
        clearStoredSession();
        return null;
      }
      storeSession(session);
      return session;
    } catch (error) {
      clearStoredSession();
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
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
): Promise<SupabaseSession> {
  const body = await authRequest("/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const session = normalizeSession(body);
  if (!session) throw new Error("Supabase did not return a valid session");
  storeSession(session);
  return session;
}

export async function supabaseSignUp(
  email: string,
  password: string,
): Promise<SupabaseSignUpResult> {
  const body = await authRequest("/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (typeof body !== "object" || body === null) {
    throw new Error("Supabase returned an invalid registration response");
  }

  const value = body as Record<string, unknown>;
  const session = normalizeSession(body);
  const rawUser =
    typeof value.user === "object" && value.user !== null
      ? (value.user as Record<string, unknown>)
      : value;
  const user =
    typeof rawUser.id === "string"
      ? {
          id: rawUser.id,
          email: typeof rawUser.email === "string" ? rawUser.email : undefined,
        }
      : null;

  if (session) storeSession(session);

  return {
    session,
    user,
    emailConfirmationRequired: session === null,
  };
}

export async function supabaseSignOut(): Promise<void> {
  const session = readStoredSession();
  try {
    if (session?.access_token) {
      await authRequest(
        "/logout",
        { method: "POST", body: JSON.stringify({}) },
        session.access_token,
      );
    }
  } finally {
    clearStoredSession();
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
