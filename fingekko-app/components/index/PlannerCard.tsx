import { Image, StyleSheet, View } from 'react-native';
import { palette, radius, shadows, spacing } from '@/constants/design';
import AppText from '../ui/AppText';
import Button from '../ui/Button';
import Icon from '../ui/Icon';

type PlannerCardProps = {
  onViewInsights: () => void;
};

const TRAITS = [
  { icon: 'PiggyBank', label: 'Budgeting' },
  { icon: 'Star', label: 'Saving' },
  { icon: 'Shield', label: 'Avoiding Debt' },
];

export default function PlannerCard({ onViewInsights }: PlannerCardProps) {
  return (
    <View style={styles.card}>
      <AppText variant="micro" color="textTertiary" style={styles.eyebrow}>
        YOUR MONEY PERSONALITY
      </AppText>

      <View style={styles.heroRow}>
        <View style={styles.left}>
          <AppText variant="h2">The Monk Spender</AppText>
          <View style={styles.banner}>
            <View style={styles.bannerIcon}>
              <Icon name="TrendingUp" size={14} color={palette.white} />
            </View>
            <AppText variant="caption" color="textSecondary" style={styles.bannerText}>
              You plan ahead and make smart money moves.
            </AppText>
          </View>
        </View>
        <Image
          source={require('../../assets/images/cardImageMonkgekko.png')}
          style={styles.image}
          resizeMode="contain"
        />
      </View>

      <AppText variant="label" color="textSecondary" style={styles.goodAt}>
        You&apos;re good at
      </AppText>
      <View style={styles.traitRow}>
        {TRAITS.map((t) => (
          <View key={t.label} style={styles.traitPill}>
            <Icon name={t.icon} size={14} color={palette.primaryDeep} />
            <AppText variant="caption" color="primaryDeep">
              {t.label}
            </AppText>
          </View>
        ))}
      </View>

      <Button variant="primary" size="md" onPress={onViewInsights} style={styles.cta}>
        View Full Insights
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  eyebrow: { letterSpacing: 1, marginBottom: spacing.md },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  left: { flex: 1, gap: spacing.md },
  image: { width: 104, height: 104 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  bannerIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: { flex: 1, lineHeight: 18 },
  goodAt: { marginTop: spacing.lg, marginBottom: spacing.sm },
  traitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  traitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryLight,
  },
  cta: { marginTop: spacing.lg },
});
