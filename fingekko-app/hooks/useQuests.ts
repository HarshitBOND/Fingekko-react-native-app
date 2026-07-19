/**
 * Daily quest state — shared by the home card and the full quests screen so
 * both read and write the same source of truth.
 *
 * Difficulty adapts: completing a quest of a type nudges that type harder the
 * next day, failing it nudges it easier. The day's picks are seeded off the
 * date string, so the same day always regenerates the same board even if the
 * server round-trip fails.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import type { DailyQuest, QuestState, QuestStatus, QuestType } from '@/constants/types';
import type { QuestStateResponse } from '@/types';
import { QUEST_BANK, QUEST_BY_ID, QUEST_TYPES, type Quest } from '@/constants/quests';
import { apiRequest } from '@/utils/api';

export const QUESTS_PER_DAY = 4;
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 5;
const DEFAULT_DIFFICULTY = 2;

export type ActiveQuest = Quest & { status: QuestStatus; progress: number };

function getTodayKey() {
  const [today] = new Date().toISOString().split('T');
  return today ?? '';
}

function clampDifficulty(value: number) {
  return Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, value));
}

function buildDefaultDifficultyMap(): Record<QuestType, number> {
  return QUEST_TYPES.reduce((acc, type) => {
    acc[type] = DEFAULT_DIFFICULTY;
    return acc;
  }, {} as Record<QuestType, number>);
}

function shuffle<T>(items: T[], rng: () => number) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function hashStringToSeed(str: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function makeRngFromSeed(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function scoreQuest(quest: Quest, difficultyByType: Record<QuestType, number>) {
  const target = clampDifficulty(difficultyByType[quest.type] ?? DEFAULT_DIFFICULTY);
  return Math.abs(quest.difficulty - target);
}

function pickQuestForType(
  type: QuestType,
  difficultyByType: Record<QuestType, number>,
  usedIds: Set<number>,
  rng: () => number,
) {
  const target = clampDifficulty(difficultyByType[type] ?? DEFAULT_DIFFICULTY);
  const candidates = QUEST_BANK.filter((quest) => quest.type === type && !usedIds.has(quest.id));
  if (candidates.length === 0) return null;

  const sorted = [...candidates].sort(
    (left, right) => Math.abs(left.difficulty - target) - Math.abs(right.difficulty - target),
  );
  const top = sorted.slice(0, Math.min(3, sorted.length));
  return top[Math.floor(rng() * top.length)] ?? null;
}

function pickBestRemainingQuest(
  difficultyByType: Record<QuestType, number>,
  usedIds: Set<number>,
  rng: () => number,
) {
  const candidates = QUEST_BANK.filter((quest) => !usedIds.has(quest.id));
  if (candidates.length === 0) return null;

  const sorted = [...candidates].sort(
    (left, right) => scoreQuest(left, difficultyByType) - scoreQuest(right, difficultyByType),
  );
  const top = sorted.slice(0, Math.min(3, sorted.length));
  return top[Math.floor(rng() * top.length)] ?? null;
}

function selectDailyQuests(difficultyByType: Record<QuestType, number>, dateKey: string) {
  const usedIds = new Set<number>();
  const selected: Quest[] = [];
  const rng = makeRngFromSeed(hashStringToSeed(dateKey || getTodayKey()));
  const shuffledTypes = shuffle(QUEST_TYPES, rng).slice(0, Math.min(QUESTS_PER_DAY, QUEST_TYPES.length));

  for (const type of shuffledTypes) {
    const quest = pickQuestForType(type, difficultyByType, usedIds, rng);
    if (quest) {
      selected.push(quest);
      usedIds.add(quest.id);
    }
  }

  while (selected.length < QUESTS_PER_DAY) {
    const quest = pickBestRemainingQuest(difficultyByType, usedIds, rng);
    if (!quest) break;
    selected.push(quest);
    usedIds.add(quest.id);
  }

  return selected;
}

function createDailyQuestState(
  dateKey: string,
  difficultyByType: Record<QuestType, number>,
): QuestState {
  const quests: DailyQuest[] = selectDailyQuests(difficultyByType, dateKey).map((quest) => ({
    questId: quest.id,
    status: 'pending',
    progress: 0,
  }));

  return { date: dateKey, difficultyByType, quests };
}

export function useQuests() {
  const { getToken, isSignedIn } = useAuth();
  const [questState, setQuestState] = useState<QuestState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    let isActive = true;

    const loadState = async () => {
      const todayKey = getTodayKey();
      let stored: QuestState | null = null;

      try {
        if (isSignedIn) {
          const token = await getTokenRef.current();
          if (token) {
            const response = await apiRequest<QuestStateResponse>('/api/quests/state', {}, token);
            stored = response.state as QuestState | null;
          }
        }
      } catch (error) {
        // A failed fetch shouldn't leave the board empty — fall through and
        // build today's quests locally instead.
        console.warn('Failed to load quest state:', error);
      }

      const difficultyByType = stored?.difficultyByType ?? buildDefaultDifficultyMap();
      const nextState =
        stored && stored.date === todayKey
          ? stored
          : createDailyQuestState(todayKey, difficultyByType);

      if ((!stored || stored.date !== todayKey) && isSignedIn) {
        try {
          const token = await getTokenRef.current();
          if (token) {
            await apiRequest({ method: 'put', url: '/api/quests/state', token, data: nextState });
          }
        } catch (error) {
          console.warn('Failed to persist quest state:', error);
        }
      }

      if (isActive) {
        setQuestState(nextState);
        setIsLoading(false);
      }
    };

    loadState();
    return () => {
      isActive = false;
    };
  }, [isSignedIn]);

  const persist = useCallback(async (state: QuestState) => {
    if (!isSignedIn) return;
    try {
      const token = await getTokenRef.current();
      if (token) {
        await apiRequest({ method: 'put', url: '/api/quests/state', token, data: state });
      }
    } catch (error) {
      console.warn('Failed to save quest progress:', error);
    }
  }, [isSignedIn]);

  const updateQuestStatus = useCallback((questId: number, nextStatus: QuestStatus) => {
    setQuestState((current) => {
      if (!current) return current;

      const questIndex = current.quests.findIndex((quest) => quest.questId === questId);
      if (questIndex === -1) return current;

      const quest = current.quests[questIndex];
      const definition = QUEST_BY_ID.get(questId);
      if (!definition) return current;

      // Toggling back off an already-resolved quest returns it to pending and
      // undoes the difficulty nudge, so a mis-tap is always recoverable.
      const isUndo = quest.status === nextStatus;
      const resolvedStatus: QuestStatus = isUndo ? 'pending' : nextStatus;

      const difficultyByType = { ...current.difficultyByType };
      const currentDifficulty = difficultyByType[definition.type] ?? DEFAULT_DIFFICULTY;

      let delta = 0;
      if (isUndo) {
        delta = quest.status === 'completed' ? -1 : 1;
      } else if (quest.status === 'pending') {
        delta = nextStatus === 'completed' ? 1 : -1;
      } else {
        // Switching straight from completed to failed (or back) is a swing of two.
        delta = nextStatus === 'completed' ? 2 : -2;
      }
      difficultyByType[definition.type] = clampDifficulty(currentDifficulty + delta);

      const updatedQuests = [...current.quests];
      updatedQuests[questIndex] = {
        ...quest,
        status: resolvedStatus,
        progress: resolvedStatus === 'completed' ? 1 : 0,
      };

      const nextState: QuestState = { ...current, difficultyByType, quests: updatedQuests };
      void persist(nextState);
      return nextState;
    });
  }, [persist]);

  const quests = useMemo<ActiveQuest[]>(() => {
    if (!questState) return [];
    return questState.quests
      .map((entry) => {
        const definition = QUEST_BY_ID.get(entry.questId);
        if (!definition) return null;
        return { ...definition, status: entry.status, progress: entry.progress };
      })
      .filter((quest): quest is ActiveQuest => Boolean(quest));
  }, [questState]);

  const completedCount = quests.filter((quest) => quest.status === 'completed').length;
  const earnedXp = quests
    .filter((quest) => quest.status === 'completed')
    .reduce((sum, quest) => sum + quest.xp, 0);
  const availableXp = quests.reduce((sum, quest) => sum + quest.xp, 0);

  return {
    quests,
    isLoading,
    completedCount,
    totalCount: quests.length,
    earnedXp,
    availableXp,
    updateQuestStatus,
  };
}
