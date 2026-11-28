"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getAdminSession } from "./admin-api";
import {
  AdminAuthSessionController,
  type AdminAuthSessionState,
} from "./admin-auth-session-controller";
import { ADMIN_DEMO_MODE } from "./demo-mode";
import {
  ADMIN_SUPABASE_SESSION_STORAGE_KEY,
  adminSupabaseSignIn,
  adminSupabaseSignOut,
  invalidateAdminSessionOperations,
  restoreAdminSupabaseSession,
} from "./supabase-auth";
import type { AdminUser, StaffRole } from "./types";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AdminAuthSessionState>(() =>
    ADMIN_DEMO_MODE
      ? {
          user: DEMO_ADMIN_USER,
          role: "SUPER_ADMIN",
          isLoading: false,
          authError: null,
        }
      : {
          user: null,
          role: null,
          isLoading: true,
          authError: null,
        },
  );
  const controllerRef = useRef<AdminAuthSessionController | null>(null);

  useEffect(() => {
    if (ADMIN_DEMO_MODE) return;

    const controller = new AdminAuthSessionController(
      {
        storageKey: ADMIN_SUPABASE_SESSION_STORAGE_KEY,
        restoreSession: restoreAdminSupabaseSession,
        getAdminSession,
        signIn: adminSupabaseSignIn,
        signOut: adminSupabaseSignOut,
        invalidateSessionOperations: invalidateAdminSessionOperations,
      },
      setAuthState,
      { user: null, role: null, isLoading: true, authError: null },
    );
    controllerRef.current = controller;
    void controller.bootstrap();

    const handleStorageChange = (event: StorageEvent) => {
      const isSameStorageArea =
        event.storageArea === null || event.storageArea === window.localStorage;
      void controller.handleStorageChange({
        key: event.key,
        oldValue: event.oldValue,
        newValue: event.newValue,
        isSameStorageArea,
      });
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      controller.dispose();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const { user, role, isLoading, authError } = authState;

  const signIn = async (email: string, password: string): Promise<void> => {
    if (ADMIN_DEMO_MODE) return;
    await controllerRef.current?.signIn(email, password);
  };

  const refreshSession = async (): Promise<void> => {
    if (ADMIN_DEMO_MODE) return;
    await controllerRef.current?.refreshSession();
  };

  const hasRole = (targetRoles: StaffRole | StaffRole[]): boolean => {
    if (!user || !role || isLoading) return false;
    const targets = Array.isArray(targetRoles) ? targetRoles : [targetRoles];

    if (ADMIN_DEMO_MODE) {
      if (role === "SUPER_ADMIN") return true;
      return targets.includes(role);
    }

    if (user.roles.includes("SUPER_ADMIN")) return true;
    return targets.some((target) => user.roles.includes(target));
  };

  const canAccessFinance = (): boolean =>
    hasRole(["SUPER_ADMIN", "MANAGEMENT", "FINANCE_ADMIN"]);

  const logout = async (): Promise<void> => {
    if (ADMIN_DEMO_MODE) {
      setAuthState({
        user: null,
        role: null,
        isLoading: false,
        authError: null,
      });
      return;
    }
    await controllerRef.current?.logout();
  };

  const setRole = (newRole: StaffRole) => {
    if (!user) return;
    if (!ADMIN_DEMO_MODE && !user.roles.includes(newRole)) return;

    if (ADMIN_DEMO_MODE) {
      setAuthState((current) =>
        current.user
          ? {
              ...current,
              role: newRole,
              user: { ...current.user, role: newRole },
            }
          : current,
      );
      return;
    }

    controllerRef.current?.setWorkViewRole(newRole);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: Boolean(user) && !isLoading,
        isLoading,
        isDemoMode: ADMIN_DEMO_MODE,
        authError,
        mfaSatisfied:
          !isLoading && Boolean(user?.mfaSatisfied ?? user?.mfaEnabled),
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
