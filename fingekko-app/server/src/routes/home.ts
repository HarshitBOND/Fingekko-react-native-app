import express , {Request, Response} from 'express';
import authMiddleware from "../middleware/auth.js";
import {getQuestState, setQuestState } from '../repositories/questRepository.js';
import {
  createTransaction,
  deleteTransaction,
  getTransactionById,
  listTransactions,
  updateTransaction,
} from '../repositories/transactionRepository.js';
import { monthKeyOf, nextUnpaidEssential, summarizeEssentials } from '../repositories/essentialRepository.js';
import { awardXp, incrementCashInHand, updateById, updateUserStats } from '../repositories/userRepository.js';
import { logXpEvent } from '../repositories/xpEventRepository.js';
import { settleCashInHand } from '../services/cashInHand.js';
import { parseStatement } from '../services/statementParser.js';
import {
  QUEST_BY_ID,
  enrichState,
  evaluateAuto,
  generateBoard,
  istDayKey,
  istYesterdayKey,
  nextDifficultyByType,
  xpEffectFor,
  type EvalContext,
  type QuestStatus,
  type StoredQuestEntry,
  type StoredQuestState,
} from '../quests/questBank.js';

// XP granted for logging a personal transaction — keep in sync with the
// expense-split reward in communityExpense.routes.ts.
const XP_FOR_TRANSACTION = 10;

// Absolute server-side sanity bound on a single transaction. This is a hard
// backstop against typos/overflow/crafted requests — far above any real personal
// entry — not the gentle "are you sure?" nudge the client shows much lower down.
const MAX_TRANSACTION_AMOUNT = 1_000_000_000;

function isValidAmount(amount: unknown): amount is number {
  return typeof amount === 'number' && Number.isFinite(amount) && amount > 0 && amount <= MAX_TRANSACTION_AMOUNT;
}


const router = express.Router();

router.get('/me', authMiddleware, (req: Request, res: Response) => {
  return res.json({ user: req.user });
});

router.get('/home', authMiddleware, async (req: Request, res: Response, next: Function) => {
  const safeUser = (req.user);
  const stats = safeUser.stats ?? {};

  // Settle the cash-in-hand buffer against any elapsed pay cycles so the balance
  // the Home card shows reflects real money on hand (AUDIT items 12/20).
  let cashInHand = safeUser.cashInHand ?? 0;
  const userId = safeUser.id ?? safeUser._id?.toString();
  try {
    cashInHand = await settleCashInHand(userId, new Date());
  } catch (error) {
    console.error('Failed to settle cash-in-hand:', error);
  }

  // Recurring-essentials totals every budget surface reserves money against
  // (AUDIT items 10/19). unpaidTotal drives Safe-to-Spend; monthlyTotal drives
  // Goals feasibility.
  let essentials = { monthlyTotal: 0, unpaidTotal: 0, count: 0 };
  try {
    essentials = await summarizeEssentials(userId, monthKeyOf());
  } catch (error) {
    console.error('Failed to summarize essentials:', error);
  }

  // The single most urgent unpaid bill, for the Home "pay this first" nudge
  // (AUDIT item 11). The client only shows it when the balance can cover it.
  let nextEssential = null;
  try {
    nextEssential = await nextUnpaidEssential(userId, new Date());
  } catch (error) {
    console.error('Failed to resolve next unpaid essential:', error);
  }

  return res.json({
    user: {
      id: safeUser.id,
      name: safeUser.name,
      email: safeUser.email,
      level: safeUser.level ?? 1,
      xp: safeUser.xp ?? 0,
      points: safeUser.points ?? 0,
      userGekko: safeUser.userGekko ?? 'Planner Gekko',
      avatarKey: safeUser.avatarKey ?? 'planner',
      monthlyIncome: safeUser.monthlyIncome ?? 0,
      payday: safeUser.payday ?? null,
      currency: safeUser.currency ?? 'INR',
      cashInHand,
      monthlyEssentials: essentials.monthlyTotal,
      unpaidEssentials: essentials.unpaidTotal,
      nextEssential,
      essentialsOnboarded: Boolean(safeUser.essentialsOnboarded),
      // Signup date — the personality engine measures logging consistency
      // against days since signup, not days since the first logged expense.
      createdAt: safeUser.createdAt ?? null,
    },
    stats: {
      dayStreak: stats.dayStreak ?? 0,
      bestStreak: stats.bestStreak ?? 0,
      totalXp: safeUser.xp ?? 0,
      questsDone: stats.questsDone ?? 0,
      questsTarget: stats.questsTarget ?? 4,
      betterThanYesterday: stats.betterThanYesterday ?? 0,
    },
  });
});

