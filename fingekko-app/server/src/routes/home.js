const express = require('express');
const authMiddleware = require('../middleware/auth');
const { createGoal, listGoals } = require('../repositories/goalRepository');
const { getQuestState, setQuestState } = require('../repositories/questRepository');
const { createTransaction, listTransactions } = require('../repositories/transactionRepository');
const { sanitizeUser } = require('../utils/auth');

const router = express.Router();

router.get('/me', authMiddleware, (req, res) => {
  return res.json({ user: sanitizeUser(req.user) });
});

router.get('/home', authMiddleware, (req, res) => {
  const safeUser = sanitizeUser(req.user);
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
      totalXp: safeUser.xp ?? 0,
      questsDone: stats.questsDone ?? 0,
      questsTarget: stats.questsTarget ?? 4,
      betterThanYesterday: stats.betterThanYesterday ?? 0,
    },
  });
});

router.get('/profile', authMiddleware, (req, res) => {
  return res.json({ user: sanitizeUser(req.user) });
});

router.get('/transactions', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id ?? req.user._id?.toString();
    const transactions = await listTransactions(userId);
    return res.json({ transactions });
  } catch (error) {
    return next(error);
  }
});

router.post('/transactions', authMiddleware, async (req, res, next) => {
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

router.get('/goals', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id ?? req.user._id?.toString();
    const goals = await listGoals(userId);
    return res.json({ goals });
  } catch (error) {
    return next(error);
  }
});

router.post('/goals', authMiddleware, async (req, res, next) => {
  const { title, targetAmount, currentAmount, deadline, emoji } = req.body ?? {};

  if (!title) {
    return res.status(400).json({ error: 'Goal title is required.' });
  }

  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return res.status(400).json({ error: 'Target amount must be greater than 0.' });
  }

  if (!deadline) {
    return res.status(400).json({ error: 'Deadline is required.' });
  }

  try {
    const userId = req.user.id ?? req.user._id?.toString();
    const goal = await createGoal(userId, {
      title,
      targetAmount,
      currentAmount: Number.isFinite(currentAmount) ? currentAmount : 0,
      deadline,
      emoji: emoji || 'goal',
    });

    return res.status(201).json({ goal });
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

    return res.json({ state });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
