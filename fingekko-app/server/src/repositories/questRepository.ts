import QuestState from '../models/QuestState.js';

/**
 * Types (STRICTLY aligned with Mongo schema)
 */

export interface Quest {
  questId: number;
  status: string;
  progress: number;
}

export type DifficultyByType = Record<string, number>;

export interface QuestStateDTO {
  date: string;
  difficultyByType: DifficultyByType;
  quests: Quest[];
}

/**
 * DB shape (Mongoose lean result)
 */
type QuestStateDB = {
  userId: string;
  date: string;
  difficultyByType: Map<string, number> | Record<string, number>;
  quests: Quest[];
};

/**
 * Normalize Map → Object
 */
function normalizeDifficulty(input: any): DifficultyByType {
  if (!input) return {};
  if (input instanceof Map) return Object.fromEntries(input);
  return input;
}

/**
 * Optional safe clone
 */
function cloneState(state: QuestStateDTO | null): QuestStateDTO | null {
  if (!state) return null;

  return {
    ...state,
    difficultyByType: { ...state.difficultyByType },
    quests: state.quests.map((q) => ({ ...q })),
  };
}

/**
 * GET Quest State
 */
export async function getQuestState(
  userId: string
): Promise<QuestStateDTO | null> {
  try {
    const state = await QuestState
      .findOne({ userId })
      .lean<QuestStateDB | null>();

    if (!state) return null;

    return {
      date: state.date,
      difficultyByType: normalizeDifficulty(state.difficultyByType),
      quests: state.quests ?? [],
    };
  } catch (err) {
    throw new Error('Failed to fetch quest state');
  }
}

/**
 * SET / UPSERT Quest State
 */
export async function setQuestState(
  userId: string,
  state: QuestStateDTO
): Promise<QuestStateDTO> {
  try {
    const updated = await QuestState.findOneAndUpdate(
      { userId },
      {
        userId,
        date: state.date,
        difficultyByType: state.difficultyByType ?? {},
        quests: state.quests ?? [],
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    ).lean<QuestStateDB | null>();

    if (!updated) {
      throw new Error('Failed to update quest state');
    }

    return {
      date: updated.date,
      difficultyByType: normalizeDifficulty(updated.difficultyByType),
      quests: updated.quests ?? [],
    };
  } catch (err: any) {
    throw new Error(err.message || 'Failed to set quest state');
  }
}