/**
 * Server-authoritative quest engine (AUDIT items 28–37).
 *
 * The entire gamification layer used to be client-authored and trusted: the
 * board, XP, difficulty, completion and streak were all decided on the phone and
 * the server wrote them verbatim, so a modified client could mint unlimited XP
 * and a perfect streak. This module makes the *server* own all of it:
 *
 *   - the quest bank, XP table and difficulty live here (items 30, 31);
 *   - the board is generated here (item 29);
 *   - quests are split into `self` (self-attested, LOW xp) and `auto`
 *     (behavioral, HIGH xp) — auto quests have no manual complete button and are
 *     judged from real logged transactions (items 28, 32, 34);
 *   - "today" is a single fixed timezone (IST) so streak math can't be gamed
 *     around midnight (item 37).
 *
 * The client is now a thin renderer: it fetches the enriched board and sends
 * actions for `self` quests only. It cannot set XP, difficulty, status or the
 * board itself.
 */

export type QuestType =
  | 'saving'
  | 'discipline'
  | 'tracking'
  | 'engagement'
  | 'budgeting'
  | 'challenge'
  | 'lifestyle'
  | 'mindfulness'
  | 'learning';

export type QuestStatus = 'pending' | 'completed' | 'failed';

/** How a quest is verified. `self` = tap-to-complete, LOW xp. `auto` = judged
 *  from the day's real transactions, HIGH xp, no manual button. */
export type VerifyKind = 'self' | 'auto';

/**
 * The condition an `auto` quest is judged against. We can only honestly check
 * things that show up in *logged* transactions, so the auto set is deliberately
 * limited to spend thresholds (see the audit decision). Abstinence quests
 * ("don't order food") stay `self` because the app can't see un-logged spending.
 */
export type AutoRule =
  | { kind: 'spend_under'; threshold: number }
  | { kind: 'under_daily_budget' }
  | { kind: 'less_than_yesterday' }
  | { kind: 'zero_spend' };

export interface QuestSeed {
  id: number;
  title: string;
  description: string;
  icon: string;
  difficulty: number;
  type: QuestType;
  verify: VerifyKind;
  auto?: AutoRule;
}

export interface Quest extends QuestSeed {
  /** Authoritative XP, derived from verify + difficulty (never trusted from the client). */
  xp: number;
}

export const QUESTS_PER_DAY = 4;
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 5;
const DEFAULT_DIFFICULTY = 2;

/**
 * XP table (item 34): self-improving quests are cheap and self-reportable;
 * validated behavioral quests are worth far more and are auto-verified. The gap
 * is deliberate — a self quest tops out at 50, an auto quest starts at 180 — so
 * there's no incentive to prefer the un-checkable ones.
 */
function xpFor(verify: VerifyKind, difficulty: number): number {
  const d = Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, difficulty));
  return verify === 'auto' ? 60 * d : 10 * d;
}

