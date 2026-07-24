/**
 * Quest catalog.
 *
 * Each quest carries a short punchy `title` (what shows in the list), a
 * `description` (the actual instruction), and its own `icon` — the old bank had
 * one shared icon per type, so four quests in a row looked identical.
 *
 * IDs are stable and must never be reused: saved quest state persists only
 * `questId`, so changing an id silently rewrites someone's day.
 */

import type { QuestType } from './types';
import { palette } from './design';

export interface Quest {
  id: number;
  /** Short name shown as the row headline. */
  title: string;
  /** The instruction — what the player actually has to do. */
  description: string;
  /** Lucide icon name, distinct per quest. */
  icon: string;
  difficulty: number;
  type: QuestType;
  xp: number;
}

export const QUEST_TYPE_META: Record<QuestType, { label: string; color: string; tint: string }> = {
  saving: { label: 'Saving', color: palette.success, tint: palette.successLight },
  discipline: { label: 'Discipline', color: palette.danger, tint: palette.dangerLight },
  tracking: { label: 'Tracking', color: palette.info, tint: palette.infoLight },
  engagement: { label: 'Engagement', color: palette.primaryDeep, tint: palette.primaryLight },
  budgeting: { label: 'Budgeting', color: palette.warning, tint: palette.warningLight },
  challenge: { label: 'Challenge', color: '#8B5CF6', tint: '#F1EBFE' },
  lifestyle: { label: 'Lifestyle', color: '#0EA5A5', tint: '#E4F7F7' },
  mindfulness: { label: 'Mindfulness', color: '#D97757', tint: '#FBEDE8' },
  learning: { label: 'Learning', color: '#5B9BD5', tint: palette.infoLight },
};

export const DEFAULT_QUEST_TYPE_META = {
  label: 'Quest',
  color: palette.primaryDeep,
  tint: palette.primaryLight,
};

export function getQuestTypeMeta(type?: QuestType | string) {
  if (type && type in QUEST_TYPE_META) {
    return QUEST_TYPE_META[type as QuestType];
  }
  return DEFAULT_QUEST_TYPE_META;
}

export const DIFFICULTY_META: Record<number, { label: string; color: string; tint: string }> = {
  1: { label: 'Easy', color: palette.success, tint: palette.successLight },
  2: { label: 'Light', color: palette.info, tint: palette.infoLight },
  3: { label: 'Medium', color: palette.warning, tint: palette.warningLight },
  4: { label: 'Hard', color: palette.danger, tint: palette.dangerLight },
  5: { label: 'Legendary', color: '#8B5CF6', tint: '#F1EBFE' },
};

/**
 * @deprecated The authoritative quest bank now lives on the server
 * (`server/src/quests/questBank.ts`) — it owns quest content, XP, difficulty and
 * the `self`/`auto` split, and ships each board fully enriched to the client
 * (AUDIT items 29–31). This client copy is no longer read by `useQuests`; only
 * `QUEST_TYPE_META` / `DIFFICULTY_META` above are still used, for display. Do not
 * edit the entries below expecting a gameplay effect — change the server bank.
 */
