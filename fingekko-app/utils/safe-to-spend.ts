import { Goal, Transaction, UserProfile } from '../constants/types';

const MS_IN_DAY = 24 * 60 * 60 * 1000;

export type SafeSpendResult = {
  safeToSpend: number;
  dailyBudget: number;
  progress: number;
  daysLeft: number;
  cycleIncome: number;
  cycleExpenses: number;
  savings: number;
  balance: number;
  goalDailyReserve: number;
  buffer: number;
};

type CalculationInput = {
  profile: UserProfile | null;
  transactions: Transaction[];
  goals: Goal[];
  today?: Date;
};

function parseDate(value?: string): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getTime());
  const day = next.getDate();
  next.setMonth(next.getMonth() + months);
  if (next.getDate() < day) {
    next.setDate(0);
  }
  return next;
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / MS_IN_DAY);
}

export function calculateSafeToSpend({
  profile,
  transactions,
  goals,
  today = new Date(),
}: CalculationInput): SafeSpendResult {
  const todayString = today.toISOString().split('T')[0];
  const parsedTransactions = transactions
    .map(transaction => ({
      ...transaction,
      parsedDate: parseDate(transaction.date),
    }))
    .filter(transaction => transaction.parsedDate);

  const incomeTransactions = parsedTransactions
    .filter(transaction => transaction.type === 'income')
    .sort((a, b) => b.parsedDate!.getTime() - a.parsedDate!.getTime());

  const lastIncomeDate = incomeTransactions[0]?.parsedDate ?? null;
  const cycleStart = lastIncomeDate ?? new Date(today.getFullYear(), today.getMonth(), 1);
  const cycleTransactions = parsedTransactions.filter(
    transaction => transaction.parsedDate! >= cycleStart
  );

  const cycleIncome = cycleTransactions
    .filter(transaction => transaction.type === 'income')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const cycleExpenses = cycleTransactions
    .filter(transaction => transaction.type === 'expense')
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const fallbackMonthlyIncome = profile?.monthlyIncome ?? 0;
  const effectiveIncome = cycleIncome > 0 ? cycleIncome : fallbackMonthlyIncome;
  const currentBalance = effectiveIncome - cycleExpenses;

  const nextIncomeDate = (() => {
    if (lastIncomeDate) {
      const next = addMonths(lastIncomeDate, 1);
      return next <= today ? addMonths(next, 1) : next;
    }

    if (fallbackMonthlyIncome > 0) {
      return new Date(today.getFullYear(), today.getMonth() + 1, 1);
    }

    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
  })();

  const daysLeft = Math.max(1, daysBetween(today, nextIncomeDate));

  const goalDailyReserve = goals.reduce((sum, goal) => {
    const deadline = parseDate(goal.deadline);
    if (!deadline || deadline <= today) {
      return sum;
    }

    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
    if (remaining <= 0) {
      return sum;
    }

    const daysToDeadline = Math.max(1, daysBetween(today, deadline));
    return sum + remaining / daysToDeadline;
  }, 0);

  const buffer = Math.max(0, effectiveIncome * 0.1);
  const baseDailyAllowance = Math.max(0, (currentBalance - buffer) / daysLeft);
  const dailyBudget = Math.max(0, baseDailyAllowance - goalDailyReserve);

  const spentToday = parsedTransactions
    .filter(transaction => transaction.type === 'expense' && transaction.date === todayString)
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const safeToSpend = Math.max(0, dailyBudget - spentToday);
  const progress = dailyBudget > 0 ? Math.min(1, spentToday / dailyBudget) : 0;

  return {
    safeToSpend,
    dailyBudget,
    progress,
    daysLeft,
    cycleIncome: effectiveIncome,
    cycleExpenses,
    savings: currentBalance,
    balance: currentBalance,
    goalDailyReserve,
    buffer,
  };
}
