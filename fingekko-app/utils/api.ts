import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_PORT = 4000;

function getDevServerHost() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest?.debuggerHost ||
    Constants.manifest2?.extra?.expoClient?.hostUri;

  if (!hostUri) {
    return null;
  }

  const host = hostUri.split(':')[0];
  return host || null;
}

function replaceLocalhost(url: string, host: string) {
  const replacePattern = /^(https?:\/\/)(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?/i;
  return url.replace(replacePattern, (_match, protocol, _host, port) => {
    const nextPort = port || `:${DEFAULT_PORT}`;
    return `${protocol}${host}${nextPort}`;
  });
}

function resolveApiUrl() {
  const platformOverride = Platform.select({
    android: process.env.EXPO_PUBLIC_API_URL_ANDROID,
    ios: process.env.EXPO_PUBLIC_API_URL_IOS,
    web: process.env.EXPO_PUBLIC_API_URL_WEB,
    default: process.env.EXPO_PUBLIC_API_URL,
  });

  const fallbackDefault = Platform.select({
    android: 'http://10.0.2.2:4000',
    ios: 'http://localhost:4000',
    web: 'http://localhost:4000',
    default: 'http://localhost:4000',
  });

  const baseUrl = platformOverride || process.env.EXPO_PUBLIC_API_URL || fallbackDefault;
  const isDevice = Boolean(Constants.isDevice);
  const host = getDevServerHost();

  if (isDevice && host && baseUrl) {
    return replaceLocalhost(baseUrl, host);
  }

  if (!baseUrl && host) {
    return `http://${host}:${DEFAULT_PORT}`;
  }

  return baseUrl || `http://localhost:${DEFAULT_PORT}`;
}
const API_URL = resolveApiUrl();

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
