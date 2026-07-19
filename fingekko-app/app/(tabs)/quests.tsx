import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AppText from '@/components/ui/AppText';
import Icon from '@/components/ui/Icon';
import LoadingScreen from '@/components/ui/LoadingScreen';
import ProgressBar from '@/components/ProgressBar';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { DIFFICULTY_META, QUEST_TYPE_META } from '@/constants/quests';
import { gradients, layout, palette, radius, shadows, spacing } from '@/constants/design';
import { useQuests, type ActiveQuest } from '@/hooks/useQuests';
import HeroCard from '@/components/ui/HeroCard';

function QuestRow({
  quest,
  onComplete,
  onFail,
}: {
  quest: ActiveQuest;
  onComplete: () => void;
  onFail: () => void;
}) {
  const typeMeta = QUEST_TYPE_META[quest.type];
  const difficultyMeta = DIFFICULTY_META[quest.difficulty] ?? DIFFICULTY_META[3];
  const isDone = quest.status === 'completed';
  const isFailed = quest.status === 'failed';

  return (
    <View style={[styles.card, isDone && styles.cardDone, isFailed && styles.cardFailed]}>
      <View style={styles.cardTop}>
        <View style={[styles.questIcon, { backgroundColor: typeMeta.tint }]}>
          <Icon name={quest.icon} size={22} color={typeMeta.color} clickable={false} />
        </View>

        <View style={styles.cardHeadings}>
          {/* No numberOfLines — quest names wrap instead of being cut off. */}
          <AppText variant="title" style={isDone ? styles.doneText : undefined}>
            {quest.title}
          </AppText>
          <AppText variant="caption" color="textSecondary" style={styles.description}>
            {quest.description}
          </AppText>
        </View>

        <View style={styles.xpBadge}>
          <Icon name="Zap" size={12} color={palette.warning} clickable={false} />
          <AppText variant="micro" color="warning">
            {quest.xp}
          </AppText>
        </View>
      </View>

      <View style={styles.tagRow}>
        <View style={[styles.tag, { backgroundColor: typeMeta.tint }]}>
          <AppText variant="micro" style={{ color: typeMeta.color }}>
            {typeMeta.label}
          </AppText>
        </View>
        <View style={[styles.tag, { backgroundColor: difficultyMeta.tint }]}>
          <AppText variant="micro" style={{ color: difficultyMeta.color }}>
            {difficultyMeta.label}
          </AppText>
        </View>
        {isDone && (
          <View style={[styles.tag, { backgroundColor: palette.successLight }]}>
            <Icon name="Check" size={11} color={palette.success} clickable={false} />
            <AppText variant="micro" color="success">
              Complete
            </AppText>
          </View>
        )}
        {isFailed && (
          <View style={[styles.tag, { backgroundColor: palette.dangerLight }]}>
            <AppText variant="micro" color="danger">
              Skipped today
            </AppText>
          </View>
        )}
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={({ pressed }) => [styles.action, isDone && styles.actionDoneActive, pressed && styles.pressed]}
          onPress={onComplete}
        >
          <Icon name="Check" size={15} color={isDone ? palette.white : palette.success} clickable={false} />
          <AppText variant="label" style={{ color: isDone ? palette.white : palette.success }}>
            {isDone ? 'Completed' : 'Mark done'}
          </AppText>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.action, styles.actionSkip, isFailed && styles.actionSkipActive, pressed && styles.pressed]}
          onPress={onFail}
        >
          <Icon name="X" size={15} color={isFailed ? palette.white : palette.textSecondary} clickable={false} />
          <AppText variant="label" style={{ color: isFailed ? palette.white : palette.textSecondary }}>
            Skip
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

export default function QuestsScreen() {
  const { quests, isLoading, completedCount, totalCount, earnedXp, availableXp, updateQuestStatus } =
    useQuests();

  if (isLoading) {
    return <LoadingScreen label="Building today's quests..." />;
  }

  const progress = totalCount > 0 ? completedCount / totalCount : 0;
  const allDone = totalCount > 0 && completedCount === totalCount;

  return (
    <ScreenContainer
      contentStyle={{ gap: spacing.lg }}
      header={
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <Icon name="ArrowLeft" size={20} color={palette.textPrimary} clickable={false} />
          </Pressable>
          <AppText variant="title" weight="bold">
            Today&apos;s Quests
          </AppText>
          <View style={{ width: 40 }} />
        </View>
      }
    >
      {/* Hero: the day's progress at a glance */}
      <HeroCard colors={gradients.hero} padding={22}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <AppText variant="label" color="onDarkMuted">
              {allDone ? 'Board cleared' : 'Quest board'}
            </AppText>
            <AppText variant="hero" color="onDark" style={{ marginTop: 2 }}>
              {completedCount}
              <AppText variant="h2" color="onDarkMuted">
                {' '}
                / {totalCount}
              </AppText>
            </AppText>
            <AppText variant="caption" color="onDarkMuted">
              {allDone
                ? 'Every quest done — come back tomorrow for a harder board.'
                : `${totalCount - completedCount} left to clear today`}
            </AppText>
          </View>
          <View style={styles.heroBadge}>
            <Icon name="Trophy" size={26} color={palette.white} clickable={false} />
          </View>
        </View>

        <View style={styles.heroProgress}>
          <ProgressBar
            progress={progress}
            height={8}
            radius={radius.pill}
            trackColor="rgba(255,255,255,0.22)"
            colors={['#EAF8E5', '#A7E58C']}
          />
        </View>

        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <AppText variant="micro" color="onDarkMuted">
              XP EARNED
            </AppText>
            <AppText variant="title" color="onDark">
              {earnedXp}
            </AppText>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <AppText variant="micro" color="onDarkMuted">
              UP FOR GRABS
            </AppText>
            <AppText variant="title" color="onDark">
              {availableXp}
            </AppText>
          </View>
        </View>
      </HeroCard>

      {quests.map((quest, index) => (
        <Animated.View key={quest.id} entering={FadeInDown.duration(360).delay(index * 60)}>
          <QuestRow
            quest={quest}
            onComplete={() => updateQuestStatus(quest.id, 'completed')}
            onFail={() => updateQuestStatus(quest.id, 'failed')}
          />
        </Animated.View>
      ))}

      <View style={styles.footerNote}>
        <Icon name="Sparkles" size={15} color={palette.primaryDeep} clickable={false} />
        <AppText variant="caption" color="textSecondary" style={{ flex: 1 }}>
          Your board adapts. Clear a type and tomorrow&apos;s version gets harder; skip it and
          FinGekko eases off.
        </AppText>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },

  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  heroBadge: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroProgress: { marginTop: spacing.lg },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  heroStat: { flex: 1, alignItems: 'center', gap: 2 },
  heroDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.18)' },

  card: {
    backgroundColor: palette.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: palette.border,
    ...shadows.sm,
  },
  cardDone: { borderColor: palette.success, backgroundColor: palette.cardMuted },
  cardFailed: { opacity: 0.72 },
  cardTop: { flexDirection: 'row', gap: spacing.md },
  questIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeadings: { flex: 1, gap: 3 },
  doneText: { textDecorationLine: 'line-through', color: palette.textSecondary },
  description: { lineHeight: 19 },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: palette.warningLight,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  actionRow: { flexDirection: 'row', gap: spacing.sm },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.successLight,
  },
  actionDoneActive: { backgroundColor: palette.success },
  actionSkip: { backgroundColor: palette.bg },
  actionSkipActive: { backgroundColor: palette.textTertiary },
  pressed: { opacity: 0.7 },

  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: palette.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.base,
  },
});
