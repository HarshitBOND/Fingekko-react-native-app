/**
 * Goal feasibility engine (AUDIT item 13). The single source of truth for
 * "the soonest a savings goal is realistically reachable on the user's income."
 * Promoted out of goals.tsx (item 6) so every surface computes it identically.
 *
 * Disposable income = monthlyIncome − recurring essentials (item 10): money
 * already committed to rent/bills can't go toward a goal, so it must not count
 * toward feasibility. We convert that monthly rate to a *daily* one so genuinely
 * fast small goals ("₹500 by next week") stay selectable, while the absurd ones
 * ("₹3 crore by tomorrow on ₹10k income") are blocked. `minMonths` exposes the
 * coarse `ceil(target / monthlyDisposable)` figure from the item spec for any
 * caller that wants a month count; the picker gates on the precise `minDeadline`.
 */

const DAYS_PER_MONTH = 30;

/** income − essentials, never negative. Money free to put toward goals. */
export function monthlyDisposableOf(monthlyIncome: number, monthlyEssentials = 0): number {
  return Math.max(0, (monthlyIncome || 0) - (monthlyEssentials || 0));
}

// Formats Y/M/D straight into "YYYY-MM-DD" with no Date/UTC round-trip, so the
// computed date is exactly the date callers compare/save against.
function formatIso(year: number, month: number, day: number): string {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const clampedDay = Math.min(day, daysInMonth);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

/**
 * The soonest date `targetAmount` is realistically reachable given a monthly
 * disposable rate, counted forward from `from`. Returns null when there's no
 * income-based restriction to apply — either the amount isn't valid yet or there's
 * no disposable income (we never lock out a user who hasn't told us their income).
 */
export function minFeasibleDeadline(
  targetAmount: number,
  monthlyDisposable: number,
  from: Date,
): Date | null {
  if (!(targetAmount > 0) || !(monthlyDisposable > 0)) return null;
  const dailyDisposable = monthlyDisposable / DAYS_PER_MONTH;
  const minDays = Math.max(1, Math.ceil(targetAmount / dailyDisposable));
  return new Date(from.getFullYear(), from.getMonth(), from.getDate() + minDays);
}

export interface GoalFeasibilityInput {
  targetAmount: number;
  monthlyIncome: number;
  monthlyEssentials?: number;
  from?: Date;
}

export interface GoalFeasibility {
  /** income − essentials, floored at 0. */
  monthlyDisposable: number;
  /** monthlyDisposable spread across the month. */
  dailyDisposable: number;
  /** Earliest realistically-reachable date, or null when unrestricted. */
  minDeadline: Date | null;
  /** `minDeadline` as "YYYY-MM-DD", or '' when unrestricted. */
  minDeadlineIso: string;
  /** Coarse `ceil(target / monthlyDisposable)` month count; 0 when unrestricted. */
  minMonths: number;
}

/** Full feasibility read for a goal, from raw profile numbers. */
export function computeGoalFeasibility({
  targetAmount,
  monthlyIncome,
  monthlyEssentials = 0,
  from = new Date(),
}: GoalFeasibilityInput): GoalFeasibility {
  const monthlyDisposable = monthlyDisposableOf(monthlyIncome, monthlyEssentials);
  const dailyDisposable = monthlyDisposable / DAYS_PER_MONTH;
  const minDeadline = minFeasibleDeadline(targetAmount, monthlyDisposable, from);
  const minDeadlineIso = minDeadline
    ? formatIso(minDeadline.getFullYear(), minDeadline.getMonth(), minDeadline.getDate())
    : '';
  const minMonths =
    targetAmount > 0 && monthlyDisposable > 0 ? Math.ceil(targetAmount / monthlyDisposable) : 0;
  return { monthlyDisposable, dailyDisposable, minDeadline, minDeadlineIso, minMonths };
}
