const express = require('express');
const authMiddleware = require('../middleware/auth');
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

module.exports = router;
