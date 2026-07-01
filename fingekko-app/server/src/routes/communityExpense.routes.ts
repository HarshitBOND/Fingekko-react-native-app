import { Request, Response, Router } from 'express';
import authMiddleware from '../middleware/auth.js';
import communityExpenseRepository from '../repositories/communityExpenseRepository.js';
import { createCommunityExpense, updateCommunityExpense } from '../services/communityExpenseService.js';

const router = Router();

router.use(authMiddleware);

function getCurrentUserId(req: Request) {
  const user = req.user as any;
  return user?._id?.toString?.() || user?.id?.toString?.() || '';
}

function serializeUser(user: any) {
  if (!user) {
    return null;
  }

  return {
    id: user._id?.toString?.() || user.id?.toString?.() || user.toString?.() || '',
    name: user.name,
    email: user.email,
    avatarKey: user.avatarKey,
  };
}

function toId(value: any) {
  return value?._id?.toString?.() || value?.toString?.() || '';
}

function serializeExpense(expense: any) {
  return {
    id: expense._id.toString(),
    description: expense.description,
    amount: expense.amount,
    expenseDate: expense.expenseDate,
    currency: expense.currency,
    notes: expense.notes,
    createdBy: serializeUser(expense.createdBy),
    paidBy: serializeUser(expense.paidBy),
    participants: (expense.participants ?? []).map((participant: any) => ({
      userId: serializeUser(participant.userId),
      amount: participant.amount,
      settled: participant.settled,
    })),
    createdAt: expense.createdAt?.toISOString?.() || new Date(expense.createdAt).toISOString(),
    updatedAt: expense.updatedAt?.toISOString?.() || new Date(expense.updatedAt).toISOString(),
  };
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const expenses = await communityExpenseRepository.listForUser(currentUserId);
    return res.json({ expenses: expenses.map(serializeExpense) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to fetch expenses' });
  }
});

router.get('/:expenseId', async (req: Request, res: Response) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const expense = await communityExpenseRepository.findById(String(req.params.expenseId));

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const visible =
      toId(expense.createdBy) === currentUserId ||
      toId(expense.paidBy) === currentUserId ||
      (expense.participants ?? []).some((participant: any) => toId(participant.userId) === currentUserId);

    if (!visible) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    return res.json({ expense: serializeExpense(expense) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to fetch expense' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const currentUserId = getCurrentUserId(req);

    const expense = await createCommunityExpense(currentUserId, {
      description: String(req.body?.description ?? ''),
      amount: Number(req.body?.amount ?? 0),
      expenseDate: String(req.body?.expenseDate ?? ''),
      participantIds: Array.isArray(req.body?.participantIds) ? req.body.participantIds : [],
      notes: String(req.body?.notes ?? ''),
      currency: String(req.body?.currency ?? 'INR'),
    });

    const populated = await communityExpenseRepository.findById(expense._id.toString());
    return res.status(201).json({ expense: serializeExpense(populated || expense) });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to create expense' });
  }
});

router.put('/:expenseId', async (req: Request, res: Response) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const updated = await updateCommunityExpense(currentUserId, String(req.params.expenseId), {
      description: String(req.body?.description ?? ''),
      amount: Number(req.body?.amount ?? 0),
      expenseDate: String(req.body?.expenseDate ?? ''),
      participantIds: Array.isArray(req.body?.participantIds) ? req.body.participantIds : [],
      notes: String(req.body?.notes ?? ''),
      currency: String(req.body?.currency ?? 'INR'),
    });

    return res.json({ expense: serializeExpense(updated) });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to update expense' });
  }
});

router.patch('/:expenseId/settle', async (req: Request, res: Response) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const expense = await communityExpenseRepository.findById(String(req.params.expenseId));

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const updatedParticipants = (expense.participants ?? []).map((participant: any) =>
      participant.userId.toString() === currentUserId ? { ...participant.toObject?.(), settled: true } : participant
    );

    const updated = await communityExpenseRepository.updateExpense(String(req.params.expenseId), {
      participants: updatedParticipants,
    });

    return res.json({ expense: serializeExpense(updated) });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: 'Failed to settle expense' });
  }
});

router.delete('/:expenseId', async (req: Request, res: Response) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const expense = await communityExpenseRepository.findById(String(req.params.expenseId));

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (toId(expense.createdBy) !== currentUserId) {
      return res.status(403).json({ message: 'Only the creator can delete this expense' });
    }

    await communityExpenseRepository.deleteExpense(String(req.params.expenseId));
    return res.json({ message: 'Expense deleted' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to delete expense' });
  }
});

export default router;