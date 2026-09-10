"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { isSupportedLocale, type SupportedLocale } from "@khlim/i18n";
import { apiService } from "./api-service";
import {
  clearStoredSession,
  getGuardianRegistrationMetadata,
  restoreSupabaseSession,
  supabaseRecoverPassword,
  supabaseSignIn,
  supabaseSignOut,
  supabaseSignUp,
  type SupabaseSession,
} from "./supabase-auth";
import type {
  AccountMeResponse,
  GuardianProfile,
  UpsertGuardianProfileDto,
} from "./types";

export interface LoginResult {
  guardianOnboardingRequired: boolean;
}

export interface RegistrationResult {
  authenticated: boolean;
  emailConfirmationOrSignInRequired: boolean;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  account: AccountMeResponse | null;
  guardianProfile: GuardianProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (
    email: string,
    password: string,
    fullName: string,
    preferredLocale?: SupportedLocale,
  ) => Promise<RegistrationResult>;
  logout: () => Promise<void>;
  refreshAccount: () => Promise<AccountMeResponse | null>;
  updateGuardianProfile: (profile: UpsertGuardianProfileDto) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function finishPendingGuardianRegistration(
  session: SupabaseSession,
  account: AccountMeResponse,
): Promise<{ account: AccountMeResponse; guardianOnboardingRequired: boolean }> {
  if (account.guardianProfile) {
    return { account, guardianOnboardingRequired: false };
  }

  const metadata = getGuardianRegistrationMetadata(session.user);
  if (!metadata || !isSupportedLocale(metadata.preferredLocale)) {
    return { account, guardianOnboardingRequired: false };
  }

  await apiService.updatePreferences({
    preferredLocale: metadata.preferredLocale,
  });
  await apiService.upsertGuardianProfile({
    displayName: metadata.displayName,
  });

  return {
    account: await apiService.getMe(),
    guardianOnboardingRequired: true,
  };
}

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

  const login = async (
    email: string,
    password: string,
  ): Promise<LoginResult> => {
    setIsLoading(true);
    let supabaseSessionEstablished = false;
    try {
      const session = await supabaseSignIn(email, password);
      supabaseSessionEstablished = true;
      const account = await apiService.getMe();
      const result = await finishPendingGuardianRegistration(session, account);
      applyAccount(result.account);
      return {
        guardianOnboardingRequired: result.guardianOnboardingRequired,
      };
    } catch (error) {
      if (supabaseSessionEstablished) {
        clearStoredSession();
      }
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
    let supabaseSessionEstablished = false;
    try {
      const result = await supabaseSignUp(email, password, {
        displayName: fullName.trim(),
        preferredLocale,
      });
      supabaseSessionEstablished = Boolean(result.session);
      if (!result.session) {
        applyAccount(null);
        return {
          authenticated: false,
          emailConfirmationOrSignInRequired:
            result.emailConfirmationOrSignInRequired,
        };
      }

      await apiService.upsertGuardianProfile({
        displayName: fullName.trim(),
      });
      await apiService.updatePreferences({ preferredLocale });
      const value = await apiService.getMe();
      applyAccount(value);
      return {
        authenticated: true,
        emailConfirmationOrSignInRequired: false,
      };
    } catch (error) {
      if (supabaseSessionEstablished) {
        clearStoredSession();
      }
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

  const updateGuardianProfile = async (profile: UpsertGuardianProfileDto) => {
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
