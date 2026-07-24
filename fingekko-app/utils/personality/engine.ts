/**
 * FinGekko Personality Engine.
 *
 * Classifies a user into one of six money personalities from behaviour the app
 * already records — spend analysis, splits, goals and streaks. Implements the
 * Personality Engine logic doc: 8 parameters → 3 gates → normalise → score →
 * winner + drivers.
 *
 * Everything here is pure: no React, no fetching, no clock reads except the
 * `today` you pass in. That keeps it unit-testable and lets the UI layer decide
 * when to run it. See `usePersonality` for the data plumbing.
 */

import type { PersonalityType } from '@/constants/personality';

/* ── Input ──────────────────────────────────────────────────────────────── */

export type PersonalityExpense = {
  amount: number;
  category: string;
  /** YYYY-MM-DD. */
  date: string;
  /** True when this spend was shared with someone (a split). */
  isSplit?: boolean;
};

export type PersonalityGoal = {
  isOnTrack: boolean;
};

export type PersonalityInput = {
  expenses: PersonalityExpense[];
  goals: PersonalityGoal[];
  /** Unique days the user logged at least one transaction. */
  daysLogged: number;
  /** Account creation date (YYYY-MM-DD). */
  signupDate: string;
  /** Monthly income in ₹, if the user told us. Omit/0 when unknown. */
  monthlyIncome?: number | null;
  /** Defaults to now — injected so tests and the UI can pin the date. */
  today?: Date;
};

/* ── Output ─────────────────────────────────────────────────────────────── */

export type PersonalityDriver = {
  signal: SignalName;
  /** Human-readable, already formatted for display. */
  label: string;
  /** How much this signal contributed to the winning score. */
  contribution: number;
};

export type PersonalityParams = {
  transactionFrequency: number;
  spendingCv: number;
  bingeRatio: number;
  sizeRatio: number;
  topCategoryShare: number;
  topCategoryName: string;
  socialSpendRatio: number;
  /** null when the user has no goals. */
  goalProgress: number | null;
  loggingConsistency: number;
  /** null when we don't know their income. */
  saveRate: number | null;
  avgDaily: number;
  avgTransactionSize: number;
  totalDays: number;
  totalTransactions: number;
};

export type PersonalityResult =
  | {
      status: 'insufficient_data';
      /** Which gate stopped us — lets the UI explain what's still needed. */
      reason: 'not_enough_time' | 'not_enough_transactions';
      /** Progress toward the gate, 0–1, for a "keep going" meter. */
      progress: number;
      daysTracked: number;
      transactionsLogged: number;
    }
  | {
      status: 'ok';
      type: PersonalityType;
      /** 0–1. Gap between winner and runner-up, relative to the winner. */
      confidence: number;
      /** Set only when confidence < 0.15 — the user straddles two types. */
      secondaryType: PersonalityType | null;
      drivers: PersonalityDriver[];
      scores: Record<PersonalityType, number>;
      params: PersonalityParams;
    };

/* ── Tunables ───────────────────────────────────────────────────────────────
 * Calibrated for young Indian users (18–30, ₹15K–₹60K income) on synthetic
 * scenarios. Per the doc these should eventually become the 10th/90th
 * percentile of real user data — keep them in one block so that swap is easy. */

export const GATES = {
  /** Below this many days since signup, patterns aren't meaningful yet. */
  minDays: 7,
  /** Log on fewer than this share of days and the avoidance *is* the type. */
  ostrichConsistency: 0.3,
  /** Variance/binge/category-share need a baseline to mean anything. */
  minTransactions: 10,
} as const;

const RANGES = {
  transactionFrequency: [1, 6],
  spendingCv: [0.3, 1.5],
  bingeRatio: [2, 8],
  sizeRatio: [0.1, 0.6],
  topCategoryShare: [0.25, 0.65],
  socialSpendRatio: [0.05, 0.45],
  goalProgress: [0, 0.8],
  loggingConsistency: [0.3, 0.85],
  saveRate: [0, 0.3],
} as const;

/** Below this confidence the runner-up is reported as a secondary type. */
const HYBRID_THRESHOLD = 0.15;

