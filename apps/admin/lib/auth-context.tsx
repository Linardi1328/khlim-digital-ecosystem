"use client";

import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { AdminUser, StaffRole } from "./types";

interface AuthContextValue {
  user: AdminUser | null;
  role: StaffRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  setRole: (role: StaffRole) => void;
  hasRole: (roles: StaffRole | StaffRole[]) => boolean;
  canAccessFinance: () => boolean;
  logout: () => void;
}

const DEFAULT_ADMIN_USER: AdminUser = {
  id: "usr-admin-lead",
  email: "admin@khlim.com",
  displayName: "Admin Operations Lead",
  role: "SUPER_ADMIN",
  roles: ["SUPER_ADMIN", "MANAGEMENT"],
  mfaEnabled: true,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(DEFAULT_ADMIN_USER);
  const [role, setActiveRole] = useState<StaffRole>("SUPER_ADMIN");
  const [isLoading] = useState<boolean>(false);

  const hasRole = (targetRoles: StaffRole | StaffRole[]): boolean => {
    if (!user) return false;
    const array = Array.isArray(targetRoles) ? targetRoles : [targetRoles];
    if (role === "SUPER_ADMIN") return true;
    return array.includes(role);
  };

  const canAccessFinance = (): boolean => {
    return hasRole(["SUPER_ADMIN", "MANAGEMENT", "FINANCE"]);
  };

  const logout = () => {
    setUser(null);
  };

  const setRole = (newRole: StaffRole) => {
    setActiveRole(newRole);
    if (user) {
      setUser({ ...user, role: newRole });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated: !!user,
        isLoading,
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