router.get('/profile', authMiddleware, async (req: Request, res: Response, next: Function) => {
  try {
    const userId = req.user.id ?? req.user._id?.toString();
    // Settle cash-in-hand so the profile (and everything reading it) sees the
    // real, drawn-down buffer (AUDIT items 12/20).
    const cashInHand = await settleCashInHand(userId, new Date());
    // Essentials totals so Goals/Safe-to-Spend (which read /profile) can reserve
    // money against recurring bills (AUDIT items 10/19).
    const essentials = await summarizeEssentials(userId, monthKeyOf());
    return res.json({
      user: {
        ...req.user,
        cashInHand,
        monthlyEssentials: essentials.monthlyTotal,
        unpaidEssentials: essentials.unpaidTotal,
        essentialsOnboarded: Boolean(req.user.essentialsOnboarded),
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.put('/profile', authMiddleware, async (req: Request, res: Response, next: Function) => {
  const { monthlyIncome, payday, currency, addCashInHand } = req.body ?? {};
  const update: Record<string, unknown> = {};

  if (monthlyIncome !== undefined) {
    if (!Number.isFinite(monthlyIncome) || monthlyIncome < 0) {
      return res.status(400).json({ error: 'Monthly income must be a positive number.' });
    }
    update.monthlyIncome = monthlyIncome;
  }

  if (payday !== undefined && payday !== null) {
    if (!Number.isInteger(payday) || payday < 1 || payday > 31) {
      return res.status(400).json({ error: 'Payday must be a day of month between 1 and 31.' });
    }
    update.payday = payday;
  }

  if (currency !== undefined) {
    update.currency = currency;
  }

  // Declared extra cash (from the overspend prompt) is added to the persistent
  // buffer, not set — the user is telling us about money they hold (AUDIT item 12).
  const hasCash = addCashInHand !== undefined;
  if (hasCash && (!Number.isFinite(addCashInHand) || addCashInHand <= 0)) {
    return res.status(400).json({ error: 'Extra cash must be a positive number.' });
  }

  if (Object.keys(update).length === 0 && !hasCash) {
    return res.status(400).json({ error: 'Nothing to update.' });
  }

  try {
    const userId = req.user.id ?? req.user._id?.toString();
    let user = req.user;
    if (Object.keys(update).length > 0) {
      user = await updateById(userId, update);
    }
    if (hasCash) {
      // Settle first so the buffer is anchored to the current cycle before we
      // add to it, then apply the atomic, clamped increment.
      await settleCashInHand(userId, new Date());
      user = await incrementCashInHand(userId, addCashInHand);
    }
    return res.json({ user });
  } catch (error) {
    return next(error);
  }
});

router.get('/transactions', authMiddleware, async (req: Request, res: Response, next: Function) => {
  try {
    const userId = req.user.id ?? req.user._id?.toString();
    const transactions = await listTransactions(userId);
    return res.json({ transactions });
  } catch (error) {
    return next(error);
  }
});

router.post('/transactions', authMiddleware, async (req: Request, res: Response, next: Function) => {
  const { type, amount, category, date } = req.body ?? {};

  if (!type || !['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'Transaction type must be income or expense.' });
  }

  if (!isValidAmount(amount)) {
    return res.status(400).json({ error: 'Amount must be greater than 0 and within a sane range.' });
  }

  if (!category) {
    return res.status(400).json({ error: 'Category is required.' });
  }

  if (!date) {
    return res.status(400).json({ error: 'Date is required.' });
  }

  try {
    const userId = req.user.id ?? req.user._id?.toString();
    const transaction = await createTransaction(userId, {
      type,
      amount,
      category,
      date,
    });

    let xpAward = null;
    try {
      xpAward = await awardXp(userId, XP_FOR_TRANSACTION);
      await logXpEvent(userId, {
        type: 'transaction_added',
        amount: XP_FOR_TRANSACTION,
        description: `Tracked ${type}: ${category}`,
      });
    } catch (xpError) {
      console.error('Failed to award XP for transaction:', xpError);
    }

    return res.status(201).json({ transaction, xpAward });
  } catch (error) {
    return next(error);
  }
});

router.put('/transactions/:id', authMiddleware, async (req: Request, res: Response, next: Function) => {
  const { type, amount, category, date } = req.body ?? {};
  const update: { type?: 'income' | 'expense'; amount?: number; category?: string; date?: string } = {};

  if (type !== undefined) {
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Transaction type must be income or expense.' });
    }
    update.type = type;
  }
  if (amount !== undefined) {
    if (!isValidAmount(amount)) {
      return res.status(400).json({ error: 'Amount must be greater than 0 and within a sane range.' });
    }
    update.amount = amount;
  }
  if (category !== undefined) {
    if (!category) {
      return res.status(400).json({ error: 'Category cannot be empty.' });
    }
    update.category = category;
  }
  if (date !== undefined) {
    if (!date) {
      return res.status(400).json({ error: 'Date cannot be empty.' });
    }
    update.date = date;
  }

  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: 'Nothing to update.' });
  }

  try {
    const userId = req.user.id ?? req.user._id?.toString();
    const id = String(req.params.id);
    const existing = await getTransactionById(userId, id);
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }
    // Split rows mirror a shared expense; editing one here would desync the
    // split. They're managed through the expense flow, not the personal list.
    if (existing.isSplit) {
      return res.status(400).json({ error: 'This entry is part of a shared expense — edit it from the split instead.' });
    }

    const transaction = await updateTransaction(userId, id, update);
    return res.json({ transaction });
  } catch (error) {
    return next(error);
  }
});

router.delete('/transactions/:id', authMiddleware, async (req: Request, res: Response, next: Function) => {
  try {
    const userId = req.user.id ?? req.user._id?.toString();
    const id = String(req.params.id);
    const existing = await getTransactionById(userId, id);
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }
    if (existing.isSplit) {
      return res.status(400).json({ error: 'This entry is part of a shared expense — remove it from the split instead.' });
    }

    const deleted = await deleteTransaction(userId, id);
    if (!deleted) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }

    // Reverse the +10 XP the create awarded, so an add→delete loop can't farm
    // XP. awardXp clamps at 0, so this can never push the user negative.
    let xpAward = null;
    try {
      xpAward = await awardXp(userId, -XP_FOR_TRANSACTION);
      await logXpEvent(userId, {
        type: 'transaction_deleted',
        amount: -XP_FOR_TRANSACTION,
        description: `Removed ${deleted.type}: ${deleted.category}`,
      });
    } catch (xpError) {
      console.error('Failed to reverse XP for deleted transaction:', xpError);
    }

    return res.json({ transaction: deleted, xpAward });
  } catch (error) {
    return next(error);
  }
});

