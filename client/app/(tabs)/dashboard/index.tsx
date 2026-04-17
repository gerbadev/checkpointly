import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { Stack, useFocusEffect, useRouter, type Href } from "expo-router";
import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { getToken } from "@/lib/auth";
import { API_URL } from "@/constants/api";
import { Card } from "@/components/Card";
import { AppButton } from "@/components/AppButton";
import { theme } from "@/constants/theme";
import { useThemeColors, usePreferences } from "@/state/UserPreferencesContext";
import { Screen } from "@/components/Screen";
import { CheckpointFeedback, FeedbackPayload } from "@/components/CheckpointFeedback";
import { Ionicons } from "@expo/vector-icons";
import { useSocial } from "@/state/SocialContext";
import { useLevelUp } from "@/state/LevelUpContext";

type HabitAtRisk = {
  id: string;
  title: string;
  current_streak: number;
};

type StreakFreezeResult = {
  used: boolean;
  canUse?: boolean;
  day?: string;
};

type DashboardSummary = {
  habitsAtRisk: HabitAtRisk[];
  streakFreeze?: StreakFreezeResult;
  xpTotal?: number;
  freezeTokens?: number;
  level?: number;
  levelCurrentXp?: number;
  levelNextXp?: number;
  levelProgress?: number; 
};

type DailyChestStatus = {
  available: boolean;
  today: string;
  lastClaimed: string | null;
  lootInfo?: { minXp?: number; maxXp?: number; freezeChancePct?: number; };
};

function getNextLocalMidnightMsFrom(nowMs: number) {
  const d = new Date(nowMs);
  const next = new Date(d);
  next.setHours(24, 0, 0, 0);
  return next.getTime();
}

