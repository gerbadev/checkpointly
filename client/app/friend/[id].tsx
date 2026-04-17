import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { getToken } from "@/lib/auth";
import { API_URL } from "@/constants/api";
import { theme } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/state/UserPreferencesContext";

interface PublicProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  xp_total: number;
  freeze_tokens: number;
  level: number;
  levelCurrentXp: number;
  levelNextXp: number;
  levelProgress: number;
  totalHabits: number;
  longestStreak: number;
  totalCheckpoints: number;
  achievements: { name: string; description: string; unlocked_at: string }[];
  last_active_date?: string | null;
  is_active_now?: boolean;
}

export default function FriendProfileScreen() {
  const { id, returnTo, tab } = useLocalSearchParams<{ id: string; returnTo?: string; tab?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareInvitations, setShareInvitations] = useState<any[]>([]);
  const colors = useThemeColors();

  const handleBack = () => {
    if (returnTo === "social") {
      const t = typeof tab === "string" && tab.length ? tab : "friends";
      router.replace(`/(tabs)/social?tab=${encodeURIComponent(t)}` as any);
      return;
    }
    router.back();
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/social/habit-shares/${invitationId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška");
      
      setShareInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      Alert.alert("Uspješno!", "Avantura je dodana u vašu listu.");
    } catch (e: any) {
      Alert.alert("Greška", e.message);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/social/habit-shares/${invitationId}/decline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Greška");
      
      setShareInvitations(prev => prev.filter(inv => inv.id !== invitationId));
    } catch (e: any) {
      Alert.alert("Greška", e.message);
    }
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/social/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Greška");
        setProfile(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();

    (async () => {
      try {
        const token = await getToken();
        if (!token) {
          return;
        }
        const res = await fetch(`${API_URL}/social/habit-shares/incoming`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Greška");
        
        setShareInvitations(data);
      } catch (e: any) {
        console.error('Error fetching share invitations:', e);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: colors.bg }]}>
        <Ionicons name="alert-circle" size={48} color={colors.danger} />
        <Text style={[styles.errorText, { color: colors.danger }]}>{error || "Profil nije dostupan."}</Text>
        <TouchableOpacity onPress={handleBack} style={[styles.backBtn, { backgroundColor: colors.glass }]}>
          <Text style={[styles.backBtnText, { color: colors.primary }]}>Natrag</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const progressPercent = Math.round(profile.levelProgress * 100);
  const isActive = Boolean(profile.is_active_now);
  const dotColor = isActive ? "#22c55e" : "rgba(148,163,184,0.85)";

  function formatLastActive(dateStr?: string | null) {
    if (!dateStr) return "Zadnje aktivan: -";
    try {
      const direct = new Date(dateStr as any);
      const parsed =
        !Number.isNaN(direct.getTime()) && direct instanceof Date ? direct : null;

      const fallbackParsed = (() => {
        if (parsed) return parsed;
        if (typeof dateStr !== "string") return null;
        const isoLike = dateStr.includes("T");
        const fallback = new Date(isoLike ? dateStr : `${dateStr}T00:00:00`);
        if (Number.isNaN(fallback.getTime())) return null;
        return fallback;
      })();

      if (!fallbackParsed) return "Zadnje aktivan: -";

      const tz = "Europe/Zagreb";
      const ymd = (d: Date) =>
        new Intl.DateTimeFormat("en-CA", {
          timeZone: tz,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(d); 

      const todayYmd = ymd(new Date());
      const lastYmd = ymd(fallbackParsed);

      const toUtcMidnightMs = (ymdStr: string) => {
        const [y, m, d] = ymdStr.split("-").map((x) => Number(x));
        return Date.UTC(y, (m || 1) - 1, d || 1);
      };

      const diffDays = Math.max(
        0,
        Math.round((toUtcMidnightMs(todayYmd) - toUtcMidnightMs(lastYmd)) / 86400000)
      );

      if (diffDays === 0) return "Zadnje aktivan: Danas";
      if (diffDays === 1) return "Zadnje aktivan: Jučer";

      const rtf = new Intl.RelativeTimeFormat("hr", { numeric: "always" });
      if (diffDays < 30) return `Zadnje aktivan: ${rtf.format(-diffDays, "day")}`;

      const diffMonths = Math.floor(diffDays / 30);
      if (diffMonths < 12) return `Zadnje aktivan: ${rtf.format(-diffMonths, "month")}`;

      const diffYears = Math.floor(diffDays / 365);
      return `Zadnje aktivan: ${rtf.format(-diffYears, "year")}`;
    } catch {
      return "Zadnje aktivan: -";
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <BlurView intensity={80} tint={colors.text === "#09090B" ? "light" : "dark"} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleBack} style={[styles.backBtn, { backgroundColor: colors.glass }]}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{profile.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + Name */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={[styles.avatar, { borderColor: colors.primary }]} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.glassStrong, borderColor: colors.primary }]}>
                <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                  {(profile.name || profile.email || "?")[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View style={[styles.activityDot, { backgroundColor: dotColor, borderColor: colors.bg }]} />
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{profile.name || "Korisnik"}</Text>
          <Text style={[styles.email, { color: colors.muted }]}>{profile.email}</Text>
          <Text style={[styles.lastActiveText, { color: colors.faint }]}>{isActive ? "Aktivan sada" : formatLastActive(profile.last_active_date)}</Text>

          {/* Level Badge */}
          <View style={[styles.levelBadge, { backgroundColor: colors.warning + "26", borderColor: colors.warning + "4D" }]}>
            <Ionicons name="trophy" size={14} color={colors.warning} />
            <Text style={[styles.levelBadgeText, { color: colors.warning }]}>Level {profile.level}</Text>
          </View>
        </View>

        {/* XP Progress */}
        <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
          <Text style={[styles.cardLabel, { color: colors.faint }]}>XP NAPREDAK</Text>
          <View style={styles.xpRow}>
            <Text style={[styles.xpTotal, { color: colors.text }]}>{profile.xp_total} XP ukupno</Text>
            <Text style={[styles.xpSub, { color: colors.muted }]}>
              {profile.levelCurrentXp}/{profile.levelNextXp} do sljedećeg levela
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.glassBorder }]}>
            <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: colors.primary }]} />
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
            <Ionicons name="compass" size={24} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{profile.totalHabits}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Avanture</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.text }]}>{profile.totalCheckpoints}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Checkpointi</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
            <Ionicons name="flame" size={24} color={colors.warning} />
            <Text style={[styles.statValue, { color: colors.text }]}>{profile.longestStreak}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Najduži streak</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
            <Ionicons name="snow" size={24} color={colors.accent} />
            <Text style={[styles.statValue, { color: colors.text }]}>{profile.freeze_tokens}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Freeze tokeni</Text>
          </View>
        </View>

        {/* Habit Share Invitations */}
        {(() => {
          return null;
        })()}
        {shareInvitations.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
            <Text style={[styles.cardLabel, { color: colors.faint }]}>POZIVI ZA DIJELJENJE AVANTURA</Text>
            {shareInvitations.map((invitation) => (
              <View key={invitation.id} style={[styles.invitationRow, { borderBottomColor: colors.glassBorder }]}>
                <View style={styles.invitationContent}>
                  <Text style={[styles.invitationTitle, { color: colors.text }]}>
                    {invitation.habit_title}
                  </Text>
                  <Text style={[styles.invitationFrom, { color: colors.muted }]}>
                    Od: {invitation.from_user_name}
                  </Text>
                  <Text style={[styles.invitationDate, { color: colors.faint }]}>
                    {new Date(invitation.created_at).toLocaleDateString('hr-HR')}
                  </Text>
                </View>
                <View style={styles.invitationActions}>
                  <TouchableOpacity
                    onPress={() => handleAcceptInvitation(invitation.id)}
                    style={[styles.invitationButton, { backgroundColor: colors.success + '20' }]}
                  >
                    <Ionicons name="checkmark" size={16} color={colors.success} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeclineInvitation(invitation.id)}
                    style={[styles.invitationButton, { backgroundColor: colors.danger + '20' }]}
                  >
                    <Ionicons name="close" size={16} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Achievements */}
        <View style={[styles.card, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
          <Text style={[styles.cardLabel, { color: colors.faint }]}>POSTIGNUĆA</Text>
          {profile.achievements.length === 0 ? (
            <Text style={[styles.emptyAchiev, { color: colors.faint }]}>Još nema postignuća.</Text>
          ) : (
            profile.achievements.map((a, i) => (
              <View key={i} style={[styles.achievRow, { borderBottomColor: colors.glassBorder }]}>
                <View style={[styles.achievIcon, { backgroundColor: colors.warning + "26" }]}>
                  <Ionicons name="medal" size={20} color={colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.achievName, { color: colors.text }]}>{a.name}</Text>
                  <Text style={[styles.achievDesc, { color: colors.muted }]}>{a.description}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0F172A" },
  centered: { flex: 1, backgroundColor: "#0F172A", justifyContent: "center", alignItems: "center" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700" },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  backBtnText: { color: theme.colors.primary, fontWeight: "700" },

  // Avatar
  avatarSection: { alignItems: "center", marginBottom: 24, marginTop: 8 },
  avatarWrap: { width: 90, height: 90, position: "relative" },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: theme.colors.primary },
  avatarFallback: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.colors.primary + "33",
    borderWidth: 3,
    borderColor: theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontSize: 36, fontWeight: "800", color: theme.colors.primary },
  name: { fontSize: 22, fontWeight: "800", color: "#fff", marginBottom: 4 },
  email: { fontSize: 13, color: "#888", marginBottom: 12 },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,215,0,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
  },
  levelBadgeText: { color: "#FFD700", fontWeight: "700", fontSize: 13 },
  activityDot: {
    position: "absolute",
    right: -3,
    bottom: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#0F172A",
  },

  // XP Card
  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardLabel: { color: "#555", fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 12 },
  xpRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  xpTotal: { color: "#fff", fontWeight: "800", fontSize: 16 },
  xpSub: { color: "#888", fontSize: 12 },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4, backgroundColor: theme.colors.primary },

  // Stats grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
  },
  statCard: {
    width: "47%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  statValue: { color: "#fff", fontSize: 22, fontWeight: "800" },
  statLabel: { color: "#888", fontSize: 12, fontWeight: "600" },

  // Achievements
  achievRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  achievIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,215,0,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  achievName: { color: "#fff", fontWeight: "700", fontSize: 14, marginBottom: 2 },
  achievDesc: { color: "#888", fontSize: 12 },
  emptyAchiev: { color: "#555", textAlign: "center", paddingVertical: 12 },
  errorText: { color: "#ff6b6b", marginTop: 12, fontSize: 15, textAlign: "center", paddingHorizontal: 32 },
  lastActiveText: { color: "#8b97b3", fontSize: 12, fontWeight: "700", marginBottom: 10, marginTop: -6 },

  // Habit Share Invitations
  invitationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  invitationContent: {
    flex: 1,
    marginRight: 12,
  },
  invitationTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    marginBottom: 2,
  },
  invitationFrom: {
    color: "#888",
    fontSize: 12,
    marginBottom: 2,
  },
  invitationDate: {
    color: "#555",
    fontSize: 11,
  },
  invitationActions: {
    flexDirection: "row",
    gap: 8,
  },
  invitationButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});

