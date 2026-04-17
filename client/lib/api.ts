import { API_URL } from '@/constants/api';

export async function apiFetch(
  path: string,
  token: string,
  options: RequestInit = {}
) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error('API Error:', {
      status: res.status,
      statusText: res.statusText,
      url: `${API_URL}${path}`,
      error: errorData
    });
    throw new Error(errorData.error || `API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
