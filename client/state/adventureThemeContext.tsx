// client/state/adventureThemeContext.tsx
import React, { createContext, useContext, useMemo, useState } from "react";
import { getAdventureTheme, type AdventureThemeId } from "@/constants/adventureThemes";
import { theme as baseTheme } from "@/constants/theme";

type Ctx = {
  currentThemeId: AdventureThemeId | null;
  setCurrentThemeId: (id: AdventureThemeId | null) => void;
  currentAccent: string; // ready-for-tabs
};

const AdventureThemeContext = createContext<Ctx | null>(null);

export function AdventureThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentThemeId, setCurrentThemeId] = useState<AdventureThemeId | null>(null);

  const currentAccent = useMemo(() => {
    if (!currentThemeId) return baseTheme.colors.primary;
    return getAdventureTheme(currentThemeId).accent;
  }, [currentThemeId]);

  const value = useMemo(
    () => ({ currentThemeId, setCurrentThemeId, currentAccent }),
    [currentThemeId, currentAccent]
  );

  return (
    <AdventureThemeContext.Provider value={value}>
      {children}
    </AdventureThemeContext.Provider>
  );
}

export function useAdventureTheme() {
  const ctx = useContext(AdventureThemeContext);
  if (!ctx) {
    throw new Error("useAdventureTheme must be used inside AdventureThemeProvider");
  }
  return ctx;
}
