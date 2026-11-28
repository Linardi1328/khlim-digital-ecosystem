"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { isSupportedLocale, type SupportedLocale } from "@khlim/i18n";
import { apiService } from "./api-service";
import {
  clearStoredSessionIfEpoch,
  invalidateWebSessionOperations,
  restoreSupabaseSession,
  SUPABASE_SESSION_STORAGE_KEY,
  supabaseRecoverPassword,
  supabaseSignIn,
  supabaseSignOut,
  supabaseSignUp,
} from "./supabase-auth";
import {
  WebAuthSessionController,
  type WebAuthSessionState,
  type WebLoginResult,
  type WebRegistrationResult,
} from "./web-auth-session-controller";
import type {
  AccountMeResponse,
  GuardianProfile,
  UpsertGuardianProfileDto,
} from "./types";

export type LoginResult = WebLoginResult;
export type RegistrationResult = WebRegistrationResult;

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<WebAuthSessionState>({
    isAuthenticated: false,
    account: null,
    guardianProfile: null,
    isLoading: true,
  });
  const controllerRef = useRef<WebAuthSessionController | null>(null);

  useEffect(() => {
    const controller = new WebAuthSessionController(
      {
        storageKey: SUPABASE_SESSION_STORAGE_KEY,
        restoreSession: restoreSupabaseSession,
        getMe: () => apiService.getMe(),
        updatePreferences: (dto) => apiService.updatePreferences(dto),
        upsertGuardianProfile: (profile) =>
          apiService.upsertGuardianProfile(profile),
        signIn: supabaseSignIn,
        signUp: supabaseSignUp,
        signOut: supabaseSignOut,
        invalidateSessionOperations: invalidateWebSessionOperations,
        clearStoredSessionIfEpoch,
        isSupportedLocale,
      },
      setAuthState,
      {
        isAuthenticated: false,
        account: null,
        guardianProfile: null,
        isLoading: true,
      },
    );
    controllerRef.current = controller;
    void controller.bootstrap();

    const handleStorageChange = (event: StorageEvent) => {
      const isSameStorageArea =
        event.storageArea === null || event.storageArea === window.localStorage;
      void controller.handleStorageChange({
        key: event.key,
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

  const refreshAccount = useCallback(async () => {
    return (await controllerRef.current?.refreshAccount()) ?? null;
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const controller = controllerRef.current;
      if (!controller) {
        throw new Error("Authentication controller is not ready.");
      }
      return controller.login(email, password);
    },
    [],
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      preferredLocale: SupportedLocale = "en",
    ): Promise<RegistrationResult> => {
      const controller = controllerRef.current;
      if (!controller) {
        throw new Error("Authentication controller is not ready.");
      }
      return controller.register(email, password, fullName, preferredLocale);
    },
    [],
  );

  const logout = useCallback(async () => {
    await controllerRef.current?.logout();
  }, []);

  const updateGuardianProfile = useCallback(
    async (profile: UpsertGuardianProfileDto) => {
      await controllerRef.current?.updateGuardianProfile(profile);
    },
    [],
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    await supabaseRecoverPassword(email);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: authState.isAuthenticated,
        account: authState.account,
        guardianProfile: authState.guardianProfile,
        isLoading: authState.isLoading,
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
