"use client";

export interface AdminSupabaseUser {
  id: string;
  email?: string;
}

export interface AdminSupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  token_type: string;
  user: AdminSupabaseUser;
}

export interface AdminTotpFactor {
  id: string;
  friendlyName?: string;
}

export interface AdminTotpEnrollment {
  id: string;
  qrCode: string;
  secret: string;
}

export const ADMIN_SUPABASE_SESSION_STORAGE_KEY =
  "khlim_admin_supabase_session";
const EXPIRY_SKEW_SECONDS = 60;
let refreshPromise: Promise<AdminSupabaseSession | null> | null = null;

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
      "Staff authentication is not configured for this environment.",
    );
  }

  return { url, anonKey };
}

function normalizeSession(payload: unknown): AdminSupabaseSession | null {
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

function readStoredSession(): AdminSupabaseSession | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(ADMIN_SUPABASE_SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    return normalizeSession(JSON.parse(raw));
  } catch {
    window.localStorage.removeItem(ADMIN_SUPABASE_SESSION_STORAGE_KEY);
    return null;
  }
}

function storeSession(session: AdminSupabaseSession | null): void {
  if (typeof window === "undefined") return;

  if (!session) {
    window.localStorage.removeItem(ADMIN_SUPABASE_SESSION_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    ADMIN_SUPABASE_SESSION_STORAGE_KEY,
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
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);

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
          : `Staff authentication failed with status ${response.status}`;
    throw new Error(message);
  }

  return body;
}

export function clearAdminSupabaseSession(): void {
  storeSession(null);
}

export function getStoredAdminAccessToken(): string | null {
  return readStoredSession()?.access_token ?? null;
}

export async function refreshAdminSupabaseSession(): Promise<AdminSupabaseSession | null> {
  if (refreshPromise) return refreshPromise;

  const current = readStoredSession();
  if (!current?.refresh_token) {
    clearAdminSupabaseSession();
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
        clearAdminSupabaseSession();
        return null;
      }
      storeSession(session);
      return session;
    } catch (error) {
      clearAdminSupabaseSession();
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function restoreAdminSupabaseSession(): Promise<AdminSupabaseSession | null> {
  const session = readStoredSession();
  if (!session) return null;

  if (
    session.expires_at >
    Math.floor(Date.now() / 1000) + EXPIRY_SKEW_SECONDS
  ) {
    return session;
  }

  return refreshAdminSupabaseSession();
}

export async function getValidAdminAccessToken(): Promise<string | null> {
  const session = await restoreAdminSupabaseSession();
  return session?.access_token ?? null;
}

export async function adminSupabaseSignIn(
  email: string,
  password: string,
): Promise<AdminSupabaseSession> {
  const body = await authRequest("/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const session = normalizeSession(body);
  if (!session)
    throw new Error("Supabase did not return a valid staff session");
  storeSession(session);
  return session;
}

function currentAdminSession(): AdminSupabaseSession {
  const session = readStoredSession();
  if (!session?.access_token) {
    throw new Error("Staff session is missing or expired");
  }
  return session;
}

function normalizeTotpFactor(value: unknown): AdminTotpFactor | null {
  if (typeof value !== "object" || value === null) return null;
  const factor = value as Record<string, unknown>;
  if (
    typeof factor.id !== "string" ||
    factor.factor_type !== "totp" ||
    factor.status !== "verified"
  ) {
    return null;
  }
  return {
    id: factor.id,
    friendlyName:
      typeof factor.friendly_name === "string"
        ? factor.friendly_name
        : undefined,
  };
}

export async function listAdminTotpFactors(): Promise<AdminTotpFactor[]> {
  const session = currentAdminSession();
  const body = await authRequest("/user", { method: "GET" }, session.access_token);
  if (typeof body !== "object" || body === null) return [];

  const factors = (body as { factors?: unknown }).factors;
  if (!Array.isArray(factors)) return [];
  return factors
    .map(normalizeTotpFactor)
    .filter((factor): factor is AdminTotpFactor => factor !== null);
}

export async function enrollAdminTotpFactor(): Promise<AdminTotpEnrollment> {
  const session = currentAdminSession();
  const body = await authRequest(
    "/factors",
    {
      method: "POST",
      body: JSON.stringify({
        factor_type: "totp",
        friendly_name: "KHLIM Operations Console",
      }),
    },
    session.access_token,
  );

  if (typeof body !== "object" || body === null) {
    throw new Error("Supabase did not return a valid MFA enrollment");
  }
  const value = body as Record<string, unknown>;
  const totp =
    typeof value.totp === "object" && value.totp !== null
      ? (value.totp as Record<string, unknown>)
      : null;
  if (
    typeof value.id !== "string" ||
    !totp ||
    typeof totp.qr_code !== "string" ||
    typeof totp.secret !== "string"
  ) {
    throw new Error("Supabase did not return a valid TOTP enrollment");
  }

  const qrCode = totp.qr_code.startsWith("data:")
    ? totp.qr_code
    : `data:image/svg+xml;utf8,${encodeURIComponent(totp.qr_code)}`;

  return { id: value.id, qrCode, secret: totp.secret };
}

export async function challengeAdminTotpFactor(
  factorId: string,
): Promise<string> {
  const session = currentAdminSession();
  const body = await authRequest(
    `/factors/${encodeURIComponent(factorId)}/challenge`,
    { method: "POST", body: JSON.stringify({}) },
    session.access_token,
  );
  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).id !== "string"
  ) {
    throw new Error("Supabase did not return a valid MFA challenge");
  }
  return (body as { id: string }).id;
}

export async function verifyAdminTotpFactor(
  factorId: string,
  challengeId: string,
  code: string,
): Promise<AdminSupabaseSession> {
  const session = currentAdminSession();
  const body = await authRequest(
    `/factors/${encodeURIComponent(factorId)}/verify`,
    {
      method: "POST",
      body: JSON.stringify({
        factor_id: factorId,
        challenge_id: challengeId,
        code: code.trim(),
      }),
    },
    session.access_token,
  );
  const verified = normalizeSession(body);
  if (!verified) {
    throw new Error("Supabase did not return an MFA-upgraded staff session");
  }
  storeSession(verified);
  return verified;
}

export async function adminSupabaseSignOut(): Promise<void> {
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
    clearAdminSupabaseSession();
  }
}
