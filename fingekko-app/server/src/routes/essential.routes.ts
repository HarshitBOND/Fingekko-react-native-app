import express, { Request, Response } from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  createEssential,
  deleteEssential,
  getEssentialById,
  listEssentials,
  monthKeyOf,
  setEssentialPaid,
  summarizeEssentials,
  updateEssential,
} from '../repositories/essentialRepository.js';
import { updateById } from '../repositories/userRepository.js';

import { processGoalShiftOnEssentialChange } from '../services/goalShiftService.js';

const router = express.Router();

// Hard sanity ceiling on a single bill — a backstop against typos/overflow, far
// above any real recurring essential. Mirrors the transaction guard's intent.
const MAX_ESSENTIAL_AMOUNT = 100_000_000;

function validateFields(body: any, partial: boolean): { error?: string; value?: { name?: string; amount?: number; dueDay?: number; category?: string } } {
  const value: { name?: string; amount?: number; dueDay?: number; category?: string } = {};

  if (body.name !== undefined || !partial) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return { error: 'A name is required.' };
    }
    value.name = body.name.trim();
  }

  if (body.amount !== undefined || !partial) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_ESSENTIAL_AMOUNT) {
      return { error: 'Amount must be greater than 0 and within a sane range.' };
    }
    value.amount = amount;
  }

  if (body.dueDay !== undefined || !partial) {
    const dueDay = Number(body.dueDay);
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
      return { error: 'Due day must be a day of month between 1 and 31.' };
    }
    value.dueDay = dueDay;
  }

  if (body.category !== undefined) {
    value.category = typeof body.category === 'string' && body.category.trim() ? body.category.trim() : 'other';
  }

  return { value };
}

const userIdOf = (req: Request) => req.user.id ?? req.user._id?.toString();

// List the user's essentials + the totals every budget surface reserves against.
router.get('/', authMiddleware, async (req: Request, res: Response, next: Function) => {
  try {
    const userId = userIdOf(req);
    const monthKey = monthKeyOf();
    const [essentials, summary] = await Promise.all([
      listEssentials(userId, monthKey),
      summarizeEssentials(userId, monthKey),
    ]);
    return res.json({ essentials, summary, onboarded: Boolean(req.user.essentialsOnboarded) });
  } catch (error) {
    return next(error);
  }
});

router.post('/', authMiddleware, async (req: Request, res: Response, next: Function) => {
  const { error, value } = validateFields(req.body ?? {}, false);
  if (error) return res.status(400).json({ error });

  try {
    const userId = userIdOf(req);
    const monthKey = monthKeyOf();
    const oldSummary = await summarizeEssentials(userId, monthKey);

    const essential = await createEssential(userId, {
      name: value!.name!,
      amount: value!.amount!,
      dueDay: value!.dueDay!,
      category: value!.category,
    });

    const newSummary = await summarizeEssentials(userId, monthKey);
    const goalShift = await processGoalShiftOnEssentialChange(
      userId,
      oldSummary.monthlyTotal,
      newSummary.monthlyTotal,
      essential.name,
      essential.amount,
      false
    );

    return res.status(201).json({ essential, goalShift });
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', authMiddleware, async (req: Request, res: Response, next: Function) => {
  const { error, value } = validateFields(req.body ?? {}, true);
  if (error) return res.status(400).json({ error });
  if (!value || Object.keys(value).length === 0) {
    return res.status(400).json({ error: 'Nothing to update.' });
  }

  try {
    const userId = userIdOf(req);
    const id = String(req.params.id);
    const existing = await getEssentialById(userId, id);
    if (!existing) return res.status(404).json({ error: 'Essential not found.' });

    const monthKey = monthKeyOf();
    const oldSummary = await summarizeEssentials(userId, monthKey);

    const essential = await updateEssential(userId, id, value);
    if (!essential) return res.status(404).json({ error: 'Essential not found.' });

    const newSummary = await summarizeEssentials(userId, monthKey);

    const goalShift = await processGoalShiftOnEssentialChange(
      userId,
      oldSummary.monthlyTotal,
      newSummary.monthlyTotal,
      essential.name,
      essential.amount,
      false
    );

    return res.json({ essential, goalShift });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', authMiddleware, async (req: Request, res: Response, next: Function) => {
  try {
    const userId = userIdOf(req);
    const id = String(req.params.id);
    const existing = await getEssentialById(userId, id);
    if (!existing) return res.status(404).json({ error: 'Essential not found.' });

    const monthKey = monthKeyOf();
    const oldSummary = await summarizeEssentials(userId, monthKey);

    const deleted = await deleteEssential(userId, id);
    const newSummary = await summarizeEssentials(userId, monthKey);

    const goalShift = await processGoalShiftOnEssentialChange(
      userId,
      oldSummary.monthlyTotal,
      newSummary.monthlyTotal,
      existing.name,
      existing.amount,
      true
    );

    return res.json({ essential: deleted, goalShift });
  } catch (error) {
    return next(error);
  }
});

// Toggle "paid this month" for one bill.
router.post('/:id/paid', authMiddleware, async (req: Request, res: Response, next: Function) => {
  const paid = req.body?.paid;
  if (typeof paid !== 'boolean') {
    return res.status(400).json({ error: 'paid must be a boolean.' });
  }
  try {
    const userId = userIdOf(req);
    const id = String(req.params.id);
    const essential = await setEssentialPaid(userId, id, paid);
    if (!essential) return res.status(404).json({ error: 'Essential not found.' });
    return res.json({ essential });
  } catch (error) {
    return next(error);
  }
});

// Mark the essentials onboarding form complete (valid even with zero bills).
router.post('/complete-onboarding', authMiddleware, async (req: Request, res: Response, next: Function) => {
  try {
    const userId = userIdOf(req);
    const user = await updateById(userId, { essentialsOnboarded: true });
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
});

export default router;
