/**
 * Daily quest state — a thin client over the server-authoritative quest engine
 * (AUDIT items 28–37).
 *
 * The board, XP, difficulty, completion and streak are all owned and validated
 * by the server now. This hook only:
 *   - fetches the enriched board the server generated,
 *   - sends *actions* for `self` quests (complete / skip / undo) — the server
 *     validates the transition, banks/deducts XP and returns the new board,
 *   - re-fetches when spending changes, since `auto` quests are judged from real
 *     transactions and can flip to failed/completed on their own.
 *
 * It no longer builds boards, computes XP, or mutates difficulty — a modified
 * client can't mint XP or forge a streak any more.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import type { QuestType } from '@/constants/types';
import type { ApiQuest, ApiQuestState, QuestActionResponse, QuestStateResponse } from '@/types';
import { emitAppEvent } from '@/lib/appEvents';
import { useAppEvent } from '@/hooks/use-app-event';
import { apiRequest } from '@/utils/api';

// Server ships `type` as a string; narrow it back for the display-meta maps.
export type ActiveQuest = Omit<ApiQuest, 'type'> & { type: QuestType };

function mapQuest(quest: ApiQuest): ActiveQuest {
  return { ...quest, type: quest.type as QuestType };
}

function isAllComplete(state: ApiQuestState | null): boolean {
  return !!state && state.quests.length > 0 && state.quests.every((q) => q.status === 'completed');
}

export function useQuests() {
  const { getToken, isSignedIn } = useAuth();
  const [state, setState] = useState<ApiQuestState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Identity for this hook instance, so it can ignore its own broadcasts.
  const instanceId = useRef(Symbol('useQuests')).current;
  // Whether the board was already fully cleared, so we only celebrate on the
  // transition into "all done", not on every fetch of an already-clear board.
  const wasAllComplete = useRef(false);

  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  // Adopt a board without re-broadcasting (used for fetches and for boards
  // pushed by the other hook instance).
  const adoptQuiet = useCallback((next: ApiQuestState | null) => {
    setState(next);
    setIsLoading(false);
    wasAllComplete.current = isAllComplete(next);
  }, []);

  // Adopt a board produced by *this* instance's action, and tell the rest of the
  // app: sync the other hook copy, and celebrate a freshly-cleared board.
  const adoptAndBroadcast = useCallback(
    (next: ApiQuestState) => {
      const nowAll = isAllComplete(next);
      const justCleared = nowAll && !wasAllComplete.current;
      setState(next);
      setIsLoading(false);

      queueMicrotask(() => {
        emitAppEvent('quests:changed', { state: next, source: instanceId });
        if (justCleared) {
          const earnedXp = next.quests
            .filter((q) => q.status === 'completed')
            .reduce((sum, q) => sum + q.xp, 0);
          emitAppEvent('quests:allComplete', {
            date: next.date,
            earnedXp,
            totalCount: next.quests.length,
          });
        }
      });
      wasAllComplete.current = nowAll;
    },
    [instanceId],
  );

  const fetchState = useCallback(async () => {
    if (!isSignedIn) {
      adoptQuiet(null);
      return;
    }
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      const response = await apiRequest<QuestStateResponse>('/api/quests/state', {}, token);
      adoptQuiet(response?.state ?? null);
    } catch (error) {
      console.warn('Failed to load quest state:', error);
      setIsLoading(false);
    }
  }, [isSignedIn, adoptQuiet]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!active) return;
      await fetchState();
    })();
    return () => {
      active = false;
    };
  }, [fetchState]);

  // Auto quests are judged from real spend, so a new/edited/removed transaction
  // (or an income/budget change) can flip one — re-read the server's verdict.
  useAppEvent('transaction:changed', () => {
    void fetchState();
  });
  useAppEvent('profile:changed', () => {
    void fetchState();
  });

  // Keep the two hook copies (home card ⇄ quests screen) in lockstep.
  useAppEvent('quests:changed', ({ state: next, source }) => {
    if (source === instanceId) return;
    adoptQuiet(next as ApiQuestState);
  });

  const updateQuestStatus = useCallback(
    async (questId: number, nextStatus: 'completed' | 'failed') => {
      if (!isSignedIn) return;
      const current = state?.quests.find((q) => q.questId === questId);
      if (!current) return;
      // Auto quests have no manual control — the server would reject it anyway.
      if (current.verify === 'auto') return;

      // Re-tapping the same action toggles the quest back to pending.
      const action = current.status === nextStatus ? 'undo' : nextStatus === 'completed' ? 'complete' : 'skip';
      const optimisticStatus = action === 'undo' ? 'pending' : nextStatus;

      // Optimistic local update for instant feedback; the server response is
      // authoritative and replaces this a moment later.
      setState((prev) =>
        prev
          ? {
              ...prev,
              quests: prev.quests.map((q) =>
                q.questId === questId
                  ? { ...q, status: optimisticStatus, progress: optimisticStatus === 'completed' ? 1 : 0 }
                  : q,
              ),
            }
          : prev,
      );

      try {
        const token = await getTokenRef.current();
        if (!token) return;
        const response = await apiRequest<QuestActionResponse & { goalShift?: any }>({
          method: 'put',
          url: '/api/quests/state',
          token,
          data: { action, questId },
        });
        if (response?.state) adoptAndBroadcast(response.state);
        if (response?.goalShift?.shiftedGoals?.length > 0) {
          emitAppEvent('goal:shifted', {
            reason: 'quest',
            message: response.goalShift.message,
            shiftedGoals: response.goalShift.shiftedGoals,
          });
        }
      } catch (error) {
        console.warn('Failed to update quest:', error);
        // Re-sync with the server so we don't strand the optimistic guess.
        void fetchState();
      }
    },
    [isSignedIn, state, adoptAndBroadcast, fetchState],
  );

  const quests = useMemo<ActiveQuest[]>(() => (state?.quests ?? []).map(mapQuest), [state]);

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
