import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";

import { getToken } from "@/lib/auth";
import { API_URL } from "@/constants/api";

import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { AppButton } from "@/components/AppButton";
import { theme } from "@/constants/theme"; 
import { useThemeColors } from "@/state/UserPreferencesContext";

type AdventureThemeId = "mountain" | "space" | "forest" | "ocean" | "desert";
type AdventureTheme = {
  id: AdventureThemeId;
  label: string;
  emoji: string;
  accent: string;
  softBg: string;
  border: string;
};

const ADVENTURE_THEMES: AdventureTheme[] = [
  {
    id: "mountain",
    label: "Planina",
    emoji: "🏔️",
    accent: "#A78BFA",
    softBg: "rgba(167,139,250,0.14)",
    border: "rgba(167,139,250,0.28)",
  },
  {
    id: "space",
    label: "Svemir",
    emoji: "🌌",
    accent: "#60A5FA",
    softBg: "rgba(96,165,250,0.14)",
    border: "rgba(96,165,250,0.28)",
  },
  {
    id: "forest",
    label: "Šuma",
    emoji: "🌲",
    accent: "#34D399",
    softBg: "rgba(52,211,153,0.14)",
    border: "rgba(52,211,153,0.26)",
  },
  {
    id: "ocean",
    label: "Ocean",
    emoji: "🌊",
    accent: "#22D3EE",
    softBg: "rgba(34,211,238,0.14)",
    border: "rgba(34,211,238,0.26)",
  },
  {
    id: "desert",
    label: "Pustinja",
    emoji: "🏜️",
    accent: "#FBBF24",
    softBg: "rgba(251,191,36,0.14)",
    border: "rgba(251,191,36,0.26)",
  },
];

type Mode = "ai" | "custom";

function ModePill({
  selected,
  title,
  subtitle,
  onPress,
  disabled,
}: {
  selected: boolean;
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 18,
          backgroundColor: selected
            ? "rgba(167,139,250,0.22)"
            : colors.glass,
          borderWidth: 1.5,
          borderColor: selected
            ? "rgba(167,139,250,0.65)"
            : colors.glassBorder,
          opacity: disabled ? 0.55 : pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 999,
            borderWidth: 2,
            borderColor: selected
              ? colors.primary
              : colors.faint,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          {selected && (
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                backgroundColor: colors.primary,
              }}
            />
          )}
        </View>

        <Text
          style={{
            color: colors.text,
            fontWeight: "900",
            fontSize: 18,
          }}
        >
          {title} {selected ? "✓" : ""}
        </Text>
      </View>

      <Text
        style={{
          color: colors.muted,
          marginTop: 8,
          marginLeft: 34,
          fontSize: 14,
          lineHeight: 18,
        }}
      >
        {subtitle}
      </Text>
    </Pressable>
  );
}

