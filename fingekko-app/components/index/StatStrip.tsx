import { Pressable, StyleSheet, View } from 'react-native';
import { palette, radius, shadows, spacing } from '@/constants/design';
import AppText from '../ui/AppText';
import Icon from '../ui/Icon';

type StatStripProps = {
  dayStreak?: number;
  totalXp?: number;
  questsDone?: number;
  questsTarget?: number;
  betterThanYesterday?: number;
  /** Opens the full-screen Streak Calendar. */
  onViewStreak: () => void;
};

type Stat = { icon: string; value: string; label: string; tint: string; fill: string };

/**
 * Replaces the old full-width "Today's Progress" grid and the streak hero card.
 * Both were competing with the balance for attention; the numbers are the same,
 * just demoted to a single glanceable row with the calendar behind a tap.
 */
export default function StatStrip({
  dayStreak = 0,
  totalXp = 0,
  questsDone = 0,
  questsTarget = 0,
  betterThanYesterday,
  onViewStreak,
}: StatStripProps) {
  const stats: Stat[] = [
    { icon: 'Flame', value: String(dayStreak), label: 'day streak', tint: palette.warning, fill: palette.warningLight },
    { icon: 'Zap', value: String(totalXp), label: 'total XP', tint: palette.info, fill: palette.infoLight },
    {
      icon: 'Target',
      value: `${questsDone}/${questsTarget}`,
      label: 'quests',
      tint: palette.primaryDeep,
      fill: palette.primaryLight,
    },
  ];

  // "Better than yesterday" is a signed % change in quests done, so it can be
  // negative or zero — phrase each case honestly instead of "−50% better" (item 18).
  const yesterdayLabel =
    typeof betterThanYesterday !== 'number'
      ? 'Track your streak over time'
      : betterThanYesterday > 0
        ? `${betterThanYesterday}% better than yesterday`
        : betterThanYesterday < 0
          ? `${Math.abs(betterThanYesterday)}% behind yesterday`
          : 'On par with yesterday';

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {stats.map((stat, index) => (
          <View key={stat.label} style={styles.statWrap}>
            {index > 0 && <View style={styles.divider} />}
            <View style={styles.stat}>
              <View style={[styles.iconWrap, { backgroundColor: stat.fill }]}>
                <Icon name={stat.icon} size={16} color={stat.tint} clickable={false} />
              </View>
              <AppText variant="title" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {stat.value}
              </AppText>
              <AppText variant="micro" color="textTertiary" numberOfLines={1}>
                {stat.label}
              </AppText>
            </View>
          </View>
        ))}
      </View>

      <Pressable style={styles.footer} onPress={onViewStreak} hitSlop={6}>
        <AppText variant="caption" color="textSecondary">
          {yesterdayLabel}
        </AppText>
        <View style={styles.footerAction}>
          <AppText variant="micro" color="primaryDeep">
            View streak calendar
          </AppText>
          <Icon name="ChevronRight" size={14} color={palette.primaryDeep} clickable={false} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderRadius: radius.xl,
    paddingTop: spacing.base,
    ...shadows.sm,
  },
  row: { flexDirection: 'row', paddingHorizontal: spacing.sm },
  statWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  divider: { width: 1, height: 40, backgroundColor: palette.divider },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.base,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: palette.divider,
  },
  footerAction: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
