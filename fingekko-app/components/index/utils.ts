import type { Transaction } from '@/constants/types';
import { MONTH_NAMES } from './constants';
import type { HomeStats } from './types';

export const formatDateLabel = (date: Date) =>
  date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

export const getFirstName = (fullName?: string | null) => fullName?.split(' ')[0] ?? 'Arjun';

export const getMonthLabel = (month: number, year: number) => `${MONTH_NAMES[month]} ${year}`;

export const buildDemoStats = (params: {
  useDummyData: boolean;
  activeTransactions: Transaction[];
  demoProfileXp: number;
  expensesThisMonth: number;
  expensesLastMonth: number;
}): HomeStats | null => {
  if (!params.useDummyData) return null;

  const categoryCount = new Set(params.activeTransactions.map((item) => item.category)).size;

  const dayStreak = Math.max(1, 12 - Math.min(4, Math.floor(params.expensesThisMonth / 4000)));

  return {
    dayStreak,
    bestStreak: dayStreak,
    totalXp: params.demoProfileXp + Math.round(params.expensesThisMonth / 10),
    questsDone: Math.min(9, Math.max(1, categoryCount)),
    questsTarget: 9,
    betterThanYesterday: Math.max(0, Math.min(99, 55 + Math.round((params.expensesLastMonth - params.expensesThisMonth) / 400))),
  };
};