function ThemePicker({
  value,
  onChange,
  disabled,
}: {
  value: AdventureThemeId;
  onChange: (v: AdventureThemeId) => void;
  disabled?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <View style={{ marginTop: 12 }}>
      <Text
        style={{
          color: colors.faint,
          fontWeight: "900",
          fontSize: 11,
          letterSpacing: 1.4,
          marginBottom: 10,
        }}
      >
        TEMA AVANTURE
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingRight: 6 }}
      >
        {ADVENTURE_THEMES.map((t) => {
          const active = t.id === value;
          return (
            <Pressable
              key={t.id}
              onPress={() => onChange(t.id)}
              disabled={disabled}
              style={({ pressed }) => ({
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 999,
                backgroundColor: active ? t.softBg : colors.glass,
                borderWidth: 1,
                borderColor: active ? t.border : colors.glassBorder,
                opacity: disabled ? 0.55 : pressed ? 0.92 : 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              })}
            >
              <Text style={{ fontSize: 16 }}>{t.emoji}</Text>
              <Text style={{ color: colors.text, fontWeight: "900" }}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function validateTitleUi(raw: string): string | null {
  const t = raw.trim();

  if (!t) return "Unesi naziv avanture da možemo nastaviti.";
  if (t.length < 3) return "Naziv je prekratak (min 3 znaka).";

  const noSpaces = t.replace(/\s+/g, "");
  const sameCharSpam = /^([^\s])\1{5,}$/.test(noSpaces);
  if (sameCharSpam) return "Naziv izgleda kao spam. Probaj nešto smislenije 🙂";

  const hasLetter = /[a-zA-ZÀ-ž]/.test(t);
  if (!hasLetter) return "Naziv mora sadržavati barem jedno slovo.";

  return null;
}
async function readApiError(res: Response): Promise<{ error?: string; code?: string }> {
  const raw = await res.text().catch(() => "");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { error: raw };
  }
}

export default function CreateHabitScreen() {
  const router = useRouter();
  const colors = useThemeColors();

  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<Mode>("ai");
  const [loading, setLoading] = useState(false);

  const [themeId, setThemeId] = useState<AdventureThemeId>("mountain");

  const [titleTouched, setTitleTouched] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  const selectedTheme = useMemo(() => {
    return ADVENTURE_THEMES.find((t) => t.id === themeId) ?? ADVENTURE_THEMES[0];
  }, [themeId]);

  const titleOk = useMemo(() => validateTitleUi(title) == null, [title]);

  async function handleNext() {
  const err = validateTitleUi(title);

  if (err) {
    setTitleTouched(true);
    setTitleError(err);

    Alert.alert("Naziv nedostaje", err);
    return;
  }

  setTitleError(null);
  setLoading(true);

  try {
    if (mode === "ai") {
      const token = await getToken();

      const res = await fetch(`${API_URL}/habits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          category: "general",
          daily_minutes: 10,
          experience_level: "beginner",
          checkpoint_mode: "ai",
          theme: themeId,
        }),
      });

      if (!res.ok) {
  const data = await readApiError(res);

  const isBlocked = res.status === 400 && data?.code === "blocked";

  if (!isBlocked) {
    if (__DEV__) {
      console.warn("create habit failed:", { status: res.status, body: data });
    }
  }

  const message =
    data?.error ||
    (res.status === 400
      ? "Naziv nije prihvatljiv. Pokušaj drugi."
      : "Ne možemo stvoriti avanturu. Pokušajte ponovno.");

  setTitleTouched(true);
  setTitleError(message);

  Alert.alert("Naziv nije prihvatljiv", message);
  return;
}


  setTitleError(null);

      router.replace("/habits");
      return;
    }

    /* router.push({
      pathname: "/habits/create/checkpoints",
      params: { title: title.trim(), theme: themeId },
    }); */
  } catch (err) {
    Alert.alert("Greška", "Ne možemo stvoriti avanturu. Pokušajte ponovno.");
  } finally {
    setLoading(false);
  }
}


  return (
    <Screen scroll={true}>
      {loading && (
        <View
          pointerEvents="auto"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "transparent",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 420,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.glassBorder,
              borderRadius: theme.radius.lg,
              paddingVertical: 22,
              paddingHorizontal: 18,
              alignItems: "center",
              shadowColor: "#000",
              shadowOpacity: 0.35,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 10 },
              elevation: 12,
            }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={{
                color: colors.text,
                marginTop: 14,
                fontWeight: "900",
                fontSize: 18,
              }}
            >
              Pripremamo…
            </Text>
            <Text
              style={{
                color: colors.muted,
                marginTop: 8,
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              {mode === "ai"
                ? "Generiramo putanju avanture."
                : "Otvaramo uređivač putanje."}
            </Text>
          </View>
        </View>
      )}

      <Text
        style={[
          theme.type.hero,
          { color: colors.text, marginBottom: 8 },
        ]}
      >
        Stvorite novu avanturu
      </Text>

      <Text
        style={{ color: colors.muted, marginBottom: 18, lineHeight: 20 }}
      >
        Postavite cilj i odaberite izgled putanje.
      </Text>

      <Card>
        <Text
          style={[
            theme.type.h2,
            { color: colors.text, marginBottom: 10 },
          ]}
        >
          Što želite postići?
        </Text>

        <TextInput
          editable={!loading}
          placeholder="Naziv avanture (npr. Naučiti C++)"
          placeholderTextColor={colors.faint}
          value={title}
          onChangeText={(v) => {
            setTitle(v);
            if (titleTouched) setTitleError(validateTitleUi(v));
          }}

          onBlur={() => {
          }}
          style={{
            borderWidth: 1,
            borderColor: titleError
              ? colors.danger
              : colors.glassBorder,
            backgroundColor: colors.glass,
            color: colors.text,
            paddingVertical: 14,
            paddingHorizontal: 14,
            borderRadius: theme.radius.md,
            fontSize: 16,
            fontWeight: "600",
            opacity: loading ? 0.65 : 1,
          }}
        />

        {!!titleError && (
          <View
            style={{
              marginTop: 10,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 14,
              backgroundColor: colors.danger + "1A", // 10% opacity
              borderWidth: 1,
              borderColor: colors.danger + "33", // 20% opacity
            }}
          >
            <Text style={{ color: colors.danger, fontWeight: "800" }}>
              ⚠️ {titleError}
            </Text>
          </View>
        )}

        <ThemePicker value={themeId} onChange={setThemeId} disabled={loading} />

        <View style={{ marginTop: 12 }}>
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 16,
              backgroundColor: selectedTheme.softBg,
              borderWidth: 1,
              borderColor: selectedTheme.border,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ fontSize: 18 }}>{selectedTheme.emoji}</Text>
              <View>
                <Text style={{ color: colors.text, fontWeight: "900" }}>
                  Tema: {selectedTheme.label}
                </Text>
                <Text
                  style={{
                    color: colors.muted,
                    marginTop: 2,
                    fontSize: 12,
                  }}
                >
                  Vizualni stil će pratiti ovu avanturu.
                </Text>
              </View>
            </View>

            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                backgroundColor: selectedTheme.accent,
              }}
            />
          </View>
        </View>
      </Card>


      <View style={{ marginTop: 14 }}>
        <AppButton
          title={loading ? "Molimo pričekajte…" : "Nastavi"}
          onPress={handleNext}
          disabled={loading}
          style={{
            paddingVertical: 16,
            borderRadius: 20,
          }}
        />

        <Text style={{ marginTop: 10, textAlign: "center", color: colors.faint }}>
          Savjet: kratak, jasan naziv = lakši fokus.
        </Text>
      </View>
    </Screen>
  );
}
