const { getDbStatus } = require('../db');
const QuestState = require('../models/QuestState');

const memoryQuestState = new Map();

function cloneState(state) {
  if (!state) {
    return null;
  }

  return {
    ...state,
    difficultyByType: { ...(state.difficultyByType ?? {}) },
    quests: (state.quests ?? []).map((quest) => ({ ...quest })),
  };
}

async function getQuestState(userId) {
  const { usingMemory } = getDbStatus();
  if (usingMemory) {
    return cloneState(memoryQuestState.get(userId) ?? null);
  }

  const state = await QuestState.findOne({ userId }).lean();
  if (!state) {
    return null;
  }

  const difficultyByType =
    state.difficultyByType instanceof Map
      ? Object.fromEntries(state.difficultyByType)
      : state.difficultyByType ?? {};

  return {
    date: state.date,
    difficultyByType,
    quests: state.quests ?? [],
  };
}

async function setQuestState(userId, state) {
  const { usingMemory } = getDbStatus();
  if (usingMemory) {
    memoryQuestState.set(userId, cloneState(state));
    return cloneState(state);
  }

  const updated = await QuestState.findOneAndUpdate(
    { userId },
    {
      userId,
      date: state.date,
      difficultyByType: state.difficultyByType ?? {},
      quests: state.quests ?? [],
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  const updatedDifficulty =
    updated.difficultyByType instanceof Map
      ? Object.fromEntries(updated.difficultyByType)
      : updated.difficultyByType ?? {};

  return {
    date: updated.date,
    difficultyByType: updatedDifficulty,
    quests: updated.quests ?? [],
  };
}

module.exports = {
  getQuestState,
  setQuestState,
};
