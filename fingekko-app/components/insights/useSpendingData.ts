/**
 * Fetches the signed-in user's profile + transactions and derives the shared
 * spending model (see compute.ts). Every insights surface uses this hook, so the
 * Insights screen, Spend Impact, and Spending Breakdown always agree on the numbers.
 */
import type { Transaction } from '@/constants/types';
import type { ApiUser, ProfileResponse, TransactionsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { formatCurrency } from '@/utils/helpers';
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

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadData = async () => {
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
          if (!isActive) return;
          setProfile(profileResponse.user);
          setTransactions(transactionsResponse.transactions);
        } catch (error) {
          console.warn('Failed to load insights:', error);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      loadData();
      return () => {
        isActive = false;
      };
    }, [isSignedIn])
  );

  const currency = profile?.currency ?? '₹';
  const formatAmount = useCallback(
    (value: number) => formatCurrency(Math.round(value), currency),
    [currency]
  );

  const now = useMemo(() => new Date(), []);
  const data = useMemo(() => computeSpending(transactions, profile, now), [transactions, profile, now]);

  return { loading, isSignedIn, profile, transactions, currency, formatAmount, data, now };
}

export default useSpendingData;
