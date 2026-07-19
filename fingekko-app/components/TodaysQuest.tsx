import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import ProgressBar from './ProgressBar';
import AppText from './ui/AppText';
import Card from './ui/Card';
import Icon from './ui/Icon';
import { QUEST_TYPE_META } from '@/constants/quests';
import { palette, radius, spacing } from '@/constants/design';
import { useQuests } from '@/hooks/useQuests';

/**
 * Home-screen preview of the daily quest board. Deliberately shallow — it shows
 * the day's progress and the next couple of quests, then hands off to
 * /quests for the full board rather than trying to fit everything in a card.
 */
export default function TodaysQuest() {
  const { quests, isLoading, completedCount, totalCount, earnedXp } = useQuests();

  const openQuests = () => router.push('/(tabs)/quests');

  if (isLoading) {
    return (
      <Card variant="elevated" padding={20}>
        <AppText variant="label" color="textTertiary" style={styles.eyebrow}>
          TODAY&apos;S QUESTS
        </AppText>
        <AppText variant="bodySm" color="textSecondary" style={{ marginTop: spacing.sm }}>
          Building your quests...
        </AppText>
      </Card>
    );
  }

  if (totalCount === 0) {
    return (
      <Card variant="elevated" padding={20}>
        <AppText variant="label" color="textTertiary" style={styles.eyebrow}>
          TODAY&apos;S QUESTS
        </AppText>
        <AppText variant="bodySm" color="textSecondary" style={{ marginTop: spacing.sm }}>
          No quests available yet.
        </AppText>
      </Card>
    );
  }

  const progress = completedCount / totalCount;
  const allDone = completedCount === totalCount;
  // Lead with what still needs doing; once the board is clear, show it as-is.
  const preview = allDone ? quests.slice(0, 2) : quests.filter((q) => q.status === 'pending').slice(0, 2);

  return (
    <Card variant="elevated" padding={0}>
      <Pressable style={({ pressed }) => [styles.inner, pressed && styles.pressed]} onPress={openQuests}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <AppText variant="label" color="textTertiary" style={styles.eyebrow}>
              TODAY&apos;S QUESTS
            </AppText>
            <AppText variant="title" weight="bold" style={{ marginTop: 3 }}>
              {allDone ? 'Board cleared 🎉' : `${totalCount - completedCount} quests left`}
            </AppText>
          </View>
          <View style={styles.countPill}>
            <AppText variant="label" color="primaryDeep">
              {completedCount}/{totalCount}
            </AppText>
          </View>
        </View>

        <View style={styles.progress}>
          <ProgressBar
            progress={progress}
            height={6}
            radius={radius.pill}
            trackColor={palette.track}
            colors={[palette.primary, palette.primaryBright]}
          />
        </View>

        <View style={styles.previewList}>
          {preview.map((quest) => {
            const meta = QUEST_TYPE_META[quest.type];
            const isDone = quest.status === 'completed';
            return (
              <View key={quest.id} style={styles.previewRow}>
                <View style={[styles.previewIcon, { backgroundColor: meta.tint }]}>
                  <Icon name={quest.icon} size={17} color={meta.color} clickable={false} />
                </View>
                {/* Two lines, not one — long quest names used to get cut off mid-word. */}
                <AppText
                  variant="bodySm"
                  numberOfLines={2}
                  style={[styles.previewText, isDone && styles.previewDone]}
                >
                  {quest.title}
                </AppText>
                <View style={styles.previewXp}>
                  <Icon name="Zap" size={11} color={palette.warning} clickable={false} />
                  <AppText variant="micro" color="warning">
                    {quest.xp}
                  </AppText>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.footer}>
          <AppText variant="caption" color="textSecondary">
            {earnedXp} XP earned today
          </AppText>
          <View style={styles.footerLink}>
            <AppText variant="caption" color="primaryDeep">
              View all quests
            </AppText>
            <Icon name="ChevronRight" size={14} color={palette.primaryDeep} clickable={false} />
          </View>
        </View>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  inner: { padding: spacing.lg },
  pressed: { opacity: 0.75 },
  eyebrow: { letterSpacing: 1, fontSize: 11 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  countPill: {
    backgroundColor: palette.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  progress: { marginTop: spacing.md },
  previewList: { marginTop: spacing.base, gap: spacing.md },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  previewIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: { flex: 1, lineHeight: 20 },
  previewDone: { textDecorationLine: 'line-through', color: palette.textTertiary },
  previewXp: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.base,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.divider,
  },
  footerLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
