import type { Transaction } from '@/constants/types';
import type { HomeResponse, TransactionsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { appendDummyExpense, createDummyProfile, createDummyTransactions, summarizeExpenses } from '@/utils/demo-finance';
import { useAuth } from '@clerk/clerk-expo';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Theme } from './constants';
import type { ProgressItem } from './types';
import { buildDemoStats, formatDateLabel, getFirstName } from './utils';

export const useHomeScreen = () => {
  const now = useMemo(() => new Date(), []);
  const { getToken, isSignedIn } = useAuth();
  const [homeData, setHomeData] = useState<HomeResponse | null>(null);
  const [realTransactions, setRealTransactions] = useState<Transaction[]>([]);
  const getTokenRef = useRef(getToken);
  // Demo mode defaults off — real signed-in users should see their own data.
  const [useDummyData, setUseDummyData] = useState(false);
  const [demoTransactions, setDemoTransactions] = useState<Transaction[]>(() => createDummyTransactions(now));
  const [dummyAmount, setDummyAmount] = useState('');
  const [dummyCategory, setDummyCategory] = useState('Shopping');
  const demoProfile = useMemo(() => createDummyProfile(), []);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const loadRealData = async () => {
    if (!isSignedIn) {
      setHomeData(null);
      setRealTransactions([]);
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
      setRealTransactions(transactionsResponse?.transactions ?? []);
    } catch (error) {
      console.warn('Failed to load home data:', error);
    }
  };

  useEffect(() => {
    let isActive = true;
    (async () => {
      if (isActive) await loadRealData();
    })();
    return () => {
      isActive = false;
    };
  }, [isSignedIn]);

  const activeProfile = useMemo(
    () => (useDummyData ? demoProfile : homeData?.user ?? null),
    [useDummyData, demoProfile, homeData?.user],
  );

  const activeTransactions = useMemo(
    () => (useDummyData ? demoTransactions : realTransactions),
    [useDummyData, demoTransactions, realTransactions],
  );

  const spending = useMemo(
    () => summarizeExpenses(activeTransactions, activeProfile ?? demoProfile, now),
    [activeProfile, activeTransactions, demoProfile, now],
  );

  const spendProgress = spending.spendProgress;
  const remainingProgress = spending.remainingProgress;
  const balanceAmount = spending.remainingBalance;
  const monthlySpend = spending.expensesThisMonth;
  const monthlyBudget = spending.monthlyBudget;
  const daysLeftInMonth = spending.daysLeftInMonth;
  const avgDailySpend = spending.avgDailySpend;
  const currentDateLabel = formatDateLabel(now);
  const visibleStats = useDummyData
    ? buildDemoStats({
        useDummyData,
        activeTransactions,
        demoProfileXp: demoProfile.xp,
        expensesThisMonth: spending.expensesThisMonth,
        expensesLastMonth: spending.expensesLastMonth,
      })
    : homeData?.stats ?? null;

  const progressItems: ProgressItem[] | undefined = useMemo(() => {
    if (!visibleStats) return undefined;

    return [
      { icon: 'Flame', value: String(visibleStats.dayStreak), label: 'Day Streak', color: Theme.primaryDark },
      { icon: 'Zap', value: String(visibleStats.totalXp), label: 'Total XP', color: Theme.mountainTeal },
      { icon: 'Target', value: `${visibleStats.questsDone} / ${visibleStats.questsTarget}`, label: 'Quests Done', color: Theme.primary },
      { icon: 'BarChart3', value: `${visibleStats.betterThanYesterday}%`, label: 'Better than\nyesterday', color: Theme.forestSoft },
    ];
  }, [visibleStats]);

  const activeProfileName = getFirstName(activeProfile?.name ?? null);

  const handleToggleDemo = () => {
    if (useDummyData) {
      setUseDummyData(false);
      return;
    }

    setDemoTransactions(createDummyTransactions(now));
    setUseDummyData(true);
  };

  const handleAddExpense = () => {
    const amount = Number(dummyAmount);
    if (!amount || Number.isNaN(amount)) return false;

    if (useDummyData) {
      setDemoTransactions((current) => appendDummyExpense(current, amount, dummyCategory || 'Misc', new Date()));
      setDummyAmount('');
      return true;
    }

    // Real mode: persist to the backend, then refresh from it.
    void (async () => {
      try {
        const token = await getTokenRef.current();
        if (!token) return;
        await apiRequest({
          method: 'post',
          url: '/api/transactions',
          token,
          data: {
            type: 'expense',
            amount: Math.round(amount),
            category: dummyCategory || 'Misc',
            date: new Date().toISOString(),
          },
        });
        await loadRealData();
      } catch (error) {
        console.warn('Failed to add expense:', error);
      }
    })();
    setDummyAmount('');
    return true;
  };

  const resetDemoTransactions = () => {
    setDemoTransactions(createDummyTransactions(now));
  };

  return {
    now,
    useDummyData,
    demoTransactions,
    dummyAmount,
    dummyCategory,
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
    activeTransactions,
    progressItems,
    setDummyAmount,
    setDummyCategory,
    handleToggleDemo,
    handleAddExpense,
    resetDemoTransactions,
  };
};