import { Colors, FontSizes } from '@/constants/Colors';
import type { DailyQuest, QuestDefinition, QuestState, QuestStatus, QuestType } from '@/constants/types';
import type { QuestStateResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@clerk/clerk-expo';
import { BarChart3, Check, Target, Wallet, X, Zap } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Divider from './Divider';
import ProgressBar from './ProgressBar';

const questBank: QuestDefinition[] = [
  {
    id: 1,
    text: 'Save ₹50 today',
    difficulty: 1,
    type: 'saving',
    xp: 40,
  },
  {
    id: 2,
    text: 'Save ₹100 today',
    difficulty: 1,
    type: 'saving',
    xp: 50,
  },
  {
    id: 3,
    text: 'Save ₹200 today',
    difficulty: 2,
    type: 'saving',
    xp: 80,
  },
  {
    id: 4,
    text: 'Avoid impulse purchases today',
    difficulty: 2,
    type: 'discipline',
    xp: 90,
  },
  {
    id: 5,
    text: 'Do not order food online today',
    difficulty: 2,
    type: 'discipline',
    xp: 100,
  },
  {
    id: 6,
    text: 'Track every expense today',
    difficulty: 1,
    type: 'tracking',
    xp: 50,
  },
  {
    id: 7,
    text: 'Open the app 3 times today',
    difficulty: 1,
    type: 'engagement',
    xp: 30,
  },
  {
    id: 8,
    text: 'Review your weekly spending',
    difficulty: 2,
    type: 'tracking',
    xp: 70,
  },
  {
    id: 9,
    text: 'Skip one unnecessary expense today',
    difficulty: 2,
    type: 'discipline',
    xp: 80,
  },
  {
    id: 10,
    text: 'Save all loose change today',
    difficulty: 1,
    type: 'saving',
    xp: 40,
  },
  {
    id: 11,
    text: 'Spend less than ₹300 today',
    difficulty: 3,
    type: 'budgeting',
    xp: 120,
  },
  {
    id: 12,
    text: 'Log breakfast, lunch, and dinner expenses',
    difficulty: 2,
    type: 'tracking',
    xp: 70,
  },
  {
    id: 13,
    text: 'No late-night ordering today',
    difficulty: 2,
    type: 'discipline',
    xp: 90,
  },
  {
    id: 14,
    text: 'Complete all quests today',
    difficulty: 4,
    type: 'challenge',
    xp: 200,
  },
  {
    id: 15,
    text: 'Avoid using food delivery apps today',
    difficulty: 3,
    type: 'discipline',
    xp: 130,
  },
  {
    id: 16,
    text: 'Save ₹500 this week',
    difficulty: 4,
    type: 'saving',
    xp: 220,
  },
  {
    id: 17,
    text: 'Track your biggest expense today',
    difficulty: 1,
    type: 'tracking',
    xp: 40,
  },
  {
    id: 18,
    text: 'Spend nothing after 8 PM',
    difficulty: 2,
    type: 'discipline',
    xp: 100,
  },
  {
    id: 19,
    text: 'Cook at home today',
    difficulty: 2,
    type: 'lifestyle',
    xp: 90,
  },
  {
    id: 20,
    text: 'Check your savings goal progress',
    difficulty: 1,
    type: 'engagement',
    xp: 30,
  },
  {
    id: 21,
    text: 'Spend 10 minutes reviewing finances',
    difficulty: 1,
    type: 'mindfulness',
    xp: 40,
  },
  {
    id: 22,
    text: 'Avoid buying snacks outside today',
    difficulty: 2,
    type: 'discipline',
    xp: 80,
  },
  {
    id: 23,
    text: 'Save ₹100 before noon',
    difficulty: 2,
    type: 'saving',
    xp: 70,
  },
  {
    id: 24,
    text: 'Track transportation expenses',
    difficulty: 1,
    type: 'tracking',
    xp: 50,
  },
  {
    id: 25,
    text: 'Do a no-spend evening',
    difficulty: 3,
    type: 'discipline',
    xp: 120,
  },
  {
    id: 26,
    text: 'Spend under your daily budget',
    difficulty: 3,
    type: 'budgeting',
    xp: 130,
  },
  {
    id: 27,
    text: 'Save ₹1000 this month',
    difficulty: 5,
    type: 'saving',
    xp: 300,
  },
  {
    id: 28,
    text: "Review yesterday's spending mistakes",
    difficulty: 2,
    type: 'mindfulness',
    xp: 80,
  },
  {
    id: 29,
    text: 'Avoid shopping apps today',
    difficulty: 3,
    type: 'discipline',
    xp: 140,
  },
  {
    id: 30,
    text: 'Log expenses within 5 minutes of spending',
    difficulty: 3,
    type: 'tracking',
    xp: 150,
  },
  {
    id: 31,
    text: 'Reach a 7-day streak',
    difficulty: 4,
    type: 'challenge',
    xp: 250,
  },
  {
    id: 32,
    text: 'Drink water instead of buying a beverage',
    difficulty: 1,
    type: 'lifestyle',
    xp: 40,
  },
  {
    id: 33,
    text: 'Spend 15 minutes learning about investing',
    difficulty: 2,
    type: 'learning',
    xp: 90,
  },
  {
    id: 34,
    text: 'Transfer ₹50 to savings instantly after income',
    difficulty: 2,
    type: 'saving',
    xp: 80,
  },
  {
    id: 35,
    text: 'Avoid all online purchases today',
    difficulty: 4,
    type: 'discipline',
    xp: 180,
  },
  {
    id: 36,
    text: 'Review your top 3 spending categories',
    difficulty: 2,
    type: 'tracking',
    xp: 70,
  },
  {
    id: 37,
    text: 'Spend less than yesterday',
    difficulty: 3,
    type: 'budgeting',
    xp: 120,
  },
  {
    id: 38,
    text: 'Complete a full no-spend day',
    difficulty: 5,
    type: 'challenge',
    xp: 350,
  },
  {
    id: 39,
    text: 'Save money instead of ordering dessert',
    difficulty: 1,
    type: 'discipline',
    xp: 50,
  },
  {
    id: 40,
    text: 'Check your progress before sleeping',
    difficulty: 1,
    type: 'engagement',
    xp: 30,
  },
  {
    id: 41,
    text: 'Spend 10 minutes learning about budgeting',
    difficulty: 2,
    type: 'learning',
    xp: 90,
  },
];

const QUESTS_PER_DAY = 4;
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 5;
const DEFAULT_DIFFICULTY = 2;

const questTypeIcons: Record<QuestType, typeof Wallet> = {
  saving: Wallet,
  discipline: Target,
  tracking: BarChart3,
  engagement: Zap,
  budgeting: Wallet,
  challenge: Target,
  lifestyle: Zap,
  mindfulness: Target,
  learning: BarChart3,
};

const difficultyLabels: Record<number, string> = {
  1: 'Easy',
  2: 'Light',
  3: 'Medium',
  4: 'Hard',
  5: 'Legendary',
};

const questTypes= Array.from( new Set(questBank.map(quest=>quest.type) as QuestType[]));

function getTodayKey() {
  const [today] = new Date().toISOString().split('T');
  return today ?? '';
}

function clampDifficulty(value: number) {
  return Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, value));
}

