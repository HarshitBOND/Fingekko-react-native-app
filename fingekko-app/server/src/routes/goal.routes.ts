import { Request, Response, Router } from 'express';
import authMiddleware from '../middleware/auth.js';
import { createGoal, deleteGoal, getGoalById, listGoals, updateGoal } from '../repositories/goalRepository.js';
import { awardXp, awardBadges, updateGoalStats } from '../repositories/userRepository.js';
import { logXpEvent, listXpEvents } from '../repositories/xpEventRepository.js';
import { evaluateBadges, BADGE_CATALOG, type BadgeId } from '../services/badgeCatalog.js';

const router = Router();

router.use(authMiddleware);

// Gamification tuning: how much XP goal actions earn.
const XP_NEW_GOAL = 15;
const XP_MIN_CONTRIBUTION = 5;
const XP_MAX_CONTRIBUTION = 100;
const XP_GOAL_COMPLETE = 200;
const XP_BADGE_UNLOCK = 25;

const MILESTONE_THRESHOLDS = [0.25, 0.5, 0.75] as const;
const MILESTONE_XP: Record<number, number> = { 0.25: 20, 0.5: 35, 0.75: 50 };

// Fixed 7-day buckets anchored to the Unix epoch (not calendar Mon-Sun weeks)
// — all the streak logic needs is equal-length periods and a "gap === 1"
// check, not a displayed weekly calendar.
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function xpForContribution(amount: number) {
  if (amount <= 0) return 0;
  return Math.min(XP_MAX_CONTRIBUTION, Math.max(XP_MIN_CONTRIBUTION, Math.round(amount / 50)));
}

function isGoalComplete(goal: { targetAmount: number; currentAmount: number }) {
  return goal.targetAmount > 0 && goal.currentAmount >= goal.targetAmount;
}

function progressRatio(goal: { targetAmount: number; currentAmount: number }) {
  return goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0;
}

function crossedMilestones(previousRatio: number, nextRatio: number): number[] {
  return MILESTONE_THRESHOLDS.filter((t) => previousRatio < t && nextRatio >= t);
}

function weekBucketFor(dateStr: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!match) {
    return Math.floor(Date.now() / WEEK_MS);
  }
  const [, y, m, d] = match;
  return Math.floor(Date.UTC(Number(y), Number(m) - 1, Number(d)) / WEEK_MS);
}

function describeBadges(ids: BadgeId[]) {
  return ids.map((id) => {
    const def = BADGE_CATALOG.find((b) => b.id === id)!;
    return { id: def.id, label: def.label, icon: def.icon };
  });
}

async function getCurrentUserId(req: any) {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  return req.user.id ?? req.user._id?.toString();
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const currentUserId = await getCurrentUserId(req);
    const goals = await listGoals(currentUserId);
    const goalStats = {
      contributionStreak: (req.user as any).goalStats?.contributionStreak ?? 0,
      bestContributionStreak: (req.user as any).goalStats?.bestContributionStreak ?? 0,
    };
    const badges = (req.user as any).badges ?? [];

    return res.json({ goals, goalStats, badges, badgeCatalog: BADGE_CATALOG });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to fetch goals' });
  }
});

router.get('/xp-events', async (req: Request, res: Response) => {
  try {
    const currentUserId = await getCurrentUserId(req);
    const events = await listXpEvents(currentUserId, 50);
    return res.json({ events });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to fetch XP history' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const { title, targetAmount, currentAmount, deadline, emoji } = req.body ?? {};

  if (!title) {
    return res.status(400).json({ message: 'Goal title is required.' });
  }

  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return res.status(400).json({ message: 'Target amount must be greater than 0.' });
  }

  if (!deadline) {
    return res.status(400).json({ message: 'Deadline is required.' });
  }

  try {
    const currentUserId = await getCurrentUserId(req);
    const goal = await createGoal(currentUserId, {
      title,
      targetAmount,
      currentAmount: Number.isFinite(currentAmount) ? currentAmount : 0,
      deadline,
      emoji: emoji || '🎯',
    });

    // Evaluate badges against the fresh goal list (e.g. "first_goal").
    const allGoals = await listGoals(currentUserId);
    const priorGoalStats = (req.user as any).goalStats ?? {};
    const alreadyEarnedIds = new Set<string>(((req.user as any).badges ?? []).map((b: any) => String(b.id)));
    const newBadgeIds = evaluateBadges({
      goals: allGoals,
      contributionStreak: priorGoalStats.contributionStreak ?? 0,
      alreadyEarnedIds,
    });
    const badgesEarned = describeBadges(newBadgeIds);
    const badgeXp = newBadgeIds.length * XP_BADGE_UNLOCK;

    const xpEarned = XP_NEW_GOAL + badgeXp;
    const xpResult = await awardXp(currentUserId, xpEarned);

    await logXpEvent(currentUserId, {
      type: 'goal_created',
      amount: XP_NEW_GOAL,
      description: `Created goal "${goal.title}"`,
      goalId: goal.id,
    });

    if (newBadgeIds.length > 0) {
      await awardBadges(currentUserId, newBadgeIds);
      for (const badge of badgesEarned) {
        await logXpEvent(currentUserId, {
          type: 'badge_unlocked',
          amount: XP_BADGE_UNLOCK,
          description: `Unlocked badge "${badge.label}"`,
          goalId: goal.id,
        });
      }
    }

    return res.status(201).json({ goal, xpEarned, justCompleted: false, badgesEarned, ...xpResult });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to create goal' });
  }
});

