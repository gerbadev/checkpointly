import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSocial } from "@/state/SocialContext";
import { getToken } from "@/lib/auth";
import { API_URL } from "@/constants/api";
import { theme } from "@/constants/theme";

type IncomingFriend = {
  friendship_id?: string;
  friend_id: string;
  name: string;
  email: string;
  avatar_url?: string;
  status: "accepted" | "pending" | "blocked";
  is_active_now?: boolean;
  last_active_date?: string | null;
};

export default function HabitShareSelectFriend() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const habitId = params.id;

  const { friends } = useSocial();
  const acceptedFriends = useMemo(() => {
    const list = (friends ?? []) as IncomingFriend[];
    return list.filter((f) => f.status === "accepted");
  }, [friends]);

  const [sending, setSending] = useState(false);

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
        }).format(d); // YYYY-MM-DD

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

  async function sendInvite(friendId: string) {
    if (!habitId) return;
    if (sending) return;

    try {
      setSending(true);
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
      if (!res.ok) throw new Error(data.error || "Greška pri dijeljenju avanture.");

      Alert.alert("Poziv poslan", "Čekate odgovor prijatelja.");
      router.back();
    } catch (e: any) {
      Alert.alert("Greška", e?.message || "Ne možemo podijeliti avanturu.");
    } finally {
      setSending(false);
    }
  }

  const renderItem = ({ item }: { item: IncomingFriend }) => {
    const isActive = Boolean(item.is_active_now);
    const dotColor = isActive ? "#22c55e" : "rgba(148,163,184,0.85)";

    return (
      <TouchableOpacity
        style={styles.friendCard}
        activeOpacity={0.85}
        disabled={sending}
        onPress={() => sendInvite(String(item.friend_id))}
      >
        <View style={styles.avatarWrap}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { justifyContent: "center", alignItems: "center" }]}>
              <Text style={{ color: theme.colors.faint, fontWeight: "800" }}>
                {(item.name || item.email || "?")[0]?.toUpperCase()}
              </Text>
            </View>
          )}

          <View style={[styles.activityDot, { backgroundColor: dotColor }]} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.friendName} numberOfLines={1}>
            {item.name || "Korisnik"}
          </Text>
          <Text style={styles.friendMeta} numberOfLines={1}>
            {isActive ? "Aktivan sada" : formatLastActive(item.last_active_date)}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color={theme.colors.faint} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
          <Text style={{ color: theme.colors.text, fontWeight: "900" }}>Otkaži</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Dijeli avanturu</Text>
      </View>

      {!acceptedFriends.length ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="people-outline" size={46} color={theme.colors.faint} />
          <Text style={styles.emptyTitle}>Nemate prijatelje</Text>
          <Text style={styles.emptyText}>Nemate prijatelje s kojima možete podijeliti avanturu.</Text>
        </View>
      ) : (
        <FlatList
          data={acceptedFriends}
          keyExtractor={(item) => item.friendship_id || item.friend_id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#0F172A" },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  title: { fontSize: 28, fontWeight: "bold", color: "#fff" },
  listContainer: { paddingHorizontal: 20, paddingBottom: 100, gap: 12 },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    gap: 12,
  },
  avatarWrap: { width: 46, height: 46, borderRadius: 23, position: "relative" },
  avatar: { width: "100%", height: "100%", borderRadius: 23 },
  activityDot: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#0F172A",
  },
  friendName: { color: "#fff", fontWeight: "800", fontSize: 16 },
  friendMeta: { color: theme.colors.muted, marginTop: 3, fontSize: 12, fontWeight: "700" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  emptyTitle: { color: "#fff", fontWeight: "900", marginTop: 12, fontSize: 18 },
  emptyText: { color: theme.colors.muted, textAlign: "center", marginTop: 6, lineHeight: 20 },
});

