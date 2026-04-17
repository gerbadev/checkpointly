import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSocial } from "@/state/SocialContext";
import { getToken } from "@/lib/auth";
import { API_URL } from "@/constants/api";
import { theme } from "../../constants/theme";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { useThemeColors, usePreferences } from "@/state/UserPreferencesContext";

export default function SocialScreen() {
  const { leaderboard, friends, loadLeaderboard, loadFriends, sendFriendRequest, acceptFriendRequest } = useSocial();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<"leaderboard" | "friends">("leaderboard");
  const [friendEmail, setFriendEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [habitInvites, setHabitInvites] = useState<any[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);

  const colors = useThemeColors();
  const { preferences } = usePreferences();
  const isDark = preferences.darkMode;

  function formatLastActive(dateStr?: string | null) {
    if (!dateStr) return "-";
    try {
      const fallbackParsed = new Date(dateStr);
      if (Number.isNaN(fallbackParsed.getTime())) return "-";

      const diffDays = Math.max(0, Math.round((Date.now() - fallbackParsed.getTime()) / 86400000));
      if (diffDays === 0) return "Danas";
      if (diffDays === 1) return "Jučer";
      if (diffDays < 7) return `${diffDays} d`;
      return fallbackParsed.toLocaleDateString('hr-HR');
    } catch {
      return "-";
    }
  }

  useEffect(() => {
    const tab = typeof params?.tab === "string" ? params.tab : "";
    if (tab === "friends") setActiveTab("friends");
    if (tab === "leaderboard") setActiveTab("leaderboard");
  }, [params?.tab]);

  const loadHabitInvites = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      setInvitesLoading(true);
      const res = await fetch(`${API_URL}/social/habit-shares/incoming`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setHabitInvites(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn("Failed to load habit invites", e);
    } finally {
      setInvitesLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadLeaderboard(), loadFriends(), loadHabitInvites()]);
    setRefreshing(false);
  };

  const handleAddFriend = async () => {
    if (!friendEmail.trim()) return;
    setLoading(true);
    try {
      await sendFriendRequest(friendEmail.trim());
      Alert.alert("Zahtjev poslan", `Poslan zahtjev korisniku: ${friendEmail}`);
      setFriendEmail("");
    } catch (e: any) {
      Alert.alert("Greška", e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
    loadFriends();
    loadHabitInvites();
  }, []);

  const declineHabitInvite = async (inviteId: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/social/habit-shares/${inviteId}/decline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await loadHabitInvites();
      }
    } catch (e) {}
  };

  const acceptHabitInvite = async (inviteId: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/social/habit-shares/${inviteId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await loadHabitInvites();
        Alert.alert("Prihvaćeno", "Dobivate kopiju avanture.");
      }
    } catch (e) {}
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const isPending = item.status === "pending";
    const canAccept = isPending && item.requester_id === item.friend_id; 
    const friendId = activeTab === "leaderboard" ? item.id : item.friend_id;

    return (
      <Card 
        style={{ padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center' }}
      >
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          onPress={() => router.push(`/friend/${friendId}?returnTo=social&tab=${activeTab}` as any)}
        >
          {activeTab === "leaderboard" && (
            <Text style={{ width: 30, fontWeight: '900', color: colors.faint, fontSize: 14 }}>#{index + 1}</Text>
          )}
          <View style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12, position: 'relative', backgroundColor: colors.glass }}>
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={{ width: 44, height: 44, borderRadius: 22 }} />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="person" size={20} color={colors.faint} />
              </View>
            )}
            <View style={{ 
              position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, 
              backgroundColor: item.is_active_now ? '#22c55e' : colors.faint,
              borderWidth: 2, borderColor: colors.surface
            }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>{item.name || "Korisnik"}</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
              {item.is_active_now ? "Aktivan sada" : `Aktivan: ${formatLastActive(item.last_active_date)}`}
            </Text>
          </View>
        </TouchableOpacity>

        {activeTab === "friends" && isPending ? (
          <View>
            {canAccept ? (
              <TouchableOpacity 
                style={{ backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                onPress={() => acceptFriendRequest(item.friendship_id)}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>Prihvati</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ color: colors.faint, fontSize: 12, fontStyle: 'italic' }}>Čeka se...</Text>
            )}
          </View>
        ) : (
          <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
            <Text style={{ color: colors.text, fontWeight: '900', fontSize: 11 }}>Lvl {Math.floor((item.xp_total || 0) / 100) + 1}</Text>
          </View>
        )}
      </Card>
    );
  };

  return (
    <Screen scroll={false}>
      <View style={{ padding: 20 }}>
        <Text style={[theme.type.hero, { color: colors.text, marginBottom: 20 }]}>Društvo</Text>

        <View style={{ 
          flexDirection: "row", 
          backgroundColor: colors.glassStrong, 
          borderRadius: 16, 
          padding: 4,
          borderWidth: 1,
          borderColor: colors.glassBorder,
          marginBottom: 20
        }}>
          <TouchableOpacity
            style={{ flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 12, backgroundColor: activeTab === "leaderboard" ? colors.primary : 'transparent' }}
            onPress={() => setActiveTab("leaderboard")}
          >
            <Text style={{ color: activeTab === "leaderboard" ? '#fff' : colors.muted, fontWeight: "800" }}>Poredak</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 12, backgroundColor: activeTab === "friends" ? colors.primary : 'transparent' }}
            onPress={() => setActiveTab("friends")}
          >
            <Text style={{ color: activeTab === "friends" ? '#fff' : colors.muted, fontWeight: "800" }}>Prijatelji</Text>
          </TouchableOpacity>
        </View>

        {activeTab === "friends" && (
          <View style={{ flexDirection: "row", marginBottom: 20, gap: 10 }}>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                color: colors.text,
                borderRadius: 12,
                paddingHorizontal: 16,
                height: 48,
                borderWidth: 1,
                borderColor: colors.glassBorder,
              }}
              placeholder="Email prijatelja..."
              placeholderTextColor={colors.faint}
              value={friendEmail}
              onChangeText={setFriendEmail}
            />
            <TouchableOpacity 
              style={{ backgroundColor: colors.primary, width: 48, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center" }}
              onPress={handleAddFriend}
            >
              <Ionicons name="person-add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Habit Share Invitations */}
        {activeTab === "friends" && habitInvites.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ color: colors.faint, fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 12, paddingHorizontal: 20 }}>
              POZIVI ZA DIJELJENE AVANTURE
            </Text>
            {habitInvites.map((invitation) => (
              <Card key={invitation.id} style={{ padding: 16, marginBottom: 10, marginHorizontal: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14, marginBottom: 2 }}>
                      {invitation.habit_title}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 2 }}>
                      Od: {invitation.from_user_name}
                    </Text>
                    <Text style={{ color: colors.faint, fontSize: 11 }}>
                      {new Date(invitation.created_at).toLocaleDateString('hr-HR')}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => acceptHabitInvite(invitation.id)}
                      style={{ backgroundColor: colors.success + '20', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }}
                    >
                      <Ionicons name="checkmark" size={16} color={colors.success} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => declineHabitInvite(invitation.id)}
                      style={{ backgroundColor: colors.danger + '20', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }}
                    >
                      <Ionicons name="close" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}
      </View>

      <FlatList
        data={activeTab === "leaderboard" ? leaderboard : friends}
        keyExtractor={(item, index) => item.friendship_id || item.id || `item-${index}`}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListFooterComponent={activeTab === "leaderboard" ? (
          <View style={{ padding: 10, alignItems: 'center' }}>
            <Text style={{ color: colors.faint, fontSize: 12 }}>Prikazano je top 50 avanturista 🏔️</Text>
          </View>
        ) : null}
      />
    </Screen>
  );
}
