"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getAdminSession } from "./admin-api";
import { ADMIN_DEMO_MODE } from "./demo-mode";
import {
  adminSupabaseSignIn,
  adminSupabaseSignOut,
  restoreAdminSupabaseSession,
} from "./supabase-auth";
import type { AdminSession, AdminUser, StaffRole } from "./types";

interface AuthContextValue {
  user: AdminUser | null;
  role: StaffRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemoMode: boolean;
  authError: string | null;
  mfaSatisfied: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  setRole: (role: StaffRole) => void;
  hasRole: (roles: StaffRole | StaffRole[]) => boolean;
  canAccessFinance: () => boolean;
  logout: () => Promise<void>;
}

const STAFF_ROLE_SET = new Set<StaffRole>([
  "SUPER_ADMIN",
  "MANAGEMENT",
  "FINANCE_ADMIN",
  "FINANCE",
  "ADMIN",
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

const DEMO_ADMIN_USER: AdminUser = {
  id: "demo-admin-user",
  email: "demo-admin@example.invalid",
  displayName: "Demo Operations Admin",
  role: "SUPER_ADMIN",
  roles: ["SUPER_ADMIN", "MANAGEMENT"],
  mfaEnabled: true,
  mfaSatisfied: true,
  authenticatorAssuranceLevel: "aal2",
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toStaffRoles(roles: string[]): StaffRole[] {
  return roles.filter((role): role is StaffRole =>
    STAFF_ROLE_SET.has(role as StaffRole),
  );
}

function choosePrimaryRole(roles: StaffRole[]): StaffRole | null {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? roles[0] ?? null;
}

function toAdminUser(session: AdminSession): AdminUser | null {
  const roles = toStaffRoles(session.roles);
  const role = choosePrimaryRole(roles);
  if (!role) return null;

  return {
    id: session.id,
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(
    ADMIN_DEMO_MODE ? DEMO_ADMIN_USER : null,
  );
  const [role, setActiveRole] = useState<StaffRole | null>(
    ADMIN_DEMO_MODE ? "SUPER_ADMIN" : null,
  );
  const [isLoading, setIsLoading] = useState(!ADMIN_DEMO_MODE);
  const [authError, setAuthError] = useState<string | null>(null);

  async function loadRealStaffSession(): Promise<void> {
    const session = await restoreAdminSupabaseSession();
    if (!session) {
      setUser(null);
      setActiveRole(null);
      return;
    }

    const resolved = await getAdminSession();
    const adminUser = toAdminUser(resolved);
    if (!adminUser) {
      await adminSupabaseSignOut();
      throw new Error("This account does not have KHLIM staff access.");
    }

    setUser(adminUser);
    setActiveRole(adminUser.role);
  }

  useEffect(() => {
    if (ADMIN_DEMO_MODE) return;

    let cancelled = false;
    setIsLoading(true);
    void loadRealStaffSession()
      .catch((error) => {
        if (cancelled) return;
        setUser(null);
        setActiveRole(null);
        setAuthError(
          error instanceof Error
            ? error.message
            : "Staff session could not be restored.",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    if (ADMIN_DEMO_MODE) return;

    setIsLoading(true);
    setAuthError(null);
    try {
      await adminSupabaseSignIn(email.trim(), password);
      await loadRealStaffSession();
    } catch (error) {
      await adminSupabaseSignOut().catch(() => undefined);
      setUser(null);
      setActiveRole(null);
      const message =
        error instanceof Error ? error.message : "Staff sign-in failed.";
      setAuthError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = async (): Promise<void> => {
    if (ADMIN_DEMO_MODE) return;

    setIsLoading(true);
    setAuthError(null);
    try {
      await loadRealStaffSession();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Staff session refresh failed.";
      setAuthError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const hasRole = (targetRoles: StaffRole | StaffRole[]): boolean => {
    if (!user || !role) return false;
    const targets = Array.isArray(targetRoles) ? targetRoles : [targetRoles];

    if (ADMIN_DEMO_MODE) {
      if (role === "SUPER_ADMIN") return true;
      return targets.includes(role);
    }

    if (user.roles.includes("SUPER_ADMIN")) return true;
    return targets.some((target) => user.roles.includes(target));
  };

  const canAccessFinance = (): boolean =>
    hasRole(["SUPER_ADMIN", "MANAGEMENT", "FINANCE_ADMIN", "FINANCE"]);

  const logout = async (): Promise<void> => {
    if (!ADMIN_DEMO_MODE) {
      await adminSupabaseSignOut().catch(() => undefined);
    }
    setUser(null);
    setActiveRole(null);
    setAuthError(null);
  };

  const setRole = (newRole: StaffRole) => {
    if (!ADMIN_DEMO_MODE || !user) return;
    setActiveRole(newRole);
    setUser({ ...user, role: newRole });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: Boolean(user),
        isLoading,
        isDemoMode: ADMIN_DEMO_MODE,
        authError,
        mfaSatisfied: Boolean(user?.mfaSatisfied ?? user?.mfaEnabled),
        signIn,
        refreshSession,
        setRole,
        hasRole,
        canAccessFinance,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAdminAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AuthProvider");
  }
  return context;
}
