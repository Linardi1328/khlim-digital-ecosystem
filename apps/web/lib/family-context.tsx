"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
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
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
      const list = links.map((l) => l.athlete);
      if (list.length > 0) {
        setActiveChild((prev) => {
          if (!prev) return list[0] ?? null;
          const found = list.find((a) => a.id === prev.id);
          return found ?? list[0] ?? null;
        });
      } else {
        setActiveChild(null);
      }
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
    const createdLink = await apiService.createManagedAthlete(dto);
    await refreshFamily();
    setActiveChild(createdLink.athlete);
    return createdLink.athlete;
  };

  const athletes = athleteLinks.map((l) => l.athlete);

  return (
    <FamilyContext.Provider
      value={{
        athleteLinks,
        athletes,
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
