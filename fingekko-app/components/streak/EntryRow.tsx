import { StyleSheet, View } from 'react-native';
import { palette, radius, shadows, spacing } from '@/constants/design';
import AppText from '../ui/AppText';
import { entryVisual, formatAmount, timeLabel, type StreakTransaction } from './utils';

/** Soft, low-opacity wash of a hue — for the resting emoji bubble. */
const withAlpha = (hex: string, alpha: number) => {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export interface EntryRowProps {
  transaction: StreakTransaction;
}

/**
 * One transaction on the streak-calendar timeline: a time label on the rail,
 * then a card with the category emoji, name, and the signed amount — echoing
 * the reference journal entry cards.
 */
export default function EntryRow({ transaction }: EntryRowProps) {
  const visual = entryVisual(transaction);
  const time = timeLabel(transaction.createdAt);
  const signed = `${visual.isIncome ? '+' : '−'} ${formatAmount(transaction.amount)}`;

  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <AppText variant="micro" numeric color="textTertiary">
          {time || '—'}
        </AppText>
      </View>

      <View style={styles.card}>
        <View style={[styles.bubble, { backgroundColor: withAlpha(visual.color, 0.14) }]}>
          <AppText variant="title">{visual.emoji}</AppText>
        </View>
        <View style={styles.body}>
          <AppText variant="bodySm" weight="bold" color="textPrimary" numberOfLines={1}>
            {visual.label}
          </AppText>
          <AppText variant="micro" color="textTertiary">
            {visual.isIncome ? 'Income' : 'Expense'}
          </AppText>
        </View>
        <AppText
          variant="label"
          numeric
          weight="bold"
          style={{ color: visual.isIncome ? palette.success : palette.textPrimary }}
        >
          {signed}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rail: {
    width: 48,
    paddingTop: spacing.base,
    alignItems: 'flex-end',
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.md,
    ...shadows.xs,
  },
  bubble: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 1,
  },
});