export const QUEST_BANK: Quest[] = [
  {
    id: 1,
    title: 'Pocket Change Hero',
    description: 'Put ₹50 aside today — small, but it counts.',
    icon: 'PiggyBank',
    difficulty: 1,
    type: 'saving',
    xp: 40,
  },
  {
    id: 2,
    title: 'The Hundred Club',
    description: 'Move ₹100 into savings before the day ends.',
    icon: 'Coins',
    difficulty: 1,
    type: 'saving',
    xp: 50,
  },
  {
    id: 3,
    title: 'Double Century',
    description: 'Bank ₹200 today without touching it again.',
    icon: 'Landmark',
    difficulty: 2,
    type: 'saving',
    xp: 80,
  },
  {
    id: 4,
    title: 'Hold the Line',
    description: 'No impulse buys today. Pause before every purchase.',
    icon: 'ShieldCheck',
    difficulty: 2,
    type: 'discipline',
    xp: 90,
  },
  {
    id: 5,
    title: 'Kitchen Wins',
    description: "Don't order food online today — not once.",
    icon: 'UtensilsCrossed',
    difficulty: 2,
    type: 'discipline',
    xp: 100,
  },
  {
    id: 6,
    title: 'Nothing Escapes',
    description: 'Log every single expense you make today.',
    icon: 'ClipboardList',
    difficulty: 1,
    type: 'tracking',
    xp: 50,
  },
  {
    id: 7,
    title: 'Stay Close',
    description: 'Check in on FinGekko three times today.',
    icon: 'Bell',
    difficulty: 1,
    type: 'engagement',
    xp: 30,
  },
  {
    id: 8,
    title: 'The Weekly Review',
    description: 'Look back at this week’s spending and spot one pattern.',
    icon: 'CalendarCheck',
    difficulty: 2,
    type: 'tracking',
    xp: 70,
  },
  {
    id: 9,
    title: 'One Less Thing',
    description: 'Find one expense you were about to make — and skip it.',
    icon: 'CircleSlash',
    difficulty: 2,
    type: 'discipline',
    xp: 80,
  },
  {
    id: 10,
    title: 'Every Coin Counts',
    description: 'Collect all your loose change into one place today.',
    icon: 'Coins',
    difficulty: 1,
    type: 'saving',
    xp: 40,
  },
  {
    id: 11,
    title: 'Under Three Hundred',
    description: 'Keep your total spend below ₹300 for the whole day.',
    icon: 'Gauge',
    difficulty: 3,
    type: 'budgeting',
    xp: 120,
  },
  {
    id: 12,
    title: 'Three Square Meals',
    description: 'Log breakfast, lunch and dinner — every one of them.',
    icon: 'Soup',
    difficulty: 2,
    type: 'tracking',
    xp: 70,
  },
  {
    id: 13,
    title: 'Midnight Guard',
    description: 'No late-night ordering. The cart closes after dinner.',
    icon: 'MoonStar',
    difficulty: 2,
    type: 'discipline',
    xp: 90,
  },
  {
    id: 14,
    title: 'Clean Sweep',
    description: 'Finish every other quest on your board today.',
    icon: 'Trophy',
    difficulty: 4,
    type: 'challenge',
    xp: 200,
  },
  {
    id: 15,
    title: 'Delete the Temptation',
    description: 'Stay out of every food delivery app for a full day.',
    icon: 'Bike',
    difficulty: 3,
    type: 'discipline',
    xp: 130,
  },
  {
    id: 16,
    title: 'The Five Hundred',
    description: 'Save ₹500 across this week. Chip away at it daily.',
    icon: 'Vault',
    difficulty: 4,
    type: 'saving',
    xp: 220,
  },
  {
    id: 17,
    title: 'Name the Big One',
    description: 'Find and log your largest expense of the day.',
    icon: 'TrendingUp',
    difficulty: 1,
    type: 'tracking',
    xp: 40,
  },
  {
    id: 18,
    title: 'After Eight',
    description: 'Spend nothing at all after 8 PM tonight.',
    icon: 'Clock',
    difficulty: 2,
    type: 'discipline',
    xp: 100,
  },
  {
    id: 19,
    title: 'Home Cooked',
    description: 'Make at least one meal yourself today.',
    icon: 'ChefHat',
    difficulty: 2,
    type: 'lifestyle',
    xp: 90,
  },
  {
    id: 20,
    title: 'Eyes on the Prize',
    description: 'Open your savings goals and check how close you are.',
    icon: 'Target',
    difficulty: 1,
    type: 'engagement',
    xp: 30,
  },
  {
    id: 21,
    title: 'Ten Quiet Minutes',
    description: 'Sit with your finances for ten focused minutes.',
    icon: 'Brain',
    difficulty: 1,
    type: 'mindfulness',
    xp: 40,
  },
  {
    id: 22,
    title: 'Skip the Snack Run',
    description: 'Buy no snacks outside today. Eat what you have.',
    icon: 'Cookie',
    difficulty: 2,
    type: 'discipline',
    xp: 80,
  },
  {
    id: 23,
    title: 'Before Noon',
    description: 'Move ₹100 to savings before the clock hits 12.',
    icon: 'Sunrise',
    difficulty: 2,
    type: 'saving',
    xp: 70,
  },
  {
    id: 24,
    title: 'Miles and Money',
    description: 'Log everything you spent getting around today.',
    icon: 'Bus',
    difficulty: 1,
    type: 'tracking',
    xp: 50,
  },
  {
    id: 25,
    title: 'The Quiet Evening',
    description: 'Get through the whole evening spending nothing.',
    icon: 'Moon',
    difficulty: 3,
    type: 'discipline',
    xp: 120,
  },
  {
    id: 26,
    title: 'Inside the Lines',
    description: 'Finish the day under your daily budget.',
    icon: 'Ruler',
    difficulty: 3,
    type: 'budgeting',
    xp: 130,
  },
  {
    id: 27,
    title: 'The Thousand',
    description: 'Save ₹1,000 over the course of this month.',
    icon: 'Vault',
    difficulty: 5,
    type: 'saving',
    xp: 300,
  },
  {
    id: 28,
    title: 'Lessons from Yesterday',
    description: 'Review yesterday’s spending and name one thing to change.',
    icon: 'History',
    difficulty: 2,
    type: 'mindfulness',
    xp: 80,
  },
  {
    id: 29,
    title: 'Cart Abandoned',
    description: 'Keep every shopping app closed for the whole day.',
    icon: 'ShoppingCart',
    difficulty: 3,
    type: 'discipline',
    xp: 140,
  },
  {
    id: 30,
    title: 'Five Minute Rule',
    description: 'Log each expense within five minutes of spending it.',
    icon: 'Timer',
    difficulty: 3,
    type: 'tracking',
    xp: 150,
  },
  {
    id: 31,
    title: 'Seven Day Streak',
    description: 'Keep your streak alive until it hits seven days.',
    icon: 'Flame',
    difficulty: 4,
    type: 'challenge',
    xp: 250,
  },
  {
    id: 32,
    title: 'Just Water',
    description: 'Choose water over a bought drink today.',
    icon: 'GlassWater',
    difficulty: 1,
    type: 'lifestyle',
    xp: 40,
  },
  {
    id: 33,
    title: 'Learn to Invest',
    description: 'Spend 15 minutes reading about how investing works.',
    icon: 'BookOpen',
    difficulty: 2,
    type: 'learning',
    xp: 90,
  },
  {
    id: 34,
    title: 'Pay Yourself First',
    description: 'The moment money lands, move ₹50 straight to savings.',
    icon: 'ArrowDownToLine',
    difficulty: 2,
    type: 'saving',
    xp: 80,
  },
  {
    id: 35,
    title: 'Offline Only',
    description: 'Make zero online purchases for a full day.',
    icon: 'WifiOff',
    difficulty: 4,
    type: 'discipline',
    xp: 180,
  },
  {
    id: 36,
    title: 'The Big Three',
    description: 'Open Insights and study your top three categories.',
    icon: 'ChartPie',
    difficulty: 2,
    type: 'tracking',
    xp: 70,
  },
  {
    id: 37,
    title: 'Beat Yesterday',
    description: 'Spend less today than you did yesterday.',
    icon: 'TrendingDown',
    difficulty: 3,
    type: 'budgeting',
    xp: 120,
  },
  {
    id: 38,
    title: 'The Perfect Zero',
    description: 'A full day with not a single rupee spent.',
    icon: 'Sparkles',
    difficulty: 5,
    type: 'challenge',
    xp: 350,
  },
  {
    id: 39,
    title: 'Skip Dessert',
    description: 'Pass on the sweet add-on and pocket the difference.',
    icon: 'IceCream',
    difficulty: 1,
    type: 'discipline',
    xp: 50,
  },
  {
    id: 40,
    title: 'Nightly Check-in',
    description: 'Review how your day went before you sleep.',
    icon: 'BedDouble',
    difficulty: 1,
    type: 'engagement',
    xp: 30,
  },
  {
    id: 41,
    title: 'Budgeting 101',
    description: 'Spend 10 minutes learning one budgeting technique.',
    icon: 'GraduationCap',
    difficulty: 2,
    type: 'learning',
    xp: 90,
  },
];

export const QUEST_BY_ID = new Map(QUEST_BANK.map((quest) => [quest.id, quest]));

export const QUEST_TYPES = Array.from(new Set(QUEST_BANK.map((quest) => quest.type)));
