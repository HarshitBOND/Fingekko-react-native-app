import { Request, Response, Router } from 'express';
import authMiddleware from '../middleware/auth.js';
import communityExpenseRepository from '../repositories/communityExpenseRepository.js';
import { createCommunityExpense, updateCommunityExpense } from '../services/communityExpenseService.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

const router = Router();

router.use(authMiddleware);

async function resolveIds(paidBy: string, participantIds: { userId: string; amount: number }[], currentUserId: string) {
  const clerkIdsToResolve = new Set<string>();
  if (paidBy) clerkIdsToResolve.add(paidBy);
  participantIds.forEach((p: any) => {
    if (p.userId) clerkIdsToResolve.add(p.userId);
  });

  const resolvedUsers = await User.find({
    $or: [
      { clerkId: { $in: Array.from(clerkIdsToResolve) } },
      { _id: { $in: Array.from(clerkIdsToResolve).filter(id => mongoose.Types.ObjectId.isValid(id)) } }
    ]
  });

  const userMap = new Map<string, string>(); // maps clerkId or _id to _id
  resolvedUsers.forEach((u: any) => {
    userMap.set(u.clerkId, u._id.toString());
    userMap.set(u._id.toString(), u._id.toString());
  });

  const resolvedPaidBy = (paidBy && userMap.get(paidBy)) || currentUserId;

  const resolvedParticipants = participantIds.map((p: any) => ({
    userId: userMap.get(p.userId) || p.userId,
    amount: p.amount
  })).filter((p: any) => mongoose.Types.ObjectId.isValid(p.userId));

  return { resolvedPaidBy, resolvedParticipants };
}

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

function paidByIncludes(expense: any, userId: string) {
  return (expense.paidBy ?? []).some((entry: any) => toId(entry.userId) === userId);
}

function serializeExpense(expense: any, currentUserId?: string) {
  const paidByList = (expense.paidBy ?? []).map((entry: any) => ({
    userId: serializeUser(entry.userId),
    amount: entry.amount,
  }));

  const participants = (expense.participants ?? []).map((participant: any) => ({
    userId: serializeUser(participant.userId),
    amount: participant.amount,
    settled: participant.settled,
  }));

  const yourAmountPaid = currentUserId
    ? roundTwo((expense.paidBy ?? []).filter((p: any) => toId(p.userId) === currentUserId).reduce((sum: number, p: any) => sum + p.amount, 0))
    : 0;
  const yourAmountOwed = currentUserId
    ? roundTwo((expense.participants ?? []).filter((p: any) => toId(p.userId) === currentUserId).reduce((sum: number, p: any) => sum + p.amount, 0))
    : 0;

  return {
    id: expense._id.toString(),
    groupId: expense.groupId ? toId(expense.groupId) : null,
    groupName: expense.groupId?.name ?? null,
    description: expense.description,
    amount: expense.amount,
    expenseDate: expense.expenseDate?.toISOString?.() ?? expense.expenseDate ?? null,
    currency: expense.currency,
    notes: expense.notes,
    createdBy: serializeUser(expense.createdBy),
    paidBy: paidByList,
    participants,
    yourAmountPaid,
    yourAmountOwed,
    netBalance: roundTwo(yourAmountPaid - yourAmountOwed),
    createdAt: expense.createdAt?.toISOString?.() || new Date(expense.createdAt).toISOString(),
    updatedAt: expense.updatedAt?.toISOString?.() || new Date(expense.updatedAt).toISOString(),
  };
}

function roundTwo(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const expenses = await communityExpenseRepository.listForUser(currentUserId);
    return res.json({ expenses: expenses.map((expense) => serializeExpense(expense, currentUserId)) });
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

    let splitType = req.body?.splitType;
    let participantIds = req.body?.participantIds || [];

    // Transform string arrays to object format expected by the service
    if (Array.isArray(participantIds)) {
      participantIds = participantIds.map((p: any) => {
        if (typeof p === 'string') {
          return { userId: p, amount: 0 };
        } else if (p && typeof p === 'object') {
          return {
            userId: String(p.userId || p.id || ''),
            amount: Number(p.amount ?? 0),
          };
        }
        return { userId: '', amount: 0 };
      }).filter((p: any) => p.userId);
    } else {
      participantIds = [];
    }

    const validSplitTypes = [
      "equalPaidByYou",
      "unequalPaidByYou",
      "equalPaidByOthers",
      "unequalPaidByOthers",
      "fullyOwedPaidByYou",
      "fullyOwedPaidByOthers",
    ];

    if (!splitType || !validSplitTypes.includes(splitType)) {
      splitType = "equalPaidByYou";
    }

    const { resolvedPaidBy, resolvedParticipants } = await resolveIds(
      String(req.body?.paidBy ?? ''),
      participantIds,
      currentUserId
    );

    const expense = await createCommunityExpense(currentUserId, {
      description: String(req.body?.description ?? ''),
      amount: Number(req.body?.amount ?? 0),
      expenseDate: String(req.body?.expenseDate ?? ''),
      splitType: splitType,
      participantIds: resolvedParticipants,
      notes: String(req.body?.notes ?? ''),
      currency: String(req.body?.currency ?? 'INR'),
      paidBy: resolvedPaidBy,
      groupId: req.body?.groupId ? String(req.body.groupId) : undefined,
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

    let splitType = req.body?.splitType;
    let participantIds = req.body?.participantIds || [];

    if (Array.isArray(participantIds)) {
      participantIds = participantIds.map((p: any) => {
        if (typeof p === 'string') {
          return { userId: p, amount: 0 };
        } else if (p && typeof p === 'object') {
          return {
            userId: String(p.userId || p.id || ''),
            amount: Number(p.amount ?? 0),
          };
        }
        return { userId: '', amount: 0 };
      }).filter((p: any) => p.userId);
    } else {
      participantIds = [];
    }

    const validSplitTypes = [
      "equalPaidByYou",
      "unequalPaidByYou",
      "equalPaidByOthers",
      "unequalPaidByOthers",
      "fullyOwedPaidByYou",
      "fullyOwedPaidByOthers",
    ];

    if (!splitType || !validSplitTypes.includes(splitType)) {
      splitType = "equalPaidByYou";
    }

    const { resolvedPaidBy, resolvedParticipants } = await resolveIds(
      String(req.body?.paidBy ?? ''),
      participantIds,
      currentUserId
    );

    const updated = await updateCommunityExpense(currentUserId, String(req.params.expenseId), {
      description: String(req.body?.description ?? ''),
      amount: Number(req.body?.amount ?? 0),
      expenseDate: String(req.body?.expenseDate ?? ''),
      splitType: splitType,
      participantIds: resolvedParticipants,
      notes: String(req.body?.notes ?? ''),
      currency: String(req.body?.currency ?? 'INR'),
      paidBy: resolvedPaidBy,
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

    await communityExpenseRepository.SoftdeleteExpense(
      String(req.params.expenseId),
      currentUserId,
      { action: 'DELETE', performedBy: currentUserId }
    );
    return res.json({ message: 'Expense deleted' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to delete expense' });
  }
});

export default router;