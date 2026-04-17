import React from "react";
import { Pressable, Text, View } from "react-native";
import { theme } from "../constants/theme";
import { usePreferences } from "@/state/UserPreferencesContext";

type Option<T extends string> = {
  label: string;
  value: T;
};

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
}) {
  const { preferences } = usePreferences();
  const colors = theme.getColors(preferences.darkMode);

  return (
    <View
      style={{
        flexDirection: "row",
        padding: 6,
        borderRadius: 999,
        backgroundColor: colors.glassStrong,
        borderWidth: 1,
        borderColor: colors.glassBorder,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;

        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={({ pressed }) => [
              {
                flex: 1,
                paddingVertical: 12,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: active
                  ? `${colors.primary}15`
                  : "transparent",
                borderWidth: active ? 1 : 0,
                borderColor: active ? `${colors.primary}30` : "transparent",
                opacity: pressed ? 0.92 : 1,
                transform: [{ scale: pressed ? 0.99 : 1 }],
              },
            ]}
          >
            <Text
              style={{
                color: active ? colors.text : colors.muted,
                fontWeight: active ? "900" : "700",
                fontSize: 13,
              }}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
