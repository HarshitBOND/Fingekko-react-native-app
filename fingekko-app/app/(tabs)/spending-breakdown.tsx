import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import AppText from '@/components/ui/AppText';
import DonutChart from '@/components/ui/DonutChart';
import Icon from '@/components/ui/Icon';
import LoadingScreen from '@/components/ui/LoadingScreen';
import PressableScale from '@/components/ui/PressableScale';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { layout, palette, radius, shadows, spacing } from '@/constants/design';
import { useSpendingData } from '@/components/insights/useSpendingData';

type Period = 'week' | 'month';

export default function SpendingBreakdownScreen() {
  const params = useLocalSearchParams<{ period?: string }>();
  const [period, setPeriod] = useState<Period>(params.period === 'month' ? 'month' : 'week');
  const [focused, setFocused] = useState<number | null>(null);
  const { loading, formatAmount, data } = useSpendingData();

  const slices = period === 'week' ? data.weekCategories : data.monthCategories;
  const total = useMemo(() => slices.reduce((sum, c) => sum + c.amount, 0), [slices]);
  const top = slices[0];
  const focusedSlice = focused != null ? slices[focused] : null;

  const setPeriodReset = (p: Period) => {
    setFocused(null);
    setPeriod(p);
  };

  const donutData = useMemo(() => slices.map((c) => ({ value: c.amount, color: c.color })), [slices]);

  const periodLabel = period === 'week' ? 'This week' : 'This month';

  return (
    <ScreenContainer
      contentStyle={{ gap: spacing.lg }}
      header={
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon name="ArrowLeft" size={20} color={palette.textPrimary} clickable={false} />
          </Pressable>
          <AppText variant="title" weight="bold">Spending breakdown</AppText>
          <View style={{ width: 40 }} />
        </View>
      }
    >
      {/* Period toggle */}
      <View style={styles.segment}>
        {(['week', 'month'] as Period[]).map((p) => {
          const active = period === p;
          return (
            <PressableScale
              key={p}
              onPress={() => setPeriodReset(p)}
              style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={p === 'week' ? 'Show this week' : 'Show this month'}
            >
              <AppText
                variant="label"
                style={{ color: active ? palette.primaryDeep : palette.textSecondary }}
              >
                {p === 'week' ? 'This week' : 'This month'}
              </AppText>
            </PressableScale>
          );
        })}
      </View>

      {loading ? (
        <LoadingScreen label="Crunching your categories..." />
      ) : slices.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Icon name="BarChart3" size={26} color={palette.primaryDeep} clickable={false} />
          </View>
          <AppText variant="title" weight="bold" align="center">Nothing to break down yet</AppText>
          <AppText variant="bodySm" color="textSecondary" align="center" style={{ marginTop: 4 }}>
            {period === 'week'
              ? 'No expenses in the last 7 days. Log a few to see where your money goes.'
              : 'No expenses this month yet. Add some to see your category split.'}
          </AppText>
        </View>
      ) : (
        <>
          {/* Donut */}
          <View style={styles.chartCard}>
            <DonutChart
              data={donutData}
              radius={110}
              focusedIndex={focused}
              onSlicePress={(index) => setFocused((cur) => (cur === index ? null : index))}
              centerLabel={() =>
                focusedSlice ? (
                  <View style={{ alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: focusedSlice.color }} />
                      <AppText variant="micro" color="textTertiary" style={{ textTransform: 'uppercase', maxWidth: 100 }} numberOfLines={1}>
                        {focusedSlice.label}
                      </AppText>
                    </View>
                    <AppText variant="money" numberOfLines={1} adjustsFontSizeToFit style={{ maxWidth: 120 }}>
                      {formatAmount(focusedSlice.amount)}
                    </AppText>
                    <AppText variant="caption" weight="bold" style={{ color: focusedSlice.color }}>
                      {focusedSlice.share}% of spend
                    </AppText>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <AppText variant="micro" color="textTertiary">{periodLabel.toUpperCase()}</AppText>
                    <AppText variant="money" numberOfLines={1} adjustsFontSizeToFit style={{ maxWidth: 120 }}>
                      {formatAmount(total)}
                    </AppText>
                    <AppText variant="caption" color="textSecondary">
                      {slices.length} {slices.length === 1 ? 'category' : 'categories'}
                    </AppText>
                  </View>
                )
              }
            />
          </View>

          {/* Insight line */}
          {top ? (
            <View style={styles.insightRow}>
              <View style={[styles.insightDot, { backgroundColor: top.color }]} />
              <AppText variant="bodySm" color="textPrimary" style={{ flex: 1 }}>
                <AppText variant="bodySm" weight="bold" style={{ textTransform: 'capitalize' }}>
                  {top.label}
                </AppText>{' '}
                is your biggest {periodLabel.toLowerCase()} category at {top.share}%.
              </AppText>
            </View>
          ) : null}

          {/* Full category legend / list — tap to focus the matching wedge */}
          <View style={styles.listCard}>
            {slices.map((c, i) => {
              const isFocused = focused === i;
              return (
                <PressableScale
                  key={c.label}
                  onPress={() => setFocused((cur) => (cur === i ? null : i))}
                  style={[styles.legendRow, i > 0 && styles.legendRowBorder, isFocused && styles.legendRowActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isFocused }}
                  accessibilityLabel={`${c.label}, ${formatAmount(c.amount)}, ${c.share} percent`}
                >
                  <View style={[styles.legendDot, { backgroundColor: c.color }]} />
                  <AppText variant="label" style={styles.legendName} numberOfLines={1}>
                    {c.label}
                  </AppText>
                  <AppText numeric variant="label" weight="bold" style={styles.legendAmt}>
                    {formatAmount(c.amount)}
                  </AppText>
                  <View style={styles.legendPctWrap}>
                    <AppText variant="caption" weight="bold" style={{ color: c.color }}>
                      {c.share}%
                    </AppText>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </>
      )}
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
  segment: {
    flexDirection: 'row',
    backgroundColor: palette.card,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
    ...shadows.xs,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  segmentBtnActive: { backgroundColor: palette.primaryLight },
  chartCard: {
    backgroundColor: palette.card,
    borderRadius: radius.xl,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    ...shadows.md,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.base,
  },
  insightDot: { width: 10, height: 10, borderRadius: 5 },
  listCard: {
    backgroundColor: palette.card,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    ...shadows.md,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: spacing.md },
  legendRowBorder: { borderTopWidth: 1, borderTopColor: palette.divider },
  legendRowActive: { backgroundColor: palette.primaryLight, borderRadius: radius.md, marginHorizontal: -8, paddingHorizontal: 8, borderTopColor: 'transparent' },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendName: { flex: 1, textTransform: 'capitalize' },
  legendAmt: { color: palette.textPrimary },
  legendPctWrap: { minWidth: 44, alignItems: 'flex-end' },
  emptyCard: {
    backgroundColor: palette.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.md,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
});
