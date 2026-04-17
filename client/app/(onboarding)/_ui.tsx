import React from "react";
import { Pressable, Text, View, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { getToken } from "@/lib/auth";
import { API_URL } from "@/constants/api";
import { setHasOnboarded } from "@/lib/onboarding";
import { useThemeColors, usePreferences } from "@/state/UserPreferencesContext";

export function OBContainer({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useThemeColors();
  const { preferences } = usePreferences();
  const isDark = preferences.darkMode;

  async function handleSkip() {
    try {
      const token = await getToken();
      if (token) {
        await fetch(`${API_URL}/profile/onboarding/complete`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      await setHasOnboarded(true);
      router.replace("/(tabs)/dashboard");
    } catch (e) {
      router.replace("/(tabs)/dashboard");
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: isDark ? "#070A12" : "#F8F9FA" }]}>
      <View style={[styles.blob, { top: -40, left: -60, opacity: 0.15, backgroundColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(167,139,250,0.12)" }]} />
      <View style={[styles.blob2, { top: 140, right: -120, opacity: 0.12, backgroundColor: isDark ? "rgba(120,180,255,0.18)" : "rgba(120,180,255,0.08)" }]} />
      <View style={[styles.blob3, { bottom: -60, right: -60, opacity: 0.1, backgroundColor: isDark ? "rgba(255,180,140,0.16)" : "rgba(255,180,140,0.06)" }]} />

      <View style={{ 
        position: 'absolute', 
        top: insets.top + 10, 
        right: 18, 
        zIndex: 10 
      }}>
        <TouchableOpacity 
          onPress={() => {
            Alert.alert(
              "Preskoči onboarding",
              "Želite li preskočiti uvod i ići izravno na nadzornu ploču?",
              [
                { text: "Odustani", style: "cancel" },
                { text: "Preskoči", style: "default", onPress: handleSkip }
              ]
            );
          }}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 20,
            backgroundColor: colors.glassStrong,
            borderWidth: 1,
            borderColor: colors.glassBorder,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "800", fontSize: 13 }}>
            Preskoči
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

/** TEXT (visok kontrast) */
type OBTextVariant = "hero" | "title" | "body" | "muted" | "label" | "cap";

export function OBText({
  children,
  variant = "body",
  style,
  align,
}: {
  children: React.ReactNode;
  variant?: OBTextVariant;
  style?: any;
  align?: "left" | "center" | "right";
}) {
  const colors = useThemeColors();
  
  const textStyles = StyleSheet.create({
    hero: { color: colors.text, fontSize: 34, fontWeight: "900", lineHeight: 40 },
    title: { color: colors.text, fontSize: 28, fontWeight: "900", lineHeight: 34 },
    body: { color: colors.text, fontSize: 16, fontWeight: "700", lineHeight: 22, opacity: 0.94 },
    muted:{ color: colors.muted, fontSize: 15, fontWeight: "700", lineHeight: 21 },
    label:{ color: colors.text, fontSize: 13, fontWeight: "900", letterSpacing: 0.6, opacity: 0.92 },
    cap:  { color: colors.faint, fontSize: 13, fontWeight: "800" },
  });

  return (
    <Text style={[(textStyles as any)[variant], align ? { textAlign: align } : null, style]}>
      {children}
    </Text>
  );
}

/** BUTTON */
export function OBButton({
  title,
  onPress,
  variant = "primary",
  disabled,
  align = "center",
  style,
}: {
  title: string;
  onPress: () => void | Promise<void>;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  align?: "left" | "center" | "right";
  style?: any;
}) {
  const colors = useThemeColors();
  const isPrimary = variant === "primary";

  const alignItems =
    align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          borderRadius: 16,
          paddingVertical: 14,
          paddingHorizontal: 16,
          justifyContent: "center",
          alignItems,
          opacity: disabled ? 0.4 : pressed ? 0.92 : 1,
          backgroundColor: isPrimary ? colors.glassStrong : "transparent",
          borderWidth: 1,
          borderColor: isPrimary ? colors.primary : colors.glassBorder,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: isPrimary ? colors.primary : colors.text,
          fontWeight: "900",
          fontSize: 16,
          textAlign: align,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

export function OBFooter({ children }: { children: React.ReactNode }) {
  const colors = useThemeColors();
  return (
    <View style={{ marginTop: 18 }}>
      <View style={{ height: 1, backgroundColor: colors.glassBorder, marginBottom: 14 }} />
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

export function OBNavFooter({
  onBack,
  onNext,
  backHref,
  nextHref,
  backLabel = "Natrag",
  nextLabel = "Naprijed",
  hideBack,
  nextDisabled,
  replace = true,
}: {
  onBack?: () => void | Promise<void>;
  onNext?: () => void | Promise<void>;
  backHref?: Href;
  nextHref?: Href;
  backLabel?: string;
  nextLabel?: string;
  hideBack?: boolean;
  nextDisabled?: boolean;
  replace?: boolean;
}) {
  const router = useRouter();

  const goBack = async () => {
    if (onBack) return onBack();
    if (backHref) return replace ? router.replace(backHref) : router.push(backHref);
    if (router.canGoBack()) return router.back();
    router.replace("/(tabs)/dashboard");
  };

  const goNext = async () => {
    if (onNext) return onNext();
    if (nextHref) return replace ? router.replace(nextHref) : router.push(nextHref);
  };

  return (
    <OBFooter>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        {!hideBack ? (
          <View style={{ minWidth: 140 }}>
            <OBButton title={backLabel} variant="secondary" onPress={goBack} />
          </View>
        ) : (
          <View />
        )}
        <View style={{ minWidth: 160 }}>
          <OBButton title={nextLabel} variant="primary" disabled={nextDisabled} onPress={goNext} />
        </View>
      </View>
    </OBFooter>
  );
}

export function OBOptionRow({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 14,
        opacity: disabled ? 0.45 : pressed ? 0.92 : 1,
        backgroundColor: selected ? `${colors.primary}15` : colors.glassStrong,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.glassBorder,
      })}
    >
      <Text
        style={{
          color: colors.text,
          fontWeight: "900",
          fontSize: 16,
          lineHeight: 22,
        }}
      >
        {label}
        {selected ? (
          <Text style={{ color: colors.primary, fontWeight: "900" }}>
            {"  "}✓
          </Text>
        ) : null}
      </Text>
    </Pressable>
  );
}

export function OBOptionPill({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        borderRadius: 999,
        paddingVertical: 10,
        paddingHorizontal: 14,
        opacity: disabled ? 0.45 : pressed ? 0.92 : 1,
        backgroundColor: selected ? `${colors.primary}20` : colors.glassStrong,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.glassBorder,
        maxWidth: "100%",
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text
          style={{
            color: colors.text,
            fontWeight: "900",
            fontSize: 14,
            lineHeight: 18,
            flexShrink: 1,
          }}
        >
          {label}
        </Text>
        {selected ? (
          <Text style={{ marginLeft: 8, color: colors.primary, fontWeight: "900" }}>
            ✓
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function OBChipsWrap({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
        marginTop: 8,
      }}
    >
      {children}
    </View>
  );
}

export function OBChip({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 999,
        paddingVertical: 10,
        paddingHorizontal: 14,
        opacity: disabled ? 0.45 : pressed ? 0.92 : 1,
        backgroundColor: selected ? `${colors.primary}15` : colors.glassStrong,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.glassBorder,
      })}
    >
      <Text
        style={{
          color: colors.text,
          fontWeight: "900",
          fontSize: 15,
        }}
      >
        {label}
      </Text>
      {selected ? (
        <Text style={{ marginLeft: 8, color: colors.primary, fontWeight: "900" }}>
          ✓
        </Text>
      ) : null}
    </Pressable>
  );
}

export function ProgressDots({ step, total }: { step: number; total: number }) {
  const colors = useThemeColors();
  return (
    <View style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
      {Array.from({ length: total }).map((_, i) => {
        const active = i === step;
        return (
          <View
            key={i}
            style={{
              height: 8,
              width: active ? 28 : 8,
              borderRadius: 999,
              backgroundColor: active ? colors.primary : colors.faint,
              borderWidth: 1,
              borderColor: active ? colors.primary : colors.glassBorder,
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
    maxWidth: 520,
    alignSelf: "center",
    width: "100%",
  },
  blob: { position: "absolute", width: 220, height: 220, borderRadius: 999 },
  blob2:{ position: "absolute", width: 320, height: 320, borderRadius: 999 },
  blob3:{ position: "absolute", width: 240, height: 240, borderRadius: 999 },
});

export default function _UiRoute() {
  return null;
}
