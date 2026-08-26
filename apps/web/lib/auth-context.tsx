"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { SupportedLocale } from "@khlim/i18n";
import {
  getStoredAccessToken,
  supabaseSignIn,
  supabaseSignUp,
  supabaseRecoverPassword,
  supabaseSignOut,
  type SupabaseUser,
} from "./supabase-auth";
import { apiService } from "./api-service";
import type {
  AccountMeResponse,
  GuardianProfile,
  UpsertGuardianProfileDto,
} from "./types";

interface AuthContextValue {
  user: SupabaseUser | null;
  account: AccountMeResponse | null;
  guardianProfile: GuardianProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    email: string,
    password: string,
    displayName: string,
    locale: SupportedLocale,
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updateGuardianProfile: (dto: UpsertGuardianProfileDto) => Promise<void>;
  refreshAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [account, setAccount] = useState<AccountMeResponse | null>(null);
  const [guardianProfile, setGuardianProfile] = useState<GuardianProfile | null>(
    null,
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshAccount = useCallback(async () => {
    const token = getStoredAccessToken();
    if (!token) {
      setUser(null);
      setAccount(null);
      setGuardianProfile(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    try {
      const me = await apiService.getMe();
      setAccount(me);
      setGuardianProfile(me.guardianProfile);
      setUser({
        id: me.id,
        email: me.email,
        user_metadata: {
          display_name: me.guardianProfile?.displayName,
          preferred_locale: me.preferredLocale,
        },
      });
      setIsAuthenticated(true);
    } catch {
      // Session invalid / expired
      await supabaseSignOut();
      setUser(null);
      setAccount(null);
      setGuardianProfile(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAccount();
  }, [refreshAccount]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const session = await supabaseSignIn(email, password);
      setUser(session.user);
      await refreshAccount();
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    displayName: string,
    locale: SupportedLocale,
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { session } = await supabaseSignUp(email, password, {
        full_name: displayName,
        preferred_locale: locale,
      });

      if (session) {
        setUser(session.user);
        try {
          await apiService.upsertGuardianProfile({
            displayName,
            phone: "",
          });
        } catch {
          // Non-blocking initial profile creation
        }
        await refreshAccount();
      }
      return true;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await supabaseSignOut();
      setUser(null);
      setAccount(null);
      setGuardianProfile(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const requestPasswordReset = async (email: string): Promise<void> => {
    await supabaseRecoverPassword(email);
  };

  const updateGuardianProfile = async (
    dto: UpsertGuardianProfileDto,
  ): Promise<void> => {
    await apiService.upsertGuardianProfile(dto);
    await refreshAccount();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        account,
        guardianProfile,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        requestPasswordReset,
        updateGuardianProfile,
        refreshAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
