/**
 * Feeds the personality engine with the four pillars it needs — spend analysis,
 * splits, goals and streaks — and re-runs it whenever any of them changes.
 *
 * The engine itself is pure (see `utils/personality/engine`); everything
 * fetch-shaped and time-shaped lives here.
 *
 * The fetch is shared process-wide: Home's quick-action tile and the Personality
 * screen both read this, and without sharing, opening Home would fire a second
 * copy of /api/transactions on top of the one `useHomeScreen` already makes.
 * One in-flight request is reused by every consumer, and the result is cached
 * until something actually invalidates it.
 */

import { useAuth } from '@clerk/clerk-expo';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GoalsResponse, ProfileResponse, TransactionsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { useAppEvent } from '@/hooks/use-app-event';
import {
  classifyPersonality,
  isGoalOnTrack,
  type PersonalityResult,
} from '@/utils/personality/engine';

/** Local-time YYYY-MM-DD — never `toISOString`, which shifts the day westward. */
const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type Snapshot = {
  transactions: TransactionsResponse['transactions'];
  goals: GoalsResponse['goals'];
  signupDate: string | null;
  monthlyIncome: number | null;
};

const EMPTY: Snapshot = { transactions: [], goals: [], signupDate: null, monthlyIncome: null };

/* ── Process-wide shared state ──────────────────────────────────────────── */

let cache: Snapshot | null = null;
let inFlight: Promise<Snapshot | null> | null = null;
/** Refetch if the cached snapshot is older than this. */
const TTL_MS = 60_000;
let fetchedAt = 0;

const subscribers = new Set<(snapshot: Snapshot) => void>();

function publish(snapshot: Snapshot) {
  cache = snapshot;
  fetchedAt = Date.now();
  subscribers.forEach((notify) => notify(snapshot));
}

/** Drops the cache so the next read refetches. */
function invalidate() {
  cache = null;
  fetchedAt = 0;
}

async function fetchSnapshot(getToken: () => Promise<string | null>): Promise<Snapshot | null> {
  const token = await getToken();
  if (!token) return null;

  const [txns, profile, goalsRes] = await Promise.all([
    apiRequest<TransactionsResponse>('/api/transactions', {}, token),
    apiRequest<ProfileResponse>('/api/profile', {}, token).catch(() => null),
    // Goals are optional input — a failure just means the engine redistributes
    // the Strategist weights, not that we can't classify.
    apiRequest<GoalsResponse>('/api/goals', {}, token).catch(() => null),
  ]);

  return {
    transactions: txns?.transactions ?? [],
    goals: goalsRes?.goals ?? [],
    signupDate: profile?.user?.createdAt ? toIso(new Date(profile.user.createdAt)) : null,
    monthlyIncome: profile?.user?.monthlyIncome ?? null,
  };
}

export function usePersonality() {
  const { getToken, isSignedIn } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [snapshot, setSnapshot] = useState<Snapshot | null>(cache);
  const [loading, setLoading] = useState(cache === null);

  // Every mounted copy of this hook hears about a new snapshot.
  useEffect(() => {
    const notify = (next: Snapshot) => {
      setSnapshot(next);
      setLoading(false);
    };
    subscribers.add(notify);
    return () => {
      subscribers.delete(notify);
    };
  }, []);

  const load = useCallback(
    async (force = false) => {
      if (!isSignedIn) {
        publish(EMPTY);
        return;
      }
      if (force) invalidate();

      // Fresh enough — reuse it rather than hitting the network again.
      if (!force && cache && Date.now() - fetchedAt < TTL_MS) {
        setSnapshot(cache);
        setLoading(false);
        return;
      }

      // A request is already running; ride along instead of starting a second.
      if (inFlight) {
        await inFlight;
        return;
      }

      inFlight = fetchSnapshot(() => getTokenRef.current()).finally(() => {
        inFlight = null;
      });

      try {
        const next = await inFlight;
        if (next) publish(next);
      } catch (error) {
        console.warn('Failed to load personality data:', error);
      } finally {
        setLoading(false);
      }
    },
    [isSignedIn],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // A new entry or income change can flip the classification.
  useAppEvent('transaction:changed', () => void load(true));
  useAppEvent('profile:changed', () => void load(true));

  const result = useMemo<PersonalityResult | null>(() => {
    if (!snapshot) return null;
    const { transactions, goals, signupDate, monthlyIncome } = snapshot;

    const expenses = transactions
      .filter((t) => t.type === 'expense')
      .map((t) => ({
        amount: t.amount,
        category: t.category,
        date: String(t.date).slice(0, 10),
        // Splits are mirrored into personal transactions and flagged there, so
        // counting them here is complete without double-counting the community
        // expense they came from.
        isSplit: Boolean((t as { isSplit?: boolean }).isSplit),
      }));

    // Unique days with at least one entry — the same definition the streak
    // uses, so the two never disagree.
    const daysLogged = new Set(transactions.map((t) => String(t.date).slice(0, 10))).size;

    // Fall back to the earliest entry when the API predates the createdAt
    // field. It understates total_days (and so flatters consistency), but it's
    // far better than assuming today.
    const earliest = transactions.reduce<string | null>((min, t) => {
      const d = String(t.date).slice(0, 10);
      return !min || d < min ? d : min;
    }, null);

    return classifyPersonality({
      expenses,
      goals: goals.map((g) => ({
        isOnTrack: isGoalOnTrack({
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          deadline: g.deadline,
          createdAt: g.createdAt,
        }),
      })),
      daysLogged,
      signupDate: signupDate ?? earliest ?? toIso(new Date()),
      monthlyIncome,
    });
  }, [snapshot]);

  return { result, loading, refresh: () => load(true) };
}

export default usePersonality;
