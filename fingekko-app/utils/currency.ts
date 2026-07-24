/**
 * Central currency formatter (AUDIT item 17).
 *
 * The user's display currency lives on their profile (`User.currency`), but the
 * whole app used to hard-code `₹` in dozens of local `inr()` helpers, so a non-INR
 * user saw the wrong symbol everywhere. This module is the single source of truth
 * for formatting a *personal* money figure.
 *
 * The active currency is a module-level value set once the profile loads
 * (see `hooks/useCurrencySync.ts`) and refreshed on `profile:changed`. Screens
 * call the pure `formatMoney` / `currencySymbol`, so there's no prop-drilling.
 *
 * NOTE: group / shared expenses are NOT personal — each one stores its own
 * `currency` (a shared bill can be in a different currency from your profile).
 * Those surfaces keep threading their per-expense currency and must not use this.
 */

export interface CurrencyMeta {
  code: string;
  symbol: string;
  /** Locale used for digit grouping (e.g. Indian 1,00,000 vs 100,000). */
  locale: string;
}

// A small, deliberately curated set — extend as real users need them.
const CURRENCIES: Record<string, CurrencyMeta> = {
  INR: { code: 'INR', symbol: '₹', locale: 'en-IN' },
  USD: { code: 'USD', symbol: '$', locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', locale: 'en-IE' },
  GBP: { code: 'GBP', symbol: '£', locale: 'en-GB' },
  JPY: { code: 'JPY', symbol: '¥', locale: 'ja-JP' },
  AUD: { code: 'AUD', symbol: 'A$', locale: 'en-AU' },
  CAD: { code: 'CAD', symbol: 'C$', locale: 'en-CA' },
  SGD: { code: 'SGD', symbol: 'S$', locale: 'en-SG' },
  AED: { code: 'AED', symbol: 'AED ', locale: 'en-AE' },
};

const DEFAULT: CurrencyMeta = CURRENCIES.INR;
let active: CurrencyMeta = DEFAULT;

/** Every currency the app can format, for a picker. */
export const SUPPORTED_CURRENCIES: CurrencyMeta[] = Object.values(CURRENCIES);

export function isSupportedCurrency(code?: string | null): boolean {
  return !!code && Object.prototype.hasOwnProperty.call(CURRENCIES, code.toUpperCase());
}

/** Point the app at the user's profile currency. Unknown/absent → INR default. */
export function setActiveCurrency(code?: string | null): void {
  active = (code && CURRENCIES[code.toUpperCase()]) || DEFAULT;
}

export function getActiveCurrency(): CurrencyMeta {
  return active;
}

export function currencySymbol(): string {
  return active.symbol;
}

export interface FormatMoneyOptions {
  /**
   * 'auto' (default) → a real minus for negatives only ("−₹300"), nothing for
   * positives. 'always' → a leading "+" on positives too. 'none' → no sign, uses
   * the absolute value (for places that colour/label the direction themselves).
   */
  signDisplay?: 'auto' | 'always' | 'none';
  /** Keep two fraction digits when the value isn't whole. Default: rounded. */
  decimals?: boolean;
}

/**
 * Format a personal money figure in the active currency. Symbol-first, with a
 * true minus sign ("−₹300", not "₹-300"), and locale-aware digit grouping.
 */
export function formatMoney(amount: number, opts: FormatMoneyOptions = {}): string {
  const { signDisplay = 'auto', decimals = false } = opts;
  const meta = active;
  const value = Number.isFinite(amount) ? amount : 0;
  const abs = Math.abs(value);
  const showDecimals = decimals && !Number.isInteger(abs);

  const digits = showDecimals
    ? abs.toLocaleString(meta.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.round(abs).toLocaleString(meta.locale);

  // A value that rounds to what's displayed as zero must not carry a sign — a
  // count-up passing through zero (or a −0.3) should read "₹0", never "−₹0".
  const roundsToZero = showDecimals ? Math.round(abs * 100) === 0 : Math.round(abs) === 0;
  const negative = value < 0 && !roundsToZero;

  const sign = signDisplay === 'none'
    ? ''
    : negative
      ? '−'
      : signDisplay === 'always' && !roundsToZero
        ? '+'
        : '';
  return `${sign}${meta.symbol}${digits}`;
}

/**
 * Format a string of copy (e.g. quest description or personality tagline) by replacing
 * hardcoded `₹` and 'rupee' terms with the active user's currency symbol.
 */
export function formatCurrencyCopy(text: string | null | undefined): string {
  if (!text) return '';
  const sym = active.symbol;
  if (sym === '₹') return text;
  return text
    .replace(/₹/g, sym)
    .replace(/\brupees\b/gi, 'currency')
    .replace(/\brupee\b/gi, 'currency');
}