// The seed catalog. IDs are stable and must never be reused — saved state
// persists only `questId`, so changing an id silently rewrites someone's day.
// `auto` quests are the only ones the server can genuinely verify from spend.
const QUEST_SEEDS: QuestSeed[] = [
  { id: 1, title: 'Pocket Change Hero', description: 'Put ₹50 aside today — small, but it counts.', icon: 'PiggyBank', difficulty: 1, type: 'saving', verify: 'self' },
  { id: 2, title: 'The Hundred Club', description: 'Move ₹100 into savings before the day ends.', icon: 'Coins', difficulty: 1, type: 'saving', verify: 'self' },
  { id: 3, title: 'Double Century', description: 'Bank ₹200 today without touching it again.', icon: 'Landmark', difficulty: 2, type: 'saving', verify: 'self' },
  { id: 4, title: 'Hold the Line', description: 'No impulse buys today. Pause before every purchase.', icon: 'ShieldCheck', difficulty: 2, type: 'discipline', verify: 'self' },
  { id: 5, title: 'Kitchen Wins', description: "Don't order food online today — not once.", icon: 'UtensilsCrossed', difficulty: 2, type: 'discipline', verify: 'self' },
  { id: 6, title: 'Nothing Escapes', description: 'Log every single expense you make today.', icon: 'ClipboardList', difficulty: 1, type: 'tracking', verify: 'self' },
  { id: 7, title: 'Stay Close', description: 'Check in on FinGekko three times today.', icon: 'Bell', difficulty: 1, type: 'engagement', verify: 'self' },
  { id: 8, title: 'The Weekly Review', description: 'Look back at this week’s spending and spot one pattern.', icon: 'CalendarCheck', difficulty: 2, type: 'tracking', verify: 'self' },
  { id: 9, title: 'One Less Thing', description: 'Find one expense you were about to make — and skip it.', icon: 'CircleSlash', difficulty: 2, type: 'discipline', verify: 'self' },
  { id: 10, title: 'Every Coin Counts', description: 'Collect all your loose change into one place today.', icon: 'Coins', difficulty: 1, type: 'saving', verify: 'self' },
  { id: 11, title: 'Under Three Hundred', description: 'Keep your total spend below ₹300 for the whole day.', icon: 'Gauge', difficulty: 3, type: 'budgeting', verify: 'auto', auto: { kind: 'spend_under', threshold: 300 } },
  { id: 12, title: 'Three Square Meals', description: 'Log breakfast, lunch and dinner — every one of them.', icon: 'Soup', difficulty: 2, type: 'tracking', verify: 'self' },
  { id: 13, title: 'Midnight Guard', description: 'No late-night ordering. The cart closes after dinner.', icon: 'MoonStar', difficulty: 2, type: 'discipline', verify: 'self' },
  { id: 14, title: 'Clean Sweep', description: 'Finish every other quest on your board today.', icon: 'Trophy', difficulty: 4, type: 'challenge', verify: 'self' },
  { id: 15, title: 'Delete the Temptation', description: 'Stay out of every food delivery app for a full day.', icon: 'Bike', difficulty: 3, type: 'discipline', verify: 'self' },
  { id: 16, title: 'The Five Hundred', description: 'Save ₹500 across this week. Chip away at it daily.', icon: 'Vault', difficulty: 4, type: 'saving', verify: 'self' },
  { id: 17, title: 'Name the Big One', description: 'Find and log your largest expense of the day.', icon: 'TrendingUp', difficulty: 1, type: 'tracking', verify: 'self' },
  { id: 18, title: 'After Eight', description: 'Spend nothing at all after 8 PM tonight.', icon: 'Clock', difficulty: 2, type: 'discipline', verify: 'self' },
  { id: 19, title: 'Home Cooked', description: 'Make at least one meal yourself today.', icon: 'ChefHat', difficulty: 2, type: 'lifestyle', verify: 'self' },
  { id: 20, title: 'Eyes on the Prize', description: 'Open your savings goals and check how close you are.', icon: 'Target', difficulty: 1, type: 'engagement', verify: 'self' },
  { id: 21, title: 'Ten Quiet Minutes', description: 'Sit with your finances for ten focused minutes.', icon: 'Brain', difficulty: 1, type: 'mindfulness', verify: 'self' },
  { id: 22, title: 'Skip the Snack Run', description: 'Buy no snacks outside today. Eat what you have.', icon: 'Cookie', difficulty: 2, type: 'discipline', verify: 'self' },
  { id: 23, title: 'Before Noon', description: 'Move ₹100 to savings before the clock hits 12.', icon: 'Sunrise', difficulty: 2, type: 'saving', verify: 'self' },
  { id: 24, title: 'Miles and Money', description: 'Log everything you spent getting around today.', icon: 'Bus', difficulty: 1, type: 'tracking', verify: 'self' },
  { id: 25, title: 'The Quiet Evening', description: 'Get through the whole evening spending nothing.', icon: 'Moon', difficulty: 3, type: 'discipline', verify: 'self' },
  { id: 26, title: 'Inside the Lines', description: 'Finish the day under your daily budget.', icon: 'Ruler', difficulty: 3, type: 'budgeting', verify: 'auto', auto: { kind: 'under_daily_budget' } },
  { id: 27, title: 'The Thousand', description: 'Save ₹1,000 over the course of this month.', icon: 'Vault', difficulty: 5, type: 'saving', verify: 'self' },
  { id: 28, title: 'Lessons from Yesterday', description: 'Review yesterday’s spending and name one thing to change.', icon: 'History', difficulty: 2, type: 'mindfulness', verify: 'self' },
  { id: 29, title: 'Cart Abandoned', description: 'Keep every shopping app closed for the whole day.', icon: 'ShoppingCart', difficulty: 3, type: 'discipline', verify: 'self' },
  { id: 30, title: 'Five Minute Rule', description: 'Log each expense within five minutes of spending it.', icon: 'Timer', difficulty: 3, type: 'tracking', verify: 'self' },
  { id: 31, title: 'Seven Day Streak', description: 'Keep your streak alive until it hits seven days.', icon: 'Flame', difficulty: 4, type: 'challenge', verify: 'self' },
  { id: 32, title: 'Just Water', description: 'Choose water over a bought drink today.', icon: 'GlassWater', difficulty: 1, type: 'lifestyle', verify: 'self' },
  { id: 33, title: 'Learn to Invest', description: 'Spend 15 minutes reading about how investing works.', icon: 'BookOpen', difficulty: 2, type: 'learning', verify: 'self' },
  { id: 34, title: 'Pay Yourself First', description: 'The moment money lands, move ₹50 straight to savings.', icon: 'ArrowDownToLine', difficulty: 2, type: 'saving', verify: 'self' },
  { id: 35, title: 'Offline Only', description: 'Make zero online purchases for a full day.', icon: 'WifiOff', difficulty: 4, type: 'discipline', verify: 'self' },
  { id: 36, title: 'The Big Three', description: 'Open Insights and study your top three categories.', icon: 'ChartPie', difficulty: 2, type: 'tracking', verify: 'self' },
  { id: 37, title: 'Beat Yesterday', description: 'Spend less today than you did yesterday.', icon: 'TrendingDown', difficulty: 3, type: 'budgeting', verify: 'auto', auto: { kind: 'less_than_yesterday' } },
  { id: 38, title: 'The Perfect Zero', description: 'A full day with not a single rupee spent.', icon: 'Sparkles', difficulty: 5, type: 'challenge', verify: 'auto', auto: { kind: 'zero_spend' } },
  { id: 39, title: 'Skip Dessert', description: 'Pass on the sweet add-on and pocket the difference.', icon: 'IceCream', difficulty: 1, type: 'discipline', verify: 'self' },
  { id: 40, title: 'Nightly Check-in', description: 'Review how your day went before you sleep.', icon: 'BedDouble', difficulty: 1, type: 'engagement', verify: 'self' },
  { id: 41, title: 'Budgeting 101', description: 'Spend 10 minutes learning one budgeting technique.', icon: 'GraduationCap', difficulty: 2, type: 'learning', verify: 'self' },
];

