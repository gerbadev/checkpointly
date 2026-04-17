import React, { useMemo, useState } from "react";
import { View, TextInput, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { API_URL } from "@/constants/api";
import { getToken } from "@/lib/auth";
import { useOnboarding, type OnboardingTheme } from "./_store";
import { OBContainer, ProgressDots, OBText, OBNavFooter, OBOptionRow, } from "./_ui";

const THEMES: { id: OnboardingTheme; label: string; emoji: string }[] = [
  { id: "mountain", label: "Planina 🏔️", emoji: "🏔️" },
  { id: "space", label: "Svemir 🪐", emoji: "🪐" },
  { id: "forest", label: "Šuma 🌲", emoji: "🌲" },
  { id: "ocean", label: "Ocean 🌊", emoji: "🌊" },
  { id: "desert", label: "Pustinja 🏜️", emoji: "🏜️" },
];

export default function OnboardingFirstAdventure() {
  const router = useRouter();
  const { state, setState } = useOnboarding();
  const [saving, setSaving] = useState(false);

  const titleTrimmed = state.title.trim();
  const canCreate = useMemo(() => titleTrimmed.length >= 3 && !saving, [titleTrimmed, saving]);

  async function createHabitNow() {
    if (saving) return;

    if (titleTrimmed.length < 3) {
      Alert.alert("Naziv je prekratak", "Upiši barem 3 znaka.");
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();

      const res = await fetch(`${API_URL}/habits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: titleTrimmed,
          category: state.interests?.[0] ?? null,
          daily_minutes: state.minutesPerDay,
          experience_level: "beginner",
          theme: state.theme,
          description: state.goals.length ? `goals:${state.goals.join(",")}` : null,
        }),
      });

      const raw = await res.text().catch(() => "");
      let data: any = null;
      try { data = raw ? JSON.parse(raw) : null; } catch {}

      if (!res.ok) {
        const msg = data?.error || (raw?.slice?.(0, 180) ?? "Ne možemo kreirati avanturu.");
        throw new Error(msg);
      }

      const newHabitId = data?.habit?.id;
      if (!newHabitId) throw new Error("Nedostaje ID avanture u odgovoru.");

      setState((p) => ({ ...p, title: titleTrimmed }));

      router.replace({
        pathname: "/(onboarding)/done",
        params: { habitId: String(newHabitId) },
      });
    } catch (e: any) {
      Alert.alert("Greška", e?.message || "Ne možemo kreirati avanturu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <OBContainer>
      <View style={{ flex: 1, gap: 14 }}>
        <ProgressDots step={5} total={6} />

        <OBText variant="title">Prva avantura</OBText>
        <OBText variant="muted">Daj joj naziv i odaberi temu. Generiramo putanju odmah.</OBText>

        <View style={{ marginTop: 10, gap: 10 }}>
          <OBText variant="label">Naziv</OBText>
          <TextInput
            value={state.title}
            onChangeText={(v) => setState((p) => ({ ...p, title: v }))}
            placeholder="npr. Jutarnje čitanje 15 min"
            placeholderTextColor="rgba(255,255,255,0.40)"
            style={{
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.18)",
              backgroundColor: "rgba(255,255,255,0.08)",
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 12,
              color: "white",
              fontWeight: "800",
              fontSize: 16,
            }}
          />
        </View>

        <View style={{ marginTop: 8, gap: 10 }}>
          <OBText variant="label">Tema</OBText>
          <View style={{ gap: 10 }}>
            {THEMES.map((t) => (
              <OBOptionRow
                key={t.id}
                label={t.label}
                selected={state.theme === t.id}
                onPress={() => setState((p) => ({ ...p, theme: t.id }))}
              />
            ))}
          </View>
        </View>

        {saving ? (
          <View style={{ marginTop: 10 }}>
            <ActivityIndicator />
            <OBText variant="cap" style={{ marginTop: 8 }}>
              Generiram putanju…
            </OBText>
          </View>
        ) : null}
        
        <View style={{ marginTop: "auto" as any }}>
          <OBNavFooter
            backHref="/(onboarding)/how-it-works"
            nextLabel={saving ? "Generiram…" : "Generiraj"}
            nextDisabled={!canCreate}
            onNext={createHabitNow}
          />
        </View>
      </View>
    </OBContainer>
  );
}
