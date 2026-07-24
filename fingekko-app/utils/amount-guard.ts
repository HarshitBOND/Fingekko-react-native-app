/**
 * Sanity guard for money amounts entered by hand.
 *
 * The "extra zeros" trap: typing `2000000` when you meant `20000` saves silently
 * and quietly wrecks every balance downstream. We flag two shapes of mistake:
 *
 *  1. An absolute ceiling — a single entry this large is almost always a typo,
 *     regardless of who the user is.
 *  2. A multiple of the user's *own* typical spend — catches the single-extra-zero
 *     case (₹400 → ₹4000) that an absolute ceiling never would.
 *
 * A flagged amount isn't blocked — the caller confirms it with the user and
 * proceeds if they say it's intentional.
 */

/** One personal transaction at or above this is treated as unusual outright. */
export const HARD_AMOUNT_CEILING = 1_000_000;

/** How many times the user's typical spend counts as "unusually large". */
export const TYPICAL_MULTIPLE = 5;

/**
 * Below this the relative check stays quiet — small amounts aren't worth a
 * prompt even when they're several times a tiny typical spend (a run of ₹20
 * coffees shouldn't make a normal ₹300 buy feel suspicious).
 */
const RELATIVE_CHECK_FLOOR = 2_000;

/** Median of the given amounts (positive only), or 0 when there's no history. */
export function typicalExpense(amounts: number[]): number {
  const positive = amounts.filter((a) => Number.isFinite(a) && a > 0).sort((a, b) => a - b);
  if (positive.length === 0) return 0;
  const mid = Math.floor(positive.length / 2);
  return positive.length % 2 ? positive[mid] : (positive[mid - 1] + positive[mid]) / 2;
}

/**
 * Whether an amount is large enough to be worth confirming before saving.
 * Pass `typical` (e.g. from {@link typicalExpense}) to enable the relative check;
 * omit it and only the absolute ceiling applies.
 */
export function isAmountUnusual(amount: number, opts: { typical?: number } = {}): boolean {
  if (!Number.isFinite(amount) || amount <= 0) return false;
  if (amount >= HARD_AMOUNT_CEILING) return true;

  const typical = opts.typical ?? 0;
  if (typical > 0 && amount >= RELATIVE_CHECK_FLOOR && amount > typical * TYPICAL_MULTIPLE) {
    return true;
  }
  return false;
}