// ── Bulk import: paste a day's transactions as text (AUDIT item 14) ───────────
// Two steps so money is only ever written from rows the user has reviewed:
//   preview → parse text into draft rows (no writes) + surface same-day manual
//             entries so the client can offer to replace them (collision flow);
//   commit  → validate the finalized rows, remove the entries the user chose to
//             replace, then create the imported rows against the chosen day.
const MAX_IMPORT_ROWS = 100;

router.post('/transactions/import/preview', authMiddleware, async (req: Request, res: Response, next: Function) => {
  const { text, date } = req.body ?? {};
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Paste some transactions to import.' });
  }
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'A valid import date (YYYY-MM-DD) is required.' });
  }

  try {
    const userId = req.user.id ?? req.user._id?.toString();
    const { rows, detectedBalance } = parseStatement(text);
    // Existing manual (non-split) entries on the same day. Split rows are managed
    // via the expense flow, so they're never offered for replacement here.
    const all = await listTransactions(userId);
    const existingForDate = all.filter((t) => t.date === date && !t.isSplit);
    return res.json({ rows, detectedBalance, existingForDate });
  } catch (error) {
    return next(error);
  }
});

router.post('/transactions/import/commit', authMiddleware, async (req: Request, res: Response, next: Function) => {
  const { rows, date, rejectTransactionIds } = req.body ?? {};

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'No transactions to import.' });
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return res.status(400).json({ error: `Too many rows — import at most ${MAX_IMPORT_ROWS} at a time.` });
  }
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'A valid import date (YYYY-MM-DD) is required.' });
  }

  // Validate every row up front and reject the whole batch on any bad row, so we
  // never write a partial, half-wrong import.
  const clean: { type: 'income' | 'expense'; amount: number; category: string }[] = [];
  for (const r of rows) {
    if (!r || !['income', 'expense'].includes(r.type)) {
      return res.status(400).json({ error: 'Every row needs a type of income or expense.' });
    }
    if (!isValidAmount(r.amount)) {
      return res.status(400).json({ error: 'Every row needs an amount greater than 0 and within a sane range.' });
    }
    if (typeof r.category !== 'string' || !r.category.trim()) {
      return res.status(400).json({ error: 'Every row needs a category.' });
    }
    clean.push({ type: r.type, amount: r.amount, category: r.category.trim() });
  }

  const rejectIds: string[] = Array.isArray(rejectTransactionIds)
    ? rejectTransactionIds.filter((id: unknown): id is string => typeof id === 'string')
    : [];

  try {
    const userId = req.user.id ?? req.user._id?.toString();

    // 1) Remove the same-day manual entries the user chose to replace. Each
    //    reverses the +10 XP its create awarded (closes an import→delete XP loop),
    //    is owner-scoped, and never touches split rows.
    let removed = 0;
    for (const id of rejectIds) {
      const existing = await getTransactionById(userId, id);
      if (!existing || existing.isSplit) continue;
      const deleted = await deleteTransaction(userId, id);
      if (!deleted) continue;
      removed += 1;
      try {
        await awardXp(userId, -XP_FOR_TRANSACTION);
        await logXpEvent(userId, {
          type: 'transaction_deleted',
          amount: -XP_FOR_TRANSACTION,
          description: `Replaced on import: ${deleted.category}`,
        });
      } catch (xpError) {
        console.error('Failed to reverse XP on import-replace:', xpError);
      }
    }

    // 2) Create the imported rows against the chosen day. Bulk import does NOT
    //    award XP — XP rewards the daily logging habit, and paying out per row
    //    would turn the importer into an XP farm (guards AUDIT items 28–37).
    let created = 0;
    for (const r of clean) {
      await createTransaction(userId, { type: r.type, amount: r.amount, category: r.category, date });
      created += 1;
    }

    return res.json({ created, removed });
  } catch (error) {
    return next(error);
  }
});