export const QUEST_BANK: Quest[] = QUEST_SEEDS.map((seed) => ({
  ...seed,
  xp: xpFor(seed.verify, seed.difficulty),
}));

export const QUEST_BY_ID = new Map<number, Quest>(QUEST_BANK.map((quest) => [quest.id, quest]));

export const QUEST_TYPES: QuestType[] = Array.from(new Set(QUEST_BANK.map((q) => q.type)));

// ── "Today" in a single fixed timezone (IST, UTC+5:30, no DST) ────────────────
// Doing all day-boundary math in one zone kills the midnight-collision bug
// (item 37): the client used UTC while streak comparisons used local time.

function dayKeyForOffset(now: Date, offsetDays: number): string {
  const IST_MS = 5.5 * 60 * 60 * 1000;
  const shifted = new Date(now.getTime() + IST_MS + offsetDays * 86400000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function istDayKey(now: Date = new Date()): string {
  return dayKeyForOffset(now, 0);
}

export function istYesterdayKey(now: Date = new Date()): string {
  return dayKeyForOffset(now, -1);
}

// ── Difficulty adaptation (item 36) ───────────────────────────────────────────
// Computed once, at board generation, from the *previous* day's outcome — not
// mutated on every tap. That removes the undo-toggle farm: you can't re-apply a
// difficulty nudge by flipping a quest completed→pending→completed.

function clampDifficulty(value: number): number {
  return Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, value));
}

