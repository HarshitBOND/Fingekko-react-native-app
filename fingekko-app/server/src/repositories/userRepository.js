const crypto = require('crypto');
const { getDbStatus } = require('../db');
const User = require('../models/User');

const memoryUsers = new Map();
const memoryEmails = new Map();

function buildUser(data) {
  const stats = data.stats ?? {};
  const user = {
    id: crypto.randomUUID(),
    clerkId: data.clerkId ?? null,
    name: data.name,
    email: data.email.toLowerCase(),
    passwordHash: data.passwordHash ?? null,
    monthlyIncome: data.monthlyIncome ?? 0,
    currency: data.currency ?? 'Rs. ',
    level: data.level ?? 1,
    xp: data.xp ?? 0,
    points: data.points ?? 0,
    userGekko: data.userGekko ?? 'Planner Gekko',
    avatarKey: data.avatarKey ?? 'planner',
    stats: {
      dayStreak: stats.dayStreak ?? 0,
      questsDone: stats.questsDone ?? 0,
      questsTarget: stats.questsTarget ?? 4,
      betterThanYesterday: stats.betterThanYesterday ?? 0,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return user;
}

function cloneUser(user) {
  if (!user) {
    return null;
  }

  return {
    ...user,
    stats: { ...user.stats },
  };
}

async function createUser(data) {
  const { usingMemory } = getDbStatus();

  try {
    if (usingMemory) {
      const user = buildUser(data);
      memoryUsers.set(user.id, user);
      memoryEmails.set(user.email, user.id);
      return cloneUser(user);
    }

    const created = await User.create({
      clerkId: data.clerkId,
      name: data.name,
      email: data.email,
      monthlyIncome: data.monthlyIncome ?? 0,
      currency: data.currency ?? 'Rs. ',
      passwordHash: data.passwordHash ?? null,
      level: 1,
      xp: 0,
      points: 0,
      userGekko: "Planner Gekko",
      avatarKey: "planner",
      stats: {
        dayStreak: 0,
        questsDone: 0,
        questsTarget: 4,
        betterThanYesterday: 0,
      },
    });

    console.log("✅ USER SAVED TO MONGO:", created._id);

    return created.toObject();
  } catch (err) {
    console.error("❌ CREATE USER FAILED:", err.message);
    throw err;
  }
}

async function findByEmail(email) {
  const normalized = email.toLowerCase();
  const { usingMemory } = getDbStatus();
  if (usingMemory) {
    const id = memoryEmails.get(normalized);
    return cloneUser(id ? memoryUsers.get(id) : null);
  }

  return User.findOne({ email: normalized }).lean();
}

async function findByClerkId(clerkId) {
  if (!clerkId) {
    return null;
  }

  const { usingMemory } = getDbStatus();
  if (usingMemory) {
    for (const user of memoryUsers.values()) {
      if (user.clerkId === clerkId) {
        return cloneUser(user);
      }
    }
    return null;
  }

  return User.findOne({ clerkId }).lean();
}

async function findById(id) {
  const { usingMemory } = getDbStatus();
  if (usingMemory) {
    return cloneUser(memoryUsers.get(id));
  }

  return User.findById(id).lean();
}

async function updateById(id, update) {
  const { usingMemory } = getDbStatus();
  if (usingMemory) {
    const current = memoryUsers.get(id);
    if (!current) {
      return null;
    }

    const next = {
      ...current,
      ...update,
      stats: { ...current.stats, ...(update.stats ?? {}) },
      updatedAt: new Date(),
    };

    if (update.email && update.email !== current.email) {
      memoryEmails.delete(current.email);
      memoryEmails.set(update.email.toLowerCase(), current.id);
      next.email = update.email.toLowerCase();
    }

    memoryUsers.set(id, next);
    return cloneUser(next);
  }

  return User.findByIdAndUpdate(id, update, { new: true }).lean();
}

module.exports = {
  createUser,
  findByClerkId,
  findByEmail,
  findById,
  updateById,
};
