import React from "react";
import { Text, View } from "react-native";
import { theme } from "../constants/theme";
import { usePreferences } from "@/state/UserPreferencesContext";

export function StatusPill({ status }: { status: "active" | "paused" | "archived" }) {
  const { preferences } = usePreferences();
  const colors = theme.getColors(preferences.darkMode);

  const map = {
    active: { label: "Active", color: colors.success },
    paused: { label: "Paused", color: colors.warning },
    archived: { label: "Archived", color: colors.faint },
  }[status];

  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: colors.glassStrong,
        borderWidth: 1,
        borderColor: colors.glassBorder,
      }}
    >
      <Text style={{ color: map.color, fontWeight: "800", fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {map.label}
      </Text>
    </View>
  );
}