export function buildDefaultDifficultyMap(): Record<string, number> {
  return QUEST_TYPES.reduce((acc, type) => {
    acc[type] = DEFAULT_DIFFICULTY;
    return acc;
  }, {} as Record<string, number>);
}

export interface StoredQuestEntry {
  questId: number;
  status: QuestStatus;
  progress: number;
  /** Net XP currently applied to the user for this entry (+xp done, −xp failed,
   *  0 pending). Lets every transition be an idempotent delta. */
  xpEffect: number;
}

export interface StoredQuestState {
  date: string;
  difficultyByType: Record<string, number>;
  quests: StoredQuestEntry[];
}

/** Next day's difficulty: nudge each type up for a completed quest of that type,
 *  down for a failed one, starting from the previous map (or defaults). */
export function nextDifficultyByType(prev: StoredQuestState | null): Record<string, number> {
  const map = { ...buildDefaultDifficultyMap(), ...(prev?.difficultyByType ?? {}) };
  if (!prev) return map;
  for (const entry of prev.quests) {
    const def = QUEST_BY_ID.get(entry.questId);
    if (!def) continue;
    if (entry.status === 'completed') map[def.type] = clampDifficulty((map[def.type] ?? DEFAULT_DIFFICULTY) + 1);
    else if (entry.status === 'failed') map[def.type] = clampDifficulty((map[def.type] ?? DEFAULT_DIFFICULTY) - 1);
  }
  return map;
}

// ── Deterministic board selection ─────────────────────────────────────────────
// Seeded off userId + date so the same user's board for a given day is stable
// across repeated fetches before it's persisted.

function hashStringToSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function scoreAgainst(quest: Quest, target: number): number {
  return Math.abs(quest.difficulty - target);
}

function pickForType(type: QuestType, target: number, used: Set<number>, rng: () => number): Quest | null {
  const candidates = QUEST_BANK.filter((q) => q.type === type && !used.has(q.id));
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort((a, b) => scoreAgainst(a, target) - scoreAgainst(b, target));
  const top = sorted.slice(0, Math.min(3, sorted.length));
  return top[Math.floor(rng() * top.length)] ?? null;
}

function pickBestRemaining(difficultyByType: Record<string, number>, used: Set<number>, rng: () => number): Quest | null {
  const candidates = QUEST_BANK.filter((q) => !used.has(q.id));
  if (candidates.length === 0) return null;
  const sorted = [...candidates].sort(
    (a, b) =>
      scoreAgainst(a, clampDifficulty(difficultyByType[a.type] ?? DEFAULT_DIFFICULTY)) -
      scoreAgainst(b, clampDifficulty(difficultyByType[b.type] ?? DEFAULT_DIFFICULTY)),
  );
  const top = sorted.slice(0, Math.min(3, sorted.length));
  return top[Math.floor(rng() * top.length)] ?? null;
}