/**
 * Tie-break order for exactly-equal scores. Specific behavioural signatures win
 * over Strategist, which is the broadest pattern and the easiest to land on by
 * accident.
 */
const TIE_BREAK: Exclude<PersonalityType, 'ostrich'>[] = [
  'social_butterfly',
  'binge_beast',
  'impulse_comet',
  'comfort_spender',
  'strategist',
];

/* ── Math helpers ───────────────────────────────────────────────────────── */

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Map a raw value onto 0–1 across [min, max], clamping outside it. */
export const normalize = (value: number, min: number, max: number): number =>
  max === min ? 0 : clamp01((value - min) / (max - min));

export const normalizeInverse = (value: number, min: number, max: number): number =>
  1 - normalize(value, min, max);

const mean = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

/** Population standard deviation. */
const stdDev = (xs: number[]): number => {
  if (xs.length === 0) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

/** Whole days between two dates, ignoring time-of-day. */
const daysBetween = (from: Date, to: Date): number => {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86400000);
};

/** Parse YYYY-MM-DD as a *local* calendar day (never UTC — that shifts the day). */
const parseDay = (value: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? '').trim());
  if (!m) {
    const loose = new Date(value);
    return Number.isNaN(loose.getTime()) ? null : loose;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

const dayKey = (value: string): string => String(value ?? '').trim().slice(0, 10);

/* ── Step 1: the 8 parameters ───────────────────────────────────────────── */

export function computeParams(input: PersonalityInput): PersonalityParams {
  const today = input.today ?? new Date();
  const expenses = input.expenses.filter((e) => Number.isFinite(e.amount) && e.amount > 0);

  const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalTransactions = expenses.length;

  const signup = parseDay(input.signupDate);
  // +1 so a same-day signup counts as one day, not zero.
  const totalDays = signup ? Math.max(1, daysBetween(signup, today) + 1) : 1;
  // Can't be active on more days than have passed — guards a bad signup date.
  const activeDays = Math.max(1, Math.min(input.daysLogged, totalDays));

  // 1. How many purchases per active day.
  const transactionFrequency = totalTransactions / activeDays;

  // Daily totals drive variance and binge. Only days with spend are counted, so
  // a quiet Tuesday doesn't read as a "₹0 day" and deflate the average.
  const byDay = new Map<string, number>();
  expenses.forEach((e) => {
    const key = dayKey(e.date);
    byDay.set(key, (byDay.get(key) ?? 0) + e.amount);
  });
  const dailyTotals = [...byDay.values()];
  const avgDaily = mean(dailyTotals);

  // 2. Coefficient of variation: 0.2 steady, 1.5+ erratic.
  const spendingCv = avgDaily > 0 ? stdDev(dailyTotals) / avgDaily : 0;

  // 3. How extreme the worst day is against a typical one.
  const bingeRatio = avgDaily > 0 ? Math.max(...dailyTotals, 0) / avgDaily : 0;

  // 4. Transaction granularity — income-agnostic by construction.
  const avgTransactionSize = totalTransactions > 0 ? totalSpend / totalTransactions : 0;
  const sizeRatio = avgDaily > 0 ? avgTransactionSize / avgDaily : 0;

  // 5. Does one category dominate?
  const byCategory = new Map<string, number>();
  expenses.forEach((e) => {
    const key = (e.category || 'Other').trim() || 'Other';
    byCategory.set(key, (byCategory.get(key) ?? 0) + e.amount);
  });
  let topCategoryName = '';
  let topCategorySpend = 0;
  byCategory.forEach((amount, label) => {
    if (amount > topCategorySpend) {
      topCategorySpend = amount;
      topCategoryName = label;
    }
  });
  const topCategoryShare = totalSpend > 0 ? topCategorySpend / totalSpend : 0;

  // 6. How much of the money involves other people.
  const splitSpend = expenses.reduce((sum, e) => (e.isSplit ? sum + e.amount : sum), 0);
  const socialSpendRatio = totalSpend > 0 ? splitSpend / totalSpend : 0;

  // 7. Goals — null (not zero) when there are none, so "no goals" isn't scored
  // as "failing all goals".
  const goalProgress =
    input.goals.length > 0
      ? input.goals.filter((g) => g.isOnTrack).length / input.goals.length
      : null;

  // 8. How reliably they show up.
  const loggingConsistency = clamp01(activeDays / totalDays);

  // Optional: only meaningful once we know income.
  const income = input.monthlyIncome ?? 0;
  const saveRate = income > 0 ? Math.max(0, (income - totalSpend) / income) : null;

  return {
    transactionFrequency,
    spendingCv,
    bingeRatio,
    sizeRatio,
    topCategoryShare,
    topCategoryName,
    socialSpendRatio,
    goalProgress,
    loggingConsistency,
    saveRate,
    avgDaily,
    avgTransactionSize,
    totalDays,
    totalTransactions,
  };
}

/* ── Step 3: normalised signals ─────────────────────────────────────────── */

export type SignalName =
  | 'freq'
  | 'variance'
  | 'binge'
  | 'smallTxn'
  | 'categoryConc'
  | 'categoryDiv'
  | 'social'
  | 'goal'
  | 'consistency'
  | 'steadiness'
  | 'lowBinge'
  | 'lowFreq'
  | 'save';

type Signals = Record<SignalName, number | null>;

function computeSignals(p: PersonalityParams): Signals {
  const r = RANGES;
  return {
    freq: normalize(p.transactionFrequency, ...r.transactionFrequency),
    variance: normalize(p.spendingCv, ...r.spendingCv),
    binge: normalize(p.bingeRatio, ...r.bingeRatio),
    smallTxn: normalizeInverse(p.sizeRatio, ...r.sizeRatio),
    categoryConc: normalize(p.topCategoryShare, ...r.topCategoryShare),
    categoryDiv: normalizeInverse(p.topCategoryShare, ...r.topCategoryShare),
    social: normalize(p.socialSpendRatio, ...r.socialSpendRatio),
    goal: p.goalProgress === null ? null : normalize(p.goalProgress, ...r.goalProgress),
    consistency: normalize(p.loggingConsistency, ...r.loggingConsistency),
    steadiness: normalizeInverse(p.spendingCv, ...r.spendingCv),
    lowBinge: normalizeInverse(p.bingeRatio, ...r.bingeRatio),
    lowFreq: normalizeInverse(p.transactionFrequency, ...r.transactionFrequency),
    save: p.saveRate === null ? null : normalize(p.saveRate, ...r.saveRate),
  };
}

/* ── Step 4: score each type ────────────────────────────────────────────── */

type WeightMap = Partial<Record<SignalName, number>>;

const WEIGHTS: Record<Exclude<PersonalityType, 'ostrich' | 'strategist'>, WeightMap> = {
  impulse_comet: { freq: 0.4, smallTxn: 0.35, variance: 0.25 },
  binge_beast: { binge: 0.45, lowFreq: 0.3, variance: 0.25 },
  social_butterfly: { social: 0.6, categoryDiv: 0.25, freq: 0.15 },
  comfort_spender: { categoryConc: 0.55, steadiness: 0.25, lowBinge: 0.2 },
};

/**
 * Strategist's full weighting. `goal` and `save` are optional signals; when one
 * is missing its weight is redistributed across the rest in proportion, so the
 * weights always sum to 1 and users aren't penalised for skipping goals or
 * withholding their income.
 */
const STRATEGIST_WEIGHTS: WeightMap = {
  goal: 0.35,
  consistency: 0.3,
  steadiness: 0.2,
  save: 0.15,
};

/**
 * The signals that actually *evidence* strategy — having a plan and executing
 * it. `consistency` and `steadiness` are only proxies: they measure diligent
 * logging and even pacing, which almost every engaged user scores high on.
 */
const STRATEGIST_DEFINING: SignalName[] = ['goal', 'save'];

/**
 * How much to damp Strategist when its defining evidence is missing.
 *
 * Redistributing the full weight onto the proxies (as a naive reading of the
 * spec implies) makes Strategist beat every other type for any user who logs
 * daily: consistency ≈ 1.0 and steadiness ≈ 1.0 alone produce a ~1.0 score.
 * Measured on synthetic fixtures, that let Strategist out-rank a clear Impulse
 * Comet (0.95 vs 0.74) and a clear Social Butterfly (0.92 vs 0.85).
 *
 * So we keep the redistribution (weights still sum to 1, and a user with no
 * goals can still land on Strategist when nothing else fits) but scale the
 * result by how much defining evidence exists. A user who has never set a goal
 * or told us their income hasn't shown they're strategic — only that they're
 * diligent, which is a different thing.
 */
const STRATEGIST_DAMPING = 0.35;

/** Drop unavailable signals and rescale the remainder to sum to 1. */
function redistribute(weights: WeightMap, signals: Signals): WeightMap {
  const available = (Object.entries(weights) as [SignalName, number][]).filter(
    ([name]) => signals[name] !== null,
  );
  const total = available.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) return {};
  return Object.fromEntries(available.map(([name, w]) => [name, w / total])) as WeightMap;
}