// ── Server-authoritative quest engine (AUDIT items 28–37) ─────────────────────
// The board, XP, difficulty, completion and streak are all owned and validated
// here. The client can only send actions for `self` quests; it can no longer set
// XP, difficulty, status, or the board itself. `auto` quests are judged from the
// user's real logged transactions.

// Coerce a persisted DTO into the strongly-typed engine shape.
function toStored(dto: any): StoredQuestState {
  return {
    date: dto.date,
    difficultyByType: dto.difficultyByType ?? {},
    quests: (dto.quests ?? []).map((q: any) => ({
      questId: Number(q.questId),
      status: (q.status as QuestStatus) ?? 'pending',
      progress: Number(q.progress ?? 0),
      xpEffect: Number.isFinite(q.xpEffect) ? Number(q.xpEffect) : 0,
    })),
  };
}

// Today's board, generating a fresh one (with difficulty adapted from the prior
// day) whenever the stored board isn't for the current IST day.
function ensureTodayBoard(userId: string, stored: StoredQuestState | null, today: string): StoredQuestState {
  if (stored && stored.date === today) return stored;
  const difficultyByType = nextDifficultyByType(stored);
  return { date: today, difficultyByType, quests: generateBoard(userId, today, difficultyByType) };
}

// Real spend this cycle, from logged transactions, for judging auto quests.
async function buildEvalContext(userId: string, monthlyIncome: number, now: Date): Promise<EvalContext> {
  const txns = await listTransactions(userId);
  const today = istDayKey(now);
  const yesterday = istYesterdayKey(now);
  const sumExpenses = (dayKey: string) =>
    txns.reduce(
      (sum, t) => (t.type === 'expense' && String(t.date).slice(0, 10) === dayKey ? sum + t.amount : sum),
      0,
    );
  return {
    todayExpenses: sumExpenses(today),
    yesterdayExpenses: sumExpenses(yesterday),
    dailyBudget: monthlyIncome > 0 ? monthlyIncome / 30 : null,
  };
}

