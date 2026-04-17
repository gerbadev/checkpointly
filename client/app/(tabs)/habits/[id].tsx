import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Switch,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { API_URL } from "@/constants/api";
import { getToken } from "@/lib/auth";
import { Card } from "@/components/Card";
import { AppButton } from "@/components/AppButton";
import { theme } from "@/constants/theme";
import { Screen } from "@/components/Screen";
import { CheckpointPath } from "@/components/CheckpointPath";
import { CheckpointFeedback, FeedbackPayload } from "@/components/CheckpointFeedback";
import { getAdventureTheme } from "@/constants/adventureThemes";
import { AdventureBackground } from "@/components/AdventureBackground";
import { ThemePattern } from "@/components/ThemePattern";
import { useAdventureTheme } from "@/state/adventureThemeContext";
import { useSocial } from "@/state/SocialContext";

type Checkpoint = {
  id: string;
  title: string;
  notes?: string;
  completed: boolean;
  skipped?: boolean;
  position?: number;
};

type Progress = {
  habitId: string;
  currentCheckpointIndex: number | null;
  totalCheckpoints: number;
  percentage: number;
  currentStreak?: number;
  streakAtRisk?: boolean;
};

function safeParseJson(raw: string) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function normalizeText(s: string) {
  return (s ?? "").trim();
}

async function fetchJson(url: string, options: RequestInit) {
  const res = await fetch(url, options);
  const raw = await res.text().catch(() => "");
  const data = safeParseJson(raw);
  return { ok: res.ok, status: res.status, data, raw };
}

