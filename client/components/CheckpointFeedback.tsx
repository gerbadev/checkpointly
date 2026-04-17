import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import * as Haptics from "expo-haptics";
import { theme } from "@/constants/theme";
import { getAdventureTheme, type AdventureThemeId } from "@/constants/adventureThemes";
import { useThemeColors } from "@/state/UserPreferencesContext";

export type FeedbackPayload = {
  title: string;
  xpGained: number;
  message?: string;
  streakDays?: number;
  streakContinued?: boolean;
};

type Props = {
  visible: boolean;
  payload: FeedbackPayload | null;
  onDone: () => void;
  durationMs?: number;
  themeId?: AdventureThemeId; 
};

export function CheckpointFeedback({
  visible,
  payload,
  onDone,
  durationMs = 2200,
  themeId,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const colors = useThemeColors();

  const t = useMemo(() => getAdventureTheme(themeId ?? "mountain"), [themeId]);

  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const payloadKey = useMemo(() => {
    if (!payload) return "";
    return `${payload.title}|${payload.xpGained}|${payload.message ?? ""}|${payload.streakDays ?? ""}|${
      payload.streakContinued ? "1" : "0"
    }`;
  }, [payload]);

  const streakLine = useMemo(() => {
    if (!payload) return null;
    if (payload.streakDays == null) return null;

    const d = payload.streakDays;
    const suffix = d === 1 ? "" : "a";
    return payload.streakContinued
      ? `🔥 Niz nastavljen: ${d} dan${suffix}`
      : `🔥 Niz: ${d} dan${suffix}`;
  }, [payload]);

  const lastRunKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let timeout: any;

    async function run() {
      if (!visible || !payload) return;

      if (lastRunKeyRef.current === payloadKey) return;
      lastRunKeyRef.current = payloadKey;

      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      opacity.setValue(0);
      scale.setValue(0.92);
      glow.setValue(0);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();

      const holdMs = Math.max(900, durationMs - 520);
      timeout = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 260,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.98,
            duration: 260,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished) onDoneRef.current?.();
        });
      }, holdMs);
    }

    run();
    return () => timeout && clearTimeout(timeout);
  }, [visible, payloadKey, durationMs, opacity, scale, glow, payload]);

  useEffect(() => {
    if (!visible) lastRunKeyRef.current = null;
  }, [visible]);

  if (!visible || !payload) return null;

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.0, 0.6],
  });

  const xp = Number(payload?.xpGained ?? 0);

  return (
  <View pointerEvents="none" style={[styles.overlay, { backgroundColor: colors.glassStrong }]}>
    <Animated.View style={[styles.cardWrap, { opacity, transform: [{ scale }] }]}>
      <Animated.View
        style={[
          styles.glow,
          {
            opacity: glowOpacity as any,
            backgroundColor: t.softBg,
            borderColor: t.border,
          },
        ]}
      />

      <View
        style={[
          styles.card,
          {
            borderColor: t.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>{payload.title}</Text>

        <View style={styles.row}>
          {xp > 0 && (
            <View style={[styles.pill, { backgroundColor: t.softBg, borderColor: t.border }]}>
              <Text style={[styles.pillText, { color: colors.text }]}>✨ +{xp} XP</Text>
            </View>
          )}

          {payload.streakDays != null && (
            <View style={[styles.pill, { backgroundColor: colors.glass, borderColor: t.border }]}>
              <Text style={[styles.pillTextSecondary, { color: colors.text }]}>{streakLine}</Text>
            </View>
          )}
        </View>

        {!!payload.message && <Text style={[styles.message, { color: colors.muted }]}>{payload.message}</Text>}
      </View>
    </Animated.View>
  </View>
);


}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  cardWrap: {
    width: "88%",
    maxWidth: 420,
  },
  glow: {
  position: "absolute",
  left: -18,
  right: -18,
  top: -18,
  bottom: -18,
  borderRadius: 28,
  borderWidth: 1,
},

card: {
  borderRadius: 24,
  paddingVertical: 16,
  paddingHorizontal: 16,
  borderWidth: 1,
},

  title: {
    fontWeight: "900",
    fontSize: 16,
    textAlign: "center",
  },
  row: {
    marginTop: 12,
    gap: 10,
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
  },
  pillSecondary: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  pillText: {
    fontWeight: "900",
    fontSize: 13,
  },
  pillTextSecondary: {
    fontWeight: "800",
    fontSize: 12,
  },
  message: {
    marginTop: 12,
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "700",
  },
});