// Apply a status change to one entry as an idempotent XP delta (item 33: award
// on completion, deduct on failure; awardXp clamps at 0 and never drops level).
async function applyTransition(userId: string, entry: StoredQuestEntry, newStatus: QuestStatus) {
  const def = QUEST_BY_ID.get(entry.questId);
  if (!def) return null;
  const newEffect = xpEffectFor(def, newStatus);
  const delta = newEffect - entry.xpEffect;
  entry.status = newStatus;
  entry.progress = newStatus === 'completed' ? 1 : 0;
  entry.xpEffect = newEffect;
  if (delta === 0) return null;

  const result = await awardXp(userId, delta);
  try {
    await logXpEvent(userId, {
      type: newStatus === 'completed' ? 'quest_completed' : newStatus === 'failed' ? 'quest_failed' : 'quest_reset',
      amount: delta,
      description:
        newStatus === 'completed'
          ? `Quest done: ${def.title}`
          : newStatus === 'failed'
            ? `Quest failed: ${def.title}`
            : `Quest reset: ${def.title}`,
    });
  } catch (e) {
    console.error('Failed to log quest XP event:', e);
  }
  return result;
}

// Re-judge every auto quest against real spend and settle its XP. Idempotent:
// unchanged conditions produce a zero delta, so repeated calls never farm XP.
async function reconcileAuto(userId: string, state: StoredQuestState, ctx: EvalContext): Promise<boolean> {
  let changed = false;
  for (const entry of state.quests) {
    const def = QUEST_BY_ID.get(entry.questId);
    if (!def || def.verify !== 'auto') continue;
    const desired = evaluateAuto(def, ctx);
    if (desired !== entry.status || xpEffectFor(def, desired) !== entry.xpEffect) {
      await applyTransition(userId, entry, desired);
      changed = true;
    }
  }
  return changed;
}

