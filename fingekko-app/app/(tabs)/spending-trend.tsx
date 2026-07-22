import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import AppText from '@/components/ui/AppText';
import DonutChart from '@/components/ui/DonutChart';
import Icon from '@/components/ui/Icon';
import LoadingScreen from '@/components/ui/LoadingScreen';
import MiniAreaStat from '@/components/ui/MiniAreaStat';
import PressableScale from '@/components/ui/PressableScale';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { buildMonthlyComparison, computeCategoryBreakdown } from '@/components/insights/compute';
import { useSpendingData } from '@/components/insights/useSpendingData';
import { fontFamily, layout, palette, radius, shadows, spacing } from '@/constants/design';

// Days visible per "page" — small enough that a full month never gets congested.
const WINDOW = 8;
const FORECAST_COLOR = 'rgba(102,204,68,0.5)';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// KPI-card accents (app-native: brand green + two hues from the category palette).
const CARD_GREEN = palette.primary;
const CARD_BLUE = '#3B82C4';
const CARD_VIOLET = '#8B5CF6';

export default function SpendingTrendScreen() {
  const params = useLocalSearchParams<{ month?: string; year?: string }>();
  const { loading, formatAmount, data, transactions, now } = useSpendingData();
  const { width: screenW } = useWindowDimensions();

  const parsedMonth = params.month != null ? parseInt(String(params.month), 10) : NaN;
  const parsedYear = params.year != null ? parseInt(String(params.year), 10) : NaN;
  const [selectedMonth, setSelectedMonth] = useState<number>(
    Number.isInteger(parsedMonth) && parsedMonth >= 0 && parsedMonth <= 11 ? parsedMonth : now.getMonth()
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    Number.isInteger(parsedYear) && parsedYear > 1970 ? parsedYear : now.getFullYear()
  );
  const [offset, setOffset] = useState(0);
  const [pickerVisible, setPickerVisible] = useState(false);

  const comparison = useMemo(
    () => buildMonthlyComparison(transactions, selectedYear, selectedMonth, now, data.avgThisMonth),
    [transactions, selectedYear, selectedMonth, now, data.avgThisMonth]
  );

  const isCurrent = comparison.isCurrentMonth;
  const N = comparison.labels.length;
  const maxOffset = Math.max(0, N - WINDOW);

  // Open the window near "today" for the current month; at the start otherwise.
  useEffect(() => {
    const start = isCurrent ? Math.min(maxOffset, Math.max(0, comparison.todayIndex - WINDOW + 1)) : 0;
    setOffset(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear, N, isCurrent, comparison.todayIndex]);

  const from = Math.min(offset, maxOffset);
  const to = from + WINDOW;
  const winLabels = comparison.labels.slice(from, to);
  const winCurrent = comparison.current.slice(from, to);
  const winPrevious = comparison.previous ? comparison.previous.slice(from, to) : undefined;
  const winExpected = comparison.expected ? comparison.expected.slice(from, to) : undefined;

  // series1 is the backbone that sets the x-axis, so it must span the whole window:
  // forecast for the current month, otherwise the month's own actual line.
  const big1 = isCurrent && winExpected && winExpected.length ? winExpected : winCurrent;
  const big2 = isCurrent && winCurrent.length ? winCurrent : undefined;
  const big3 = isCurrent && winPrevious && winPrevious.length ? winPrevious : undefined;

  const bigMax = useMemo(() => {
    const all = [
      ...comparison.current.map((d) => d.value),
      ...(comparison.previous?.map((d) => d.value) ?? []),
      ...(comparison.expected?.map((d) => d.value) ?? []),
    ];
    const m = all.length ? Math.max(...all) : 0;
    return m > 0 ? m * 1.15 : 1;
  }, [comparison]);

  const hasAnyData =
    comparison.current.some((d) => d.value > 0) || (comparison.previous?.some((d) => d.value > 0) ?? false);

  // Chart geometry — generous per-point spacing so the window reads clearly.
  const contentW = Math.min(screenW, 640) - layout.gutter * 2;
  const chartW = Math.max(220, contentW - spacing.lg * 2);
  const CHART_INIT = 12;
  const CHART_END = 12;
  const winCount = Math.max(big1.length, 1);
  const bigSpacing = winCount > 1 ? Math.max(24, (chartW - CHART_INIT - CHART_END) / (winCount - 1)) : chartW;

  // Summary numbers.
  const monthTotal = comparison.current.length ? comparison.current[comparison.current.length - 1].value : 0;
  const projectedEnd = comparison.expected ? comparison.expected[comparison.expected.length - 1].value : monthTotal;
  const lastMonthTotal = data.expensesLastMonth;
  const daysInMonth = comparison.daysInMonth;

  // ── Mini area-chart KPI cards ──
  // Daily spend (from the cumulative series) makes a lively sparkline.
  const toDaily = (cum: { value: number }[]) =>
    cum.map((p, i) => ({ value: Math.max(0, Math.round(p.value - (i > 0 ? cum[i - 1].value : 0))) }));
  const thisDaily = toDaily(comparison.current);
  const lastDaily = comparison.previous ? toDaily(comparison.previous) : [];
  const forecastSeries = comparison.expected ?? comparison.current;
  const todayNum = comparison.todayIndex + 1;
  const lastMonthName = MONTH_NAMES[(selectedMonth + 11) % 12];

  const summaryCards = isCurrent
    ? [
        { icon: 'Wallet', title: 'Spent so far', period: `${MONTH_SHORT[selectedMonth]} 1–${todayNum}`, value: formatAmount(monthTotal), data: thisDaily, color: CARD_GREEN },
        { icon: 'TrendingUp', title: 'Projected', period: `by ${MONTH_SHORT[selectedMonth]} ${daysInMonth}`, value: formatAmount(projectedEnd), data: forecastSeries, color: CARD_VIOLET },
        { icon: 'CalendarDays', title: 'Last month', period: `${lastMonthName} total`, value: formatAmount(lastMonthTotal), data: lastDaily.length ? lastDaily : thisDaily, color: CARD_BLUE },
      ]
    : [
        { icon: 'Wallet', title: 'Total spent', period: `${MONTH_NAMES[selectedMonth]} ${selectedYear}`, value: formatAmount(monthTotal), data: thisDaily, color: CARD_GREEN },
        { icon: 'TrendingUp', title: 'Daily average', period: 'per day', value: formatAmount(Math.round(monthTotal / Math.max(1, daysInMonth))), data: thisDaily, color: CARD_BLUE },
      ];

  // ── Category donut ("where it went") for the selected month ──
  const categories = useMemo(() => {
    const monthStart = new Date(selectedYear, selectedMonth, 1);
    const monthEnd = isCurrent ? now : new Date(selectedYear, selectedMonth + 1, 0);
    return computeCategoryBreakdown(transactions.filter((t) => t.type === 'expense'), monthStart, monthEnd);
  }, [transactions, selectedMonth, selectedYear, isCurrent, now]);
  const donutTotal = categories.reduce((sum, c) => sum + c.amount, 0);
  const pieData = categories.map((c) => ({ value: c.amount, color: c.color }));
  const topCats = categories.slice(0, 5);

  const rangeLabel = winLabels.length
    ? `${MONTH_SHORT[selectedMonth]} ${winLabels[0]}–${winLabels[winLabels.length - 1]}`
    : '';

  const step = Math.max(1, WINDOW - 1);
  const canLeft = from > 0;
  const canRight = from < maxOffset;
  const goLeft = () => setOffset((o) => Math.max(0, Math.min(o, maxOffset) - step));
  const goRight = () => setOffset((o) => Math.min(maxOffset, Math.min(o, maxOffset) + step));

  const goPrevMonth = () => {
    const m = selectedMonth - 1;
    if (m < 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else setSelectedMonth(m);
  };
  const atCurrentEdge = selectedYear === now.getFullYear() && selectedMonth >= now.getMonth();
  const goNextMonth = () => {
    if (atCurrentEdge) return;
    const m = selectedMonth + 1;
    if (m > 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else setSelectedMonth(m);
  };

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
          <AppText variant="title" weight="bold">Spending trend</AppText>
          <View style={{ width: 40 }} />
        </View>
      }
    >
      {loading ? (
        <LoadingScreen label="Charting your month..." />
      ) : (
        <>
          {/* Month selector */}
          <View style={styles.monthBar}>
            <TouchableOpacity
              onPress={goPrevMonth}
              hitSlop={10}
              style={styles.monthArrow}
              accessibilityRole="button"
              accessibilityLabel="Previous month"
            >
              <Icon name="ChevronLeft" size={18} color={palette.textPrimary} clickable={false} />
            </TouchableOpacity>
            <PressableScale
              style={styles.monthPill}
              onPress={() => setPickerVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Pick a month"
            >
              <Icon name="Calendar" size={14} color={palette.primaryDeep} clickable={false} />
              <AppText variant="label" weight="bold" color="textPrimary">
                {MONTH_NAMES[selectedMonth]} {selectedYear}
              </AppText>
            </PressableScale>
            <TouchableOpacity
              onPress={goNextMonth}
              hitSlop={10}
              disabled={atCurrentEdge}
              style={[styles.monthArrow, atCurrentEdge && styles.disabled]}
              accessibilityRole="button"
              accessibilityLabel="Next month"
              accessibilityState={{ disabled: atCurrentEdge }}
            >
              <Icon name="ChevronRight" size={18} color={palette.textPrimary} clickable={false} />
            </TouchableOpacity>
          </View>

          {/* Chart card */}
          <View style={styles.card}>
            {/* Legend */}
            <View style={styles.legendRow}>
              {isCurrent ? (
                <>
                  <Legend color={palette.primary} label="This month" />
                  <Legend color={palette.textTertiary} label="Last month" />
                  <Legend color={FORECAST_COLOR} label="Forecast" dashed />
                </>
              ) : (
                <Legend color={palette.primary} label={`${MONTH_NAMES[selectedMonth]} spending`} />
              )}
            </View>

            {hasAnyData ? (
              <>
                <LineChart
                  data={big1}
                  data2={big2}
                  data3={big3}
                  height={196}
                  width={chartW}
                  spacing={bigSpacing}
                  initialSpacing={CHART_INIT}
                  endSpacing={CHART_END}
                  color1={isCurrent ? FORECAST_COLOR : palette.primary}
                  color2={palette.primary}
                  color3={palette.textTertiary}
                  strokeDashArray1={isCurrent ? [6, 5] : undefined}
                  thickness1={isCurrent ? 2 : 3}
                  thickness2={3}
                  thickness3={2}
                  curved
                  hideDataPoints1={isCurrent}
                  dataPointsColor1={palette.primary}
                  dataPointsRadius1={3.5}
                  dataPointsColor2={palette.primary}
                  dataPointsRadius2={3.5}
                  dataPointsColor3={palette.textTertiary}
                  dataPointsRadius3={3}
                  hideYAxisText
                  yAxisThickness={0}
                  yAxisColor="transparent"
                  xAxisColor={palette.border}
                  xAxisThickness={1}
                  rulesType="dashed"
                  rulesColor="rgba(30,30,30,0.06)"
                  dashWidth={4}
                  dashGap={6}
                  xAxisLabelTexts={winLabels}
                  xAxisLabelTextStyle={{ color: palette.textTertiary, fontSize: 11, fontFamily: fontFamily.medium }}
                  noOfSections={4}
                  maxValue={bigMax}
                  adjustToWidth={false}
                  disableScroll
                />

                {/* Pan controls — move the window across the month */}
                <View style={styles.panRow}>
                  <PressableScale
                    style={[styles.panBtn, !canLeft && styles.disabled]}
                    onPress={goLeft}
                    disabled={!canLeft}
                    accessibilityRole="button"
                    accessibilityLabel="Earlier days"
                    accessibilityState={{ disabled: !canLeft }}
                  >
                    <Icon name="ChevronLeft" size={20} color={palette.primaryDeep} clickable={false} />
                  </PressableScale>

                  <View style={styles.rangeWrap}>
                    <AppText variant="label" weight="bold" color="textPrimary">{rangeLabel}</AppText>
                    <AppText variant="micro" color="textTertiary">
                      Day {from + 1}–{Math.min(N, to)} of {N} · swipe with the arrows
                    </AppText>
                  </View>

                  <PressableScale
                    style={[styles.panBtn, !canRight && styles.disabled]}
                    onPress={goRight}
                    disabled={!canRight}
                    accessibilityRole="button"
                    accessibilityLabel="Later days"
                    accessibilityState={{ disabled: !canRight }}
                  >
                    <Icon name="ChevronRight" size={20} color={palette.primaryDeep} clickable={false} />
                  </PressableScale>
                </View>
              </>
            ) : (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Icon name="TrendingUp" size={24} color={palette.primaryDeep} clickable={false} />
                </View>
                <AppText variant="bodySm" color="textSecondary" align="center">
                  No spending recorded for {MONTH_NAMES[selectedMonth]} {selectedYear} yet.
                </AppText>
              </View>
            )}
          </View>

          {/* Summary — mini area-chart KPI cards */}
          <View style={{ gap: spacing.lg }}>
            {summaryCards.map((c) => (
              <MiniAreaStat
                key={c.title}
                icon={c.icon}
                title={c.title}
                period={c.period}
                value={c.value}
                data={c.data}
                color={c.color}
              />
            ))}
          </View>

          {/* Where it went — category donut for the selected month */}
          <View style={styles.card}>
            <View style={styles.donutHeader}>
              <AppText variant="label" color="textSecondary" style={{ letterSpacing: 1 }}>WHERE IT WENT</AppText>
              {isCurrent && data.monthlyDeltaPercent > 0 ? (
                <View style={[styles.badge, { backgroundColor: data.isSaving ? palette.successLight : palette.dangerLight }]}>
                  <Icon
                    name={data.isSaving ? 'TrendingDown' : 'TrendingUp'}
                    size={13}
                    color={data.isSaving ? palette.primaryDeep : palette.danger}
                    clickable={false}
                  />
                  <AppText variant="micro" style={{ color: data.isSaving ? palette.primaryDeep : palette.danger }}>
                    {data.monthlyDeltaPercent}% {data.isSaving ? 'lower' : 'higher'}
                  </AppText>
                </View>
              ) : null}
            </View>

            {categories.length ? (
              <View style={styles.donutBody}>
                <DonutChart
                  data={pieData}
                  radius={76}
                  centerLabel={() => (
                    <View style={{ alignItems: 'center' }}>
                      <AppText variant="micro" color="textTertiary">
                        {isCurrent ? 'THIS MONTH' : MONTH_SHORT[selectedMonth].toUpperCase()}
                      </AppText>
                      <AppText variant="money" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 17, maxWidth: 88 }}>
                        {formatAmount(donutTotal)}
                      </AppText>
                    </View>
                  )}
                />
                <View style={styles.donutLegend}>
                  {topCats.map((c) => (
                    <View key={c.label} style={styles.donutLegendRow}>
                      <View style={[styles.donutDot, { backgroundColor: c.color }]} />
                      <AppText variant="caption" style={styles.donutName} numberOfLines={1}>{c.label}</AppText>
                      <AppText variant="caption" weight="bold" style={{ color: c.color }}>{c.share}%</AppText>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.emptyInline}>
                <AppText variant="bodySm" color="textSecondary" align="center">
                  No category spending to show for {MONTH_NAMES[selectedMonth]}.
                </AppText>
              </View>
            )}
          </View>

          {/* Insight line */}
          {isCurrent && projectedEnd > 0 ? (
            <View style={styles.insightRow}>
              <View style={[styles.insightDot, { backgroundColor: palette.primary }]} />
              <AppText variant="bodySm" color="textPrimary" style={{ flex: 1 }}>
                At this pace you&apos;re on track to spend about{' '}
                <AppText variant="bodySm" weight="bold">{formatAmount(projectedEnd)}</AppText>{' '}
                by {MONTH_NAMES[selectedMonth]} {daysInMonth}
                {lastMonthTotal > 0
                  ? projectedEnd <= lastMonthTotal
                    ? ` — under last month's ${formatAmount(lastMonthTotal)}.`
                    : ` — above last month's ${formatAmount(lastMonthTotal)}.`
                  : '.'}
              </AppText>
            </View>
          ) : null}
        </>
      )}

      {/* Month picker */}
      <Modal visible={pickerVisible} animationType="slide" transparent onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={styles.modalScrim} onPress={() => setPickerVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <ScrollView contentContainerStyle={{ padding: 12 }}>
              {Array.from({ length: 60 }).map((_, i) => {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const m = d.getMonth();
                const y = d.getFullYear();
                const active = m === selectedMonth && y === selectedYear;
                return (
                  <TouchableOpacity
                    key={`${m}-${y}`}
                    onPress={() => {
                      setSelectedMonth(m);
                      setSelectedYear(y);
                      setPickerVisible(false);
                    }}
                    style={[styles.pickerRow, active && styles.pickerRowActive]}
                  >
                    <AppText variant="label" weight={active ? 'bold' : 'semibold'} color={active ? 'primaryDeep' : 'textPrimary'}>
                      {MONTH_NAMES[m]} {y}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity onPress={() => setPickerVisible(false)} style={styles.pickerClose}>
              <AppText variant="label" weight="semibold" color="textSecondary">Close</AppText>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }, dashed && styles.legendDashed]} />
      <AppText variant="caption" color="textSecondary">{label}</AppText>
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
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  monthArrow: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.xs,
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.card,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...shadows.xs,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.md,
  },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendDashed: { borderRadius: 2, width: 14, height: 3 },
  panRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, gap: spacing.md },
  panBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeWrap: { flex: 1, alignItems: 'center' },
  disabled: { opacity: 0.35 },
  donutHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 4 },
  donutBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  donutLegend: { flex: 1, gap: 10 },
  donutLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  donutDot: { width: 10, height: 10, borderRadius: 5 },
  donutName: { flex: 1, textTransform: 'capitalize', color: palette.textPrimary },
  emptyInline: { paddingVertical: 20, alignItems: 'center' },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.base,
  },
  insightDot: { width: 10, height: 10, borderRadius: 5 },
  empty: { alignItems: 'center', paddingVertical: 28, gap: spacing.md },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center' },
  modalSheet: { margin: 20, backgroundColor: palette.card, borderRadius: radius.lg, maxHeight: '70%' },
  pickerRow: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: radius.md },
  pickerRowActive: { backgroundColor: palette.primaryLight },
  pickerClose: { padding: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: palette.divider },
});
