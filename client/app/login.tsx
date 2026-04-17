import { useState } from 'react';
import { View, Text, TextInput, Alert, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { removeToken, saveToken } from '@/lib/auth';
import * as WebBrowser from 'expo-web-browser';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { images } from '@/constants/images';
import { Screen } from '@/components/Screen';
import { theme } from '@/constants/theme';
import { AppButton } from '@/components/AppButton';
import { Card } from '@/components/Card';
import { API_URL } from '@/constants/api';
import { oauthLogin } from '../lib/auth';

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

async function readJsonOrThrow(res: Response) {
  const text = await res.text();
  const ct = res.headers.get('content-type') || '';

  if (!ct.includes('application/json')) {
    throw new Error(`Server vratio ${res.status}. Body: ${text.slice(0, 120)}`);
  }

  return JSON.parse(text);
}

import { useThemeColors } from '@/state/UserPreferencesContext';
import { Ionicons } from '@expo/vector-icons';

export default function Login() {
  const router = useRouter();
  const colors = useThemeColors();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Greška', 'Email i lozinka su obavezni');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await readJsonOrThrow(res);

      if (!res.ok) {
        throw new Error(data.error || 'Prijava nije uspjela');
      }

      await removeToken();
      await saveToken(data.token);

      router.replace('/');
    } catch (err: any) {
      Alert.alert('Prijava nije uspjela', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
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
        throw new Error('Google nije vratio ID token.');
      }

      await oauthLogin('google', idToken);
      router.replace('/');
    } catch (err: any) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
      } else {
        Alert.alert('Google prijava nije uspjela', err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll={true}>
      <View style={{ alignItems: 'center', marginBottom: 18 }}>
        <Image
          source={images.logo}
          style={{ width: '70%', height: 85, resizeMode: 'contain' }}
        />
      </View>

      <Text style={[theme.type.hero, { color: colors.text, marginBottom: 6 }]}>
        Prijava
      </Text>

      <Text style={{ color: colors.muted, marginBottom: 16 }}>
        Dobrodošli natrag.
      </Text>

      <Card>
        <Text style={[theme.type.cap, { color: colors.text, marginBottom: 6, opacity: 0.6 }]}>
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
            padding: 14,
            borderRadius: theme.radius.md,
            fontSize: 16,
            fontWeight: '600',
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
            padding: 14,
            borderRadius: theme.radius.md,
            fontSize: 16,
            fontWeight: '600',
          }}
        />

        <View style={{ marginTop: 14 }}>
          <AppButton
            title={loading ? 'Prijavljivanje…' : 'Prijavi se'}
            variant="secondary"
            onPress={handleLogin}
            disabled={loading || !email.trim() || !password.trim()}
          />
        </View>

        <View style={{ marginTop: 10 }}>
          <AppButton
            title="Nastavi s Google"
            variant="secondary"
            icon={<Ionicons name="logo-google" size={20} color="#4285F4" />}
            onPress={handleGoogleLogin}
            disabled={loading}
            style={{ borderColor: colors.text + '20', borderWidth: 1 }}
          />
        </View>

      </Card>

      <View style={{ marginTop: 14 }}>
        <Pressable onPress={() => router.push('../register')}>
          <Text style={{ textAlign: 'center', color: colors.muted }}>
            Nemate račun?{' '}
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              Registrirajte se ovdje
            </Text>
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}