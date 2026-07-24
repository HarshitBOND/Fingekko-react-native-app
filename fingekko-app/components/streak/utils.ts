import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/constants/categories';
import { palette } from '@/constants/design';
import type { Transaction } from '@/constants/types';
import type { ApiTransaction } from '@/types';
import { formatMoney } from '@/utils/currency';

/** A transaction from either the API shape or the local shape — both share these fields. */
export type StreakTransaction = Transaction | ApiTransaction;

export const pad = (n: number) => String(n).padStart(2, '0');

/** Local-time ISO (YYYY-MM-DD). Avoids the UTC shift of Date.toISOString(). */
export const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromIso = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (d: Date, n: number) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
};

export const isSameDay = (a: Date, b: Date) => toIso(a) === toIso(b);

/** Normalise a transaction's `date` (which may carry a time component) to YYYY-MM-DD. */
export const normalizeDate = (raw: string): string => {
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : toIso(parsed);
};

/** Set of every calendar day (YYYY-MM-DD) that has at least one transaction. */
export const trackedDaySet = (transactions: StreakTransaction[]): Set<string> => {
  const set = new Set<string>();
  transactions.forEach((t) => set.add(normalizeDate(t.date)));
  return set;
};

/**
 * How a tracked day was earned.
 *
 * `full`    — logged on the day itself: the habit actually happened.
 * `partial` — the day has entries, but every one of them was back-filled later.
 *             It still counts for the streak, but it wasn't a day you showed up.
 */
export type DayQuality = 'full' | 'partial';

/**
 * Split tracked days by whether they were logged live or back-filled.
 *
 * `createdAt` is when the entry was written; `date` is the day it belongs to.
 * When every entry for a day was written on a *later* day, the day is partial.
 * Entries with no `createdAt` (older rows) are treated as logged on the day, so
 * existing history never retroactively turns yellow.
 */
export const dayQualityMap = (transactions: StreakTransaction[]): Map<string, DayQuality> => {
  const map = new Map<string, DayQuality>();
  transactions.forEach((t) => {
    const day = normalizeDate(t.date);
    const createdAt = (t as { createdAt?: number }).createdAt;
    const loggedLive = !createdAt || toIso(new Date(createdAt)) <= day;
    // One live entry is enough to make the whole day count as full.
    if (loggedLive) map.set(day, 'full');
    else if (!map.has(day)) map.set(day, 'partial');
  });
  return map;
};

/**
 * Consecutive days with a logged transaction, ending today (or yesterday, so a
 * streak stays "alive" until the day is actually missed).
 */
export const currentStreak = (tracked: Set<string>, today = new Date()): number => {
  let cursor = new Date(today);
  if (!tracked.has(toIso(cursor))) cursor = addDays(cursor, -1);
  let streak = 0;
  while (tracked.has(toIso(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
};

/** Longest run of consecutive tracked days across all of history. */
export const bestStreak = (tracked: Set<string>): number => {
  const days = Array.from(tracked).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const iso of days) {
    if (prev && toIso(addDays(fromIso(prev), 1)) === iso) run += 1;
    else run = 1;
    best = Math.max(best, run);
    prev = iso;
  }
  return best;
};

export type WeekDot = { label: string; iso: string; checked: boolean; isToday: boolean };

/** Sunday→Saturday of the week containing `today`, each flagged if it was tracked. */
export const currentWeekDots = (tracked: Set<string>, today = new Date()): WeekDot[] => {
  const sunday = addDays(today, -today.getDay());
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return labels.map((label, i) => {
    const d = addDays(sunday, i);
    const iso = toIso(d);
    return { label, iso, checked: tracked.has(iso), isToday: isSameDay(d, today) };
  });
};

/** A rolling window of `count` days ending on `end` (inclusive). Oldest first. */
export const dateWindow = (count: number, end = new Date()): string[] => {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) out.push(toIso(addDays(end, -i)));
  return out;
};

const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export type EntryVisual = {
  label: string;
  emoji: string;
  color: string;
  isIncome: boolean;
};

/** Resolve a transaction's category (stored as a label) to its emoji + colour. */
export const entryVisual = (t: StreakTransaction): EntryVisual => {
  const isIncome = t.type === 'income';
  const match =
    ALL_CATEGORIES.find((c) => c.label.toLowerCase() === String(t.category).toLowerCase()) ??
    ALL_CATEGORIES.find((c) => c.id.toLowerCase() === String(t.category).toLowerCase());
  return {
    label: match?.label ?? t.category ?? (isIncome ? 'Income' : 'Expense'),
    emoji: match?.emoji ?? (isIncome ? '💰' : '💸'),
    color: match?.color ?? (isIncome ? palette.success : palette.danger),
    isIncome,
  };
};

const MONTH_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "Wednesday, July 23" — the header line on the celebration screen. */
export const longDateLabel = (d: Date): string =>
  `${WEEKDAY_LONG[d.getDay()]}, ${MONTH_LONG[d.getMonth()]} ${d.getDate()}`;

/** Compact clock label for a transaction's creation time, e.g. "7 AM" / "1:30 PM". */
export const timeLabel = (createdAt: number | undefined): string => {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return '';
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const suffix = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return minutes === 0 ? `${hours} ${suffix}` : `${hours}:${pad(minutes)} ${suffix}`;
};

/** Money with grouping, no decimals for whole numbers, in the profile currency
 *  (AUDIT item 17). */
export const formatAmount = (amount: number): string => formatMoney(amount, { decimals: true });
