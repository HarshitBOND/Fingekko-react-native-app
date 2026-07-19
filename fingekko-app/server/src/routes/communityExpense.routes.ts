import { Request, Response, Router } from 'express';
import authMiddleware from '../middleware/auth.js';
import communityExpenseRepository from '../repositories/communityExpenseRepository.js';
import { createCommunityExpense, updateCommunityExpense } from '../services/communityExpenseService.js';
import { createTransaction } from '../repositories/transactionRepository.js';
import { awardXp } from '../repositories/userRepository.js';
import { logXpEvent } from '../repositories/xpEventRepository.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

// XP granted for logging an expense — keeps the gamification loop alive from the
// most common action in the app.
const XP_FOR_EXPENSE = 15;

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

// Anyone financially involved in the expense: its author, a payer, or a
// participant. These are the people who may view, edit, or delete it.
function isPartyToExpense(expense: any, userId: string) {
  return (
    toId(expense.createdBy) === userId ||
    paidByIncludes(expense, userId) ||
    (expense.participants ?? []).some((p: any) => toId(p.userId) === userId)
  );
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

  const history = (expense.history ?? []).map((entry: any) => ({
    action: entry.action,
    note: entry.note ?? '',
    performedBy: serializeUser(entry.performedBy),
    performedAt: entry.performedAt?.toISOString?.() ?? entry.performedAt ?? null,
  }));

  return {
    id: expense._id.toString(),
    groupId: expense.groupId ? toId(expense.groupId) : null,
    groupName: expense.groupId?.name ?? null,
    description: expense.description,
    amount: expense.amount,
    expenseDate: expense.expenseDate?.toISOString?.() ?? expense.expenseDate ?? null,
    currency: expense.currency,
    notes: expense.notes,
    category: expense.category ?? '',
    createdBy: serializeUser(expense.createdBy),
    paidBy: paidByList,
    participants,
    yourAmountPaid,
    yourAmountOwed,
    netBalance: currentUserId ? computeNetBalanceForUser(expense, currentUserId) : roundTwo(yourAmountPaid - yourAmountOwed),
    isDeleted: !!expense.isDeleted,
    deletedBy: expense.deletedBy ? serializeUser(expense.deletedBy) : null,
    deletedAt: expense.deletedAt?.toISOString?.() ?? expense.deletedAt ?? null,
    // Whole days remaining before the 30-day purge — the client shows a countdown.
    purgeInDays: expense.deletedAt ? purgeDaysRemaining(expense.deletedAt) : null,
    history,
    createdAt: expense.createdAt?.toISOString?.() || new Date(expense.createdAt).toISOString(),
    updatedAt: expense.updatedAt?.toISOString?.() || new Date(expense.updatedAt).toISOString(),
  };
}

const PURGE_WINDOW_DAYS = 30;

// Days left before a soft-deleted expense is auto-purged (never negative).
function purgeDaysRemaining(deletedAt: Date | string) {
  const deleted = new Date(deletedAt).getTime();
  const elapsedDays = (Date.now() - deleted) / (24 * 60 * 60 * 1000);
  return Math.max(0, Math.ceil(PURGE_WINDOW_DAYS - elapsedDays));
}

// Net balance for the current user on this single expense, accounting for which
// participant shares have already been settled (so it stays in sync with Settle Up).
function computeNetBalanceForUser(expense: any, currentUserId: string) {
  const paidByList = expense.paidBy ?? [];
  const participants = expense.participants ?? [];
  const isPayer = paidByList.some((p: any) => toId(p.userId) === currentUserId);

  if (isPayer) {
    const owedToYou = participants
      .filter((p: any) => toId(p.userId) !== currentUserId && !p.settled)
      .reduce((sum: number, p: any) => sum + p.amount, 0);
    return roundTwo(owedToYou);
  }

  const myShare = participants.find((p: any) => toId(p.userId) === currentUserId);
  if (myShare && !myShare.settled) {
    return roundTwo(-myShare.amount);
  }

  return 0;
}