function buildDefaultDifficultyMap(): Record<QuestType, number> {
  return questTypes.reduce((acc, type) => {
    acc[type] = DEFAULT_DIFFICULTY;
    return acc;
  }, {} as Record<QuestType, number>);
}

function shuffle<T>(items: T[], rng: () => number = Math.random) {
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

function scoreQuest(quest: QuestDefinition, difficultyByType: Record<QuestType, number>) {
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
  const candidates = questBank.filter((quest) => quest.type === type && !usedIds.has(quest.id));
  if (candidates.length === 0) {
    return null;
  }

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
  const candidates = questBank.filter((quest) => !usedIds.has(quest.id));
  if (candidates.length === 0) {
    return null;
  }

  const sorted = [...candidates].sort(
    (left, right) => scoreQuest(left, difficultyByType) - scoreQuest(right, difficultyByType),
  );
  const top = sorted.slice(0, Math.min(3, sorted.length));
  return top[Math.floor(rng() * top.length)] ?? null;
}

function selectDailyQuests(difficultyByType: Record<QuestType, number>, dateKey: string) {
  const usedIds = new Set<number>();
  const selected: QuestDefinition[] = [];
  const seed = hashStringToSeed(dateKey || getTodayKey());
  const rng = makeRngFromSeed(seed);
  const shuffledTypes = shuffle(questTypes, rng).slice(0, Math.min(QUESTS_PER_DAY, questTypes.length));

  for (const type of shuffledTypes) {
    const quest = pickQuestForType(type, difficultyByType, usedIds, rng);
    if (quest) {
      selected.push(quest);
      usedIds.add(quest.id);
    }
  }

  while (selected.length < QUESTS_PER_DAY) {
    const quest = pickBestRemainingQuest(difficultyByType, usedIds, rng);
    if (!quest) {
      break;
    }
    selected.push(quest);
    usedIds.add(quest.id);
  }

  return selected;
}

function createDailyQuestState(
  dateKey: string,
  difficultyByType: Record<QuestType, number>,
): QuestState {
  const selected = selectDailyQuests(difficultyByType, dateKey);
  const quests: DailyQuest[] = selected.map((quest) => ({
    questId: quest.id,
    status: 'pending',
    progress: 0,
  }));

  return {
    date: dateKey,
    difficultyByType,
    quests,
  };
}

function formatQuestType(type: QuestType) {
  return `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
}

function getQuestSubtitle(quest: QuestDefinition) {
  const difficultyLabel = difficultyLabels[quest.difficulty] ?? `Level ${quest.difficulty}`;
  return `${formatQuestType(quest.type)} | ${difficultyLabel}`;
}

export default function TodaysQuest() {
  const { getToken, isSignedIn } = useAuth();
  const [questState, setQuestState] = useState<QuestState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const questBankById = useMemo(() => new Map(questBank.map((quest) => [quest.id, quest])), []);

  useEffect(() => {
    let isActive = true;

    const loadState = async () => {
      const todayKey = getTodayKey();
      let stored: QuestState | null = null;

      if (isSignedIn) {
        const token = await getToken();
        if (token) {
          const response = await apiRequest<QuestStateResponse>('/api/quests/state', {}, token);
          stored = response.state as QuestState | null;
        }
      }

      const difficultyByType = stored?.difficultyByType ?? buildDefaultDifficultyMap();
      const nextState =
        stored && stored.date === todayKey
          ? stored
          : createDailyQuestState(todayKey, difficultyByType);

      if ((!stored || stored.date !== todayKey) && isSignedIn) {
        const token = await getToken();
        if (token) {
          await apiRequest('/api/quests/state', {
            method: 'PUT',
            body: JSON.stringify(nextState),
          }, token);
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
  }, [getToken, isSignedIn]);

  const updateQuestStatus = (questId: number, nextStatus: QuestStatus) => {
    setQuestState((current) => {
      if (!current) {
        return current;
      }

      const questIndex = current.quests.findIndex((quest) => quest.questId === questId);
      if (questIndex === -1) {
        return current;
      }

      const quest = current.quests[questIndex];
      if (quest.status !== 'pending') {
        return current;
      }

      const definition = questBankById.get(questId);
      if (!definition) {
        return current;
      }

      const difficultyByType = { ...current.difficultyByType };
      const currentDifficulty = difficultyByType[definition.type] ?? DEFAULT_DIFFICULTY;
      const nextDifficulty =
        nextStatus === 'completed'
          ? clampDifficulty(currentDifficulty + 1)
          : clampDifficulty(currentDifficulty - 1);

      difficultyByType[definition.type] = nextDifficulty;

      const updatedQuests = [...current.quests];
      updatedQuests[questIndex] = {
        ...quest,
        status: nextStatus,
        progress: nextStatus === 'completed' ? 1 : 0,
      };

      const nextState: QuestState = {
        ...current,
        difficultyByType,
        quests: updatedQuests,
      };

      if (isSignedIn) {
        void (async () => {
          const token = await getToken();
          if (token) {
            await apiRequest('/api/quests/state', {
              method: 'PUT',
              body: JSON.stringify(nextState),
            }, token);
          }
        })();
      }
      return nextState;
    });
  };

  const quests = useMemo(() => {
    if (!questState) {
      return [];
    }

    return questState.quests
      .map((entry) => {
        const definition = questBankById.get(entry.questId);
        if (!definition) {
          return null;
        }

        return {
          ...definition,
          status: entry.status,
          progress: entry.progress,
        };
      })
      .filter((quest): quest is QuestDefinition & { status: QuestStatus; progress: number } => Boolean(quest));
  }, [questState, questBankById]);

  const completedCount = quests.filter((quest) => quest.status === 'completed').length;
  const totalCount = quests.length;

  if (isLoading) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Today's Quests</Text>
        </View>
        <Text style={styles.loadingText}>Building your quests...</Text>
      </View>
    );
  }

  if (totalCount === 0) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Today's Quests</Text>
          <Text style={styles.completionText}>0 / 0 completed</Text>
        </View>
        <Text style={styles.emptyText}>No quests available yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Today's Quests</Text>
        <Text style={styles.completionText}>
          {completedCount} / {totalCount} completed
        </Text>
      </View>

      <View style={styles.list}>
        {quests.map((quest, index) => {
          const Icon = questTypeIcons[quest.type] ?? Target;
          const isDone = quest.status === 'completed';

          return (
            <View key={quest.id}>
              <View style={styles.questRow}>
                <View style={styles.iconWrap}>
                  <Icon size={32} strokeWidth={1.3} color="#16a34a" />
                </View>

                <View style={styles.questBody}>
                  <Text style={styles.questTitle}>{quest.text}</Text>
                  <Text style={styles.questSubtitle}>{getQuestSubtitle(quest)}</Text>
                  <View style={styles.questProgress}>
                    <ProgressBar
                      progress={quest.progress}
                      height={4}
                      radius={999}
                      trackColor="#d1d5dd"
                    />
                  </View>
                </View>

                <View style={styles.questRight}>
                  <View style={styles.xpRow}>
                    <Zap size={14} color="#f59e0b" />
                    <Text style={styles.xpText}>+{quest.xp} XP</Text>
                  </View>

                  {quest.status === 'pending' ? (
                    <View style={styles.actionRow}>
                      <Pressable
                        onPress={() => updateQuestStatus(quest.id, 'completed')}
                        style={[styles.actionBadge, styles.actionComplete]}
                      >
                        <Check size={12} color="#ffffff" />
                        <Text style={styles.actionText}>Done</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => updateQuestStatus(quest.id, 'failed')}
                        style={[styles.actionBadge, styles.actionFailed]}
                      >
                        <X size={12} color="#ffffff" />
                        <Text style={styles.actionText}>Can't</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View
                      style={[styles.statusBadge, isDone ? styles.statusDone : styles.statusFailed]}
                    >
                      {isDone ? (
                        <Check size={14} color="#ffffff" />
                      ) : (
                        <X size={14} color="#ffffff" />
                      )}
                    </View>
                  )}
                </View>
              </View>

              {index < quests.length - 1 && (
                <Divider
                  orientation="horizontal"
                  thickness={1}
                  color="#eef2f7"
                  inset={6}
                  length="100%"
                  style={styles.questDivider}
                />
              )}
            </View>
          );
        })}
      </View>

      <Image
        source={require('../assets/images/+75xp.png')}
        style={{ flex: 1, width: '100%', height: 60, marginTop: 12 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f8fbf8',
    borderRadius: 12,
    padding: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: FontSizes.xs,
    fontWeight: '800',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  completionText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: '#16a34a',
  },
  loadingText: {
    marginTop: 12,
    fontSize: FontSizes.sm,
    color: '#6b7280',
  },
  emptyText: {
    marginTop: 12,
    fontSize: FontSizes.sm,
    color: '#6b7280',
  },
  list: {
    marginTop: 12,
    gap: 6,
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eaf3ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questBody: {
    flex: 1,
  },
  questTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  questSubtitle: {
    fontSize: FontSizes.xs,
    color: '#6b7280',
    marginTop: 2,
  },
  questProgress: {
    marginTop: 6,
  },
  questRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  xpText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: '#16a34a',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  actionComplete: {
    backgroundColor: '#16a34a',
  },
  actionFailed: {
    backgroundColor: '#ef4444',
  },
  actionText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: '#ffffff',
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDone: {
    backgroundColor: '#16a34a',
  },
  statusFailed: {
    backgroundColor: '#ef4444',
  },
  questDivider: {
    marginLeft: 48,
  },
  bonusCard: {
    marginTop: 12,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bonusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bonusIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffe2b3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bonusTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: '#111827',
  },
  bonusSubtitle: {
    fontSize: FontSizes.xs,
    color: '#6b7280',
  },
  bonusXP: {
    fontSize: FontSizes.xs,
    fontWeight: '800',
    color: '#7c3aed',
    marginTop: 2,
  },
  bonusGekko: {
    width: 64,
    height: 64,
    resizeMode: 'contain',
  },
});