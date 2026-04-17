import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { theme } from "../constants/theme";
import { usePreferences } from "@/state/UserPreferencesContext";

export function Card({ 
  children, 
  style, 
  variant = 'glass' 
}: { 
  children: React.ReactNode; 
  style?: StyleProp<ViewStyle>; 
  variant?: 'glass' | 'surface' | 'outline' 
}) {
  const isOutline = variant === 'outline';
  const { preferences } = usePreferences();
  const isDark = preferences.darkMode;
  const colors = theme.getColors(isDark);

  return (
    <View
      style={[
        {
          backgroundColor: variant === 'glass' 
            ? (isDark ? colors.glass : colors.surface) 
            : colors.surface,
          borderColor: colors.glassBorder,
          borderWidth: 1,
          borderRadius: theme.radius.lg,
          padding: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.35 : 0.06,
          shadowRadius: 16,
          elevation: isDark ? 4 : 2,
        },
        isOutline && { backgroundColor: 'transparent', borderStyle: 'dashed' },
        style,
      ]}
    >
      {children}
    </View>

  );
}
