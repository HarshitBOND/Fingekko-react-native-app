/**
 * Insights data layer — one source of truth for every spending number the
 * Insights screen, the Spend Impact detail, and the Spending Breakdown detail
 * render, so the same week / month always reads the same everywhere.
 *
 * Pure functions only (no React) — the `useSpendingData` hook wraps these with
 * fetching. Category colours come from a validated categorical palette (checked
 * with the dataviz validator: all pass on a light surface, CVD-separated).
 */
import type { Transaction } from '@/constants/types';
import type { ApiUser } from '@/types';

/* ── Categorical palette ────────────────────────────────────────────────────
 * Fixed hue order, assigned by category *identity* (never by rank), so a given
 * category keeps its colour however it ranks against the user's other spending. */
export const CATEGORY_PALETTE = [
  '#43A047', // green
  '#3B82C4', // blue
  '#D9811E', // amber
  '#8B5CF6', // violet
  '#159E8C', // teal
  '#E05561', // rose
] as const;

export const CATEGORY_OTHER_COLOR = '#8A94A6'; // reserved neutral for "Other"/unknown-by-name

const KNOWN_CATEGORY_COLORS: Record<string, string> = {
  food: '#D9811E',
  dining: '#D9811E',
  groceries: '#D9811E',
  restaurant: '#D9811E',
  shopping: '#3B82C4',
  transport: '#159E8C',
  transportation: '#159E8C',
  travel: '#159E8C',
  fuel: '#159E8C',
  bills: '#8B5CF6',
  utilities: '#8B5CF6',
  rent: '#8B5CF6',
  home: '#8B5CF6',
  entertainment: '#E05561',
  fun: '#E05561',
  subscriptions: '#E05561',
  health: '#43A047',
  fitness: '#43A047',
  other: CATEGORY_OTHER_COLOR,
  misc: CATEGORY_OTHER_COLOR,
  uncategorized: CATEGORY_OTHER_COLOR,
};

export function categoryColorFor(label: string): string {
  const key = (label ?? '').toLowerCase().trim();
  if (KNOWN_CATEGORY_COLORS[key]) return KNOWN_CATEGORY_COLORS[key];
  if (!key || key === 'other') return CATEGORY_OTHER_COLOR;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length];
}

export type CategorySlice = {
  label: string;
  amount: number;
  /** whole-number percent share of the range total */
  share: number;
  color: string;
};

/* ── Helpers ────────────────────────────────────────────────────────────── */
const parseDate = (value: string): Date | null => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const inRange = (date: Date | null, start: Date, end: Date) =>
  date ? date >= start && date <= end : false;

/** Sum expenses within [start, end] grouped by category, sorted high → low. */
export function computeCategoryBreakdown(
  expenses: Transaction[],
  start: Date,
  end: Date
): CategorySlice[] {
  const scoped = expenses.filter((item) => inRange(parseDate(item.date), start, end));
  const total = scoped.reduce((sum, item) => sum + item.amount, 0);
  const totals = scoped.reduce<Record<string, number>>((acc, item) => {
    const label = item.category || 'Other';
    acc[label] = (acc[label] ?? 0) + item.amount;
    return acc;
  }, {});
  return Object.entries(totals)
    .map(([label, amount]) => ({
      label,
      amount,
      share: total > 0 ? Math.round((amount / total) * 100) : 0,
      color: categoryColorFor(label),
    }))
    .sort((a, b) => b.amount - a.amount);
}

export type DayPoint = { value: number };

