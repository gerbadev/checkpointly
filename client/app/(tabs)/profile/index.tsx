import { View, Text, ActivityIndicator, ScrollView, RefreshControl, Alert, Image, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { getToken, removeToken } from '@/lib/auth';
import { API_URL } from '@/constants/api';
import { useRouter } from 'expo-router';
import { AppButton } from '@/components/AppButton';
import { Card } from '@/components/Card';
import { theme } from '@/constants/theme';
import { Screen } from '@/components/Screen';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { usePreferences, useThemeColors } from '@/state/UserPreferencesContext';
import { useLevelUp } from '@/state/LevelUpContext';

type ProfileSummary = {
  totalHabits: number;
  totalCompletions: number;
  longestStreak: number;
  xpTotal?: number;
  level?: number;
  levelCurrentXp?: number;
  levelNextXp?: number;
  levelProgress?: number; 
};

type ProfileIdentity = {
  email: string;
  name?: string;
  created_at: string;
  avatar_url?: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { preferences, togglePreference } = usePreferences();
  const isDark = preferences.darkMode;
  const { checkForLevelUp } = useLevelUp();

  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [previousLevel, setPreviousLevel] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [identity, setIdentity] = useState<ProfileIdentity | null>(null);
  const [avatarUpdating, setAvatarUpdating] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [updatingName, setUpdatingName] = useState(false);

  async function loadProfile() {
    try {
      const token = await getToken();
      const [summaryRes, identityRes] = await Promise.all([
        fetch(`${API_URL}/profile/summary`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/profile/identity`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (!summaryRes.ok || !identityRes.ok) throw new Error();
      
      const newSummary = await summaryRes.json();
      
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
      setIdentity(await identityRes.json());
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { loadProfile(); }, [previousLevel, checkForLevelUp]));

  async function handleLogout() {
    await removeToken();
    router.replace('/login');
  }

  function formatMembershipDate(raw: string) {
    const d = new Date(raw);
    const dateStr = new Intl.DateTimeFormat("hr-HR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
    return `Član od ${dateStr}`;
  }

  async function uploadAvatarFromUri(uri: string) {
    if (avatarUpdating) return;
    try {
      setAvatarUpdating(true);
      const token = await getToken();
      const form = new FormData();
      form.append('avatar', { uri, type: 'image/jpeg', name: `avatar.jpg` } as any);
      const res = await fetch(`${API_URL}/profile/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (res.ok) setIdentity(prev => prev ? { ...prev, avatar_url: data.avatar_url } : prev);
    } catch (e: any) {
      Alert.alert('Greška', 'Neuspješan upload slike.');
    } finally {
      setAvatarUpdating(false);
    }
  }

  async function handlePickFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets?.[0]?.uri) await uploadAvatarFromUri(result.assets[0].uri);
  }

  async function handleTakePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Greška", "Potrebna je dozvola za kameru.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets?.[0]?.uri) await uploadAvatarFromUri(result.assets[0].uri);
  }

  async function handleUpdateName() {
    if (!newName.trim() || updatingName) return;
    try {
      setUpdatingName(true);
      const token = await getToken();
      const res = await fetch(`${API_URL}/profile/identity`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (res.ok) {
        setIdentity(prev => prev ? { ...prev, name: newName.trim() } : prev);
        setEditingName(false);
      }
    } finally {
      setUpdatingName(false);
    }
  }

  async function handleResetData() {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/profile/reset`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        Alert.alert("Uspjeh", "Svi podaci su resetirani.");
        loadProfile();
      } else {
        const data = await res.json();
        Alert.alert("Gre\u0161ka", data.error || "Neuspje\u0161no resetiranje podataka.");
      }
    } catch (e: any) {
      Alert.alert("Gre\u0161ka", "Neuspje\u0161no resetiranje podataka.");
    }
  }

  async function handleDeleteAccount() {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/profile/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        Alert.alert("Uspje\u0161no", "Ra\u010dun je izbrisan. \u0107ete biti preusmjereni na ekran prijave.");
        await removeToken();
        router.replace('/login');
      } else {
        const data = await res.json();
        Alert.alert("Gre\u0161ka", data.error || "Neuspje\u0161no brisanje ra\u010duna.");
      }
    } catch (e: any) {
      Alert.alert("Gre\u0161ka", "Neuspje\u0161no brisanje ra\u010duna.");
    }
  }

  function PreferenceRow({ label, value, icon, onToggle }: { label: string; value: boolean; icon: any; onToggle: () => void }) {
    return (
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={onToggle}
        style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.glassBorder
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: colors.glassStrong, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={icon} size={18} color={colors.primary} />
          </View>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{label}</Text>
        </View>
        <View style={{ 
          width: 44, 
          height: 24, 
          borderRadius: 14, 
          backgroundColor: value ? colors.primary : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
          justifyContent: 'center',
          paddingHorizontal: 2
        }}>
          <View style={{ 
            width: 20, 
            height: 20, 
            borderRadius: 10, 
            backgroundColor: '#fff',
            alignSelf: value ? 'flex-end' : 'flex-start',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            elevation: 2
          }} />
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) return <Screen><ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 100 }} /></Screen>;

  return (
    <Screen scroll={true}>
      <Stack.Screen options={{ title: "Profil", headerShown: false }} />
      <Text style={[theme.type.hero, { color: colors.text, marginBottom: 4 }]}>Vaš profil</Text>
      <Text style={{ color: colors.muted, marginBottom: 20 }}>Upravljajte svojim računom i preferencama.</Text>

      {identity && (
        <Card style={{ padding: 16 }}>
          <Text style={{ color: colors.faint, fontSize: 13, fontWeight: '800', marginBottom: 12 }}>RAČUN</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <TouchableOpacity onPress={() => Alert.alert("Upload", "Odaberi", [{ text: "Kamera", onPress: handleTakePhoto }, { text: "Galerija", onPress: handlePickFromLibrary }, { text: "Otkaži", style: "cancel" }])} style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.glass, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }}>
              {identity.avatar_url ? <Image source={{ uri: identity.avatar_url }} style={{ width: 80, height: 80 }} /> : <Text style={{ color: colors.primary, fontSize: 24, fontWeight: '900' }}>{identity.email[0].toUpperCase()}</Text>}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              {editingName ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TextInput value={newName} onChangeText={setNewName} style={{ flex: 1, color: colors.text, fontSize: 18, fontWeight: '800', borderBottomWidth: 1, borderBottomColor: colors.primary }} autoFocus />
                  <TouchableOpacity onPress={handleUpdateName}><Ionicons name="checkmark-circle" size={28} color={colors.primary} /></TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => { setNewName(identity.name || ''); setEditingName(true); }} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginRight: 8 }}>{identity.name || 'Korisnik'}</Text>
                  <Ionicons name="pencil" size={16} color={colors.faint} />
                </TouchableOpacity>
              )}
              <Text style={{ color: colors.muted, marginTop: 2 }}>{identity.email}</Text>
              <Text style={{ color: colors.faint, marginTop: 2, fontSize: 12 }}>{formatMembershipDate(identity.created_at)}</Text>
            </View>
          </View>
        </Card>
      )}

      {summary && (
        <Card style={{ marginTop: 12, padding: 16 }}>
          <Text style={{ color: colors.faint, fontSize: 13, fontWeight: '800', marginBottom: 12 }}>NAPREDAK</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900' }}>Level {summary.level || 1}</Text>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '800' }}>{summary.levelCurrentXp || 0}/{summary.levelNextXp || 100} XP</Text>
          </View>
          <View style={{ height: 10, backgroundColor: colors.glass, borderRadius: 5, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${(summary.levelProgress || 0) * 100}%`, backgroundColor: colors.primary }} />
          </View>
          <Text style={{ color: colors.muted, marginTop: 10, fontSize: 14 }}>Ukupno prikupljeno <Text style={{ color: colors.text, fontWeight: '900' }}>{summary.xpTotal || 0} XP</Text></Text>
        </Card>
      )}

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
        <Card style={{ flex: 1, padding: 16 }}>
          <Text style={{ color: colors.faint, fontSize: 12, fontWeight: '800' }}>AVANTURE</Text>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 4 }}>{summary?.totalHabits || 0}</Text>
        </Card>
        <Card style={{ flex: 1, padding: 16 }}>
          <Text style={{ color: colors.faint, fontSize: 12, fontWeight: '800' }}>NAJDUŽI NIZ</Text>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 4 }}>🔥 {summary?.longestStreak || 0}</Text>
        </Card>
      </View>

      <Card style={{ marginTop: 12, padding: 16 }}>
        <Text style={{ color: colors.faint, fontSize: 13, fontWeight: '800', marginBottom: 8 }}>PREFERENCE</Text>
        <PreferenceRow label="Tamni način" icon="moon" value={preferences.darkMode} onToggle={() => togglePreference('darkMode')} />
        <PreferenceRow label="Obavijesti" icon="notifications" value={preferences.notifications} onToggle={() => togglePreference('notifications')} />
        <PreferenceRow label="Dnevni podsjetnici" icon="alarm" value={preferences.dailyReminders} onToggle={() => togglePreference('dailyReminders')} />
      </Card>

      <Card style={{ marginTop: 12, padding: 16 }}>
        <AppButton title="Odjava" variant="secondary" onPress={handleLogout} />
      </Card>

      <Card style={{ 
        marginTop: 20, 
        backgroundColor: isDark ? 'rgba(255,0,0,0.06)' : 'rgba(255,0,0,0.04)', 
        borderColor: isDark ? 'rgba(255,0,0,0.15)' : 'rgba(255,0,0,0.1)', 
        padding: 16 
      }}>
        <Text style={{ color: isDark ? colors.danger : '#000000', fontSize: 16, fontWeight: '900', marginBottom: 8 }}>⚠️ Opasna zona</Text>
        <Text style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#000000', fontSize: 13, marginBottom: 16 }}>Ove akcije su trajne. Provjerite dvaput prije nastavka.</Text>
        <AppButton title="Resetiraj sve podatke" variant="danger" onPress={() => Alert.alert("Reset", "Sigurno?", [{ text: "Otkaži" }, { text: "Reset", style: "destructive", onPress: handleResetData }])} />
        <View style={{ height: 10 }} />
        <AppButton title="Trajno izbriši račun" variant="danger" onPress={() => Alert.alert("Brisanje", "Sigurno?", [{ text: "Otkaži" }, { text: "Izbriši", style: "destructive", onPress: handleDeleteAccount }])} />
      </Card>
    </Screen>
  );
}