function scoreWith(weights: WeightMap, signals: Signals): number {
  return (Object.entries(weights) as [SignalName, number][]).reduce((sum, [name, weight]) => {
    const value = signals[name];
    return value === null ? sum : sum + value * weight;
  }, 0);
}

/**
 * 1.0 when every defining signal is present, falling to `1 - DAMPING` when none
 * are — in proportion to the weight of what's missing.
 */
function evidenceFactor(full: WeightMap, defining: SignalName[], signals: Signals): number {
  const definingTotal = defining.reduce((sum, name) => sum + (full[name] ?? 0), 0);
  if (definingTotal <= 0) return 1;
  const missing = defining.reduce(
    (sum, name) => (signals[name] === null ? sum + (full[name] ?? 0) : sum),
    0,
  );
  return 1 - STRATEGIST_DAMPING * (missing / definingTotal);
}

/* ── Step 6: driver copy ────────────────────────────────────────────────── */

const pct = (n: number) => `${Math.round(n * 100)}%`;
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

function driverLabel(signal: SignalName, p: PersonalityParams): string {
  switch (signal) {
    case 'freq':
      return `${p.transactionFrequency.toFixed(1)} transactions per active day`;
    case 'smallTxn':
      return `Average transaction is ${inr(p.avgTransactionSize)} (${pct(
        p.avgDaily > 0 ? p.avgTransactionSize / p.avgDaily : 0,
      )} of daily spend)`;
    case 'variance':
      return `Daily spending varies by ${pct(p.spendingCv)} from average`;
    case 'binge':
      return `Peak day was ${p.bingeRatio.toFixed(1)}x your average day`;
    case 'lowFreq':
      return `Only ${p.transactionFrequency.toFixed(1)} transactions per active day`;
    case 'categoryConc':
      return `${pct(p.topCategoryShare)} of spend goes to ${p.topCategoryName || 'one category'}`;
    case 'categoryDiv':
      return `Spending spread across categories (top = ${pct(p.topCategoryShare)})`;
    case 'social':
      return `${pct(p.socialSpendRatio)} of spending involves splits`;
    case 'goal':
      return `${pct(p.goalProgress ?? 0)} of goals on track`;
    case 'consistency':
      return `Logged on ${pct(p.loggingConsistency)} of days`;
    case 'steadiness':
      return `Steady daily spending (CV = ${p.spendingCv.toFixed(2)})`;
    case 'lowBinge':
      return `No extreme spike days (peak = ${p.bingeRatio.toFixed(1)}x average)`;
    case 'save':
      return `Saving ${pct(p.saveRate ?? 0)} of income`;
  }
}