/** Cumulative daily spend across [start, end] inclusive — one running-total point per day. */
export function buildCumulativeForRange(expenses: Transaction[], start: Date, end: Date): DayPoint[] {
  const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const result: DayPoint[] = [];
  let running = 0;
  for (let d = 0; d < totalDays; d++) {
    const dayStart = new Date(start);
    dayStart.setDate(start.getDate() + d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    for (const item of expenses) {
      const date = parseDate(item.date);
      if (date && date >= dayStart && date <= dayEnd) running += item.amount;
    }
    result.push({ value: running });
  }
  return result;
}

export type MonthlyComparison = {
  /** Day-of-month labels, "1".."31". */
  labels: string[];
  /** This period's cumulative spend. For the current month it stops at today. */
  current: DayPoint[];
  /** Last month's cumulative spend (current month only, else null). */
  previous: DayPoint[] | null;
  /** Forecast: follows actual up to today, then projects to month end (current month only). */
  expected: DayPoint[] | null;
  isCurrentMonth: boolean;
  daysInMonth: number;
  /** 0-based index of "today" within the month, or -1 when not the current month. */
  todayIndex: number;
};

/**
 * Cumulative spend for one month, plus the last-month comparison and a simple
 * forward projection. Shared by the Insights trend chart and the full-screen
 * trend report so both always tell the same story for a given month.
 */
export function buildMonthlyComparison(
  transactions: Transaction[],
  selectedYear: number,
  selectedMonth: number,
  now: Date,
  avgThisMonth: number
): MonthlyComparison {
  const expenses = transactions.filter((item) => item.type === 'expense');
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();

  if (!isCurrentMonth) {
    const start = new Date(selectedYear, selectedMonth, 1);
    const end = new Date(selectedYear, selectedMonth + 1, 0);
    return {
      labels,
      current: buildCumulativeForRange(expenses, start, end),
      previous: null,
      expected: null,
      isCurrentMonth: false,
      daysInMonth,
      todayIndex: -1,
    };
  }

  const thisStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const current = buildCumulativeForRange(expenses, thisStart, now); // ends at today
  const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const previous = buildCumulativeForRange(expenses, lastStart, lastEnd);

  const todayIndex = current.length - 1;
  const spentSoFar = current[todayIndex]?.value ?? 0;
  // Forecast overlaps the actual line up to today, then extends at this month's daily pace.
  const expected = Array.from({ length: daysInMonth }, (_, i) =>
    i <= todayIndex
      ? { value: current[i]?.value ?? spentSoFar }
      : { value: Math.round(spentSoFar + avgThisMonth * (i - todayIndex)) }
  );

  return { labels, current, previous, expected, isCurrentMonth: true, daysInMonth, todayIndex };
}

export type SpendingData = ReturnType<typeof computeSpending>;

export function computeSpending(transactions: Transaction[], profile: ApiUser | null, now: Date) {
  const expenses = transactions.filter((item) => item.type === 'expense');

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const expensesThisMonth = expenses.reduce((sum, item) => {
    const date = parseDate(item.date);
    return inRange(date, startOfMonth, now) ? sum + item.amount : sum;
  }, 0);

  const expensesLastMonth = expenses.reduce((sum, item) => {
    const date = parseDate(item.date);
    return inRange(date, startOfLastMonth, endOfLastMonth) ? sum + item.amount : sum;
  }, 0);

  const daysInLastMonth = endOfLastMonth.getDate() || 1;
  const daysInThisMonth = Math.max(1, now.getDate());
  const avgLastMonth = expensesLastMonth / daysInLastMonth;
  const avgThisMonth = expensesThisMonth / daysInThisMonth;

  // Rolling 7-day window (today and the previous 6 days).
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const weekExpenses = expenses.filter((item) => {
    const date = parseDate(item.date);
    return date ? date >= weekStart && date <= now : false;
  });
  const weeklySpend = weekExpenses.reduce((sum, item) => sum + item.amount, 0);

  const monthlyIncome = profile?.monthlyIncome ?? 0;
  // Without a set income, base the weekly budget on last month's real spend
  // instead of inflating this week's own number.
  const weeklyBudget =
    monthlyIncome > 0
      ? monthlyIncome / 4
      : expensesLastMonth > 0
        ? expensesLastMonth / 4
        : Math.max(weeklySpend, 1);
  const weeklyLeft = Math.max(0, weeklyBudget - weeklySpend);
  const weeklyProgress = weeklyBudget > 0 ? Math.min(1, weeklySpend / weeklyBudget) : 0;

  const monthlyDelta = expensesLastMonth - expensesThisMonth;
  const monthlyDeltaAbs = Math.abs(monthlyDelta);
  const monthlyDeltaPercent =
    expensesLastMonth > 0 ? Math.round((monthlyDeltaAbs / expensesLastMonth) * 100) : 0;
  const isSaving = monthlyDelta >= 0;

  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);

  // Category breakdowns (all categories, high → low) for month and week.
  const monthCategories = computeCategoryBreakdown(expenses, startOfMonth, now);
  const weekCategories = computeCategoryBreakdown(expenses, weekStart, now);

  const totalExpensesThisMonth = monthCategories.reduce((sum, c) => sum + c.amount, 0);

  // Top 3 month categories, with a bar-percent for the compact list on Insights.
  const categoryRows = monthCategories.slice(0, 3).map((row) => ({
    label: row.label,
    amount: row.amount,
    share: row.share,
    barPercent: row.share,
    color: row.color,
  }));

  // Month "big" spends = expenses notably above this month's own average.
  const monthExpenses = expenses.filter((item) => inRange(parseDate(item.date), startOfMonth, now));
  const avgExpenseThisMonth = monthExpenses.length > 0 ? totalExpensesThisMonth / monthExpenses.length : 0;
  const biggestSpendsCount =
    avgExpenseThisMonth > 0
      ? monthExpenses.filter((item) => item.amount > avgExpenseThisMonth * 1.5).length
      : 0;

  // Weekly stats for the snapshot tiles.
  const weekTransactionCount = weekExpenses.length;
  const weekBiggestSpend = weekExpenses.reduce((max, item) => Math.max(max, item.amount), 0);

  // Day-by-day series across the rolling week, for the bar chart.
  const weekDaily = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    const amount = weekExpenses.reduce((sum, item) => {
      const d = parseDate(item.date);
      return d && d >= dayStart && d <= dayEnd ? sum + item.amount : sum;
    }, 0);
    return {
      label: day.toLocaleDateString('en-US', { weekday: 'short' }),
      amount,
      isToday: i === 6,
    };
  });
  const weekDailyMax = weekDaily.reduce((max, d) => Math.max(max, d.amount), 0);
  const weekDailyAvg = weeklySpend / 7;
  const weekBusiestDay = weekDaily.reduce(
    (busiest, d) => (d.amount > busiest.amount ? d : busiest),
    { label: '', amount: 0, isToday: false }
  );
  const weekActiveDays = weekDaily.filter((d) => d.amount > 0).length;

  // Weekend estimate (last 4 weeks) for the guidance copy.
  const weekendWindowStart = new Date(now);
  weekendWindowStart.setDate(now.getDate() - 27);
  weekendWindowStart.setHours(0, 0, 0, 0);
  const weekendDayKeys = new Set<string>();
  const weekendSpend = expenses.reduce((sum, item) => {
    const date = parseDate(item.date);
    if (!date || date < weekendWindowStart) return sum;
    const day = date.getDay();
    if (day === 0 || day === 6) {
      weekendDayKeys.add(date.toDateString());
      return sum + item.amount;
    }
    return sum;
  }, 0);
  const weekendAvgPerDay = weekendDayKeys.size > 0 ? weekendSpend / weekendDayKeys.size : 0;
  const weekendEstimate = weekendAvgPerDay * 2;

  return {
    // month
    expensesThisMonth,
    expensesLastMonth,
    avgLastMonth,
    avgThisMonth,
    monthlyDelta,
    monthlyDeltaAbs,
    monthlyDeltaPercent,
    isSaving,
    savedAmount: isSaving ? monthlyDeltaAbs : 0,
    savedPercent: isSaving ? monthlyDeltaPercent : 0,
    totalExpenses,
    // week
    weekStart,
    weeklySpend,
    weeklyBudget,
    weeklyLeft,
    weeklyProgress,
    weekTransactionCount,
    weekBiggestSpend,
    weekDaily,
    weekDailyMax,
    weekDailyAvg,
    weekBusiestDay,
    weekActiveDays,
    // breakdowns
    monthCategories,
    weekCategories,
    categoryRows,
    biggestSpendsCount,
    transactionCount: expenses.length,
    weekendEstimate,
  };
}
