"use client";

import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { ADMIN_DEMO_MODE } from "./demo-mode";
import type { AdminUser, StaffRole } from "./types";

interface AuthContextValue {
  user: AdminUser | null;
  role: StaffRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemoMode: boolean;
  setRole: (role: StaffRole) => void;
  hasRole: (roles: StaffRole | StaffRole[]) => boolean;
  canAccessFinance: () => boolean;
  logout: () => void;
}

const DEMO_ADMIN_USER: AdminUser = {
  id: "demo-admin-user",
  email: "demo-admin@example.invalid",
  displayName: "Demo Operations Admin",
  role: "SUPER_ADMIN",
  roles: ["SUPER_ADMIN", "MANAGEMENT"],
  mfaEnabled: true,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(
    ADMIN_DEMO_MODE ? DEMO_ADMIN_USER : null,
  );
  const [role, setActiveRole] = useState<StaffRole | null>(
    ADMIN_DEMO_MODE ? "SUPER_ADMIN" : null,
  );
  const [isLoading] = useState(false);

  const hasRole = (targetRoles: StaffRole | StaffRole[]): boolean => {
    if (!user || !role) return false;
    const roles = Array.isArray(targetRoles) ? targetRoles : [targetRoles];
    if (role === "SUPER_ADMIN") return true;
    return roles.includes(role);
  };

  const canAccessFinance = (): boolean =>
    hasRole(["SUPER_ADMIN", "MANAGEMENT", "FINANCE"]);

  const logout = () => {
    setUser(null);
    setActiveRole(null);
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
