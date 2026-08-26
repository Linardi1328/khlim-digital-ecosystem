"use client";

import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { User, GuardianProfile } from "./types";
import { apiService } from "./api-service";

interface AuthContextValue {
  isAuthenticated: boolean;
  user: User | null;
  guardianProfile: GuardianProfile | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  register: (email: string, fullName: string, preferredLocale?: string) => Promise<boolean>;
  logout: () => void;
  updateGuardianProfile: (profile: Partial<GuardianProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true); // Default logged in for demo/development
  const [user, setUser] = useState<User | null>({
    id: "usr-guardian-01",
    email: "richie.lim@example.com",
    status: "ACTIVE",
    preferredLocale: "en",
    roles: ["GUARDIAN"],
  });
  const [guardianProfile, setGuardianProfile] = useState<GuardianProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Load guardian profile
    apiService.getGuardianProfile().then((profile) => {
      setGuardianProfile(profile);
    });
  }, []);

  const login = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      setUser({
        id: "usr-guardian-01",
        email,
        status: "ACTIVE",
        preferredLocale: "en",
        roles: ["GUARDIAN"],
      });
      const profile = await apiService.getGuardianProfile();
      setGuardianProfile(profile);
      setIsAuthenticated(true);
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, fullName: string, preferredLocale = "en"): Promise<boolean> => {
    setIsLoading(true);
    try {
      const newUser: User = {
        id: `usr-${Date.now().toString(36)}`,
        email,
        status: "ACTIVE",
        preferredLocale,
        roles: ["GUARDIAN"],
      };
      setUser(newUser);
      const newProfile = await apiService.updateGuardianProfile({
        userId: newUser.id,
        displayName: fullName,
      });
      setGuardianProfile(newProfile);
      setIsAuthenticated(true);
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setGuardianProfile(null);
  };

  const updateGuardianProfile = async (profile: Partial<GuardianProfile>) => {
    const updated = await apiService.updateGuardianProfile(profile);
    setGuardianProfile(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        guardianProfile,
        isLoading,
        login,
        register,
        logout,
        updateGuardianProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
