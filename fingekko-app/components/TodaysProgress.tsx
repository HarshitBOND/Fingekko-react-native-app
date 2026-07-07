import { StyleSheet, View } from 'react-native';
import { palette, radius, shadows, spacing } from '@/constants/design';
import AppText from './ui/AppText';
import Icon from './ui/Icon';

type ProgressItem = {
  icon: string;
  value: string;
  label: string;
  color: string;
};

const defaultProgressItems: ProgressItem[] = [
  { icon: 'Flame', value: '12', label: 'Day Streak', color: palette.warning },
  { icon: 'Zap', value: '320', label: 'Total XP', color: palette.info },
  { icon: 'Target', value: '3 / 4', label: 'Quests Done', color: palette.primary },
  { icon: 'BarChart3', value: '78%', label: 'Better than yesterday', color: palette.primaryDeep },
];

const tint = (color: string) => {
  switch (color) {
    case palette.warning:
      return palette.warningLight;
    case palette.info:
      return palette.infoLight;
    case palette.primary:
    case palette.primaryDeep:
    default:
      return palette.primaryLight;
  }
};

export default function TodaysProgress({ items }: { items?: ProgressItem[] }) {
  const progressItems = items && items.length > 0 ? items : defaultProgressItems;

  return (
    <View style={styles.card}>
      <AppText variant="micro" color="textTertiary" style={styles.title}>
        TODAY&apos;S PROGRESS
      </AppText>
      <View style={styles.grid}>
        {progressItems.map((item) => (
          <View key={item.label} style={styles.tile}>
            <View style={[styles.iconWrap, { backgroundColor: tint(item.color) }]}>
              <Icon name={item.icon} size={18} color={item.color} />
            </View>
            <View style={styles.tileText}>
              <AppText variant="title" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {item.value}
              </AppText>
              <AppText variant="caption" color="textSecondary" numberOfLines={2}>
                {item.label}
              </AppText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.sm,
  },
  title: { marginBottom: spacing.md, letterSpacing: 1 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.base,
  },
  tile: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingRight: spacing.sm,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: { flex: 1, gap: 1 },
});
