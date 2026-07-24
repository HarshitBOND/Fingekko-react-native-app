import { useAuth } from '@clerk/clerk-expo';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { HomeResponse, TransactionsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { getFirstName } from '@/components/index/utils';
import { useAppEvent } from '@/hooks/use-app-event';
import { bestStreak, currentStreak, currentWeekDots, dayQualityMap, trackedDaySet } from './utils';

/**
 * Fetches the signed-in user's transactions (refetching whenever a streak screen
 * regains focus) and derives everything the streak flow renders: the current /
 * best streak, this week's dots, and the set of days that carry an entry.
 */
export function useStreakData() {
  const { getToken, isSignedIn } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [transactions, setTransactions] = useState<TransactionsResponse['transactions']>([]);
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!isSignedIn) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      const [txns, home] = await Promise.all([
        apiRequest<TransactionsResponse>('/api/transactions', {}, token),
        apiRequest<HomeResponse>('/api/home', {}, token).catch(() => null),
      ]);
      setTransactions(txns?.transactions ?? []);
      if (home?.user?.name) setFirstName(getFirstName(home.user.name));
    } catch (error) {
      console.warn('Failed to load streak data:', error);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Live updates: a new entry re-derives the streak while this screen is open.
  useAppEvent('transaction:changed', () => {
    void load();
  });

  const tracked = useMemo(() => trackedDaySet(transactions), [transactions]);
  const quality = useMemo(() => dayQualityMap(transactions), [transactions]);
  const streak = useMemo(() => currentStreak(tracked), [tracked]);
  const best = useMemo(() => bestStreak(tracked), [tracked]);
  const weekDots = useMemo(() => currentWeekDots(tracked), [tracked]);

  return { transactions, tracked, quality, streak, best, weekDots, firstName, loading, refresh: load };
}
