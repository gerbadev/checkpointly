import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { theme } from "@/constants/theme";

type UserPreferences = {
  darkMode: boolean;
  notifications: boolean;
  dailyReminders: boolean;
};

type PreferencesContextType = {
  preferences: UserPreferences;
  togglePreference: (key: keyof UserPreferences) => void;
  isLoading: boolean;
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const PREFS_KEY = "user_preferences";

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>({
    darkMode: true,
    notifications: true,
    dailyReminders: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPrefs() {
      try {
        const stored = await AsyncStorage.getItem(PREFS_KEY);
        if (stored) {
          setPreferences(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Failed to load user preferences:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadPrefs();
  }, []);

  async function togglePreference(key: keyof UserPreferences) {
    const newPrefs = { ...preferences, [key]: !preferences[key] };
    setPreferences(newPrefs);
    try {
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(newPrefs));
    } catch (e) {
      console.error("Failed to save user preferences:", e);
    }
  }

  return (
    <PreferencesContext.Provider value={{ preferences, togglePreference, isLoading }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}

export function useThemeColors() {
  const { preferences } = usePreferences();
  return theme.getColors(preferences.darkMode);
}