/** Build a fresh board of `QUESTS_PER_DAY` pending quests. */
export function generateBoard(
  userId: string,
  dateKey: string,
  difficultyByType: Record<string, number>,
): StoredQuestEntry[] {
  const rng = makeRng(hashStringToSeed(`${userId}|${dateKey}`));
  const used = new Set<number>();
  const selected: Quest[] = [];

  const types = shuffle(QUEST_TYPES, rng).slice(0, Math.min(QUESTS_PER_DAY, QUEST_TYPES.length));
  for (const type of types) {
    const target = clampDifficulty(difficultyByType[type] ?? DEFAULT_DIFFICULTY);
    const quest = pickForType(type, target, used, rng);
    if (quest) {
      selected.push(quest);
      used.add(quest.id);
    }
  }
  while (selected.length < QUESTS_PER_DAY) {
    const quest = pickBestRemaining(difficultyByType, used, rng);
    if (!quest) break;
    selected.push(quest);
    used.add(quest.id);
  }

  return selected.map((quest) => ({ questId: quest.id, status: 'pending' as QuestStatus, progress: 0, xpEffect: 0 }));
}

// ── Auto-quest evaluation (items 28, 32) ──────────────────────────────────────

export interface EvalContext {
  todayExpenses: number;
  yesterdayExpenses: number;
  /** monthlyIncome / 30, or null when income isn't set up. */
  dailyBudget: number | null;
}

/**
 * The status an `auto` quest should currently hold, given the day's real spend.
 * Optimistic: a quest is `completed` while its condition holds and auto-fails
 * the moment it's violated — so the XP is provisionally yours and lost if you
 * break it. Returns `pending` only when we can't judge yet (e.g. no budget set
 * for an under-budget quest), so we never punish a user we can't fairly assess.
 */
export function evaluateAuto(quest: Quest, ctx: EvalContext): QuestStatus {
  const rule = quest.auto;
  if (!rule) return 'pending';
  switch (rule.kind) {
    case 'spend_under':
      return ctx.todayExpenses <= rule.threshold ? 'completed' : 'failed';
    case 'zero_spend':
      return ctx.todayExpenses <= 0 ? 'completed' : 'failed';
    case 'under_daily_budget':
      if (ctx.dailyBudget == null || !(ctx.dailyBudget > 0)) return 'pending';
      return ctx.todayExpenses <= ctx.dailyBudget ? 'completed' : 'failed';
    case 'less_than_yesterday':
      // No baseline (no spend yesterday) → can't fairly judge "less than", hold.
      if (!(ctx.yesterdayExpenses > 0)) return 'pending';
      return ctx.todayExpenses < ctx.yesterdayExpenses ? 'completed' : 'failed';
    default:
      return 'pending';
  }
}

/** The XP effect a given status carries for a quest (+xp done, −xp failed, 0 else). */
export function xpEffectFor(quest: Quest, status: QuestStatus): number {
  if (status === 'completed') return quest.xp;
  if (status === 'failed') return -quest.xp;
  return 0;
}

// ── Enrichment for the client ─────────────────────────────────────────────────
// The client renders whatever the server sends and never sources XP/type/etc.
// itself, so we ship the full definition alongside each entry.

export interface EnrichedQuest {
  questId: number;
  id: number;
  title: string;
  description: string;
  icon: string;
  type: QuestType;
  difficulty: number;
  xp: number;
  verify: VerifyKind;
  status: QuestStatus;
  progress: number;
}

export interface EnrichedState {
  date: string;
  difficultyByType: Record<string, number>;
  quests: EnrichedQuest[];
}

export function enrichState(state: StoredQuestState): EnrichedState {
  return {
    date: state.date,
    difficultyByType: state.difficultyByType,
    quests: state.quests
      .map((entry) => {
        const def = QUEST_BY_ID.get(entry.questId);
        if (!def) return null;
        return {
          questId: def.id,
          id: def.id,
          title: def.title,
          description: def.description,
          icon: def.icon,
          type: def.type,
          difficulty: def.difficulty,
          xp: def.xp,
          verify: def.verify,
          status: entry.status,
          progress: entry.progress,
        } as EnrichedQuest;
      })
      .filter((q): q is EnrichedQuest => q !== null),
  };
}
