import { Request, Response, Router } from 'express';
import authMiddleware from '../middleware/auth.js';
import { createGoal, deleteGoal, listGoals, updateGoal } from '../repositories/goalRepository.js';

const router = Router();

router.use(authMiddleware);

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

    return res.status(201).json({ goal });
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
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (targetAmount !== undefined) updates.targetAmount = targetAmount;
    if (currentAmount !== undefined) updates.currentAmount = currentAmount;
    if (deadline !== undefined) updates.deadline = deadline;
    if (emoji !== undefined) updates.emoji = emoji;

    const goal = await updateGoal(currentUserId, String(req.params.goalId), updates);
    return res.json({ goal });
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
