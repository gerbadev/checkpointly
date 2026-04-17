import React, { useCallback, useMemo, useState, memo, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  Pressable,
  Alert,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Swipeable } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import { getToken } from "@/lib/auth";
import { API_URL } from "@/constants/api";
import { apiFetch } from "@/lib/api";
import { theme } from "@/constants/theme";
import { Card } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { Screen } from "@/components/Screen";
import { useThemeColors, usePreferences } from "@/state/UserPreferencesContext";
import {
  getAdventureTheme,
  type AdventureThemeId,
} from "@/constants/adventureThemes";

type CheckpointLite = {
  completed: boolean;
};

type Habit = {
  id: string;
  title: string;
  current_streak?: number;
  status: "active" | "paused" | "archived";
  theme?: AdventureThemeId;
  checkpoints?: CheckpointLite[];
  streakAtRisk?: boolean;
};

function pluralDays(n: number) {
  return n === 1 ? "dan" : "dana";
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function computeProgressFromCheckpoints(h: Habit) {
  const cps = Array.isArray(h.checkpoints) ? h.checkpoints : [];
  const total = cps.length;
  const completed = cps.reduce((acc, c) => acc + (c?.completed ? 1 : 0), 0);
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  const pct01 = total === 0 ? 0 : clamp01(completed / total);
  return { total, completed, percentage, pct01 };
}

export default function HabitsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { preferences } = usePreferences();
  const isDark = preferences.darkMode;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(true);

  const CardPattern = memo(function CardPattern({
    kind,
    color,
  }: {
    kind: string;
    color: string;
  }) {
    if (kind === "stars") {
      const stars = [
        { x: 16, y: 16, s: 3, o: 0.55 },
        { x: 64, y: 28, s: 2, o: 0.35 },
        { x: 120, y: 14, s: 2, o: 0.28 },
        { x: 210, y: 22, s: 3, o: 0.45 },
        { x: 280, y: 12, s: 2, o: 0.26 },
        { x: 320, y: 34, s: 2, o: 0.26 },
      ];
      return (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {stars.map((st, i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                left: st.x,
                top: st.y,
                width: st.s,
                height: st.s,
                borderRadius: 999,
                backgroundColor: isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.15)",
                opacity: st.o,
              }}
            />
          ))}
        </View>
      );
    }
    return (
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <View style={{ position: "absolute", left: -30, top: 22, width: 180, height: 66, borderRadius: 32, backgroundColor: color, opacity: 0.08 }} />
        <View style={{ position: "absolute", left: 90, top: 14, width: 220, height: 74, borderRadius: 36, backgroundColor: color, opacity: 0.08 }} />
      </View>
    );
  });

  function AdventureCardBackground({ themeId }: { themeId: AdventureThemeId | undefined }) {
    const t = getAdventureTheme(themeId ?? "mountain");
    return (
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <LinearGradient
          colors={[
            isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
            t.softBg || (isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"),
            isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.05)",
          ]}
          style={StyleSheet.absoluteFillObject}
        />
        <CardPattern kind={(t as any).pattern ?? "peaks"} color={t.accent} />
      </View>
    );
  }

  async function fetchHabits() {
    const token = await getToken();
    const res = await fetch(`${API_URL}/habits${showArchived ? "?includeArchived=true" : ""}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.ok ? (await res.json()) as Habit[] : null;
  }

  const loadHabits = async (withSpinner: boolean) => {
    if (withSpinner) setLoading(true);
    const data = await fetchHabits();
    if (data) setHabits(data);
    if (withSpinner) setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadHabits(true); }, [showArchived]));

  async function deleteHabit(habitId: string) {
    Alert.alert("Izbriši avanturu", "Sigurno?", [
      { text: "Otkaži" },
      { text: "Izbriši", style: "destructive", onPress: async () => {
        const token = await getToken();
        await fetch(`${API_URL}/habits/${habitId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        loadHabits(false);
      }}
    ]);
  }

  async function togglePauseHabit(habitId: string, currentStatus: string) {
    const isPaused = currentStatus === "paused";
    const action = isPaused ? "nastaviti" : "pauzirati";
    
    Alert.alert(`${action.charAt(0).toUpperCase() + action.slice(1)} avanturu`, `Sigurno želite ${action} ovu avanturu?`, [
      { text: "Otkaži" },
      { text: action.charAt(0).toUpperCase() + action.slice(1), onPress: async () => {
        try {
          const token = await getToken();
          if (!token) {
            Alert.alert("Greška", "Niste prijavljeni.");
            return;
          }
          
          const newStatus = isPaused ? "active" : "paused";
          
          // Use correct backend endpoints
          const endpoint = isPaused ? `/habits/${habitId}/resume` : `/habits/${habitId}/pause`;
          const res = await apiFetch(endpoint, token, {
            method: "POST"
          });
          
          loadHabits(false);
        } catch (error) {
          console.error('Toggle pause exception:', error);
          Alert.alert("Greška", "Ne možemo promijeniti status avanture.");
        }
      }}
    ]);
  }

  async function toggleArchiveHabit(habitId: string, currentStatus: string) {
    const isArchived = currentStatus === "archived";
    const action = isArchived ? "odarhivirati" : "arhivirati";
    
    Alert.alert(`${action.charAt(0).toUpperCase() + action.slice(1)} avanturu`, `Sigurno želite ${action} ovu avanturu?`, [
      { text: "Otkaži" },
      { text: action.charAt(0).toUpperCase() + action.slice(1), onPress: async () => {
        try {
          const token = await getToken();
          if (!token) {
            Alert.alert("Greška", "Niste prijavljeni.");
            return;
          }
          
          const newStatus = isArchived ? "active" : "archived";
          
          // Use correct backend endpoints
          const endpoint = isArchived ? `/habits/${habitId}/unarchive` : `/habits/${habitId}/archive`;
          const res = await apiFetch(endpoint, token, {
            method: "POST"
          });
          
          loadHabits(false);
        } catch (error) {
          console.error('Toggle archive exception:', error);
          Alert.alert("Greška", "Ne možemo promijeniti status avanture.");
        }
      }}
    ]);
  }

  async function shareHabit(habitId: string, habitTitle: string) {
    // Za glavni ekran, prikaži poruku da trebaju odabrati prijatelja
    Alert.alert("Dijeljenje avanture", `Avantura "${habitTitle}"`, [
      { text: "Otkaži", style: "cancel" },
      { text: "Odaberi prijatelja", onPress: () => {
        router.push(`/(tabs)/habits/share/${habitId}` as any);
      }}
    ]);
  }

  const visibleHabits = useMemo(() => showArchived ? habits : habits.filter(h => h.status !== "archived"), [habits, showArchived]);

  function LeftActions({ item }: { item: Habit }) {
    const isPaused = item.status === "paused";
    const isArchived = item.status === "archived";

    return (
      <View style={styles.actionsLeftWrap}>
        {/* Pause/Resume Action */}
        <TouchableOpacity 
          style={[styles.actionIconBtn, { backgroundColor: isPaused ? colors.success + '20' : colors.warning + '20', borderColor: isPaused ? colors.success + '40' : colors.warning + '40' }]} 
          onPress={() => togglePauseHabit(item.id, item.status)}
        >
          <Ionicons name={isPaused ? "play" : "pause"} size={14} color={isPaused ? colors.success : colors.warning} />
        </TouchableOpacity>

        {/* Archive/Unarchive Action */}
        <TouchableOpacity 
          style={[styles.actionIconBtn, { backgroundColor: colors.glassStrong, borderColor: colors.glassBorder }]} 
          onPress={() => toggleArchiveHabit(item.id, item.status)}
        >
          <Ionicons name={isArchived ? "archive" : "folder-open"} size={14} color={colors.accent} />
        </TouchableOpacity>

        {/* Share Action */}
        <TouchableOpacity 
          style={[styles.actionIconBtn, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]} 
          onPress={() => shareHabit(item.id, item.title)}
        >
          <Ionicons name="share" size={14} color={colors.primary} />
        </TouchableOpacity>

        {/* Delete Action */}
        <TouchableOpacity 
          style={[styles.actionIconBtn, { backgroundColor: colors.glassStrong, borderColor: colors.glassBorder }]} 
          onPress={() => deleteHabit(item.id)}
        >
          <Ionicons name="trash" size={14} color={colors.danger} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Screen scroll={false} contentStyle={{ paddingTop: 0, paddingHorizontal: 0 }}>
        <FlatList
          data={visibleHabits}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadHabits(false)} tintColor={colors.primary} />}
          ListHeaderComponent={
            <View style={{ paddingTop: 56, marginBottom: 20 }}>
              <Text style={[theme.type.hero, { color: colors.text, marginBottom: 8 }]}>Vaše avanture</Text>
              <Text style={[theme.type.body, { color: colors.muted, marginBottom: 20 }]}>Odaberite avanturu i nastavite svoj niz.</Text>
              
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity onPress={() => router.push("/habits/create")} style={[styles.btn, { backgroundColor: colors.primary, flex: 2 }]}>
                  <Text style={{ color: '#fff', fontWeight: '900' }}>✨ Nova avantura</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowArchived(!showArchived)} style={[styles.btn, { backgroundColor: colors.glassStrong, borderColor: colors.glassBorder, borderWidth: 1, flex: 1 }]}>
                  <Text style={{ color: colors.text, fontWeight: '800' }}>{showArchived ? "Sakrij" : "Arhiva"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const t = getAdventureTheme(item.theme ?? "mountain");
            const p = computeProgressFromCheckpoints(item);
            return (
              <Swipeable 
                renderLeftActions={() => <LeftActions item={item} />}
                leftThreshold={30}
                friction={1.5}
              >
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                  <AdventureCardBackground themeId={item.theme} />
                  <Pressable onPress={() => router.push(`/habits/${item.id}`)} style={{ padding: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.6)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.glassBorder }}>
                        <Text style={{ marginRight: 6 }}>{t.emoji}</Text>
                        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13 }}>{t.label}</Text>
                      </View>
                      <StatusPill status={item.status} />
                    </View>
                    <Text style={[theme.type.h1, { color: colors.text, marginTop: 14 }]}>{item.title}</Text>
                    <Text style={{ color: colors.muted, marginTop: 4, fontWeight: '700' }}>
                      {item.current_streak ? `🔥 Niz: ${item.current_streak} ${pluralDays(item.current_streak)}` : "Započni avanturu!"}
                    </Text>
                    <View style={{ height: 6, backgroundColor: colors.glass, borderRadius: 3, marginTop: 16, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${p.percentage}%`, backgroundColor: t.accent }} />
                    </View>
                    <Text style={{ color: colors.faint, fontSize: 12, marginTop: 8, fontWeight: '700' }}>Napredak: {p.percentage}%</Text>
                  </Pressable>
                </Card>
              </Swipeable>
            );
          }}
          ListEmptyComponent={
            <Card style={{ alignItems: 'center', padding: 40, marginTop: 20 }}>
              <Text style={{ fontSize: 40, marginBottom: 16 }}>🧭</Text>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>Još nemate avantura</Text>
              <TouchableOpacity onPress={() => router.push("/habits/create")} style={[styles.btn, { backgroundColor: colors.primary, marginTop: 20, paddingHorizontal: 24 }]}>
                <Text style={{ color: '#fff', fontWeight: '900' }}>✨ Stvori avanturu</Text>
              </TouchableOpacity>
            </Card>
          }
        />
      </Screen>
  );
}

const styles = StyleSheet.create({
  btn: { paddingVertical: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionsLeftWrap: { 
    flexDirection: 'column', 
    alignItems: 'center', 
    paddingRight: 10,
    paddingLeft: 5.5,
    justifyContent: 'center',
    gap: 4
  },
  actionIconBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
