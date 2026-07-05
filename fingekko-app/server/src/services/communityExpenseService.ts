import { Types } from 'mongoose';
import communityExpenseRepository from '../repositories/communityExpenseRepository.js';
import friendRepository from '../repositories/friendRepository.js';

type ParticipantShare = {
  userId: string;
  amount: number;
};
type SplitResults = {
  userId: string;
  amount: number;
}

type UserBalance = {
  userId: string;
  netBalance: number;
};

type Settlement = {
  fromUserId: string;
  toUserId: string;
  amount: number;
};


///////////////helper function to get a amount rounded to 2 decimal places ................
function roundTwo(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}


/////////////used to split the amount equally amound the participants and return the array of amounts for each participant ................
function splitEvenly(amount: number, participantId: string[]) {
  const participantCount = participantId.length;
  const cents = Math.round(amount * 100);
  const base = Math.floor(cents / participantCount);
  let remainder = cents % participantCount;

  const result: SplitResults[] = [];

  for (let i = 0; i < participantCount; i++) {
    let share = base;
    if (remainder > 0) {
      share++;
      remainder--;
    }
    result.push({ userId: participantId[i], amount: roundTwo(share / 100) });
  }
  return result;
}

function PaidBy(amount: number, participantIds: string[], userId: string): SplitResults[] {
  const result: SplitResults[] = [];
  const participantCount = participantIds.length;
  const cents = Math.round(amount * 100);

  if (participantCount <= 1) {
    return [{ userId, amount: 0 }];
  }

  const base = Math.floor(cents / (participantCount - 1));
  let remainder = cents % (participantCount - 1);



  for (let i = 0; i < participantCount; i++) {
    let share = base;
    if (participantIds[i] === userId) {
      continue;
    }
    if (remainder > 0) {
      share++;
      remainder--;
    }
    result.push({ userId: participantIds[i], amount: roundTwo(share / 100) });
  }

  // Add the payer's share as 0
  result.push({ userId, amount: 0 });

  return result;
}


type CreateExpenseInput = {
  description: string;
  amount: number;
  expenseDate: string;
  splitType: string;
  participantIds: ParticipantShare[];
  notes: string;
  currency: string;
  paidBy: string;
  groupId?: string;
};

function buildParticipants(
  splitType: string,
  amount: number,
  payerId: string,
  participantIds: ParticipantShare[]
) {
  const allIds = Array.from(
    new Set([...participantIds.map((p) => p.userId), payerId])
  );

  if (splitType === 'equalPaidByYou' || splitType === 'equalPaidByOthers') {
    return splitEvenly(amount, allIds).map((share) => ({
      userId: share.userId,
      amount: share.amount,
      settled: false,
    }));
  }

  if (splitType === 'unequalPaidByYou' || splitType === 'unequalPaidByOthers') {
    const providedTotal = roundTwo(
      participantIds.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    );

    if (Math.abs(providedTotal - amount) > 0.01) {
      throw new Error('Split amounts must add up to the total amount.');
    }

    return allIds.map((id) => {
      const match = participantIds.find((p) => p.userId === id);
      return { userId: id, amount: roundTwo(match?.amount ?? 0), settled: false };
    });
  }

  if (splitType === 'fullyOwedPaidByYou') {
    return allIds
      .filter((id) => id !== payerId)
      .map((id) => ({ userId: id, amount: roundTwo(amount), settled: false }));
  }

  if (splitType === 'fullyOwedPaidByOthers') {
    return allIds
      .filter((id) => id !== payerId)
      .map((id) => ({ userId: id, amount: 0, settled: false }))
      .concat([{ userId: payerId, amount: roundTwo(amount), settled: false }]);
  }

  throw new Error('Unsupported split type.');
}

export async function createCommunityExpense(currentUserId: string, input: CreateExpenseInput) {
  const payerId = input.paidBy || currentUserId;

  if (!input.participantIds.length) {
    throw new Error('At least one participant is required.');
  }

  const participants = buildParticipants(input.splitType, input.amount, payerId, input.participantIds);

  return communityExpenseRepository.createExpense({
    groupId: input.groupId,
    createdBy: currentUserId,
    paidBy: [{ userId: payerId, amount: input.amount }],
    description: input.description,
    amount: input.amount,
    currency: input.currency,
    notes: input.notes,
    expenseDate: input.expenseDate,
    participants,
    history: [{ action: 'CREATED', performedBy: currentUserId }],
  });
}

export async function updateCommunityExpense(
  currentUserId: string,
  expenseId: string,
  input: CreateExpenseInput
) {
  const existing = await communityExpenseRepository.findById(expenseId);
  if (!existing) {
    throw new Error('Expense not found.');
  }

  const payerId = input.paidBy || currentUserId;
  const participants = buildParticipants(input.splitType, input.amount, payerId, input.participantIds);

  return communityExpenseRepository.updateExpense(
    expenseId,
    {
      description: input.description,
      amount: input.amount,
      currency: input.currency,
      notes: input.notes,
      expenseDate: input.expenseDate,
      paidBy: [{ userId: payerId, amount: input.amount }],
      participants,
    },
    { action: 'UPDATED', performedBy: currentUserId }
  );
}

export async function computeGroupBalances(groupId: string) {
  const expenses = await communityExpenseRepository.listForGroup(groupId);

  const balances = new Map<string, number>();

  for (const expense of expenses) {
    for (const payer of expense.paidBy ?? []) {
      const id = payer.userId.toString();
      balances.set(id, roundTwo((balances.get(id) ?? 0) + payer.amount));
    }
    for (const participant of expense.participants ?? []) {
      const id = participant.userId.toString();
      balances.set(id, roundTwo((balances.get(id) ?? 0) - participant.amount));
    }
  }

  const result: UserBalance[] = Array.from(balances.entries()).map(([userId, netBalance]) => ({
    userId,
    netBalance,
  }));

  return {
    balances: result,
    settlements: simplifyDebts(result),
    totalSpent: roundTwo(expenses.reduce((sum, e) => sum + e.amount, 0)),
    expenseCount: expenses.length,
  };
}

export function simplifyDebts(
  balances: UserBalance[]
): Settlement[] {
  const debtors: UserBalance[] = [];
  const creditors: UserBalance[] = [];

  const EPSILON = 0.01; // Define a small epsilon value for floating-point comparison

  for (const balance of balances) {
    if (balance.netBalance < 0) {
      debtors.push({
        userId: balance.userId,
        netBalance: -balance.netBalance,
      });
    } else if (balance.netBalance > 0) {
      creditors.push({
        userId: balance.userId,
        netBalance: balance.netBalance,
      });
    }
  }

  const settlements: Settlement[] = [];

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (
    debtorIndex < debtors.length &&
    creditorIndex < creditors.length
  ) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];

    const amount = Math.min(
      debtor.netBalance,
      creditor.netBalance
    );

    settlements.push({
      fromUserId: debtor.userId,
      toUserId: creditor.userId,
      amount,
    });

    debtor.netBalance -= amount;
    creditor.netBalance -= amount;

    if (debtor.netBalance <= EPSILON) debtorIndex++;
    if (creditor.netBalance <= EPSILON) creditorIndex++;
  }

  return settlements;
}

