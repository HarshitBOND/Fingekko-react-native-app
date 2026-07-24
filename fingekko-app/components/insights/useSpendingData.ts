/**
 * Fetches the signed-in user's profile + transactions and derives the shared
 * spending model (see compute.ts). Every insights surface uses this hook, so the
 * Insights screen, Spend Impact, and Spending Breakdown always agree on the numbers.
 */
import type { Transaction } from '@/constants/types';
import type { ApiUser, ProfileResponse, TransactionsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { formatMoney } from '@/utils/currency';
import { summarizeByPayCycle } from '@/utils/pay-cycle';
import { useAppEvent } from '@/hooks/use-app-event';
import { useAuth } from '@clerk/clerk-expo';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { computeSpending } from './compute';

export function useSpendingData() {
  const { getToken, isSignedIn } = useAuth();
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const loadData = useCallback(async () => {
    if (!isSignedIn) {
      setProfile(null);
      setTransactions([]);
      setLoading(false);
      return;
    }
    const token = await getTokenRef.current();
    if (!token) return;
    try {
      const [profileResponse, transactionsResponse] = await Promise.all([
        apiRequest<ProfileResponse>('/api/profile', {}, token),
        apiRequest<TransactionsResponse>('/api/transactions', {}, token),
      ]);
      setProfile(profileResponse.user);
      setTransactions(transactionsResponse.transactions);
    } catch (error) {
      console.warn('Failed to load insights:', error);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Live updates: an entry added anywhere (including an income entry) re-reads
  // Insights straight away rather than waiting for the next focus.
  useAppEvent('transaction:changed', () => {
    void loadData();
  });
  useAppEvent('profile:changed', () => {
    void loadData();
  });

  // Personal money formatting now flows through the central, profile-driven
  // formatter (AUDIT item 17); the currency is set app-wide by useCurrencySync.
  const currency = profile?.currency ?? 'INR';
  const formatAmount = useCallback((value: number) => formatMoney(value), []);

  const now = useMemo(() => new Date(), []);
  const data = useMemo(() => computeSpending(transactions, profile, now), [transactions, profile, now]);
  // The same pay-cycle balance Home and Safe-to-Spend show (AUDIT items 19/25),
  // so Insights can reflect debt instead of contradicting the Home card.
  const cycle = useMemo(() => summarizeByPayCycle(transactions, profile, now), [transactions, profile, now]);

  return { loading, isSignedIn, profile, transactions, currency, formatAmount, data, cycle, now };
}

export default useSpendingData;
