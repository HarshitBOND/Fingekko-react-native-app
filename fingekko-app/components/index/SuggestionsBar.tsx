import { StyleSheet, View } from 'react-native';
import { gradients, palette, radius, shadows, spacing } from '@/constants/design';
import { LinearGradient } from 'expo-linear-gradient';
import AppText from '../ui/AppText';
import Button from '../ui/Button';
import IconBadge from '../ui/IconBadge';

type SuggestionsBarProps = {
  onViewInsights: () => void;
};

export default function SuggestionsBar({ onViewInsights }: SuggestionsBarProps) {
  return (
    <View style={styles.card}>
      <LinearGradient
        colors={gradients.mist}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.row}>
        <IconBadge name="TrendingUp" size={46} background={palette.primary} color={palette.white} />
        <View style={styles.text}>
          <AppText variant="title">A better choice?</AppText>
          <AppText variant="caption" color="textSecondary" style={styles.line}>
            Cook at home more often to save ₹850 — that&apos;s 2 days closer to your Goa trip.
          </AppText>
        </View>
      </View>
      <Button variant="primary" size="md" onPress={onViewInsights} style={styles.cta}>
        See the impact
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: 4 },
  line: { lineHeight: 18 },
  cta: { marginTop: spacing.base },
});
