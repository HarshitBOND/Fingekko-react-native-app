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