function formatHMS(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export default function Dashboard() {
  const colors = useThemeColors();
  const { preferences } = usePreferences();
  const isDark = preferences.darkMode;
  const router = useRouter();
  const { friends, loadFriends } = useSocial();
  const { checkForLevelUp } = useLevelUp();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [previousLevel, setPreviousLevel] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chestStatus, setChestStatus] = useState<DailyChestStatus | null>(null);
  const [loadingChest, setLoadingChest] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackPayload, setFeedbackPayload] = useState<FeedbackPayload | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [bonusExpanded, setBonusExpanded] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const bonusAvailable = !!chestStatus?.available;
  const bonusCountdown = useMemo(() => {
    const nextMidnight = getNextLocalMidnightMsFrom(nowTick);
    return formatHMS(nextMidnight - nowTick);
  }, [nowTick]);

  const loadDashboard = useCallback(async () => {
    try {
      const token = await getToken();
      const [sumRes, chestRes] = await Promise.all([
        fetch(`${API_URL}/dashboard/summary`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/rewards/daily-chest`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (sumRes.ok) {
        const newSummary = await sumRes.json();
        
        // Check for level up
        if (previousLevel !== null && newSummary.level !== previousLevel) {
          checkForLevelUp(
            previousLevel,
            newSummary.level || 1,
            newSummary.levelCurrentXp || 0,
            newSummary.levelNextXp || 100,
            newSummary.xpTotal || 0
          );
        }
        
        setSummary(newSummary);
        setPreviousLevel(newSummary.level || 1);
      }
      if (chestRes.ok) setChestStatus(await chestRes.json());
      await loadFriends();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [previousLevel, checkForLevelUp, loadFriends]);

  useFocusEffect(useCallback(() => { loadDashboard(); }, [loadDashboard]));

  const claimDailyChest = async () => {
    if (loadingChest) return;
    try {
      setLoadingChest(true);
      const token = await getToken();
      const res = await fetch(`${API_URL}/rewards/daily-chest/claim`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setFeedbackPayload({ title: "🎁 Bonus preuzet!", xpGained: data.xpGained, message: data.freezeGained > 0 ? "❄️ Dobili ste i zaštitu niza!" : "Danas imate dodatan boost!" });
        setFeedbackVisible(true);
        loadDashboard();
      }
    } finally {
      setLoadingChest(false);
    }
  };

  if (loading) return <Screen><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 100 }} /></Screen>;
  if (!summary) return <Screen><Text style={{ color: colors.text, textAlign: 'center', marginTop: 100 }}>Greška pri učitavanju.</Text></Screen>;

  const primaryMission = summary.habitsAtRisk[0] ?? null;

  return (
    <Screen scroll={true}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadDashboard(); }} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Text style={[theme.type.hero, { color: colors.text, marginBottom: 4 }]}>Danas</Text>
        <Text style={{ color: colors.muted, marginBottom: 20 }}>{primaryMission ? "Vaša avantura vas čeka." : "Sve je spremno za nove pobjede."}</Text>

        {/* ✅ BENTO GRID */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Card style={{ flex: 1.4, height: 180, justifyContent: 'space-between', padding: 16 }}>
            <View>
              <Text style={{ color: colors.faint, fontSize: 12, fontWeight: '800' }}>LEVEL</Text>
              <Text style={{ color: colors.text, fontSize: 36, fontWeight: '900', marginTop: 4 }}>{summary.level || 1}</Text>
            </View>
            <View>
              <View style={{ height: 8, backgroundColor: colors.glass, borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${(summary.levelProgress || 0) * 100}%`, backgroundColor: colors.primary }} />
              </View>
              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '800', marginTop: 8 }}>{Math.round((1 - (summary.levelProgress || 0)) * (summary.levelNextXp || 100))} XP do Lvl {(summary.level || 1) + 1}</Text>
            </View>
          </Card>

          <View style={{ flex: 1, gap: 12 }}>
            <Card style={{ flex: 1, padding: 12, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="snow" size={24} color={colors.primary} />
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 4 }}>{summary.freezeTokens || 0}</Text>
              <Text style={{ color: colors.faint, fontSize: 10, fontWeight: '800' }}>TOKENS</Text>
            </Card>
            <Card style={{ flex: 1, padding: 12, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="stats-chart" size={20} color={colors.accent} />
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 4 }}>{summary.xpTotal || 0}</Text>
              <Text style={{ color: colors.faint, fontSize: 10, fontWeight: '800' }}>UKUPNO</Text>
            </Card>
          </View>
        </View>

        {/* ✅ DAILY BONUS */}
        <Card style={{ marginTop: 12, padding: 16, borderWidth: 0.5, borderColor: bonusAvailable ? colors.primary + '80' : colors.glassBorder, backgroundColor: bonusAvailable ? colors.glassStrong : colors.surface }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20 }}>🎁</Text>
              </View>
              <View>
                <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>Dnevni bonus</Text>
                <Text style={{ color: colors.muted, fontSize: 13 }}>{bonusAvailable ? "Dostupno za preuzimanje!" : `Nova nagrada za ${bonusCountdown}`}</Text>
              </View>
            </View>
            {bonusAvailable && (
              <TouchableOpacity onPress={claimDailyChest} style={{ backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}>
                <Text style={{ color: '#fff', fontWeight: '900' }}>Preuzmi</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>

        {/* ✅ MISSION / ADVENTURE CTA */}
        {primaryMission ? (
          <Card style={{ marginTop: 12, borderLeftWidth: 4, borderLeftColor: colors.warning }}>
            <Text style={{ color: colors.faint, fontSize: 12, fontWeight: '800' }}>DANAŠNJA MISIJA</Text>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 8 }}>🏔️ {primaryMission.title}</Text>
            <Text style={{ color: colors.warning, fontWeight: '800', marginTop: 4 }}>🔥 Niz: {primaryMission.current_streak} dana</Text>
            <TouchableOpacity 
              onPress={() => router.push(`/habits/${primaryMission.id}` as Href)}
              style={{ backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginTop: 16 }}
            >
              <Text style={{ color: '#fff', fontWeight: '900' }}>Nastavi avanturu</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <Card style={{ marginTop: 12, alignItems: 'center', padding: 24 }}>
            <Ionicons name="sparkles" size={32} color={colors.primary} style={{ marginBottom: 12 }} />
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900', textAlign: 'center' }}>Za danas ste oslobođeni! ✨</Text>
            <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 8 }}>Svi vaši nizovi su sigurni. Dođite sutra ili započnite novu avanturu.</Text>
            <TouchableOpacity 
              onPress={() => router.push("/habits/create" as Href)}
              style={{ marginTop: 20, backgroundColor: colors.glassStrong, borderColor: colors.glassBorder, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 16 }}
            >
              <Text style={{ color: colors.text, fontWeight: '800' }}>Nova avantura</Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* ✅ ACTIVE FRIENDS */}
        <View style={{ marginTop: 24 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 12 }}>Aktivni prijatelji</Text>
          {friends.filter(f => f.status === 'accepted' && f.is_active_now).length === 0 ? (
            <Card style={{ padding: 16, alignItems: 'center' }}>
              <Ionicons name="moon" size={24} color={colors.faint} style={{ marginBottom: 8 }} />
              <Text style={{ color: colors.muted, fontWeight: '700' }}>Trenutno nema aktivnih prijatelja.</Text>
            </Card>
          ) : (
            <Card style={{ padding: 12 }}>
              {friends.filter(f => f.status === 'accepted' && f.is_active_now).map((friend, index, arr) => (
                <View key={friend.friendship_id}>
                  <TouchableOpacity onPress={() => router.push(`/friend/${friend.friend_id}` as any)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.glassStrong, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {friend.avatar_url ? (
                        <Image source={{ uri: friend.avatar_url }} style={{ width: 40, height: 40 }} /> 
                      ) : (
                        <Text style={{ color: colors.primary, fontWeight: '900', fontSize: 16 }}>{friend.name?.[0]?.toUpperCase() || 'K'}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{friend.name || 'Korisnik'}</Text>
                      <Text style={{ color: colors.success, fontWeight: '800', fontSize: 12, marginTop: 2 }}>Online sada</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.faint} />
                  </TouchableOpacity>
                  {index < arr.length - 1 && <View style={{ height: 1, backgroundColor: colors.glassBorder, marginVertical: 4 }} />}
                </View>
              ))}
            </Card>
          )}
        </View>

      </ScrollView>

      {feedbackPayload && (
        <CheckpointFeedback
          visible={feedbackVisible}
          onDone={() => setFeedbackVisible(false)}
          payload={feedbackPayload}
        />
      )}
    </Screen>
  );
}