export default function HabitDetails() {
  const params = useLocalSearchParams();
  const idParam = params.id;

  // Keep hooks unconditionally called (rules-of-hooks). When idParam is invalid, render nothing.
  const habitId: string = typeof idParam === "string" ? idParam : "";

  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [habit, setHabit] = useState<any>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);

  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackPayload, setFeedbackPayload] = useState<FeedbackPayload | null>(null);

  const advTheme = getAdventureTheme(habit?.theme);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingCheckpointId, setRegeneratingCheckpointId] = useState<string | null>(null);
  const [sharingLoading, setSharingLoading] = useState(false);

  const [activeY, setActiveY] = useState<number | null>(null);
  const { setCurrentThemeId } = useAdventureTheme();
  const router = useRouter();
  const { friends } = useSocial();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);

  const [editorQuery, setEditorQuery] = useState("");
  const [editorShowNotes, setEditorShowNotes] = useState(false);

  const [editorFuture, setEditorFuture] = useState<Checkpoint[]>([]);
  const [editorInitialSnapshot, setEditorInitialSnapshot] = useState<string>("");

  const [editingId, setEditingId] = useState<string | null>(null);

  const futureCheckpoints = useMemo(() => {
    return (checkpoints ?? [])
      .filter((c) => !c.completed)
      .slice()
      .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0));
  }, [checkpoints]);

  const completedCheckpoints = useMemo(() => {
    return (checkpoints ?? [])
      .filter((c) => c.completed)
      .slice()
      .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0));
  }, [checkpoints]);

  const filteredEditorFuture = useMemo(() => {
    const q = normalizeText(editorQuery).toLowerCase();
    if (!q) return editorFuture;
    return editorFuture.filter((c) => {
      const t = `${c.title ?? ""} ${c.notes ?? ""}`.toLowerCase();
      return t.includes(q);
    });
  }, [editorFuture, editorQuery]);

  const editorDirty = useMemo(() => {
    const snap = JSON.stringify(
      editorFuture.map((c) => ({
        id: c.id,
        title: c.title ?? "",
        notes: c.notes ?? "",
      }))
    );
    return snap !== editorInitialSnapshot;
  }, [editorFuture, editorInitialSnapshot]);

  function openEditor() {
    const base = futureCheckpoints.map((c) => ({ ...c }));
    setEditorFuture(base);
    setEditorQuery("");
    setEditingId(null);

    const snap = JSON.stringify(
      base.map((c) => ({
        id: c.id,
        title: c.title ?? "",
        notes: c.notes ?? "",
      }))
    );
    setEditorInitialSnapshot(snap);

    setEditorOpen(true);
  }

  function requestCloseEditor() {
    if (!editorDirty) {
      setEditorOpen(false);
      return;
    }

    Alert.alert("Nespremljene promjene", "Želiš li odbaciti promjene?", [
      { text: "Nastavi uređivati", style: "cancel" },
      { text: "Odbaci", style: "destructive", onPress: () => setEditorOpen(false) },
    ]);
  }

  function deleteEditorCheckpoint(cpId: string) {
    Alert.alert("Izbriši točku", "Ova točka će biti uklonjena iz budućih točaka.", [
      { text: "Otkaži", style: "cancel" },
      {
        text: "Izbriši",
        style: "destructive",
        onPress: () => {
          setEditorFuture((prev) => prev.filter((c) => c.id !== cpId));
          if (editingId === cpId) setEditingId(null);
        },
      },
    ]);
  }

  async function apiPatchCheckpoint(
    checkpointId: string,
    payload: { title?: string; notes?: string | null }
  ) {
    const token = await getToken();
    const { ok, data, raw, status } = await fetchJson(`${API_URL}/habits/checkpoint/${checkpointId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!ok) {
      const msg = (data as any)?.error || raw || `PATCH failed (${status})`;
      throw new Error(msg);
    }
    return data;
  }

  async function apiAddCheckpoint(
    habitIdArg: string,
    payload: { title: string; notes?: string | null }
  ) {
    const token = await getToken();
    const { ok, data, raw, status } = await fetchJson(`${API_URL}/habits/${habitIdArg}/checkpoints`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!ok) {
      const msg = (data as any)?.error || raw || `ADD failed (${status})`;
      throw new Error(msg);
    }
    return data;
  }

  async function apiDeleteCheckpoint(checkpointId: string) {
    const token = await getToken();
    const { ok, data, raw, status } = await fetchJson(`${API_URL}/habits/checkpoint/${checkpointId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!ok) {
      const msg = (data as any)?.error || raw || `DELETE failed (${status})`;
      throw new Error(msg);
    }
    return data;
  }

  async function apiReorderFuture(habitIdArg: string, orderedIds: string[]) {
    const token = await getToken();
    const { ok, data, raw, status } = await fetchJson(
      `${API_URL}/habits/${habitIdArg}/checkpoints/reorder`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderedIds }),
      }
    );

    if (!ok) {
      const msg = (data as any)?.error || raw || `REORDER failed (${status})`;
      throw new Error(msg);
    }
    return data;
  }

  async function addNewCheckpoint() {
    try {
      const created: any = await apiAddCheckpoint(habitId, { title: "Nova točka", notes: "" });

      const cp = created?.checkpoint;
      if (!cp?.id) {
        Alert.alert("Greška", "Backend nije vratio checkpoint (missing checkpoint.id).");
        return;
      }

      setEditorFuture((prev) => [
        ...prev,
        {
          id: cp.id,
          title: cp.title ?? "Nova točka",
          notes: cp.notes ?? "",
          completed: false,
          skipped: false,
          position: cp.position ?? prev.length,
        },
      ]);

      setEditingId(cp.id);
    } catch (e: any) {
      Alert.alert("Greška", e?.message || "Ne možemo dodati novu točku.");
    }
  }

  async function fetchHabit() {
    const token = await getToken();
    const { ok, data, raw, status } = await fetchJson(`${API_URL}/habits/${habitId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!ok) {
      Alert.alert("Greška", (data as any)?.error || raw || `Ne možemo učitati avanturu (${status}).`);
      return;
    }

    setHabit((data as any)?.habit);
    setCheckpoints((data as any)?.checkpoints ?? []);
  }

  useEffect(() => {
    if (!habit?.theme) return;

    setCurrentThemeId(habit.theme);
    return () => setCurrentThemeId(null);
  }, [habit?.theme, setCurrentThemeId]);

  async function fetchProgress() {
    const token = await getToken();
    const { ok, data, raw, status } = await fetchJson(`${API_URL}/habits/${habitId}/progress`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!ok) {
      Alert.alert("Greška", (data as any)?.error || raw || `Ne možemo učitati napredak (${status}).`);
      return;
    }

    setProgress(data as any);
  }

  async function completeCheckpoint(checkpointId: string) {
    try {
      const beforeStreak = typeof habit?.current_streak === "number" ? habit.current_streak : 0;

      const token = await getToken();
      const { ok, data, raw } = await fetchJson(
        `${API_URL}/habits/checkpoint/${checkpointId}/complete`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );

      if (!ok) {
        Alert.alert("Greška", (data as any)?.error || raw || "Ne možemo dovršiti točku.");
        return;
      }

      await Promise.all([fetchHabit(), fetchProgress()]);

      const xp = Number((data as any)?.xpGained ?? 0);

      setFeedbackPayload({
        title: xp > 0 ? "Točka dovršena! ✨" : "Točka dovršena!",
        xpGained: xp,
        message:
          xp > 0
            ? makeEncouragement("complete")
            : "Danas si već dobio XP za ovu avanturu. Vrati se sutra po još!",
        streakDays: Math.max(1, beforeStreak),
        streakContinued: true,
      });
      setFeedbackVisible(true);
    } catch {
      Alert.alert("Greška", "Ne možemo dovršiti točku.");
    }
  }

  async function uncompleteCheckpoint(checkpointId: string) {
    try {
      const token = await getToken();
      const { ok, data, raw } = await fetchJson(
        `${API_URL}/habits/checkpoint/${checkpointId}/uncomplete`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );

      if (!ok) {
        Alert.alert("Greška", (data as any)?.error || raw || "Ne možemo poništiti dovršavanje.");
        return;
      }

      await Promise.all([fetchHabit(), fetchProgress()]);
    } catch {
      Alert.alert("Greška", "Ne možemo poništiti dovršavanje.");
    }
  }

  async function skipCheckpoint(checkpointId: string) {
    try {
      const token = await getToken();
      const { ok, data, raw } = await fetchJson(`${API_URL}/habits/checkpoint/${checkpointId}/skip`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!ok) {
        Alert.alert("Greška", (data as any)?.error || raw || "Ne možemo preskočiti točku.");
        return;
      }

      await Promise.all([fetchHabit(), fetchProgress()]);
    } catch {
      Alert.alert("Greška", "Ne možemo preskočiti točku.");
    }
  }

  async function regenerateCheckpoints() {
    Alert.alert(
      "Regeneriraj sve točke",
      "Ova radnja će resetirati sav napredak ove avanture, uključujući i vaš niz. Jeste li sigurni da želite nastaviti?",
      [
        { text: "Otkaži", style: "cancel" },
        {
          text: "Nastavi",
          style: "destructive",
          onPress: async () => {
            try {
              setIsGenerating(true);
              const token = await getToken();

              const { ok, data, raw } = await fetchJson(
                `${API_URL}/habits/${habitId}/regenerate-checkpoints`,
                { method: "POST", headers: { Authorization: `Bearer ${token}` } }
              );

              if (!ok) {
                Alert.alert("Greška", (data as any)?.error || raw || "Ne možemo regenerirati točke.");
                return;
              }

              await Promise.all([fetchHabit(), fetchProgress()]);
            } finally {
              setIsGenerating(false);
            }
          },
        },
      ]
    );
  }

  async function shareAdventureWithFriend(friendId: string) {
    if (sharingLoading) return;
    try {
      setSharingLoading(true);
      const token = await getToken();
      if (!token) throw new Error("Niste prijavljeni.");

      const res = await fetch(`${API_URL}/social/habit-shares/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          habit_id: habitId,
          friend_id: friendId,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as any)?.error || "Greška pri dijeljenju avanture.");
      }

      Alert.alert("Uspješno poslana ponuda", "Čekate odgovor prijatelja.");
    } catch (e: any) {
      Alert.alert("Greška", e?.message || "Ne možemo podijeliti avanturu.");
    } finally {
      setSharingLoading(false);
    }
  }

  function handleShareAdventure() {
    const acceptedFriends = (friends ?? []).filter((f: any) => f.status === "accepted");

    if (!acceptedFriends.length) {
      Alert.alert("Nema prijatelja", "Nemate prijatelje s kojima možete podijeliti avanturu.");
      return;
    }

    router.push(`/(tabs)/habits/share/${habitId}` as any);
  }

  async function regenerateCheckpoint(checkpointId: string) {
    Alert.alert(
      "Regeneriraj točku",
      "Ova radnja će zamijeniti ovu točku novom. Vaš niz i ostali napredak će ostati nepromijenjeni.",
      [
        { text: "Otkaži", style: "cancel" },
        {
          text: "Nastavi",
          onPress: async () => {
            try {
              setRegeneratingCheckpointId(checkpointId);
              const token = await getToken();

              const { ok, data, raw } = await fetchJson(
                `${API_URL}/habits/checkpoint/${checkpointId}/regenerate`,
                { method: "POST", headers: { Authorization: `Bearer ${token}` } }
              );

              if (!ok) {
                Alert.alert("Greška", (data as any)?.error || raw || "Ne možemo regenerirati točku.");
                return;
              }

              await fetchHabit();
            } finally {
              setRegeneratingCheckpointId(null);
            }
          },
        },
      ]
    );
  }

  function makeEncouragement(_title: string) {
    const lines = [
      "Bravo! Nastavi ovim tempom 💪",
      "Odlično — mali koraci, veliki rezultat.",
      "To je to. Sljedeća točka te čeka ✨",
      "Svaki put kad ovo napraviš, gradiš naviku.",
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  useEffect(() => {
    if (!habitId || habitId === "index") return;
    setLoading(true);

    Promise.all([fetchHabit(), fetchProgress()])
      .catch(() => Alert.alert("Greška", "Ne možemo učitati avanturu."))
      .finally(() => setLoading(false));
  }, [habitId]);

  useEffect(() => {
    if (activeY == null) return;
    const targetY = Math.max(0, activeY - 240);

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: targetY, animated: true });
    });
  }, [activeY]);


  async function saveEditorChanges() {
    if (editorSaving) return;

    const bad = editorFuture.find((c) => !normalizeText(c.title));
    if (bad) {
      Alert.alert("Naziv nedostaje", "Svaka točka mora imati naziv.");
      return;
    }

    setEditorSaving(true);

    const merged: Checkpoint[] = [
      ...completedCheckpoints,
      ...editorFuture.map((c, idx) => ({
        ...c,
        position: completedCheckpoints.length + idx,
      })),
    ];
    setCheckpoints(merged);

    try {
      const original = futureCheckpoints.map((c) => ({
        id: c.id,
        title: c.title ?? "",
        notes: c.notes ?? "",
      }));

      const draft = editorFuture.map((c) => ({
        id: c.id,
        title: c.title ?? "",
        notes: c.notes ?? "",
      }));

      const origById = new Map(original.map((c) => [c.id, c]));
      const draftById = new Map(draft.map((c) => [c.id, c]));

      const deletedIds = original.filter((c) => !draftById.has(c.id)).map((c) => c.id);

      const changed = draft.filter((c) => {
        const o = origById.get(c.id);
        if (!o) return false; 
        return o.title !== c.title || (o.notes ?? "") !== (c.notes ?? "");
      });

      for (const cpId of deletedIds) await apiDeleteCheckpoint(cpId);

      for (const c of changed) {
        await apiPatchCheckpoint(c.id, {
          title: c.title,
          notes: c.notes ?? null,
        });
      }

      const orderedIds = draft.map((c) => c.id).filter(Boolean);
      if (orderedIds.length > 1) {
        await apiReorderFuture(habitId, orderedIds);
      }

      await Promise.all([fetchHabit(), fetchProgress()]);

      const snap = JSON.stringify(
        editorFuture.map((c) => ({
          id: c.id,
          title: c.title ?? "",
          notes: c.notes ?? "",
        }))
      );
      setEditorInitialSnapshot(snap);

      setEditorOpen(false);
    } catch (e: any) {
      Alert.alert("Greška", e?.message || "Ne možemo spremiti promjene. Pokušaj ponovno.");
    } finally {
      setEditorSaving(false);
    }
  }

  if (!habitId) return null;
  if (loading || !habit || !progress) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
          <View
            style={{
              backgroundColor: "rgba(255,255,255,0.08)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.12)",
              borderRadius: theme.radius.lg,
              padding: 20,
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="large" color={theme.colors.text} />
            <Text style={{ color: theme.colors.text, marginTop: 12, fontWeight: "800" }}>
              Učitavanje avanture…
            </Text>
            <Text style={{ color: theme.colors.muted, marginTop: 6, textAlign: "center", lineHeight: 20 }}>
              Pripremamo vašu trenutnu putanju.
            </Text>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      scroll={false}
      background={
        <View style={{ flex: 1 }}>
          <AdventureBackground themeId={(habit?.theme as any) ?? "mountain"} />
          <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
            <ThemePattern kind={advTheme.pattern} color={advTheme.accent} />
          </View>
        </View>
      }
      contentStyle={{ paddingTop: 0 }}
      style={{ backgroundColor: "transparent" }}
    >
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 200 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            marginTop: 57,
            marginHorizontal: 12,
            borderRadius: 28,
            borderWidth: 1,
            borderColor: advTheme.border,
            backgroundColor: advTheme.softBg,
            overflow: "hidden",
            padding: 16,
          }}
        >
          <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
            <ThemePattern kind={advTheme.pattern} color={advTheme.accent} />
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable
              onPress={() => router.push("/(tabs)/habits")}
              style={({ pressed }) => ({
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 999,
                backgroundColor: "rgba(0,0,0,0.22)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
                opacity: pressed ? 0.9 : 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              })}
            >
              <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
              <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Natrag</Text>
            </Pressable>

            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 999,
                backgroundColor: "rgba(0,0,0,0.22)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 16 }}>{advTheme.emoji}</Text>
              <Text style={{ color: theme.colors.text, fontWeight: "900" }}>{advTheme.label}</Text>
              <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: advTheme.accent, marginLeft: 2 }} />
            </View>
          </View>

          <Text style={[theme.type.hero, { color: theme.colors.text, marginTop: 14, marginLeft: 2, lineHeight: 40 }]}>
            {habit.title}
          </Text>

          <Text style={{ marginTop: 8, color: theme.colors.muted, lineHeight: 20, marginLeft: 2, fontWeight: "700" }}>
            {habit.current_streak && habit.current_streak > 0
              ? `🔥 Trenutni niz: ${habit.current_streak} dan${habit.current_streak > 1 ? "a" : ""}`
              : "Na početku ste svoje avanture!"}
          </Text>
        </View>

        <Card style={{ marginTop: 14, backgroundColor: "transparent" }}>
          <View style={{ 
            flexDirection: "row", 
            alignItems: "center", 
            justifyContent: "space-between",
            backgroundColor: "rgba(0,0,0,0.3)",
            padding: 16,
            margin: -20,
            marginBottom: 0,
            borderTopLeftRadius: theme.radius.lg,
            borderTopRightRadius: theme.radius.lg
          }}>
            <Text style={[theme.type.h2, { color: "#fff" }]}>Napredak</Text>
            <Text style={[theme.type.cap, { color: "#fff" }]}>{progress.percentage}%</Text>
          </View>

          <View style={{ 
            backgroundColor: "rgba(0,0,0,0.3)",
            padding: 20,
            paddingTop: 0,
            margin: -20,
            marginTop: 0,
            borderBottomLeftRadius: theme.radius.lg,
            borderBottomRightRadius: theme.radius.lg
          }}>
            <View
              style={{
                marginTop: 12,
                height: 10,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.08)",
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
              }}
            >
              <View
                style={{
                  height: "100%",
                  width: `${Math.max(0, Math.min(100, progress.percentage))}%`,
                  backgroundColor: advTheme.accent,
                }}
              />
            </View>

            {progress.streakAtRisk && (
              <View style={{ marginTop: 12 }}>
                <Text style={{ color: "#fff", fontWeight: "800" }}>🔥 Napredak vas čeka danas!</Text>
              </View>
            )}

            <View style={{ marginTop: 12, gap: 10 }}>
              <TouchableOpacity
                onPress={openEditor}
                style={{
                  backgroundColor: "rgba(255,255,255,0.1)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.2)",
                  borderRadius: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
                  Uredi putanju
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={regenerateCheckpoints}
                style={{
                  backgroundColor: "rgba(255,255,255,0.1)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.2)",
                  borderRadius: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
                  Regeneriraj sve točke
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleShareAdventure}
                disabled={sharingLoading}
                style={{
                  backgroundColor: sharingLoading ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)",
                  borderWidth: 1,
                  borderColor: sharingLoading ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)",
                  borderRadius: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  alignItems: "center",
                  opacity: sharingLoading ? 0.5 : 1,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
                  Dijeli avanturu
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        <View style={{ marginTop: 50 }}>
          <CheckpointPath
            checkpoints={checkpoints}
            currentIndex={progress.currentCheckpointIndex}
            onComplete={completeCheckpoint}
            onUncomplete={uncompleteCheckpoint}
            onSkip={skipCheckpoint}
            onRegenerate={regenerateCheckpoint}
            regeneratingId={regeneratingCheckpointId}
            onActiveY={(y) => setActiveY(y)}
            themeId={(habit?.theme as any) ?? "mountain"}
          />
        </View>

        {isGenerating && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.55)",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              paddingHorizontal: 24,
            }}
          >
            <View
              style={{
                width: "100%",
                maxWidth: 420,
                backgroundColor: "rgba(255,255,255,0.08)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                borderRadius: theme.radius.lg,
                padding: 18,
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="large" color={theme.colors.text} />
              <Text style={{ color: theme.colors.text, marginTop: 12, fontWeight: "800" }}>
                Generiranje personaliziranih točaka…
              </Text>
              <Text style={{ color: theme.colors.muted, marginTop: 6, textAlign: "center" }}>
                Ovo može potrajati nekoliko trenutaka.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <CheckpointFeedback
        visible={feedbackVisible}
        payload={feedbackPayload}
        durationMs={3600}
        themeId={(habit?.theme as any) ?? "mountain"}
        onDone={() => {
          setFeedbackVisible(false);
          setFeedbackPayload(null);
        }}
      />

      <Modal visible={editorOpen} transparent animationType="fade">
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.55)",
              paddingTop: insets.top + 10,
              paddingBottom: insets.bottom + 10,
              paddingHorizontal: 10,
            }}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={{
                flex: 1,
                borderRadius: 28,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: advTheme.border,
                backgroundColor: "rgba(8,10,18,0.94)",
              }}
            >
            <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={[theme.type.h2, { color: theme.colors.text }]}>Uredi putanju</Text>

                <Pressable
                  onPress={requestCloseEditor}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    opacity: pressed ? 0.85 : 1,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: "rgba(255,255,255,0.06)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.10)",
                  })}
                >
                  <Ionicons name="close" size={16} color={theme.colors.text} />
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Zatvori</Text>
                </Pressable>
              </View>

              <View style={{ marginTop: 12, gap: 10 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.12)",
                    backgroundColor: "rgba(255,255,255,0.06)",
                    borderRadius: 16,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    gap: 10,
                  }}
                >
                  <Ionicons name="search" size={16} color={theme.colors.faint} />
                  <TextInput
                    value={editorQuery}
                    onChangeText={setEditorQuery}
                    placeholder="Pretraži buduće točke…"
                    placeholderTextColor={theme.colors.faint}
                    style={{ flex: 1, color: theme.colors.text, fontWeight: "700" }}
                  />
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ color: theme.colors.muted, fontWeight: "800" }}>Prikaži bilješke</Text>
                  <Switch value={editorShowNotes} onValueChange={setEditorShowNotes} />
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ color: theme.colors.faint, fontWeight: "800" }}>Buduće točke (drag & drop)</Text>

                  <Pressable
                    onPress={addNewCheckpoint}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      opacity: pressed ? 0.85 : 1,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: advTheme.softBg,
                      borderWidth: 1,
                      borderColor: advTheme.border,
                    })}
                  >
                    <Ionicons name="add" size={16} color={theme.colors.text} />
                    <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Dodaj</Text>
                  </Pressable>
                </View>

                <Text style={{ color: theme.colors.muted, lineHeight: 18, fontWeight: "700" }}>
                  Povuci ručkicu (≡) da promijeniš redoslijed. Tapni karticu za uređivanje.
                </Text>
              </View>
            </View>

            <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 10 }}>
              <DraggableFlatList
                data={filteredEditorFuture}
                keyExtractor={(item) => item.id}
                onDragBegin={() => setEditingId(null)}
                activationDistance={editingId ? 9999 : 12}
                onDragEnd={({ data }) => {
                  const draggedIds = new Set(data.map((x) => x.id));
                  setEditorFuture((prev) => {
                    const q = normalizeText(editorQuery);
                    if (!q) return data;

                    const prevCopy = prev.slice();
                    let fi = 0;
                    for (let i = 0; i < prevCopy.length; i++) {
                      if (draggedIds.has(prevCopy[i].id)) {
                        prevCopy[i] = data[fi++];
                      }
                    }
                    return prevCopy;
                  });
                }}
                renderItem={({ item, drag, isActive }: RenderItemParams<Checkpoint>) => {
                  const isEditing = editingId === item.id;

                  return (
                    <Pressable
                      onPress={() => setEditingId((p) => (p === item.id ? null : item.id))}
                      style={{
                        marginBottom: 10,
                        borderRadius: 18,
                        padding: 12,
                        backgroundColor: "rgba(255,255,255,0.06)",
                        borderWidth: 1,
                        borderColor: isActive ? advTheme.border : "rgba(255,255,255,0.10)",
                        opacity: isActive ? 0.95 : 1,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          {isEditing ? (
                            <>
                              <Text
                                style={{
                                  color: theme.colors.faint,
                                  fontWeight: "900",
                                  fontSize: 11,
                                  letterSpacing: 1.2,
                                }}
                              >
                                NAZIV
                              </Text>
                              <TextInput
                                value={item.title}
                                onChangeText={(v) => {
                                  setEditorFuture((prev) =>
                                    prev.map((c) => (c.id === item.id ? { ...c, title: v } : c))
                                  );
                                }}
                                style={{
                                  marginTop: 6,
                                  color: theme.colors.text,
                                  fontWeight: "900",
                                  fontSize: 16,
                                  paddingVertical: 10,
                                  paddingHorizontal: 12,
                                  borderRadius: 14,
                                  borderWidth: 1,
                                  borderColor: "rgba(255,255,255,0.12)",
                                  backgroundColor: "rgba(0,0,0,0.18)",
                                }}
                              />

                              {editorShowNotes && (
                                <>
                                  <Text
                                    style={{
                                      marginTop: 10,
                                      color: theme.colors.faint,
                                      fontWeight: "900",
                                      fontSize: 11,
                                      letterSpacing: 1.2,
                                    }}
                                  >
                                    BILJEŠKE
                                  </Text>
                                  <TextInput
                                    value={item.notes ?? ""}
                                    onChangeText={(v) => {
                                      setEditorFuture((prev) =>
                                        prev.map((c) => (c.id === item.id ? { ...c, notes: v } : c))
                                      );
                                    }}
                                    multiline
                                    style={{
                                      marginTop: 6,
                                      color: theme.colors.text,
                                      fontWeight: "700",
                                      fontSize: 14,
                                      paddingVertical: 10,
                                      paddingHorizontal: 12,
                                      borderRadius: 14,
                                      borderWidth: 1,
                                      borderColor: "rgba(255,255,255,0.12)",
                                      backgroundColor: "rgba(0,0,0,0.18)",
                                      minHeight: 64,
                                      textAlignVertical: "top",
                                    }}
                                  />
                                </>
                              )}
                            </>
                          ) : (
                            <>
                              <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
                                {item.title}
                              </Text>
                              {!!item.notes && editorShowNotes && (
                                <Text style={{ color: theme.colors.muted, marginTop: 6, fontWeight: "700" }}>
                                  {item.notes}
                                </Text>
                              )}
                            </>
                          )}
                        </View>

                        <Pressable
                          onPress={() => deleteEditorCheckpoint(item.id)}
                          style={({ pressed }) => ({
                            width: 40,
                            height: 40,
                            borderRadius: 14,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "rgba(255,77,77,0.12)",
                            borderWidth: 1,
                            borderColor: "rgba(255,77,77,0.22)",
                            opacity: pressed ? 0.85 : 1,
                          })}
                        >
                          <Ionicons name="trash" size={16} color={theme.colors.danger} />
                        </Pressable>

                        <Pressable
                          onPressIn={() => {
                            if (!isEditing) drag();
                          }}
                          style={({ pressed }) => ({
                            width: 40,
                            height: 40,
                            borderRadius: 14,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "rgba(255,255,255,0.06)",
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.10)",
                            opacity: isEditing ? 0.35 : pressed ? 0.85 : 1,
                          })}
                        >
                          <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 18 }}>≡</Text>
                        </Pressable>
                      </View>
                    </Pressable>
                  );
                }}
              />
            </View>

            <View
              style={{
                padding: 14,
                borderTopWidth: 1,
                borderTopColor: "rgba(255,255,255,0.08)",
                gap: 10,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Pressable
                  onPress={requestCloseEditor}
                  style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, paddingVertical: 14, paddingHorizontal: 14 })}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Otkaži</Text>
                </Pressable>

                <Pressable
                  onPress={saveEditorChanges}
                  disabled={editorSaving}
                  style={({ pressed }) => ({
                    opacity: editorSaving ? 0.6 : pressed ? 0.9 : 1,
                    paddingVertical: 12,
                    paddingHorizontal: 18,
                    borderRadius: 999,
                    backgroundColor: theme.colors.primary,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.10)",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  })}
                >
                  {editorSaving ? (
                    <ActivityIndicator size="small" color={theme.colors.text} />
                  ) : (
                    <Ionicons name="checkmark" size={16} color={theme.colors.text} />
                  )}
                  <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                    {editorSaving ? "Spremanje…" : "Spremi"}
                  </Text>
                </Pressable>
              </View>

              <Text style={{ color: theme.colors.faint, textAlign: "center", fontWeight: "800" }}>
                Dovršene točke su zaključane kako se ne bi kvario napredak.
              </Text>
            </View>
          </KeyboardAvoidingView>
          </View>
        </GestureHandlerRootView>
      </Modal>
    </Screen>
  );
}
