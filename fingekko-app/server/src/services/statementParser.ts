/**
 * Plain-text statement / day parser (AUDIT item 14).
 *
 * Logging every expense by hand for a whole day is tedious, so the user can paste
 * a day's transactions as free text — one per line — and we turn each line into a
 * draft transaction they then review and confirm on the client. This is a *best
 * guess* parser, deliberately paired with a preview/edit step: money is never
 * written from a raw parse, only from rows the user has seen.
 *
 * Supported per line (amount can lead or trail; currency markers optional):
 *   250 lunch swiggy           → expense · Food · ₹250
 *   Salary 20000               → income  · Salary · ₹20000
 *   Rs. 1,200 electricity bill → expense · Bills · ₹1200
 * A line naming a balance ("Available balance: 10,000") is captured as the
 * statement balance and not turned into a transaction.
 *
 * Dates are NOT read per line — the whole paste is imported against one chosen
 * day (the user's framing: "add the entire day at once"). Date-looking tokens are
 * still stripped so they aren't mistaken for the amount.
 */

export interface ParsedRow {
  /** Original line, shown in the preview so the user can verify the guess. */
  raw: string;
  type: 'income' | 'expense';
  amount: number;
  /** Best-guess category label — matches the app's category vocabulary. */
  category: string;
  /** False when no amount could be read; the client flags these for the user. */
  ok: boolean;
  note?: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  /** A balance figure detected in the paste, if any (for the reconcile note). */
  detectedBalance: number | null;
}

// Same sane per-transaction bound the transaction routes enforce.
const MAX_AMOUNT = 1_000_000_000;

// Words that flip a line from the default (expense) to income.
const INCOME_HINTS = [
  'credit', 'credited', 'received', 'receive', 'salary', 'refund', 'refunded',
  'cashback', 'deposit', 'deposited', 'interest', 'dividend', 'income', 'payout',
  'reimbursement', 'bonus',
];

// Category keyword map. Keys are the exact category *labels* the app stores
// (see constants/categories.ts). First match wins, in listed order.
const EXPENSE_CATEGORY_HINTS: Array<[string, string[]]> = [
  ['Food', ['swiggy', 'zomato', 'restaurant', 'cafe', 'coffee', 'food', 'lunch', 'dinner', 'breakfast', 'pizza', 'domino', 'mcdonald', 'kfc', 'grocery', 'groceries', 'bigbasket', 'blinkit', 'zepto', 'instamart', 'snack', 'tea', 'meal']],
  ['Transport', ['uber', 'ola', 'rapido', 'metro', 'bus', 'train', 'irctc', 'fuel', 'petrol', 'diesel', 'cab', 'auto', 'taxi', 'transport', 'parking', 'toll', 'flight', 'indigo']],
  ['Bills', ['electricity', 'water', 'gas', 'recharge', 'broadband', 'wifi', 'dth', 'bill', 'jio', 'airtel', 'vodafone', 'postpaid', 'prepaid', 'insurance', 'emi', 'loan', 'subscription']],
  ['Rent', ['rent', 'landlord', 'maintenance']],
  ['Shopping', ['amazon', 'flipkart', 'myntra', 'ajio', 'mall', 'shopping', 'store', 'nykaa', 'clothes', 'shoes', 'purchase']],
  ['Entertainment', ['netflix', 'prime', 'hotstar', 'spotify', 'movie', 'bookmyshow', 'pvr', 'inox', 'game', 'entertainment', 'concert']],
  ['Health', ['pharmacy', 'medical', 'hospital', 'doctor', 'medicine', 'apollo', 'health', 'gym', 'clinic', 'dental']],
  ['Education', ['course', 'udemy', 'coursera', 'tuition', 'school', 'college', 'education', 'fees', 'exam', 'stationery']],
];

const INCOME_CATEGORY_HINTS: Array<[string, string[]]> = [
  ['Salary', ['salary', 'payroll', 'wages']],
  ['Freelance', ['freelance', 'upwork', 'fiverr', 'client', 'contract', 'gig', 'invoice']],
  ['Investment', ['dividend', 'interest', 'investment', 'mutual', 'stock', 'sip', 'maturity']],
  ['Gift', ['gift', 'present']],
];

