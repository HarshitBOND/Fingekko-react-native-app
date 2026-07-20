/**
 * The single shared definition of "how much does this expense move the balance
 * between me and one other person". Every screen that shows a friend balance
 * (Split hub, friend detail, notifications summary) must use this, so the
 * number you settle on one screen is the same number every other screen shows.
 *
 * The maths mirrors the server's settle-aware logic and handles multi-payer
 * expenses: a participant's share is owed to the payers in proportion to what
 * each payer fronted, and a settled share no longer moves anything.
 */

type UserRef = { id?: string } | string | null | undefined;

export type ShareEntry = {
  userId: UserRef;
  amount: number;
  settled?: boolean;
};

export type SplitExpenseLike = {
  amount: number;
  isDeleted?: boolean;
  paidBy?: ShareEntry[];
  participants?: ShareEntry[];
};

/** Amounts smaller than this are rounding dust, not real debt. */
export const MONEY_EPSILON = 0.009;

export const roundMoney = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const refId = (ref: UserRef): string =>
  typeof ref === 'string' ? ref : ref?.id ?? '';

/** Total this user fronted for the expense (0 if they are not a payer). */
export const paidAmount = (exp: SplitExpenseLike, userId: string): number =>
  (exp.paidBy ?? []).reduce((sum, p) => (refId(p.userId) === userId ? sum + (p.amount || 0) : sum), 0);

/**
 * Signed balance this one expense creates between `myId` and `friendId`,
 * from my perspective: positive = they owe me, negative = I owe them.
 * Only the friend's own share counts (never the whole bill), scaled by the
 * fraction of the bill each side actually paid. Deleted expenses move nothing.
 */
export function pairwiseBalance(exp: SplitExpenseLike, myId: string, friendId: string): number {
  if (!myId || !friendId || myId === friendId || exp.isDeleted) return 0;
  const total = exp.amount || 0;
  if (total <= 0) return 0;

  const iPaidFrac = paidAmount(exp, myId) / total;
  const friendPaidFrac = paidAmount(exp, friendId) / total;
  if (iPaidFrac === 0 && friendPaidFrac === 0) return 0;

  const myShare = (exp.participants ?? []).find((p) => refId(p.userId) === myId);
  const friendShare = (exp.participants ?? []).find((p) => refId(p.userId) === friendId);

  let amount = 0;
  // They owe me their share, for the portion of the bill I financed.
  if (friendShare && !friendShare.settled) amount += (friendShare.amount || 0) * iPaidFrac;
  // I owe them my share, for the portion they financed.
  if (myShare && !myShare.settled) amount -= (myShare.amount || 0) * friendPaidFrac;
  return amount;
}

/**
 * Which participant shares must be marked settled to zero out the balance
 * between the two people on this expense. Handles mixed directions (both
 * sides owe something, e.g. multi-payer bills) — settling only the net
 * direction would leave a residual amount behind.
 */
export function pairwiseSettleTargets(
  exp: SplitExpenseLike,
  myId: string,
  friendId: string
): string[] {
  if (!myId || !friendId || exp.isDeleted) return [];
  const total = exp.amount || 0;
  if (total <= 0) return [];

  const iPaidFrac = paidAmount(exp, myId) / total;
  const friendPaidFrac = paidAmount(exp, friendId) / total;
  const myShare = (exp.participants ?? []).find((p) => refId(p.userId) === myId);
  const friendShare = (exp.participants ?? []).find((p) => refId(p.userId) === friendId);

  const targets: string[] = [];
  if (friendShare && !friendShare.settled && (friendShare.amount || 0) * iPaidFrac > MONEY_EPSILON) {
    targets.push(friendId);
  }
  if (myShare && !myShare.settled && (myShare.amount || 0) * friendPaidFrac > MONEY_EPSILON) {
    targets.push(myId);
  }
  return targets;
}