// Streak / dashboard stats, derived from the server-owned board (item 29).
async function syncStats(userId: string, priorStats: any, state: StoredQuestState): Promise<void> {
  const date = state.date;
  const questsDone = state.quests.filter((q) => q.status === 'completed').length;
  const questsTarget = state.quests.length || priorStats?.questsTarget || 4;

  let previousDayQuestsDone = priorStats?.previousDayQuestsDone ?? 0;
  if (priorStats?.currentDate && priorStats.currentDate !== date) {
    previousDayQuestsDone = priorStats?.questsDone ?? 0;
  }

  let dayStreak = priorStats?.dayStreak ?? 0;
  let lastCompletedDate = priorStats?.lastCompletedDate ?? null;
  const allCompletedToday = questsTarget > 0 && questsDone >= questsTarget;

  if (allCompletedToday && lastCompletedDate !== date) {
    const isConsecutiveDay = lastCompletedDate
      ? Math.round((new Date(date).getTime() - new Date(lastCompletedDate).getTime()) / 86400000) === 1
      : false;
    dayStreak = isConsecutiveDay ? dayStreak + 1 : 1;
    lastCompletedDate = date;
  }

  const bestStreak = Math.max(priorStats?.bestStreak ?? 0, dayStreak);
  const betterThanYesterday = previousDayQuestsDone > 0
    ? Math.round(((questsDone - previousDayQuestsDone) / previousDayQuestsDone) * 100)
    : (questsDone > 0 ? 100 : 0);

  await updateUserStats(userId, {
    currentDate: date,
    questsDone,
    questsTarget,
    dayStreak,
    bestStreak,
    lastCompletedDate,
    previousDayQuestsDone,
    betterThanYesterday,
  });
}

router.get('/quests/state', authMiddleware, async (req: Request, res: Response, next: Function) => {
  try {
    const userId = req.user.id ?? req.user._id?.toString();
    const now = new Date();
    const today = istDayKey(now);

    const stored = await getQuestState(userId);
    const state = ensureTodayBoard(userId, stored ? toStored(stored) : null, today);

    const ctx = await buildEvalContext(userId, req.user.monthlyIncome ?? 0, now);
    await reconcileAuto(userId, state, ctx);

    const saved = toStored(await setQuestState(userId, state));
    await syncStats(userId, req.user.stats ?? {}, saved);

    return res.json({ state: enrichState(saved) });
  } catch (error) {
    return next(error);
  }
});

router.put('/quests/state', authMiddleware, async (req: Request, res: Response, next: Function) => {
  const { action, questId } = req.body ?? {};

  if (!['complete', 'skip', 'undo'].includes(action)) {
    return res.status(400).json({ error: 'action must be complete, skip or undo.' });
  }
  if (!Number.isFinite(questId)) {
    return res.status(400).json({ error: 'A numeric questId is required.' });
  }

  try {
    const userId = req.user.id ?? req.user._id?.toString();
    const now = new Date();
    const today = istDayKey(now);

    const stored = await getQuestState(userId);
    const state = ensureTodayBoard(userId, stored ? toStored(stored) : null, today);

    const entry = state.quests.find((q) => q.questId === Number(questId));
    if (!entry) {
      return res.status(404).json({ error: "That quest is not on today's board." });
    }
    const def = QUEST_BY_ID.get(entry.questId);
    if (!def) {
      return res.status(404).json({ error: 'Unknown quest.' });
    }
    // Auto quests are judged from real spending and have no manual complete.
    if (def.verify === 'auto') {
      return res.status(400).json({ error: 'This quest is verified automatically from your spending.' });
    }

    const target: QuestStatus = action === 'complete' ? 'completed' : action === 'skip' ? 'failed' : 'pending';
    const actionResult = await applyTransition(userId, entry, target);

    // Keep auto quests fresh + settle XP, then recompute streak/stats.
    const ctx = await buildEvalContext(userId, req.user.monthlyIncome ?? 0, now);
    await reconcileAuto(userId, state, ctx);

    const saved = toStored(await setQuestState(userId, state));
    await syncStats(userId, req.user.stats ?? {}, saved);

    const xpResult = actionResult ?? (await awardXp(userId, 0));
    return res.json({
      state: enrichState(saved),
      xp: xpResult.xp,
      level: xpResult.level,
      leveledUp: xpResult.leveledUp,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
