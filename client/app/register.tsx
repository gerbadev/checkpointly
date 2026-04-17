import { View, Text, TextInput, Pressable, StyleSheet, Alert, Image } from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { removeToken, saveToken } from '@/lib/auth';
import { API_URL } from '@/constants/api';
import { images } from '@/constants/images';
import { AppButton } from '@/components/AppButton';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { theme } from '@/constants/theme';
import * as WebBrowser from "expo-web-browser";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { oauthLogin } from "@/lib/auth";

WebBrowser.maybeCompleteAuthSession();

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let GoogleSignin: any, statusCodes: any;
if (!isExpoGo) {
  const RNGoogleSignin = require('@react-native-google-signin/google-signin');
  GoogleSignin = RNGoogleSignin.GoogleSignin;
  statusCodes = RNGoogleSignin.statusCodes;

  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });
}

function formatDobSlash(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const d = digits.slice(0, 2);
  const m = digits.slice(2, 4);
  const y = digits.slice(4, 8);

  let out = d;
  if (m.length) out += "/" + m;
  if (y.length) out += "/" + y;

  return out;
}

function slashToIso(slash: string) {
  const digits = slash.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const dd = digits.slice(0, 2);
  const mm = digits.slice(2, 4);
  const yyyy = digits.slice(4, 8);
  return `${yyyy}-${mm}-${dd}`;
}

function isValidDobSlash(slash: string) {
  const iso = slashToIso(slash);
  if (!iso) return false;

  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

import { useThemeColors } from '@/state/UserPreferencesContext';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const colors = useThemeColors();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [dob, setDob] = useState("");

  function isValidDob(v: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(v);
  }

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim() || !dob.trim()) {
      Alert.alert("Greška", "Sva polja (Korisničko ime, Email, Lozinka, Datum rođenja) su obavezna.");
      return;
    }

    if (!isValidDobSlash(dob.trim())) {
      Alert.alert("Greška", "Datum rođenja mora biti valjan i u formatu DD/MM/YYYY.");
      return;
    }

    const date_of_birth = slashToIso(dob.trim());

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, date_of_birth }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registracija nije uspjela");
      }

      await removeToken();
      await saveToken(data.token);
      router.replace("/");
    } catch (err: any) {
      Alert.alert("Greška", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleRegister() {
    if (isExpoGo) {
      Alert.alert('Expo Go', 'Značajka Google prijave nije podržana u Expo Go. Pokrenite aplikaciju putem development builda.');
      return;
    }

    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      
      const idToken = response.type === 'success' ? response.data.idToken : null;

      if (!idToken) {
        throw new Error("Nije dobiven ID token.");
      }

      await oauthLogin("google", idToken);
      router.replace("/");
    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
      } else {
        Alert.alert("Google registracija nije uspjela", err.message || "Greška");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll={true}>
      <View style={{ alignItems: "center", marginBottom: 18 }}>
        <Image
          source={images.logo}
          style={{ width: "70%", height: 82, resizeMode: "contain" }}
        />
      </View>

      <Text style={[theme.type.hero, { color: colors.text, marginBottom: 6 }]}>
        Stvorite račun
      </Text>

      <Text style={{ color: colors.muted, marginBottom: 16, lineHeight: 20 }}>
        Započnite svoje putovanje u par koraka.
      </Text>

      <Card>
        <Text style={[theme.type.cap, { color: colors.text, marginBottom: 6, opacity: 0.6 }]}>
          KORISNIČKO IME
        </Text>
        <TextInput
          placeholder="Unesite korisničko ime"
          placeholderTextColor={colors.faint}
          autoCapitalize="words"
          value={name}
          onChangeText={setName}
          style={{
            borderWidth: 1,
            borderColor: colors.glassBorder,
            backgroundColor: colors.glass,
            color: colors.text,
            paddingVertical: 14,
            paddingHorizontal: 14,
            borderRadius: theme.radius.md,
            fontSize: 16,
            fontWeight: "600",
          }}
        />

        <Text style={[theme.type.cap, { color: colors.text, marginTop: 14, marginBottom: 6, opacity: 0.6 }]}>
          EMAIL
        </Text>
        <TextInput
          placeholder="Email"
          placeholderTextColor={colors.faint}
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          style={{
            borderWidth: 1,
            borderColor: colors.glassBorder,
            backgroundColor: colors.glass,
            color: colors.text,
            paddingVertical: 14,
            paddingHorizontal: 14,
            borderRadius: theme.radius.md,
            fontSize: 16,
            fontWeight: "600",
          }}
        />

        <Text style={[theme.type.cap, { color: colors.text, marginTop: 14, marginBottom: 6, opacity: 0.6 }]}>
          LOZINKA
        </Text>
        <TextInput
          placeholder="Lozinka"
          placeholderTextColor={colors.faint}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={{
            borderWidth: 1,
            borderColor: colors.glassBorder,
            backgroundColor: colors.glass,
            color: colors.text,
            paddingVertical: 14,
            paddingHorizontal: 14,
            borderRadius: theme.radius.md,
            fontSize: 16,
            fontWeight: "600",
          }}
        />
        <Text style={[theme.type.cap, { color: colors.text, marginTop: 14, marginBottom: 6, opacity: 0.6 }]}>
          DATUM ROĐENJA
        </Text>
        <TextInput
          placeholder="DD/MM/YYYY"
          placeholderTextColor={colors.faint}
          value={dob}
          onChangeText={(t) => setDob(formatDobSlash(t))}
          keyboardType="number-pad"
          maxLength={10}
          style={{
            borderWidth: 1,
            borderColor: colors.glassBorder,
            backgroundColor: colors.glass,
            color: colors.text,
            paddingVertical: 14,
            paddingHorizontal: 14,
            borderRadius: theme.radius.md,
            fontSize: 16,
            fontWeight: "600",
          }}
        />

        <View style={{ marginTop: 14 }}>
          <AppButton
            title={loading ? "Stvaranje…" : "Registriraj se"}
            variant="secondary"
            onPress={handleRegister}
            disabled={loading || !name.trim() || !email.trim() || !password.trim() || !dob.trim()}
            style={{ paddingVertical: 16, borderRadius: 20 }}
          />
        </View>

        <View style={{ marginTop: 10 }}>
          <AppButton
            title="Nastavi s Google"
            variant="secondary"
            icon={<Ionicons name="logo-google" size={20} color="#4285F4" />}
            onPress={handleGoogleRegister}
            disabled={loading}
            style={{ borderColor: colors.text + '20', borderWidth: 1 }}
          />
        </View>
      </Card>

      <View style={{ marginTop: 14 }}>
        <Pressable onPress={() => router.replace("/login")}>
          <Text style={{ textAlign: "center", color: colors.muted, fontWeight: "700" }}>
            Već imate račun?{" "}
            <Text style={{ color: colors.primary, fontWeight: "800" }}>
              Prijavite se
            </Text>
          </Text>
        </Pressable>
      </View>
    </Screen>
  );

}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '600', marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 14,
    borderRadius: 8,
    marginBottom: 12
  },
  button: {
    backgroundColor: '#000',
    padding: 14,
    borderRadius: 8,
    marginTop: 8
  },
  buttonText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
  link: { marginTop: 16, textAlign: 'center', color: '#555' }
});