// Balance-line markers — a line stating the account balance, not a transaction.
// Deliberately strict (a leading qualifier or a trailing colon/equals) so a bare
// "balance" inside a normal transaction line can't swallow that row.
const BALANCE_RE = /\b(?:avl\.?\s*bal|available\s+bal(?:ance)?|closing\s+bal(?:ance)?|current\s+bal(?:ance)?|bal(?:ance)?\s*[:=])/i;

// Date tokens we strip so their digits aren't read as the amount.
const DATE_RES: RegExp[] = [
  /\b\d{4}-\d{2}-\d{2}\b/g,          // 2026-07-25
  /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, // 25/07/2026, 25-7-26
  /\b\d{1,2}[/.]\d{1,2}\b/g,         // 25/07, 25.07
];

function lower(s: string): string {
  return s.toLowerCase();
}

function pickCategory(text: string, type: 'income' | 'expense'): string {
  const hay = lower(text);
  const table = type === 'income' ? INCOME_CATEGORY_HINTS : EXPENSE_CATEGORY_HINTS;
  for (const [label, words] of table) {
    if (words.some((w) => hay.includes(w))) return label;
  }
  return 'Other';
}

function detectType(text: string): 'income' | 'expense' {
  const hay = lower(text);
  // "debit"/"spent"/"paid" are explicit expense words; income only wins on a hint
  // that isn't itself negated by a debit word (statements say "debit"/"credit").
  const looksIncome = INCOME_HINTS.some((w) => hay.includes(w));
  const looksExpense = /\b(debit|debited|spent|paid|purchase|withdraw|withdrawn|sent|payment)\b/.test(hay);
  if (looksIncome && !looksExpense) return 'income';
  return 'expense';
}

/** Pulls the first sensible money amount from a line, or null. */
function extractAmount(line: string): number | null {
  // Strip dates first so their digits can't be read as the amount.
  let cleaned = line;
  for (const re of DATE_RES) cleaned = cleaned.replace(re, ' ');
  // Drop thousands separators, then find number tokens (optional decimals).
  const noCommas = cleaned.replace(/(\d),(?=\d)/g, '$1');
  const matches = noCommas.match(/\d+(?:\.\d{1,2})?/g);
  if (!matches || matches.length === 0) return null;
  // Prefer a number attached to a currency marker; else the first token.
  const currencyMatch = noCommas.match(/(?:₹|rs\.?|inr)\s*(\d+(?:\.\d{1,2})?)/i);
  const value = Number(currencyMatch ? currencyMatch[1] : matches[0]);
  if (!Number.isFinite(value) || value <= 0 || value > MAX_AMOUNT) return null;
  return Math.round(value * 100) / 100;
}

/** Parses a whole pasted block into draft rows + any detected balance. */
export function parseStatement(text: string): ParseResult {
  const rows: ParsedRow[] = [];
  let detectedBalance: number | null = null;

  const lines = (text ?? '').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Skip CSV/TSV table headers (e.g. "Date, Description, Amount, Type, Balance")
    const isHeaderLine = /^(?:date|time|sl\.?\s*no|txn\s*id|description|narrative|particulars|details|amount|debit|credit|type|balance|category|[,\t\s"'])+$/i.test(line) ||
      ((line.includes(',') || line.includes('\t')) && extractAmount(line) === null && /date|amount|description|debit|credit|particulars/i.test(line));
    if (isHeaderLine) continue;

    // Balance line: capture the figure, don't make a transaction from it. We use
    // the last one seen (a statement's closing balance sits at the bottom).
    if (BALANCE_RE.test(line)) {
      const bal = extractAmount(line);
      if (bal !== null) {
        detectedBalance = bal;
        continue;
      }
    }

    const amount = extractAmount(line);
    if (amount === null) {
      rows.push({ raw: line, type: 'expense', amount: 0, category: 'Other', ok: false, note: "Couldn't read an amount" });
      continue;
    }
    const type = detectType(line);
    const category = pickCategory(line, type);
    rows.push({ raw: line, type, amount, category, ok: true });
  }

  return { rows, detectedBalance };
}
