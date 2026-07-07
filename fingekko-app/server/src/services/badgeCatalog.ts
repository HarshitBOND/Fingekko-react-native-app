// The achievement catalog for the Goals page, and a pure function that
// decides which (if any) new badges a user has just earned. Named
// `AchievementBadge`/`BadgeDefinition` (never bare `Badge`) since
// components/ui/Badge.tsx already exports an unrelated generic pill component
// with that name.

export type BadgeId =
  | 'first_goal'
  | 'first_completion'
  | 'five_completed'
  | 'saved_10k'
  | 'saved_100k'
  | 'three_active'
  | 'streak_4'
  | 'streak_12';

export interface BadgeDefinition {
  id: BadgeId;
  label: string;
  description: string;
  icon: string;
}

export const BADGE_CATALOG: BadgeDefinition[] = [
  { id: 'first_goal', label: 'First Steps', description: 'Create your first savings goal.', icon: 'Footprints' },
  { id: 'first_completion', label: 'Goal Getter', description: 'Fully reach a savings goal.', icon: 'Trophy' },
  { id: 'five_completed', label: 'Serial Saver', description: 'Complete 5 savings goals.', icon: 'Medal' },
  { id: 'saved_10k', label: 'Big Saver', description: 'Save a cumulative ₹10,000 across your goals.', icon: 'PiggyBank' },
  { id: 'saved_100k', label: 'Wealth Builder', description: 'Save a cumulative ₹100,000 across your goals.', icon: 'Gem' },
  { id: 'three_active', label: 'Multi-Tasker', description: 'Work toward 3 goals at the same time.', icon: 'Layers' },
  { id: 'streak_4', label: 'Consistent Contributor', description: 'Contribute to a goal 4 weeks in a row.', icon: 'Flame' },
  { id: 'streak_12', label: 'Habit Master', description: 'Contribute to a goal 12 weeks in a row.', icon: 'Crown' },
];

export interface BadgeEvalGoal {
  targetAmount: number;
  currentAmount: number;
}

export interface BadgeEvalContext {
  /** Full post-action goal list for this user. */
  goals: BadgeEvalGoal[];
  contributionStreak: number;
  alreadyEarnedIds: Set<string>;
}

/** Returns only the badge ids newly earned by this context (not already-earned ones). */
export function evaluateBadges(ctx: BadgeEvalContext): BadgeId[] {
  const { goals, contributionStreak, alreadyEarnedIds } = ctx;

  const completedCount = goals.filter((g) => g.targetAmount > 0 && g.currentAmount >= g.targetAmount).length;
  const activeCount = goals.length - completedCount;
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);

  const checks: [BadgeId, boolean][] = [
    ['first_goal', goals.length >= 1],
    ['first_completion', completedCount >= 1],
    ['five_completed', completedCount >= 5],
    ['saved_10k', totalSaved >= 10000],
    ['saved_100k', totalSaved >= 100000],
    ['three_active', activeCount >= 3],
    ['streak_4', contributionStreak >= 4],
    ['streak_12', contributionStreak >= 12],
  ];

  return checks.filter(([id, met]) => met && !alreadyEarnedIds.has(id)).map(([id]) => id);
}
