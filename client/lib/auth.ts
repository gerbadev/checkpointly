import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/constants/api';

const TOKEN_KEY = 'checkpointly_token';

export async function saveToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function removeToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}
export async function oauthLogin(
  provider: 'google',
  idToken: string
) {
  const res = await fetch(`${API_URL}/auth/oauth-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      idToken,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'OAuth login failed');
  }

  await removeToken();
  await saveToken(data.token);
  return data;
}

