// utils/storage.ts
// 💾 All read/write operations to AsyncStorage
// Every screen uses these functions — never talks to AsyncStorage directly

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import { STORAGE_KEYS } from '../constants/storage';
import { Goal, QuestState, Transaction, UserProfile } from '../constants/types';
import type { AuthSession } from '../types';

// ─── Generic Helpers ──────────────────────────────────────────────

type StorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

type WebStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const memoryStore = new Map<string, string>();

const memoryStorage: StorageAdapter = {
  getItem: async key => memoryStore.get(key) ?? null,
  setItem: async (key, value) => {
    memoryStore.set(key, value);
  },
  removeItem: async key => {
    memoryStore.delete(key);
  },
};

function getWebStorage(): WebStorage | null {
  if (typeof globalThis === 'undefined') {
    return null;
  }

  const storage = (globalThis as { localStorage?: WebStorage }).localStorage;
  return storage ?? null;
}

const webStorage: StorageAdapter = {
  getItem: async key => {
    const storage = getWebStorage();
    if (!storage) {
      return null;
    }
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key, value) => {
    const storage = getWebStorage();
    if (!storage) {
      return;
    }
    try {
      storage.setItem(key, value);
    } catch {
      // ignore web storage write errors
    }
  },
  removeItem: async key => {
    const storage = getWebStorage();
    if (!storage) {
      return;
    }
    try {
      storage.removeItem(key);
    } catch {
      // ignore web storage remove errors
    }
  },
};

const hasNativeStorage = Boolean(
  NativeModules?.RNCAsyncStorage || NativeModules?.AsyncStorage
);

const storage: StorageAdapter = Platform.OS === 'web'
  ? webStorage
  : hasNativeStorage
    ? AsyncStorage
    : memoryStorage;

// Save ANY data to storage (converts to JSON string)
async function saveData<T>(key: string, data: T): Promise<void> {
  try {
    const json = JSON.stringify(data);
    await storage.setItem(key, json);
  } catch (error) {
    console.error(`Error saving ${key}:`, error);
  }
}

// Load ANY data from storage (parses JSON back to object)
async function loadData<T>(key: string): Promise<T | null> {
  try {
    const json = await storage.getItem(key);
    return json ? JSON.parse(json) : null;
  } catch (error) {
    console.error(`Error loading ${key}:`, error);
    return null;
  }
}

// ─── Auth Session ─────────────────────────────────────────────────

export async function getAuthSession(): Promise<AuthSession | null> {
  return loadData<AuthSession>(STORAGE_KEYS.AUTH_SESSION);
}

export async function saveAuthSession(session: AuthSession): Promise<void> {
  await saveData(STORAGE_KEYS.AUTH_SESSION, session);
}

export async function clearAuthSession(): Promise<void> {
  await storage.removeItem(STORAGE_KEYS.AUTH_SESSION);
}

// ─── Transactions ─────────────────────────────────────────────────

export async function getTransactions(): Promise<Transaction[]> {
  const data = await loadData<Transaction[]>(STORAGE_KEYS.TRANSACTIONS);
  return data ?? [];          // ?? means "if null, return empty array"
}

export async function saveTransaction(transaction: Transaction): Promise<void> {
  const existing = await getTransactions();
  // Add new transaction at the BEGINNING (newest first)
  const updated = [transaction, ...existing];
  await saveData(STORAGE_KEYS.TRANSACTIONS, updated);
}

export async function deleteTransaction(id: string): Promise<void> {
  const existing = await getTransactions();
  const updated = existing.filter(t => t.id !== id);
  await saveData(STORAGE_KEYS.TRANSACTIONS, updated);
}

// ─── Profile ──────────────────────────────────────────────────────

export async function getProfile(): Promise<UserProfile> {
  const data = await loadData<UserProfile>(STORAGE_KEYS.PROFILE);
  // Default profile if none exists yet
  return data ?? {
    name: 'FinGekko User',
    monthlyIncome: 0,
    currency: '₹',
    xp: 0,
    level: 1,
    personalityType: null,
    streak: {
      currentStrak: 0,
      bestStreak: 0,
      lastTrackedDate: '',
      trackedDates: [],
    },
    achievements: [],
  };
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await saveData(STORAGE_KEYS.PROFILE, profile);
}

// ─── Goals ────────────────────────────────────────────────────────

export async function getGoals(): Promise<Goal[]> {
  const data = await loadData<Goal[]>(STORAGE_KEYS.GOALS);
  return data ?? [];
}

export async function saveGoal(goal: Goal): Promise<void> {
  const existing = await getGoals();
  const updated = [goal, ...existing];
  await saveData(STORAGE_KEYS.GOALS, updated);
}

// ─── Quests ───────────────────────────────────────────────────────

export async function getQuestState(): Promise<QuestState | null> {
  return loadData<QuestState>(STORAGE_KEYS.QUESTS);
}

export async function saveQuestState(state: QuestState): Promise<void> {
  await saveData(STORAGE_KEYS.QUESTS, state);
}