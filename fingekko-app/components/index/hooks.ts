import type { Transaction } from '@/constants/types';
import type { HomeResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { appendDummyExpense, createDummyProfile, createDummyTransactions, summarizeExpenses } from '@/utils/demo-finance';
import { useAuth } from '@clerk/clerk-expo';
import { BarChart3, Flame, Target, Zap } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Theme } from './constants';
import type { ProgressItem } from './types';
import { buildDemoStats, formatDateLabel, getFirstName } from './utils';

export const useHomeScreen = () => {
  const now = useMemo(() => new Date(), []);
  const { getToken, isSignedIn } = useAuth();
  const [homeData, setHomeData] = useState<HomeResponse | null>(null);
  const getTokenRef = useRef(getToken);
  const [useDummyData, setUseDummyData] = useState(true);
  const [demoTransactions, setDemoTransactions] = useState<Transaction[]>(() => createDummyTransactions(now));
  const [dummyAmount, setDummyAmount] = useState('');
  const [dummyCategory, setDummyCategory] = useState('Shopping');
  const demoProfile = useMemo(() => createDummyProfile(), []);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    let isActive = true;

    const loadHome = async () => {
      if (!isSignedIn) {
        setHomeData(null);
        return;
      }

      try {
        const token = await getTokenRef.current();
        if (!token) return;

        const response = await apiRequest<HomeResponse>('/api/home', {}, token);
        if (isActive) setHomeData(response);
      } catch (error) {
        console.warn('Failed to load home data:', error);
      }
    };

    loadHome();
    return () => {
      isActive = false;
    };
  }, [isSignedIn]);

  const activeProfile = useMemo(
    () => (useDummyData ? demoProfile : homeData?.user ?? null),
    [useDummyData, demoProfile, homeData?.user],
  );

  const activeTransactions = useMemo(
    () => (useDummyData ? demoTransactions : []),
    [useDummyData, demoTransactions],
  );

  const spending = useMemo(
    () => summarizeExpenses(activeTransactions, activeProfile ?? demoProfile, now),
    [activeProfile, activeTransactions, demoProfile, now],
  );

  const spendProgress = useDummyData ? spending.spendProgress : 0.43;
  const remainingProgress = useDummyData ? spending.remainingProgress : 1 - spendProgress;
  const balanceAmount = useDummyData ? spending.remainingBalance : 12450;
  const monthlySpend = useDummyData ? spending.expensesThisMonth : 8560;
  const monthlyBudget = useDummyData ? spending.monthlyBudget : 20000;
  const daysLeftInMonth = useDummyData ? spending.daysLeftInMonth : 11;
  const avgDailySpend = useDummyData ? spending.avgDailySpend : 1120;
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
      { icon: Flame, value: String(visibleStats.dayStreak), label: 'Day Streak', color: Theme.primaryDark },
      { icon: Zap, value: String(visibleStats.totalXp), label: 'Total XP', color: Theme.mountainTeal },
      { icon: Target, value: `${visibleStats.questsDone} / ${visibleStats.questsTarget}`, label: 'Quests Done', color: Theme.primary },
      { icon: BarChart3, value: `${visibleStats.betterThanYesterday}%`, label: 'Better than\nyesterday', color: Theme.forestSoft },
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

    setDemoTransactions((current) => appendDummyExpense(current, amount, dummyCategory || 'Misc', new Date()));
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