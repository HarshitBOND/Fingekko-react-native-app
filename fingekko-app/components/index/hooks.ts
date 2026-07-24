import type { Transaction } from '@/constants/types';
import type { HomeResponse, TransactionsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { summarizeByPayCycle } from '@/utils/pay-cycle';
import { useAuth } from '@clerk/clerk-expo';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppEvent } from '@/hooks/use-app-event';
import { emitAppEvent } from '@/lib/appEvents';
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

  // Live updates: a transaction or income change anywhere in the app refreshes
  // Home immediately, even while it's the screen in front.
  useAppEvent('transaction:changed', () => {
    loadRealData();
  });
  useAppEvent('profile:changed', () => {
    loadRealData();
  });

  const profile = homeData?.user ?? null;

  const spending = useMemo(
    () => summarizeByPayCycle(transactions, profile, now),
    [profile, transactions, now],
  );

  // We have no bank connection — the user has to tell us their income (and
  // when they get paid) before "remaining balance" means anything real.
  // Either they told us their salary, or they've logged real income this cycle —
  // both give "remaining balance" something true to stand on.
  const hasIncomeSetup = (profile?.monthlyIncome ?? 0) > 0 || spending.incomeThisMonth > 0;
  // Essentials onboarding (item 10): once income is set up we ask the user for
  // their recurring bills. `essentialsOnboarded` flips true when they finish the
  // form (even with zero bills), so we only prompt them once.
  const essentialsOnboarded = profile?.essentialsOnboarded ?? false;
  const needsEssentialsSetup = hasIncomeSetup && !essentialsOnboarded;
  // The most urgent unpaid bill (item 11) — surfaced by the server on /home.
  const nextEssential = profile?.nextEssential ?? null;
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
      // Insights and anything else reading the budget re-reads straight away.
      emitAppEvent('profile:changed');
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

  // Bill-due nudge (item 11): only when the user has finished essentials setup,
  // a bill is still unpaid this month, and there's actually enough left to cover
  // it — we never nag someone who can't afford it right now.
  const showBillDueAlert =
    !!nextEssential && !needsEssentialsSetup && balanceAmount >= nextEssential.amount;

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
    baseIncome: spending.baseIncome,
    incomeThisMonth: spending.incomeThisMonth,
    cashInHand: spending.cashInHand,
    monthlyEssentials: spending.monthlyEssentials,
    unpaidEssentials: spending.unpaidEssentials,
    remainingAfterEssentials: spending.remainingAfterEssentials,
    essentialsOnboarded,
    needsEssentialsSetup,
    nextEssential,
    showBillDueAlert,
    savingIncome,
    saveIncomeSetup,
    refresh: loadRealData,
  };
};
