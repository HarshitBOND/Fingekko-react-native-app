import type { Transaction } from '@/constants/types';
import { MONTH_NAMES, WEEK_DAY_LABELS } from './constants';
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

  return {
    dayStreak: Math.max(1, 12 - Math.min(4, Math.floor(params.expensesThisMonth / 4000))),
    totalXp: params.demoProfileXp + Math.round(params.expensesThisMonth / 10),
    questsDone: Math.min(9, Math.max(1, categoryCount)),
    questsTarget: 9,
    betterThanYesterday: Math.max(0, Math.min(99, 55 + Math.round((params.expensesLastMonth - params.expensesThisMonth) / 400))),
  };
};

export const getCompletedDaysForMonth = (
  transactions: Transaction[],
  month: number,
  year: number,
  useDummyData: boolean,
) => {
  if (!useDummyData) return [13, 14, 15, 16, 17, 18];

  const days = new Set<number>();
  transactions.forEach((item) => {
    const date = new Date(item.date);
    if (date.getFullYear() === year && date.getMonth() === month) {
      days.add(date.getDate());
    }
  });
  return Array.from(days).sort((a, b) => a - b);
};

export const getWeekChecked = (transactions: Transaction[], now: Date, useDummyData: boolean) => {
  if (!useDummyData) return [true, true, true, true, true, false, false];

  return WEEK_DAY_LABELS.map((_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - 6 + index);
    return transactions.some((item) => new Date(item.date).toDateString() === date.toDateString());
  });
};