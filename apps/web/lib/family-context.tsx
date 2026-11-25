"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { isFeatureNotAvailableError } from "@khlim/api-client";
import { useAuth } from "./auth-context";
import { apiService } from "./api-service";
import { isFeatureAvailable } from "./feature-availability";
import type {
  ManagedAthlete,
  ManagedAthleteLinkItem,
  CreateManagedAthleteDto,
} from "./types";

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
  const { isAuthenticated } = useAuth();
  const [athleteLinks, setAthleteLinks] = useState<ManagedAthleteLinkItem[]>(
    [],
  );
  const [activeChild, setActiveChild] = useState<ManagedAthlete | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPortalFeatureDeferred, setIsPortalFeatureDeferred] = useState(false);

  const familyFeatureEnabled =
    isFeatureAvailable("parentPortal") ||
    isFeatureAvailable("academyEnrolmentCheckout");

  const refreshFamily = useCallback(async () => {
    if (!isAuthenticated) {
      setAthleteLinks([]);
      setActiveChild(null);
      setIsPortalFeatureDeferred(false);
      return;
    }

    if (!familyFeatureEnabled || isPortalFeatureDeferred) {
      setAthleteLinks([]);
      setActiveChild(null);
      return;
    }

    setIsLoading(true);
    try {
      const links = await apiService.listManagedAthletes();
      setAthleteLinks(links);
      const athletes = links.map((link) => link.athlete);
      setActiveChild((current) => {
        if (current) {
          const existing = athletes.find(
            (athlete) => athlete.id === current.id,
          );
          if (existing) return existing;
        }
        return athletes[0] ?? null;
      });
    } catch (caught) {
      if (isFeatureNotAvailableError(caught)) {
        setIsPortalFeatureDeferred(true);
      }
      setAthleteLinks([]);
      setActiveChild(null);
    } finally {
      setIsLoading(false);
    }
  }, [familyFeatureEnabled, isAuthenticated, isPortalFeatureDeferred]);

  useEffect(() => {
    void refreshFamily();
  }, [refreshFamily]);

  const addChild = async (
    dto: CreateManagedAthleteDto,
  ): Promise<ManagedAthlete> => {
    try {
      const created = await apiService.createManagedAthlete(dto);
      await refreshFamily();
      setActiveChild(created.athlete);
      return created.athlete;
    } catch (caught) {
      if (isFeatureNotAvailableError(caught)) {
        setIsPortalFeatureDeferred(true);
      }
      throw caught;
    }
  };

  return (
    <FamilyContext.Provider
      value={{
        athleteLinks,
        athletes: athleteLinks.map((link) => link.athlete),
        activeChild,
        isLoading,
        isPortalFeatureDeferred,
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
