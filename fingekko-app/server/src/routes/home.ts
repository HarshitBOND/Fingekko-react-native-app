import express , {Request, Response} from 'express';
import authMiddleware from "../middleware/auth.js";
import {getQuestState, setQuestState } from '../repositories/questRepository.js';
import { createTransaction, listTransactions } from '../repositories/transactionRepository.js';
import { updateUserStats } from '../repositories/userRepository.js';


const router = express.Router();

router.get('/me', authMiddleware, (req: Request, res: Response) => {
  return res.json({ user: req.user });
});

router.get('/home', authMiddleware, (req: Request, res: Response) => {
  const safeUser = (req.user);
  const stats = safeUser.stats ?? {};

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

router.get('/profile', authMiddleware, (req: Request, res: Response) => {
  return res.json({ user: (req.user) });
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

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than 0.' });
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

    return res.status(201).json({ transaction });
  } catch (error) {
    return next(error);
  }
});

router.get('/quests/state', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id ?? req.user._id?.toString();
    const state = await getQuestState(userId);
    return res.json({ state });
  } catch (error) {
    return next(error);
  }
});

router.put('/quests/state', authMiddleware, async (req, res, next) => {
  const { date, difficultyByType, quests } = req.body ?? {};

  if (!date) {
    return res.status(400).json({ error: 'Quest date is required.' });
  }

  if (!Array.isArray(quests)) {
    return res.status(400).json({ error: 'Quest list is required.' });
  }

  try {
    const userId = req.user.id ?? req.user._id?.toString();
    const state = await setQuestState(userId, {
      date,
      difficultyByType: difficultyByType ?? {},
      quests,
    });

    // Keep User.stats (streak/XP dashboard numbers) in sync with real quest activity
    // instead of leaving it frozen at its signup defaults.
    const priorStats = req.user.stats ?? {};
    const questsDone = quests.filter((q: any) => q?.status === 'completed').length;
    const questsTarget = quests.length || priorStats.questsTarget || 4;

    let previousDayQuestsDone = priorStats.previousDayQuestsDone ?? 0;
    if (priorStats.currentDate && priorStats.currentDate !== date) {
      previousDayQuestsDone = priorStats.questsDone ?? 0;
    }

    let dayStreak = priorStats.dayStreak ?? 0;
    let lastCompletedDate = priorStats.lastCompletedDate ?? null;
    const allCompletedToday = questsTarget > 0 && questsDone >= questsTarget;

    if (allCompletedToday && lastCompletedDate !== date) {
      const isConsecutiveDay = lastCompletedDate
        ? Math.round((new Date(date).getTime() - new Date(lastCompletedDate).getTime()) / 86400000) === 1
        : false;
      dayStreak = isConsecutiveDay ? dayStreak + 1 : 1;
      lastCompletedDate = date;
    }

    const bestStreak = Math.max(priorStats.bestStreak ?? 0, dayStreak);

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

    return res.json({ state });
  } catch (error) {
    return next(error);
  }
});

export default router;
