import { Platform } from 'react-native';

const DEFAULT_API_URL = Platform.select({
  android: 'http://10.0.2.2:4000',
  ios: 'http://localhost:4000',
  web: 'http://localhost:4000',
  default: 'http://localhost:4000',
});

const platformOverride = Platform.select({
  android: process.env.EXPO_PUBLIC_API_URL_ANDROID,
  ios: process.env.EXPO_PUBLIC_API_URL_IOS,
  web: process.env.EXPO_PUBLIC_API_URL_WEB,
  default: process.env.EXPO_PUBLIC_API_URL,
});

const API_URL = platformOverride || process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

function normalizePath(path: string) {
  return path.startsWith('/') ? path : `/${path}`;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${normalizePath(path)}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const message = payload?.error || payload?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return (payload ?? {}) as T;
}
