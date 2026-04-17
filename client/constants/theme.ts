import { Platform } from "react-native";

export const theme = {
  colors: {
    primary: "#6366F1",
    accent: "#8B5CF6",
    purple: "#A78BFA",
    text: "#FFFFFF",
    muted: "rgba(255, 255, 255, 0.6)",
    faint: "rgba(255, 255, 255, 0.4)",
    danger: "#EF4444",
    success: "#10B981",
    warning: "#F59E0B",
    glass: "rgba(255, 255, 255, 0.08)",
    glassBorder: "rgba(255, 255, 255, 0.12)",
    glassStrong: "rgba(255, 255, 255, 0.12)",
    surface: "#12141A",
    bg: "#070A12",
    midnight: "#12141A",
  },

  modes: {
    dark: {
      bg: "#09090B", // zinc-950
      surface: "#18181B", // zinc-900
      midnight: "#18181B",
      glass: "rgba(255, 255, 255, 0.04)",
      glassBorder: "rgba(255, 255, 255, 0.08)",
      glassStrong: "rgba(255, 255, 255, 0.12)",
      primary: "#6366F1", // indigo-500
      accent: "#8B5CF6", // violet-500
      purple: "#A78BFA",
      text: "#FAFAFA", // zinc-50
      muted: "#A1A1AA", // zinc-400
      faint: "#52525B", // zinc-600
      danger: "#EF4444",
      success: "#10B981",
      warning: "#F59E0B",
    },
    light: {
      bg: "#FAFAFA", // zinc-50
      surface: "#FFFFFF",
      midnight: "#F4F4F5", // zinc-100
      glass: "rgba(0, 0, 0, 0.03)",
      glassBorder: "rgba(0, 0, 0, 0.08)",
      glassStrong: "rgba(0, 0, 0, 0.12)",
      primary: "#4F46E5", // indigo-600 for better contrast on light
      accent: "#7C3AED", // violet-600
      purple: "#8B5CF6",
      text: "#09090B", // zinc-950
      muted: "#52525B", // zinc-600
      faint: "#A1A1AA", // zinc-400
      danger: "#DC2626",
      success: "#059669",
      warning: "#D97706",
    },
  },

  getColors: (isDark: boolean) => {
    return isDark ? theme.modes.dark : theme.modes.light;
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 20,
    xl: 24,
    xxl: 32,
    full: 999,
  },

  type: {
    hero: {
      fontSize: 34,
      fontWeight: "900" as const,
      lineHeight: 42,
    },
    h1: {
      fontSize: 28,
      fontWeight: "900" as const,
      lineHeight: 34,
    },
    h2: {
      fontSize: 22,
      fontWeight: "800" as const,
      lineHeight: 28,
    },
    body: {
      fontSize: 16,
      lineHeight: 24,
    },
    cap: {
      fontSize: 12,
      fontWeight: "800" as const,
      letterSpacing: 0.8,
    },
  },
};
