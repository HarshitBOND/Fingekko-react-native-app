/**
 * Cash-in-hand settlement (AUDIT items 12/20).
 *
 * `cashInHand` is a persistent buffer of untracked money the user has told us
 * they hold. It must:
 *   - survive payday (real cash doesn't vanish when your salary lands), and
 *   - be drawn down by however much a *completed* pay cycle overspent its income,
 *     so it can't be double-counted into the next cycle's budget.
 *
 * There's no rollover job, so we settle lazily: whenever we read the balance for
 * a new cycle, we subtract the overspend of every cycle that has elapsed since
 * the buffer was last anchored, then re-anchor to the current cycle. Idempotent
 * within a cycle — calling it repeatedly the same day changes nothing.
 */

import User from '../models/User.js';
import { listTransactions } from '../repositories/transactionRepository.js';
import { getCurrentPayCycle, isoDay } from '../utils/payCycle.js';

function parseTxnDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? '').trim());
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function settleCashInHand(userId: string, now: Date = new Date()): Promise<number> {
  const user = await User.findById(userId)
    .select('monthlyIncome payday cashInHand cashInHandCycleStart')
    .lean<{ monthlyIncome?: number; payday?: number | null; cashInHand?: number; cashInHandCycleStart?: string | null } | null>();
  if (!user) return 0;

  let cash = Number.isFinite(user.cashInHand) ? Number(user.cashInHand) : 0;
  const payday = user.payday ?? null;
  const baseIncome = (user.monthlyIncome ?? 0) > 0 ? Number(user.monthlyIncome) : 0;

  const current = getCurrentPayCycle(payday, now);
  const currentStartIso = isoDay(current.start);

  // First time we've seen this buffer: just anchor to the current cycle.
  if (!user.cashInHandCycleStart) {
    await User.findByIdAndUpdate(userId, { $set: { cashInHandCycleStart: currentStartIso } });
    return cash;
  }
  // Same cycle (or, defensively, an anchor in the future) → nothing to settle.
  if (user.cashInHandCycleStart >= currentStartIso) return cash;

  const anchorIso = user.cashInHandCycleStart;
  const txns = await listTransactions(userId);
  const sumInRange = (type: 'expense' | 'income', start: Date, end: Date) =>
    txns.reduce((sum, t) => {
      const d = parseTxnDate(t.date);
      return t.type === type && d && d >= start && d <= end ? sum + t.amount : sum;
    }, 0);

  // Collect every cycle from the anchor up to (but not including) the current one.
  const completed: { start: Date; end: Date }[] = [];
  let probe = new Date(current.start.getTime() - 86400000); // a day inside the previous cycle
  let guard = 0;
  while (guard++ < 60) {
    const cyc = getCurrentPayCycle(payday, probe);
    if (isoDay(cyc.start) < anchorIso) break;
    completed.push(cyc);
    probe = new Date(cyc.start.getTime() - 86400000);
  }

  for (const cyc of completed) {
    const budget = baseIncome + sumInRange('income', cyc.start, cyc.end);
    const expenses = sumInRange('expense', cyc.start, cyc.end);
    const overspend = Math.max(0, expenses - budget);
    cash = Math.max(0, cash - overspend);
  }

  await User.findByIdAndUpdate(userId, {
    $set: { cashInHand: cash, cashInHandCycleStart: currentStartIso },
  });
  return cash;
}
