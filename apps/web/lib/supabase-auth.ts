"use client";

export interface SupabaseUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    display_name?: string;
    preferred_locale?: string;
  };
  created_at?: string;
}

export interface SupabaseSession {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user: SupabaseUser;
}

const SUPABASE_URL = (
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co"
).replace(/\/+$/, "");

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "public-anon-key";

const TOKEN_STORAGE_KEY = "khlim_supabase_access_token";
const REFRESH_STORAGE_KEY = "khlim_supabase_refresh_token";
const USER_STORAGE_KEY = "khlim_supabase_user";

export function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getStoredUser(): SupabaseUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SupabaseUser;
  } catch {
    return null;
  }
}

export function setStoredSession(session: SupabaseSession | null): void {
  if (typeof window === "undefined") return;
  if (session) {
    localStorage.setItem(TOKEN_STORAGE_KEY, session.access_token);
    localStorage.setItem(REFRESH_STORAGE_KEY, session.refresh_token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(session.user));
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

export async function supabaseSignIn(
  email: string,
  password: string,
): Promise<SupabaseSession> {
  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error_description || data?.msg || data?.message || "Invalid credentials";
    throw new Error(message);
  }

  const session: SupabaseSession = {
    access_token: data.access_token,
    token_type: data.token_type ?? "bearer",
    expires_in: data.expires_in ?? 3600,
    refresh_token: data.refresh_token,
    user: data.user,
  };

  setStoredSession(session);
  return session;
}

export async function supabaseSignUp(
  email: string,
  password: string,
  metadata?: { full_name?: string; preferred_locale?: string },
): Promise<{ user: SupabaseUser; session: SupabaseSession | null }> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email,
      password,
      data: metadata,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error_description || data?.msg || data?.message || "Registration failed";
    throw new Error(message);
  }

  const session = data.access_token
    ? {
        access_token: data.access_token,
        token_type: data.token_type ?? "bearer",
        expires_in: data.expires_in ?? 3600,
        refresh_token: data.refresh_token,
        user: data.user,
      }
    : null;

  if (session) {
    setStoredSession(session);
  }

  return { user: data.user, session };
}

export async function supabaseRecoverPassword(email: string): Promise<void> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const data = await response.json();
    const message =
      data?.error_description || data?.msg || data?.message || "Password recovery failed";
    throw new Error(message);
  }
}

export async function supabaseSignOut(): Promise<void> {
  const token = getStoredAccessToken();
  if (token) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Ignore network errors during logout
    }
  }
  setStoredSession(null);
}
