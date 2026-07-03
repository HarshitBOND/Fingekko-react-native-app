import { Types } from 'mongoose';
import communityExpenseRepository from '../repositories/communityExpenseRepository.js';
import friendRepository from '../repositories/friendRepository.js';

type ParticipantShare = {
  userId: string;
  amount: number;
};

type CreateCommunityExpenseInput = {
  description: string;
  amount: number;
  expenseDate: string;
  paidBy: string;
  splitType: 'equalPaidByYou' | 'unequalPaidByYou' | 'equalPaidByOthers' | 'unequalPaidByOthers' | 'fullyOwedPaidByYou' | 'fullyOwedPaidByOthers';
  participantIds: ParticipantShare[];
  notes?: string;
  currency?: string;
};

function roundTwo(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function splitEvenly(amount: number, participantCount: number) {
  const cents = Math.round(amount * 100);
  const base = Math.floor(cents / participantCount);
  const remainder = cents % participantCount;

  return Array.from({ length: participantCount }, (_, index) =>
    roundTwo((base + (index < remainder ? 1 : 0)) / 100)
  );
}

function splitUnevenly(
  totalAmount: number,
  participantShares: ParticipantShare[]
): ParticipantShare[] {
  if (participantShares.length === 0) {
    throw new Error('At least one participant is required');
  }

  let total = 0;

  for (const share of participantShares) {
    if (!Number.isFinite(share.amount)) {
      throw new Error('Invalid amount');
    }

    if (share.amount < 0) {
      throw new Error('Amount cannot be negative');
    }

    total += roundTwo(share.amount);
  }

  total = roundTwo(total);

  if (total !== roundTwo(totalAmount)) {
    throw new Error(
      `Split amounts (${total}) do not equal expense amount (${roundTwo(totalAmount)})`
    );
  }

  return participantShares.map((share) => ({
    userId: share.userId,
    amount: roundTwo(share.amount),
  }));
}

/**
 * Builds the final per-participant amount list based on splitType.
 * Returns shares keyed by userId so callers don't need to worry about ordering.
 */
function buildShares(
  userId: string,
  paidBy: string,
  splitType: CreateCommunityExpenseInput['splitType'],
  amount: number,
  participantIds: ParticipantShare[]
): Map<string, number> {
  const shareMap = new Map<string, number>();

  const isPaidByYou = splitType.endsWith('PaidByYou');

  if (isPaidByYou && paidBy !== userId) {
    throw new Error(`Split type "${splitType}" requires paidBy to be the current user`);
  }
  if (!isPaidByYou && paidBy === userId) {
    throw new Error(`Split type "${splitType}" requires paidBy to be someone other than the current user`);
  }

  switch (splitType) {
    case 'equalPaidByYou':
    case 'equalPaidByOthers': {
      const others = participantIds.map((p) => p.userId);
      const allParticipants = [userId, ...others];
      const shares = splitEvenly(amount, allParticipants.length);
      allParticipants.forEach((id, index) => shareMap.set(id, shares[index]));
      break;
    }

    case 'unequalPaidByYou':
    case 'unequalPaidByOthers':
    case 'fullyOwedPaidByYou':
    case 'fullyOwedPaidByOthers': {
      // participantIds carry explicit amounts that must sum to the full expense.
      // The payer's own consumption is 0 in these modes.
      const shares = splitUnevenly(amount, participantIds);
      shareMap.set(userId, 0);
      shares.forEach((s) => shareMap.set(s.userId, s.amount));
      break;
    }

    default:
      throw new Error('Invalid split type');
  }

  return shareMap;
}

async function assertFriendsOrSelf(userId: string, participantIds: string[]) {
  for (const participantId of participantIds) {
    if (participantId === userId) {
      continue;
    }

    const friendship = await friendRepository.findAcceptedFriendship(userId, participantId);
    if (!friendship) {
      throw new Error('One or more selected people are not accepted friends');
    }
  }
}

function validateCommonFields(input: CreateCommunityExpenseInput) {
  const description = input.description.trim();

  if (!description) {
    throw new Error('Description is required');
  }

  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  if (!input.expenseDate.trim()) {
    throw new Error('Expense date is required');
  }

  return description;
}

export async function createCommunityExpense(userId: string, input: CreateCommunityExpenseInput) {
  const description = validateCommonFields(input);

  const uniqueParticipantIds = Array.from(
    new Set([userId, ...(input.participantIds ?? []).map((p) => p.userId)])
  );

  await assertFriendsOrSelf(userId, uniqueParticipantIds);

  const paidBy = input.paidBy;

  if (!uniqueParticipantIds.includes(paidBy)) {
    throw new Error('Payer must be one of the participants');
  }

  const shareMap = buildShares(userId, paidBy, input.splitType, input.amount, input.participantIds ?? []);

  return communityExpenseRepository.createExpense({
    createdBy: new Types.ObjectId(userId).toString(),
    paidBy: new Types.ObjectId(paidBy).toString(),
    description,
    amount: roundTwo(input.amount),
    expenseDate: input.expenseDate,
    currency: input.currency || 'INR',
    notes: input.notes?.trim() || '',
    participants: uniqueParticipantIds.map((participantId) => ({
      userId: new Types.ObjectId(participantId).toString(),
      amount: shareMap.get(participantId) ?? 0,
      settled: participantId === paidBy,
    })),
  });
}

export async function updateCommunityExpense(userId: string, expenseId: string, input: CreateCommunityExpenseInput) {
  const expense = await communityExpenseRepository.findById(expenseId);

  if (!expense) {
    throw new Error('Expense not found');
  }

  if (expense.createdBy._id.toString() !== userId) {
    throw new Error('Only the creator can update this expense');
  }

  const description = validateCommonFields(input);

  const uniqueParticipantIds = Array.from(
    new Set([userId, ...(input.participantIds ?? []).map((p) => p.userId)])
  );

  await assertFriendsOrSelf(userId, uniqueParticipantIds);

  const paidBy = input.paidBy;

  if (!uniqueParticipantIds.includes(paidBy)) {
    throw new Error('Payer must be one of the participants');
  }

  const shareMap = buildShares(userId, paidBy, input.splitType, input.amount, input.participantIds ?? []);

  return communityExpenseRepository.updateExpense(expenseId, {
    description,
    amount: roundTwo(input.amount),
    expenseDate: input.expenseDate,
    paidBy: new Types.ObjectId(paidBy).toString(),
    currency: input.currency || 'INR',
    notes: input.notes?.trim() || '',
    participants: uniqueParticipantIds.map((participantId) => ({
      userId: new Types.ObjectId(participantId).toString(),
      amount: shareMap.get(participantId) ?? 0,
      settled: participantId === paidBy,
    })),
  });
}