/* ── The engine ─────────────────────────────────────────────────────────── */

export function classifyPersonality(input: PersonalityInput): PersonalityResult {
  const params = computeParams(input);

  // GATE 1 — not enough time for any pattern to exist.
  if (params.totalDays < GATES.minDays) {
    return {
      status: 'insufficient_data',
      reason: 'not_enough_time',
      progress: clamp01(params.totalDays / GATES.minDays),
      daysTracked: params.totalDays,
      transactionsLogged: params.totalTransactions,
    };
  }

  // GATE 2 — Ostrich. Deliberately checked *before* the transaction-count gate:
  // an Ostrich by definition won't have many transactions, so checking volume
  // first would misfile every one of them as "insufficient data".
  if (params.loggingConsistency < GATES.ostrichConsistency) {
    return {
      status: 'ok',
      type: 'ostrich',
      // Further below the threshold = more certainly an Ostrich.
      confidence: clamp01(1 - params.loggingConsistency / GATES.ostrichConsistency),
      secondaryType: null,
      drivers: [
        {
          signal: 'consistency',
          label: driverLabel('consistency', params),
          contribution: 1,
        },
      ],
      scores: emptyScores(),
      params,
    };
  }

  // GATE 3 — variance, binge and category share need a baseline.
  if (params.totalTransactions < GATES.minTransactions) {
    return {
      status: 'insufficient_data',
      reason: 'not_enough_transactions',
      progress: clamp01(params.totalTransactions / GATES.minTransactions),
      daysTracked: params.totalDays,
      transactionsLogged: params.totalTransactions,
    };
  }

  const signals = computeSignals(params);

  const strategistWeights = redistribute(STRATEGIST_WEIGHTS, signals);
  const weightsByType: Record<Exclude<PersonalityType, 'ostrich'>, WeightMap> = {
    ...WEIGHTS,
    strategist: strategistWeights,
  };

  const scores = emptyScores();
  (Object.keys(weightsByType) as Exclude<PersonalityType, 'ostrich'>[]).forEach((type) => {
    scores[type] = scoreWith(weightsByType[type], signals);
  });
  // Strategist only counts for as much as its evidence supports (see above).
  scores.strategist *= evidenceFactor(STRATEGIST_WEIGHTS, STRATEGIST_DEFINING, signals);

  // Step 5 — rank. Ostrich is gate-only, never scored here.
  // Ties break on a fixed type order rather than object-key order, so the same
  // input always yields the same answer.
  const ranked = (Object.keys(weightsByType) as Exclude<PersonalityType, 'ostrich'>[])
    .map((type) => ({ type, score: scores[type] }))
    .sort((a, b) => b.score - a.score || TIE_BREAK.indexOf(a.type) - TIE_BREAK.indexOf(b.type));

  const winner = ranked[0];
  const runnerUp = ranked[1];

  const confidence =
    winner.score > 0 ? clamp01((winner.score - (runnerUp?.score ?? 0)) / winner.score) : 0;

  // Step 6 — the two signals that contributed most to the winning score.
  const drivers: PersonalityDriver[] = (
    Object.entries(weightsByType[winner.type]) as [SignalName, number][]
  )
    .map(([signal, weight]) => ({
      signal,
      contribution: (signals[signal] ?? 0) * weight,
      label: driverLabel(signal, params),
    }))
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 2);

  return {
    status: 'ok',
    type: winner.type,
    confidence,
    secondaryType: confidence < HYBRID_THRESHOLD ? (runnerUp?.type ?? null) : null,
    drivers,
    scores,
    params,
  };
}

function emptyScores(): Record<PersonalityType, number> {
  return {
    strategist: 0,
    impulse_comet: 0,
    binge_beast: 0,
    social_butterfly: 0,
    comfort_spender: 0,
    ostrich: 0,
  };
}

/**
 * Is a goal on track? The doc takes `is_on_track` as given; we derive it by
 * comparing how far along the money is against how far along the time is. A
 * goal with no deadline (or already met) counts as on track.
 */
export function isGoalOnTrack(
  goal: { targetAmount: number; currentAmount: number; deadline: string; createdAt?: number },
  today = new Date(),
): boolean {
  const target = goal.targetAmount || 0;
  if (target <= 0) return true;
  const progress = clamp01((goal.currentAmount || 0) / target);
  if (progress >= 1) return true;

  const deadline = parseDay(goal.deadline);
  if (!deadline) return true;

  const start = goal.createdAt ? new Date(goal.createdAt) : null;
  const totalSpan = start ? daysBetween(start, deadline) : null;
  // Without a start date we can only say "is it already overdue".
  if (totalSpan === null || totalSpan <= 0) return today <= deadline;

  const elapsed = clamp01(daysBetween(start!, today) / totalSpan);
  return progress >= elapsed;
}
