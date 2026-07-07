import type { DailyQuest, QuestDefinition, QuestState, QuestStatus, QuestType } from '@/constants/types';
import type { QuestStateResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@clerk/clerk-expo';
import Icon from './ui/Icon';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Divider from './Divider';
import ProgressBar from './ProgressBar';
import Card from './ui/Card';
import AppText from './ui/AppText';
import { palette, spacing, radius, shadows, fontFamily } from '@/constants/design';

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

const questTypeIcons: Record<QuestType, string> = {
  saving: 'Wallet',
  discipline: 'Target',
  tracking: 'BarChart3',
  engagement: 'Zap',
  budgeting: 'Wallet',
  challenge: 'Target',
  lifestyle: 'Zap',
  mindfulness: 'Target',
  learning: 'BarChart3',
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
  const getTokenRef = useRef(getToken);

  const questBankById = useMemo(() => new Map(questBank.map((quest) => [quest.id, quest])), []);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    let isActive = true;

    const loadState = async () => {
      const todayKey = getTodayKey();
      let stored: QuestState | null = null;

      if (isSignedIn) {
        const token = await getTokenRef.current();
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
        const token = await getTokenRef.current();
        if (token) {
          await apiRequest({
            method: 'put',
            url: '/api/quests/state',
            token,
            data: nextState,
          });
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
            await apiRequest({
              method: 'put',
              url: '/api/quests/state',
              token,
              data: nextState,
            });
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
      <Card variant="elevated" padding={20}>
        <View style={styles.headerRow}>
          <AppText variant="label" color="textPrimary" style={styles.title}>
            {"Today's Quests"}
          </AppText>
        </View>
        <AppText variant="bodySm" color="textSecondary" style={styles.loadingText}>
          Building your quests...
        </AppText>
      </Card>
    );
  }

  if (totalCount === 0) {
    return (
      <Card variant="elevated" padding={20}>
        <View style={styles.headerRow}>
          <AppText variant="label" color="textPrimary" style={styles.title}>
            {"Today's Quests"}
          </AppText>
          <AppText variant="caption" color="textTertiary" weight="bold">
            0 / 0 completed
          </AppText>
        </View>
        <AppText variant="bodySm" color="textSecondary" style={styles.emptyText}>
          No quests available yet.
        </AppText>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding={20}>
      <View style={styles.headerRow}>
        <AppText variant="label" color="textPrimary" style={styles.title}>
          {"Today's Quests"}
        </AppText>
        <AppText variant="caption" color="primaryDeep" weight="bold">
          {completedCount} / {totalCount} completed
        </AppText>
      </View>

      <View style={styles.list}>
        {quests.map((quest, index) => {
          const iconName = questTypeIcons[quest.type] ?? 'Target';
          const isDone = quest.status === 'completed';

          return (
            <View key={quest.id}>
              <View style={styles.questRow}>
                <View style={styles.iconWrap}>
                  <Icon name={iconName} size={20} color={palette.primaryDeep} />
                </View>

                <View style={styles.questBody}>
                  <AppText variant="bodySm" color="textPrimary" weight="bold" numberOfLines={1}>
                    {quest.text}
                  </AppText>
                  <AppText variant="caption" color="textSecondary" style={styles.questSubtitle}>
                    {getQuestSubtitle(quest)}
                  </AppText>
                  <View style={styles.questProgress}>
                    <ProgressBar
                      progress={quest.progress}
                      height={4}
                      radius={radius.pill}
                      trackColor={palette.border}
                      colors={[palette.primary, palette.primaryBright]}
                    />
                  </View>
                </View>

                <View style={styles.questRight}>
                  <View style={styles.xpRow}>
                    <Icon name="Zap" size={12} color="#F5B84D" />
                    <AppText variant="micro" color="warning" weight="bold">
                      +{quest.xp} XP
                    </AppText>
                  </View>

                  {quest.status === 'pending' ? (
                    <View style={styles.actionRow}>
                      <Pressable
                        onPress={() => updateQuestStatus(quest.id, 'completed')}
                        style={[styles.actionBadge, styles.actionComplete]}
                      >
                        <Icon name="Check" size={10} color={palette.success} />
                        <AppText variant="micro" color="success" weight="bold">Done</AppText>
                      </Pressable>
                      <Pressable
                        onPress={() => updateQuestStatus(quest.id, 'failed')}
                        style={[styles.actionBadge, styles.actionFailed]}
                      >
                        <Icon name="X" size={10} color={palette.danger} />
                        <AppText variant="micro" color="danger" weight="bold">{"Can't"}</AppText>
                      </Pressable>
                    </View>
                  ) : (
                    <View
                      style={[styles.statusBadge, isDone ? styles.statusDone : styles.statusFailed]}
                    >
                      {isDone ? (
                        <Icon name="Check" size={12} color={palette.success} />
                      ) : (
                        <Icon name="X" size={12} color={palette.danger} />
                      )}
                    </View>
                  )}
                </View>
              </View>

              {index < quests.length - 1 && (
                <Divider
                  orientation="horizontal"
                  thickness={1}
                  color={palette.divider}
                  inset={4}
                  length="100%"
                  style={styles.questDivider}
                />
              )}
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  loadingText: {
    marginTop: spacing.sm,
  },
  emptyText: {
    marginTop: spacing.sm,
  },
  list: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questBody: {
    flex: 1,
  },
  questSubtitle: {
    marginTop: 2,
  },
  questProgress: {
    marginTop: 6,
  },
  questRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 4,
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  actionComplete: {
    backgroundColor: palette.successLight,
    borderColor: 'rgba(92, 184, 92, 0.2)',
  },
  actionFailed: {
    backgroundColor: palette.dangerLight,
    borderColor: 'rgba(232, 93, 93, 0.2)',
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  statusDone: {
    backgroundColor: palette.successLight,
    borderColor: 'rgba(92, 184, 92, 0.2)',
  },
  statusFailed: {
    backgroundColor: palette.dangerLight,
    borderColor: 'rgba(232, 93, 93, 0.2)',
  },
  questDivider: {
    marginLeft: 46,
    marginVertical: spacing.sm,
  },
  bonusCard: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: palette.primary,
    backgroundColor: palette.primaryLight,
  },
  bonusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bonusIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.xs,
  },
  bonusTitle: {
    fontFamily: fontFamily.bold,
  },
  bonusSubtitle: {
    color: palette.textSecondary,
  },
  bonusXP: {
    fontFamily: fontFamily.semibold,
    color: palette.primaryDeep,
    marginTop: 2,
  },
  bonusGekko: {
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
});