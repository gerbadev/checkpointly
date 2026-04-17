import React, { createContext, useContext, useMemo, useState } from "react";

export type OnboardingTheme = "mountain" | "space" | "forest" | "ocean" | "desert";
export type OnboardingGoal = "habit" | "consistency" | "project" | "energy_sleep" | "explore";

export type OnboardingState = {
  interests: string[];
  goals: OnboardingGoal[];        
  minutesPerDay: 5 | 10 | 20;
  title: string;
  theme: OnboardingTheme;
};

const defaultState: OnboardingState = {
  interests: [],
  goals: [],                        
  minutesPerDay: 10,
  title: "",
  theme: "mountain",
};

type Ctx = {
  state: OnboardingState;
  setState: React.Dispatch<React.SetStateAction<OnboardingState>>;
  reset: () => void;
};

const OnboardingContext = createContext<Ctx | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>(defaultState);

  const value = useMemo(
    () => ({
      state,
      setState,
      reset: () => setState(defaultState),
    }),
    [state]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}

export default function _StoreRoute() {
  return null;
}
