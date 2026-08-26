"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-context";
import { apiService } from "./api-service";
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
  setActiveChild: (child: ManagedAthlete | null) => void;
  addChild: (dto: CreateManagedAthleteDto) => Promise<ManagedAthlete>;
  refreshFamily: () => Promise<void>;
}

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [athleteLinks, setAthleteLinks] = useState<ManagedAthleteLinkItem[]>([]);
  const [activeChild, setActiveChild] = useState<ManagedAthlete | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshFamily = useCallback(async () => {
    if (!isAuthenticated) {
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
          const existing = athletes.find((athlete) => athlete.id === current.id);
          if (existing) return existing;
        }
        return athletes[0] ?? null;
      });
    } catch {
      setAthleteLinks([]);
      setActiveChild(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshFamily();
  }, [refreshFamily]);

  const addChild = async (
    dto: CreateManagedAthleteDto,
  ): Promise<ManagedAthlete> => {
    const created = await apiService.createManagedAthlete(dto);
    await refreshFamily();
    setActiveChild(created.athlete);
    return created.athlete;
  };

  return (
    <FamilyContext.Provider
      value={{
        athleteLinks,
        athletes: athleteLinks.map((link) => link.athlete),
        activeChild,
        isLoading,
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
