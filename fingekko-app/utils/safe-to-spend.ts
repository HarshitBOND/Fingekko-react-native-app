import { Goal, Transaction } from '../constants/types';
import type { ApiUser } from '../types';
import { summarizeByPayCycle } from './pay-cycle';

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
  /** Unpaid recurring bills reserved out of the safe-to-spend figure (AUDIT item 10). */
  unpaidEssentials: number;
};

type CalculationInput = {
  profile: ApiUser | null;
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

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / MS_IN_DAY);
}

/** Local YYYY-MM-DD — matches how transaction dates are stored (not UTC). */
function localIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Safe-to-spend now derives its cycle, balance and essentials figures from the
 * shared `summarizeByPayCycle` (AUDIT item 19) — the same source of truth Home
 * and Goals use. It no longer runs its own income-anchored cycle, so all three
 * screens agree on the pay cycle, the remaining balance, and the reservation of
 * *unpaid* essentials. On top of that shared base it layers the daily allowance,
 * the 10% buffer, and the per-day goal reserve, which are specific to this screen.
 */
export function calculateSafeToSpend({
  profile,
  transactions,
  goals,
  today = new Date(),
}: CalculationInput): SafeSpendResult {
  const summary = summarizeByPayCycle(transactions, profile, today);

  // Income this cycle = salary set up + income logged this cycle (Home's figure),
  // not the old "logged income OR salary" pick that could disagree with Home.
  const cycleIncome = summary.monthlyBudget;
  const cycleExpenses = summary.expensesThisMonth;
  const unpaidEssentials = summary.unpaidEssentials;
  // Free cash for the rest of the cycle with unpaid bills already reserved —
  // identical to what Home shows once essentials are taken out.
  const currentBalance = summary.remainingAfterEssentials;
  // The pay cycle can be on its last day (0 left); never divide by zero.
  const daysLeft = Math.max(1, summary.daysLeftInMonth);

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

  const buffer = Math.max(0, cycleIncome * 0.1);
  // No floor at 0 here: flooring hides overspend and would disagree with the Home
  // card (pay-cycle.ts), which lets the balance go negative. When the cycle is
  // over budget these go negative and the debt shows consistently on both screens.
  // The Safe-to-Spend hero still displays ≥0 via the screen's `minZero` formatting,
  // but the underlying figure stays honest.
  const baseDailyAllowance = (currentBalance - buffer) / daysLeft;
  const dailyBudget = baseDailyAllowance - goalDailyReserve;

  const todayString = localIso(today);
  const spentToday = transactions
    .filter((transaction) => transaction.type === 'expense' && transaction.date?.slice(0, 10) === todayString)
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const safeToSpend = dailyBudget - spentToday;
  // Once there's no allowance left (or the cycle is in debt) today's spend has
  // fully consumed it — read as 100% used rather than a nonsensical ratio.
  const progress = dailyBudget > 0 ? spentToday / dailyBudget : 1;

  return {
    safeToSpend,
    dailyBudget,
    progress,
    daysLeft,
    cycleIncome,
    cycleExpenses,
    savings: currentBalance,
    balance: currentBalance,
    goalDailyReserve,
    buffer,
    unpaidEssentials,
  };
}