function roundTwo(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const currentUserId = getCurrentUserId(req);
    // Opt-in: only screens that render greyed deleted records ask for them.
    const includeDeleted = req.query.includeDeleted === 'true' || req.query.includeDeleted === '1';
    const expenses = await communityExpenseRepository.listForUser(currentUserId, undefined, includeDeleted);
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

    if (!isPartyToExpense(expense, currentUserId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    return res.json({ expense: serializeExpense(expense, currentUserId) });
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
      category: req.body?.category ? String(req.body.category) : '',
    });

    // Mirror the current user's own share into their personal transactions so
    // Home / Insights (which read /api/transactions) reflect this expense too.
    const myShare = (expense.participants ?? [])
      .filter((p: any) => toId(p.userId) === currentUserId)
      .reduce((sum: number, p: any) => sum + p.amount, 0);

    if (myShare > 0) {
      try {
        await createTransaction(currentUserId, {
          type: 'expense',
          amount: roundTwo(myShare),
          category: req.body?.category ? String(req.body.category) : 'Other',
          date: String(req.body?.expenseDate ?? new Date().toISOString()),
        });
      } catch (mirrorError) {
        console.error('Failed to mirror expense into transactions:', mirrorError);
      }
    }

    // Reward the action so streak/XP surfaces actually move when users track spending.
    let xpAward = null;
    try {
      const award = await awardXp(currentUserId, XP_FOR_EXPENSE);
      await logXpEvent(currentUserId, {
        type: 'expense_added',
        amount: XP_FOR_EXPENSE,
        description: `Tracked expense: ${String(req.body?.description ?? '')}`.trim(),
      });
      xpAward = award;
    } catch (xpError) {
      console.error('Failed to award XP for expense:', xpError);
    }

    const populated = await communityExpenseRepository.findById(expense._id.toString());
    return res.status(201).json({ expense: serializeExpense(populated || expense), xpAward });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to create expense' });
  }
});

router.put('/:expenseId', async (req: Request, res: Response) => {
  try {
    const currentUserId = getCurrentUserId(req);

    // A soft-deleted expense is "numb" — a frozen record awaiting purge that
    // nobody can edit. Guard here before doing any of the resolve work.
    const existing = await communityExpenseRepository.findById(String(req.params.expenseId));
    if (!existing) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    if (!isPartyToExpense(existing, currentUserId)) {
      return res.status(403).json({ message: 'Only people in this split can edit it' });
    }
    if (existing.isDeleted) {
      return res.status(409).json({ message: 'This expense is deleted and can no longer be edited' });
    }

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

async function handleSettle(req: Request, res: Response) {
  try {
    const currentUserId = getCurrentUserId(req);
    const expense = await communityExpenseRepository.findById(String(req.params.expenseId));

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (!isPartyToExpense(expense, currentUserId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (expense.isDeleted) {
      return res.status(409).json({ message: 'This expense is deleted and can no longer be settled' });
    }

    // Which participant's share is being settled — defaults to the caller's own
    // share, but the client passes the other side's userId when the caller is
    // the payer settling what a friend owes them.
    const targetUserId = String(req.body?.userId || currentUserId);

    const updatedParticipants = (expense.participants ?? []).map((participant: any) =>
      toId(participant.userId) === targetUserId ? { ...participant.toObject?.(), settled: true } : participant
    );

    const updated = await communityExpenseRepository.updateExpense(
      String(req.params.expenseId),
      { participants: updatedParticipants },
      { action: 'SETTLED', performedBy: currentUserId, note: 'Marked settled' }
    );

    return res.json({ expense: serializeExpense(updated, currentUserId) });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: 'Failed to settle expense' });
  }
}

router.post('/:expenseId/settle', handleSettle);
router.patch('/:expenseId/settle', handleSettle);

router.delete('/:expenseId', async (req: Request, res: Response) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const expense = await communityExpenseRepository.findById(String(req.params.expenseId));

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // Either side of a split can delete it — matches the ask that both parties
    // in a shared expense can remove a wrong entry, not just whoever typed it.
    if (!isPartyToExpense(expense, currentUserId)) {
      return res.status(403).json({ message: 'Only people in this split can delete it' });
    }

    if (expense.isDeleted) {
      return res.status(409).json({ message: 'This expense is already deleted' });
    }

    const actor = await User.findById(currentUserId).select('name').lean<{ name?: string } | null>();
    const updated = await communityExpenseRepository.SoftdeleteExpense(
      String(req.params.expenseId),
      currentUserId,
      { action: 'DELETED', performedBy: currentUserId, note: `Deleted by ${actor?.name ?? 'a member'}` }
    );
    return res.json({ message: 'Expense deleted', expense: updated ? serializeExpense(updated, currentUserId) : null });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Failed to delete expense' });
  }
});

export default router;