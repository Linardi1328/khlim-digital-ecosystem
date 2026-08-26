"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { apiService } from "./api-service";
import {
  restoreSupabaseSession,
  supabaseRecoverPassword,
  supabaseSignIn,
  supabaseSignOut,
  supabaseSignUp,
} from "./supabase-auth";
import type {
  AccountMeResponse,
  GuardianProfile,
  UpsertGuardianProfileDto,
} from "./types";
import type { SupportedLocale } from "@khlim/i18n";

export interface RegistrationResult {
  authenticated: boolean;
  emailConfirmationRequired: boolean;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  account: AccountMeResponse | null;
  guardianProfile: GuardianProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    email: string,
    password: string,
    fullName: string,
    preferredLocale?: SupportedLocale,
  ) => Promise<RegistrationResult>;
  logout: () => Promise<void>;
  refreshAccount: () => Promise<AccountMeResponse | null>;
  updateGuardianProfile: (
    profile: UpsertGuardianProfileDto,
  ) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [account, setAccount] = useState<AccountMeResponse | null>(null);
  const [guardianProfile, setGuardianProfile] =
    useState<GuardianProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyAccount = useCallback((value: AccountMeResponse | null) => {
    setAccount(value);
    setGuardianProfile(value?.guardianProfile ?? null);
    setIsAuthenticated(Boolean(value));
  }, []);

  const refreshAccount = useCallback(async () => {
    try {
      const value = await apiService.getMe();
      applyAccount(value);
      return value;
    } catch {
      applyAccount(null);
      return null;
    }
  }, [applyAccount]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setIsLoading(true);
      try {
        const session = await restoreSupabaseSession();
        if (!session || cancelled) {
          if (!cancelled) applyAccount(null);
          return;
        }

        const value = await apiService.getMe();
        if (!cancelled) applyAccount(value);
      } catch {
        if (!cancelled) applyAccount(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [applyAccount]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      await supabaseSignIn(email, password);
      const value = await apiService.getMe();
      applyAccount(value);
      return true;
    } catch (error) {
      applyAccount(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    fullName: string,
    preferredLocale: SupportedLocale = "en",
  ): Promise<RegistrationResult> => {
    setIsLoading(true);
    try {
      const result = await supabaseSignUp(email, password);
      if (!result.session) {
        applyAccount(null);
        return {
          authenticated: false,
          emailConfirmationRequired: result.emailConfirmationRequired,
        };
      }

      await apiService.upsertGuardianProfile({
        displayName: fullName.trim(),
      });
      await apiService.updatePreferences({ preferredLocale });
      const value = await apiService.getMe();
      applyAccount(value);
      return { authenticated: true, emailConfirmationRequired: false };
    } catch (error) {
      applyAccount(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await supabaseSignOut();
    } finally {
      applyAccount(null);
      setIsLoading(false);
    }
  };

  const updateGuardianProfile = async (
    profile: UpsertGuardianProfileDto,
  ) => {
    await apiService.upsertGuardianProfile(profile);
    await refreshAccount();
  };

  const requestPasswordReset = async (email: string) => {
    await supabaseRecoverPassword(email);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        account,
        guardianProfile,
        isLoading,
        login,
        register,
        logout,
        refreshAccount,
        updateGuardianProfile,
        requestPasswordReset,
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
