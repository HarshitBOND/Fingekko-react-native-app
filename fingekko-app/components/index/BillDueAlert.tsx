import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { palette, radius, shadows, spacing } from '@/constants/design';
import { essentialCategoryMeta } from '@/constants/essentials';
import { formatMoney } from '@/utils/currency';
import type { NextEssential } from '@/types';
import AppText from '../ui/AppText';
import Icon from '../ui/Icon';
import PressableScale from '../ui/PressableScale';

const inr = (n: number) => formatMoney(n, { signDisplay: 'none' });

function ordinal(day: number) {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1: return `${day}st`;
    case 2: return `${day}nd`;
    case 3: return `${day}rd`;
    default: return `${day}th`;
  }
}

/**
 * Home nudge for the single most urgent unpaid bill (AUDIT item 11). It only
 * renders when the balance can actually cover the bill (gated by the hook), so
 * the message is always "you can pay this — do it before spending elsewhere"
 * rather than nagging someone who can't afford it. Tapping opens the bills list.
 */
export default function BillDueAlert({ essential }: { essential: NextEssential }) {
  const meta = essentialCategoryMeta(essential.category);
  const accent = essential.overdue ? palette.danger : palette.warning;
  const fill = essential.overdue ? palette.dangerLight : palette.warningLight;

  const dueLabel = essential.overdue
    ? `was due ${ordinal(essential.dueDay)}`
    : `due ${ordinal(essential.dueDay)}`;

  return (
    <PressableScale
      onPress={() => router.push('/(tabs)/essentials')}
      accessibilityRole="button"
      accessibilityLabel={`Pay your ${inr(essential.amount)} ${essential.name}, ${dueLabel}. Opens your bills.`}
      style={[styles.card, { backgroundColor: fill, borderColor: accent + '55' }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: meta.color + '22' }]}>
        <Icon name={meta.lucide} size={20} color={meta.color} clickable={false} />
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <AppText variant="micro" weight="bold" style={{ color: accent }}>
            {essential.overdue ? 'BILL OVERDUE' : 'BILL DUE'}
          </AppText>
          <AppText variant="micro" color="textSecondary">· {dueLabel}</AppText>
        </View>
        <AppText variant="bodySm" color="textPrimary" weight="bold">
          Pay your {inr(essential.amount)} {essential.name} before spending elsewhere.
        </AppText>
      </View>

      <Icon name="ChevronRight" size={18} color={palette.textTertiary} clickable={false} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1,
    ...shadows.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
