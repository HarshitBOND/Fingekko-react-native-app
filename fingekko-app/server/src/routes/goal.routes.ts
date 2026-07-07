import { Request, Response, Router } from 'express';
import authMiddleware from '../middleware/auth.js';
import { createGoal, deleteGoal, getGoalById, listGoals, updateGoal } from '../repositories/goalRepository.js';
import { awardXp } from '../repositories/userRepository.js';

const router = Router();

router.use(authMiddleware);

// Gamification tuning: how much XP goal actions earn.
const XP_NEW_GOAL = 15;
const XP_MIN_CONTRIBUTION = 5;
const XP_MAX_CONTRIBUTION = 100;
const XP_GOAL_COMPLETE = 200;

function xpForContribution(amount: number) {
  if (amount <= 0) return 0;
  return Math.min(XP_MAX_CONTRIBUTION, Math.max(XP_MIN_CONTRIBUTION, Math.round(amount / 50)));
}

function isGoalComplete(goal: { targetAmount: number; currentAmount: number }) {
  return goal.targetAmount > 0 && goal.currentAmount >= goal.targetAmount;
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
    return res.json({ goals });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to fetch goals' });
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

    const xpResult = await awardXp(currentUserId, XP_NEW_GOAL);

    return res.status(201).json({ goal, xpEarned: XP_NEW_GOAL, justCompleted: false, ...xpResult });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to create goal' });
  }
});

router.put('/:goalId', async (req: Request, res: Response) => {
  const { title, targetAmount, currentAmount, deadline, emoji } = req.body ?? {};

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

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (targetAmount !== undefined) updates.targetAmount = targetAmount;
    if (currentAmount !== undefined) updates.currentAmount = currentAmount;
    if (deadline !== undefined) updates.deadline = deadline;
    if (emoji !== undefined) updates.emoji = emoji;

    const goal = await updateGoal(currentUserId, goalId, updates);

    // Gamification: reward real progress (money actually added toward the
    // goal), plus a bigger one-time bonus the moment it's fully reached.
    const contribution = typeof currentAmount === 'number' ? Math.max(0, currentAmount - previous.currentAmount) : 0;
    const wasComplete = isGoalComplete(previous);
    const nowComplete = isGoalComplete(goal);
    const justCompleted = nowComplete && !wasComplete;

    const xpEarned = xpForContribution(contribution) + (justCompleted ? XP_GOAL_COMPLETE : 0);
    const xpResult = xpEarned > 0
      ? await awardXp(currentUserId, xpEarned)
      : { xp: undefined, level: undefined, leveledUp: false, xpDelta: 0 };

    return res.json({ goal, xpEarned, justCompleted, ...xpResult });
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

export default router;
