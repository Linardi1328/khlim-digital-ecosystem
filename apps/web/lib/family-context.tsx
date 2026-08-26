"use client";

import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { AthleteProfile } from "./types";
import { apiService } from "./api-service";

interface FamilyContextValue {
  athletes: AthleteProfile[];
  activeChild: AthleteProfile | null;
  setActiveChild: (child: AthleteProfile | null) => void;
  setActiveChildById: (id: string) => void;
  addChild: (data: { displayName: string; dateOfBirth: string; gender?: string }) => Promise<AthleteProfile>;
  isLoading: boolean;
  refreshAthletes: () => Promise<void>;
}

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [activeChild, setActiveChild] = useState<AthleteProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadAthletes = async () => {
    setIsLoading(true);
    try {
      const list = await apiService.getLinkedAthletes();
      setAthletes(list);
      if (list.length > 0) {
        // preserve active child or set first
        setActiveChild((prev) => {
          if (prev) {
            const match = list.find((a) => a.id === prev.id);
            if (match) return match;
          }
          return list[0] ?? null;
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAthletes();
  }, []);

  const setActiveChildById = (id: string) => {
    const found = athletes.find((a) => a.id === id);
    if (found) {
      setActiveChild(found);
    }
  };

  const addChild = async (data: { displayName: string; dateOfBirth: string; gender?: string }): Promise<AthleteProfile> => {
    const newAthlete = await apiService.createAthlete(data);
    await loadAthletes();
    setActiveChild(newAthlete);
    return newAthlete;
  };

  return (
    <FamilyContext.Provider
      value={{
        athletes,
        activeChild,
        setActiveChild,
        setActiveChildById,
        addChild,
        isLoading,
        refreshAthletes: loadAthletes,
      }}
    >
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily(): FamilyContextValue {
  const ctx = useContext(FamilyContext);
  if (!ctx) {
    throw new Error("useFamily must be used within a FamilyProvider");
  }
  return ctx;
}