router.put('/:goalId', async (req: Request, res: Response) => {
  const { title, targetAmount, currentAmount, deadline, emoji, contributionDate } = req.body ?? {};

  if (targetAmount !== undefined && (!Number.isFinite(targetAmount) || targetAmount <= 0)) {
    return res.status(400).json({ message: 'Target amount must be greater than 0.' });
  }

  try {
    const currentUserId = await getCurrentUserId(req);
    const goalId = String(req.params.goalId);

    const previous = await getGoalById(currentUserId, goalId);
    if (!previous) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    // `currentAmount` is a client-sent *absolute*, so a crafted request could
    // jump straight past the target (minting completion/milestone XP), apply a
    // negative delta, or write a negative balance. Sanitize it server-side
    // (AUDIT item 21): clamp into [what's already saved, the target]. The
    // effective target accounts for a target change in this same request.
    // NOTE: this is a bounds/anti-forgery guard, not an affordability check —
    // that stays client-side for now (item 7's known limitation).
    let sanitizedCurrentAmount: number | undefined;
    if (currentAmount !== undefined) {
      if (!Number.isFinite(currentAmount)) {
        return res.status(400).json({ message: 'currentAmount must be a number.' });
      }
      const effectiveTarget =
        Number.isFinite(targetAmount) && targetAmount > 0 ? targetAmount : previous.targetAmount;
      // Never below what's already saved (contributions only add), never above
      // the target (no overshoot). If the target was lowered below the saved
      // amount, this snaps the goal to the new target.
      sanitizedCurrentAmount = Math.min(effectiveTarget, Math.max(previous.currentAmount, currentAmount));
    }

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (targetAmount !== undefined) updates.targetAmount = targetAmount;
    if (sanitizedCurrentAmount !== undefined) updates.currentAmount = sanitizedCurrentAmount;
    if (deadline !== undefined) updates.deadline = deadline;
    if (emoji !== undefined) updates.emoji = emoji;

    const goal = await updateGoal(currentUserId, goalId, updates);

    // Gamification: reward real progress (money actually added toward the
    // goal). Everything below is gated on `contribution > 0` so unrelated
    // edits (title/target/deadline) through this same endpoint never
    // spuriously trigger milestones/streaks/badges. Derived from the *sanitized*
    // written value, so a forged absolute can't inflate the reward.
    const contribution = Math.max(0, goal.currentAmount - previous.currentAmount);
    const wasComplete = isGoalComplete(previous);
    const nowComplete = isGoalComplete(goal);
    const justCompleted = contribution > 0 && nowComplete && !wasComplete;

    const priorGoalStats = (req.user as any).goalStats ?? {};
    let contributionStreak = priorGoalStats.contributionStreak ?? 0;
    let bestContributionStreak = priorGoalStats.bestContributionStreak ?? 0;
    let streakIncreased = false;
    let milestonesHit: number[] = [];
    let badgesEarned: { id: string; label: string; icon: string }[] = [];
    let xpEarned = 0;

    if (contribution > 0) {
      const previousRatio = progressRatio(previous);
      const nextRatio = progressRatio(goal);
      milestonesHit = crossedMilestones(previousRatio, nextRatio);
      const milestoneXp = milestonesHit.reduce((sum, t) => sum + (MILESTONE_XP[t] ?? 0), 0);

      // Weekly contribution streak, mirroring the day-streak "gap must be
      // exactly 1 period or it resets" pattern from home.ts's quest system.
      const dateForBucket =
        typeof contributionDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(contributionDate)
          ? contributionDate
          : new Date().toISOString().slice(0, 10);
      const period = weekBucketFor(dateForBucket);
      const lastPeriod = priorGoalStats.lastContributionPeriod ? Number(priorGoalStats.lastContributionPeriod) : null;

      if (lastPeriod === null) {
        contributionStreak = 1;
        streakIncreased = true;
      } else if (period === lastPeriod) {
        // Same week — no change.
      } else if (period - lastPeriod === 1) {
        contributionStreak += 1;
        streakIncreased = true;
      } else if (period > lastPeriod) {
        contributionStreak = 1;
        streakIncreased = true;
      }

      bestContributionStreak = Math.max(bestContributionStreak, contributionStreak);

      if (period !== lastPeriod) {
        await updateGoalStats(currentUserId, {
          contributionStreak,
          bestContributionStreak,
          lastContributionPeriod: String(period),
        });
      }

      // Evaluate badges against the fresh post-update goal list.
      const allGoals = await listGoals(currentUserId);
      const alreadyEarnedIds = new Set<string>(((req.user as any).badges ?? []).map((b: any) => String(b.id)));
      const newBadgeIds = evaluateBadges({ goals: allGoals, contributionStreak, alreadyEarnedIds });
      badgesEarned = describeBadges(newBadgeIds);
      const badgeXp = newBadgeIds.length * XP_BADGE_UNLOCK;

      xpEarned = xpForContribution(contribution) + milestoneXp + (justCompleted ? XP_GOAL_COMPLETE : 0) + badgeXp;

      if (newBadgeIds.length > 0) {
        await awardBadges(currentUserId, newBadgeIds);
      }

      // Granular history log, even though the XP ledger update is batched
      // into a single awardXp call below.
      await logXpEvent(currentUserId, {
        type: 'goal_contribution',
        amount: xpForContribution(contribution),
        description: `Added funds to "${goal.title}"`,
        goalId: goal.id,
      });
      for (const t of milestonesHit) {
        await logXpEvent(currentUserId, {
          type: 'milestone',
          amount: MILESTONE_XP[t] ?? 0,
          description: `Reached ${Math.round(t * 100)}% of "${goal.title}"`,
          goalId: goal.id,
        });
      }
      if (justCompleted) {
        await logXpEvent(currentUserId, {
          type: 'goal_completed',
          amount: XP_GOAL_COMPLETE,
          description: `Completed goal "${goal.title}"`,
          goalId: goal.id,
        });
      }
      for (const badge of badgesEarned) {
        await logXpEvent(currentUserId, {
          type: 'badge_unlocked',
          amount: XP_BADGE_UNLOCK,
          description: `Unlocked badge "${badge.label}"`,
          goalId: goal.id,
        });
      }
    }

    const xpResult = xpEarned > 0
      ? await awardXp(currentUserId, xpEarned)
      : { xp: undefined, level: undefined, leveledUp: false, xpDelta: 0 };

    return res.json({
      goal,
      xpEarned,
      justCompleted,
      milestonesHit,
      badgesEarned,
      goalStats: { contributionStreak, bestContributionStreak },
      streakIncreased,
      ...xpResult,
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Failed to update goal';
    return res.status(message === 'Goal not found' ? 404 : 400).json({ message });
  }
});

router.delete('/:goalId', async (req: Request, res: Response) => {
  try {
    const currentUserId = await getCurrentUserId(req);
    await deleteGoal(currentUserId, String(req.params.goalId));
    return res.json({ message: 'Goal deleted' });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Failed to delete goal';
    return res.status(message === 'Goal not found' ? 404 : 400).json({ message });
  }
});

router.post('/apply-shift', async (req: Request, res: Response) => {
  const { shiftedGoals } = req.body ?? {};
  if (!Array.isArray(shiftedGoals) || shiftedGoals.length === 0) {
    return res.status(400).json({ message: 'No shifted goals provided.' });
  }

  try {
    const currentUserId = await getCurrentUserId(req);
    for (const item of shiftedGoals) {
      if (item.goalId && item.newDeadline) {
        await updateGoal(currentUserId, String(item.goalId), { deadline: item.newDeadline });
      }
    }
    return res.json({ success: true, message: 'Goal deadlines updated successfully.' });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: 'Failed to apply goal shifts.' });
  }
});

export default router;
