const crypto = require('crypto');
const { getDbStatus } = require('../db');
const Goal = require('../models/Goal');

const memoryGoals = new Map();

function cloneGoal(goal) {
  if (!goal) {
    return null;
  }

  return { ...goal };
}

function serializeGoal(goal) {
  const plain = typeof goal.toObject === 'function' ? goal.toObject() : goal;
  const id = plain.id ?? plain._id?.toString();

  return {
    id,
    title: plain.title,
    targetAmount: plain.targetAmount,
    currentAmount: plain.currentAmount,
    deadline: plain.deadline,
    emoji: plain.emoji,
    createdAt: plain.createdAt ? new Date(plain.createdAt).getTime() : Date.now(),
  };
}

async function listGoals(userId) {
  const { usingMemory } = getDbStatus();
  if (usingMemory) {
    const entries = memoryGoals.get(userId) ?? [];
    return entries.map(serializeGoal).sort((a, b) => b.createdAt - a.createdAt);
  }

  const goals = await Goal.find({ userId }).sort({ createdAt: -1 }).lean();
  return goals.map(serializeGoal);
}

async function createGoal(userId, data) {
  const { usingMemory } = getDbStatus();
  if (usingMemory) {
    const goal = {
      id: crypto.randomUUID(),
      userId,
      title: data.title,
      targetAmount: data.targetAmount,
      currentAmount: data.currentAmount ?? 0,
      deadline: data.deadline,
      emoji: data.emoji ?? 'goal',
      createdAt: Date.now(),
    };

    const current = memoryGoals.get(userId) ?? [];
    memoryGoals.set(userId, [goal, ...current]);
    return serializeGoal(goal);
  }

  const created = await Goal.create({ userId, ...data });
  return serializeGoal(created);
}

module.exports = {
  listGoals,
  createGoal,
};
