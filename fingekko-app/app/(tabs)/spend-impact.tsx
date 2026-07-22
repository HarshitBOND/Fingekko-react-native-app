import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import AppText from '@/components/ui/AppText';
import HeroCard from '@/components/ui/HeroCard';
import Icon from '@/components/ui/Icon';
import LoadingScreen from '@/components/ui/LoadingScreen';
import PressableScale from '@/components/ui/PressableScale';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { gradients, layout, palette, radius, shadows, spacing } from '@/constants/design';
import { useSpendingData } from '@/components/insights/useSpendingData';

export default function SpendImpactScreen() {
  const { loading, formatAmount, data, now } = useSpendingData();

  const isSaving = data.isSaving;
  const deltaAbs = data.monthlyDeltaAbs;
  const deltaPct = data.monthlyDeltaPercent;
  const hasData = data.expensesThisMonth > 0 || data.expensesLastMonth > 0;

  const thisMonthName = now.toLocaleString('en-US', { month: 'long' });
  const lastMonthName = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleString('en-US', {
    month: 'long',
  });

  const compareMax = Math.max(data.expensesThisMonth, data.expensesLastMonth, 1);
  const thisPct = Math.round((data.expensesThisMonth / compareMax) * 100);
  const lastPct = Math.round((data.expensesLastMonth / compareMax) * 100);

  const savedTrees = data.savedAmount > 0 ? Math.max(1, Math.round(data.savedAmount / 1000)) : 0;
  const topCats = data.monthCategories.slice(0, 5);

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
          <AppText variant="title" weight="bold">Spend impact</AppText>
          <View style={{ width: 40 }} />
        </View>
      }
    >
      {loading ? (
        <LoadingScreen label="Measuring your month..." />
      ) : (
        <>
          {/* Headline: the month-over-month delta, stated plainly */}
          <HeroCard colors={gradients.hero} padding={22}>
            <AppText variant="label" color="onDarkMuted">
              {thisMonthName.toUpperCase()} vs {lastMonthName.toUpperCase()}
            </AppText>
            {!hasData ? (
              <AppText variant="title" color="onDark" style={{ marginTop: 8 }}>
                Add a few expenses to compare your months.
              </AppText>
            ) : (
              <>
                <View style={styles.deltaRow}>
                  <Icon
                    name={isSaving ? 'ArrowDownLeft' : 'TrendingUp'}
                    size={22}
                    color={palette.white}
                    clickable={false}
                  />
                  <AppText variant="moneyLg" color="onDark" numberOfLines={1} adjustsFontSizeToFit>
                    {formatAmount(deltaAbs)}
                  </AppText>
                </View>
                <AppText variant="body" color="onDarkMuted">
                  {deltaAbs === 0
                    ? `You matched ${lastMonthName}.`
                    : `${isSaving ? 'less' : 'more'} than ${lastMonthName} so far`}
                </AppText>
                {deltaPct > 0 ? (
                  <View style={styles.deltaPill}>
                    <AppText variant="micro" color="onDark">
                      {deltaPct}% {isSaving ? 'leaner' : 'higher'}
                    </AppText>
                  </View>
                ) : null}
              </>
            )}
          </HeroCard>

          {/* This month vs last month bars */}
          <View style={styles.card}>
            <AppText variant="label" color="textSecondary" style={styles.cardLabel}>
              MONTH OVER MONTH
            </AppText>
            <CompareBar
              name={thisMonthName}
              highlight
              amount={formatAmount(data.expensesThisMonth)}
              sub={`avg ${formatAmount(data.avgThisMonth)} / day`}
              pct={thisPct}
            />
            <CompareBar
              name={lastMonthName}
              amount={formatAmount(data.expensesLastMonth)}
              sub={`avg ${formatAmount(data.avgLastMonth)} / day`}
              pct={lastPct}
            />
          </View>

          {/* Savings framing — only when actually saving */}
          {isSaving && data.savedAmount > 0 ? (
            <View style={[styles.card, styles.savedCard]}>
              <View style={styles.savedIcon}>
                <Icon name="PiggyBank" size={22} color={palette.primaryDeep} clickable={false} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="title" weight="bold">
                  {formatAmount(data.savedAmount)} kept in your pocket
                </AppText>
                <AppText variant="bodySm" color="textSecondary" style={{ marginTop: 2 }}>
                  {savedTrees > 0
                    ? `Reinvested, that's roughly ${savedTrees} ${savedTrees === 1 ? 'tree' : 'trees'} 🌳 toward a greener month.`
                    : 'Keep the streak going through the rest of the month.'}
                </AppText>
              </View>
            </View>
          ) : null}

          {/* Where it went this month — only the "Breakdown" link navigates, so the
              card itself never fights the scroll gesture. */}
          {topCats.length > 0 ? (
            <View style={styles.card}>
              <View style={styles.catHeader}>
                <AppText variant="label" color="textSecondary" style={styles.cardLabel}>
                  WHERE IT WENT
                </AppText>
                <PressableScale
                  style={styles.linkRow}
                  hitSlop={10}
                  onPress={() => router.push({ pathname: '/(tabs)/spending-breakdown', params: { period: 'month' } })}
                  accessibilityRole="button"
                  accessibilityLabel="Open full spending breakdown for this month"
                >
                  <AppText variant="caption" weight="bold" color="primaryDeep">Breakdown</AppText>
                  <Icon name="ChevronRight" size={14} color={palette.primaryDeep} clickable={false} />
                </PressableScale>
              </View>
              {topCats.map((c) => (
                <View key={c.label} style={styles.catRow}>
                  <View style={[styles.catDot, { backgroundColor: c.color }]} />
                  <AppText variant="label" style={styles.catName} numberOfLines={1}>{c.label}</AppText>
                  <AppText variant="label" weight="bold">{formatAmount(c.amount)}</AppText>
                  <AppText variant="caption" weight="bold" style={{ color: c.color, minWidth: 40, textAlign: 'right' }}>
                    {c.share}%
                  </AppText>
                </View>
              ))}
            </View>
          ) : null}
        </>
      )}
    </ScreenContainer>
  );
}

function CompareBar({
  name,
  amount,
  sub,
  pct,
  highlight,
}: {
  name: string;
  amount: string;
  sub: string;
  pct: number;
  highlight?: boolean;
}) {
  return (
    <View style={styles.compareBlock}>
      <View style={styles.compareTop}>
        <AppText variant="bodySm" weight={highlight ? 'bold' : 'medium'} color={highlight ? 'textPrimary' : 'textSecondary'}>
          {name}
        </AppText>
        <AppText variant="label" weight="bold">{amount}</AppText>
      </View>
      <View style={styles.compareTrack}>
        <View
          style={[
            styles.compareFill,
            { width: `${Math.max(2, pct)}%`, backgroundColor: highlight ? palette.primary : palette.borderStrong },
          ]}
        />
      </View>
      <AppText variant="caption" color="textTertiary" style={{ marginTop: 4 }}>{sub}</AppText>
    </View>
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
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  deltaPill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  cardLabel: { letterSpacing: 1, marginBottom: spacing.base },
  compareBlock: { marginBottom: spacing.base },
  compareTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  compareTrack: {
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: palette.track,
    overflow: 'hidden',
  },
  compareFill: { height: '100%', borderRadius: radius.pill },
  savedCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: palette.primaryLight },
  savedIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: spacing.base },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 8 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catName: { flex: 1, textTransform: 'capitalize' },
});
