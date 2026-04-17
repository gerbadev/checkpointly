import React from "react";
import { Pressable, Text, ViewStyle, StyleSheet, View } from "react-native";
import { theme } from "../constants/theme";
import { usePreferences } from "@/state/UserPreferencesContext";

type Variant = "primary" | "secondary" | "danger" | "ghost";

export function AppButton({
  title,
  onPress,
  variant = "primary",
  style,
  disabled,
  icon,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  style?: ViewStyle;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  const { preferences } = usePreferences();
  const themeColors = theme.getColors(preferences.darkMode);
  
  const isPrimary = variant === "primary";
  const isGhost = variant === "ghost";
  const isDanger = variant === "danger";

  const isDark = preferences.darkMode;
  
  const getColors = () => {
    if (disabled && !isGhost) {
      return { 
        bg: themeColors.glassStrong, 
        text: isDark ? "#fff" : "#000", 
        border: themeColors.glassBorder 
      };
    }
    switch (variant) {
      case "primary": return { bg: disabled ? themeColors.glassStrong : themeColors.primary, text: "#fff", border: "rgba(255,255,255,0.15)" };
      case "danger": return { bg: disabled ? themeColors.glassStrong : themeColors.danger, text: "#fff", border: "rgba(255,255,255,0.15)" };
      case "secondary": return { bg: themeColors.glassStrong, text: isDark ? "#fff" : "#000", border: themeColors.glassBorder };
      case "ghost": return { bg: "transparent", text: disabled ? themeColors.glassBorder : themeColors.muted, border: "transparent" };
      default: return { bg: disabled ? themeColors.glassStrong : themeColors.primary, text: "#fff", border: "rgba(255,255,255,0.15)" };
    }
  };

  const colors = getColors();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          opacity: (disabled && isGhost) ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        pressed && !isGhost && styles.pressedShadow,
        style,
      ]}
    >
      {({ pressed }) => (
        <View style={{ position: 'relative', width: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }}>
          {pressed && !isGhost && (
            <View style={[StyleSheet.absoluteFill, styles.innerHighlight]} />
          )}
          {icon}
          <Text style={[styles.text, { color: colors.text }]}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  text: {
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  pressedShadow: {
    // Simulating inner shadow/recessed state
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  innerHighlight: {
    backgroundColor: "rgba(0,0,0,0.05)",
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.08)",
    borderRadius: theme.radius.md,
  }
});

