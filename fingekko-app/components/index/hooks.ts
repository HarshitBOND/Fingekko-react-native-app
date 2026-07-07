import type { Transaction } from '@/constants/types';
import type { HomeResponse, TransactionsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { summarizeByPayCycle } from '@/utils/pay-cycle';
import { useAuth } from '@clerk/clerk-expo';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Theme } from './constants';
import type { ProgressItem } from './types';
import { formatDateLabel, getFirstName } from './utils';

export const useHomeScreen = () => {
  const now = useMemo(() => new Date(), []);
  const { getToken, isSignedIn } = useAuth();
  const [homeData, setHomeData] = useState<HomeResponse | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const loadRealData = async () => {
    if (!isSignedIn) {
      setHomeData(null);
      setTransactions([]);
      setInitialLoading(false);
      return;
    }

    try {
      const token = await getTokenRef.current();
      if (!token) return;

      const [homeResponse, transactionsResponse] = await Promise.all([
        apiRequest<HomeResponse>('/api/home', {}, token),
        apiRequest<TransactionsResponse>('/api/transactions', {}, token),
      ]);

      setHomeData(homeResponse);
      setTransactions(transactionsResponse?.transactions ?? []);
    } catch (error) {
      console.warn('Failed to load home data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  // Refetch every time the Home tab regains focus — tab screens stay mounted,
  // so a one-shot useEffect would never pick up expenses added on other screens.
  useFocusEffect(
    useCallback(() => {
      loadRealData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSignedIn])
  );

  const profile = homeData?.user ?? null;

  const spending = useMemo(
    () => summarizeByPayCycle(transactions, profile, now),
    [profile, transactions, now],
  );

  // We have no bank connection — the user has to tell us their income (and
  // when they get paid) before "remaining balance" means anything real.
  const hasIncomeSetup = (profile?.monthlyIncome ?? 0) > 0;
  const payday = profile?.payday ?? null;
  const [savingIncome, setSavingIncome] = useState(false);

  const saveIncomeSetup = async (monthlyIncome: number, nextPayday: number) => {
    setSavingIncome(true);
    try {
      const token = await getTokenRef.current();
      if (!token) return false;
      await apiRequest({
        method: 'put',
        url: '/api/profile',
        token,
        data: { monthlyIncome, payday: nextPayday },
      });
      await loadRealData();
      return true;
    } catch (error) {
      console.warn('Failed to save income setup:', error);
      return false;
    } finally {
      setSavingIncome(false);
    }
  };

  const spendProgress = spending.spendProgress;
  const remainingProgress = spending.remainingProgress;
  const balanceAmount = spending.remainingBalance;
  const monthlySpend = spending.expensesThisMonth;
  const monthlyBudget = spending.monthlyBudget;
  const daysLeftInMonth = spending.daysLeftInMonth;
  const avgDailySpend = spending.avgDailySpend;
  const currentDateLabel = formatDateLabel(now);
  const visibleStats = homeData?.stats ?? null;

  const progressItems: ProgressItem[] | undefined = useMemo(() => {
    if (!visibleStats) return undefined;

    return [
      { icon: 'Flame', value: String(visibleStats.dayStreak), label: 'Day Streak', color: Theme.primaryDark },
      { icon: 'Zap', value: String(visibleStats.totalXp), label: 'Total XP', color: Theme.mountainTeal },
      { icon: 'Target', value: `${visibleStats.questsDone} / ${visibleStats.questsTarget}`, label: 'Quests Done', color: Theme.primary },
      { icon: 'BarChart3', value: `${visibleStats.betterThanYesterday}%`, label: 'Better than\nyesterday', color: Theme.forestSoft },
    ];
  }, [visibleStats]);

  const activeProfileName = getFirstName(profile?.name ?? null);

  return {
    now,
    initialLoading,
    activeProfileName,
    currentDateLabel,
    balanceAmount,
    monthlySpend,
    monthlyBudget,
    daysLeftInMonth,
    avgDailySpend,
    spendProgress,
    remainingProgress,
    visibleStats,
    activeTransactions: transactions,
    progressItems,
    hasIncomeSetup,
    payday,
    monthlyIncome: monthlyBudget,
    savingIncome,
    saveIncomeSetup,
    refresh: loadRealData,
  };
};
