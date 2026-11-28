"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-context";
import { apiService } from "./api-service";
import { isFeatureAvailable } from "./feature-availability";
import {
  buildWebAuthContextKey,
  FamilySessionController,
  isStaleAuthContextError,
  StaleAuthContextError,
  type FamilySessionState,
} from "./family-session-isolation";
import type {
  ManagedAthlete,
  ManagedAthleteLinkItem,
  CreateManagedAthleteDto,
} from "./types";

export { isStaleAuthContextError, StaleAuthContextError };

interface FamilyContextValue {
  athleteLinks: ManagedAthleteLinkItem[];
  athletes: ManagedAthlete[];
  activeChild: ManagedAthlete | null;
  isLoading: boolean;
  isPortalFeatureDeferred: boolean;
  setActiveChild: (child: ManagedAthlete | null) => void;
  addChild: (dto: CreateManagedAthleteDto) => Promise<ManagedAthlete>;
  refreshFamily: () => Promise<void>;
}

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, account } = useAuth();
  const [sessionState, setSessionState] = useState<FamilySessionState>({
    athleteLinks: [],
    activeChild: null,
    isLoading: false,
    isPortalFeatureDeferred: false,
  });

  const controllerRef = useRef<FamilySessionController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new FamilySessionController(
      apiService,
      setSessionState,
    );
  }

  const authContextKey = buildWebAuthContextKey(isAuthenticated, account?.id);
  const authContextKeyRef = useRef(authContextKey);
  authContextKeyRef.current = authContextKey;

  const familyFeatureEnabled =
    isFeatureAvailable("parentPortal") ||
    isFeatureAvailable("academyEnrolmentCheckout");

  useEffect(() => {
    const controller = new FamilySessionController(apiService, setSessionState);
    controller.setAuthContext(authContextKeyRef.current);
    controllerRef.current = controller;
    return () => {
      controller.dispose();
    };
  }, []);

  useLayoutEffect(() => {
    controllerRef.current?.setAuthContext(authContextKey);
  }, [authContextKey]);

  const refreshFamily = useCallback(async () => {
    void authContextKey;
    await controllerRef.current?.refreshFamily({
      isAuthenticated,
      familyFeatureEnabled,
    });
  }, [authContextKey, familyFeatureEnabled, isAuthenticated]);

  useEffect(() => {
    void refreshFamily();
  }, [refreshFamily]);

  const setActiveChild = useCallback((child: ManagedAthlete | null) => {
    controllerRef.current?.setActiveChild(child);
  }, []);

  const addChild = useCallback(
    async (dto: CreateManagedAthleteDto): Promise<ManagedAthlete> => {
      const controller = controllerRef.current;
      if (!controller) {
        throw new StaleAuthContextError();
      }
      return controller.addChild(dto, {
        isAuthenticated,
        familyFeatureEnabled,
      });
    },
    [familyFeatureEnabled, isAuthenticated],
  );

  return (
    <FamilyContext.Provider
      value={{
        athleteLinks: sessionState.athleteLinks,
        athletes: sessionState.athleteLinks.map((link) => link.athlete),
        activeChild: sessionState.activeChild,
        isLoading: sessionState.isLoading,
        isPortalFeatureDeferred: sessionState.isPortalFeatureDeferred,
        setActiveChild,
        addChild,
        refreshFamily,
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily(): FamilyContextValue {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error("useFamily must be used within a FamilyProvider");
  }
  return context;
}
