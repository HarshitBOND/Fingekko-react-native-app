import { Types } from 'mongoose';
import communityExpenseRepository from '../repositories/communityExpenseRepository.js';
import friendRepository from '../repositories/friendRepository.js';

type CreateCommunityExpenseInput = {
  description: string;
  amount: number;
  expenseDate: string;
  participantIds: string[];
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

export async function createCommunityExpense(userId: string, input: CreateCommunityExpenseInput) {
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

  const uniqueParticipants = Array.from(new Set([userId, ...(input.participantIds ?? [])]));

  for (const participantId of uniqueParticipants) {
    if (participantId === userId) {
      continue;
    }

    const friendship = await friendRepository.findAcceptedFriendship(userId, participantId);
    if (!friendship) {
      throw new Error('One or more selected people are not accepted friends');
    }
  }

  const shares = splitEvenly(input.amount, uniqueParticipants.length);

  return communityExpenseRepository.createExpense({
    createdBy: new Types.ObjectId(userId).toString(),
    paidBy: new Types.ObjectId(userId).toString(),
    description,
    amount: roundTwo(input.amount),
    expenseDate: input.expenseDate,
    currency: input.currency || 'INR',
    notes: input.notes?.trim() || '',
    participants: uniqueParticipants.map((participantId, index) => ({
      userId: new Types.ObjectId(participantId).toString(),
      amount: shares[index],
      settled: participantId === userId,
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

  const uniqueParticipants = Array.from(new Set([userId, ...(input.participantIds ?? [])]));

  for (const participantId of uniqueParticipants) {
    if (participantId === userId) {
      continue;
    }

    const friendship = await friendRepository.findAcceptedFriendship(userId, participantId);
    if (!friendship) {
      throw new Error('One or more selected people are not accepted friends');
    }
  }

  const shares = splitEvenly(input.amount, uniqueParticipants.length);

  return communityExpenseRepository.updateExpense(expenseId, {
    description,
    amount: roundTwo(input.amount),
    expenseDate: input.expenseDate,
    currency: input.currency || 'INR',
    notes: input.notes?.trim() || '',
    participants: uniqueParticipants.map((participantId, index) => ({
      userId: new Types.ObjectId(participantId).toString(),
      amount: shares[index],
      settled: participantId === userId,
    })),
  });
}