// expo-image aliased: RN's Image (used elsewhere in this file) can't decode
// WebP on iOS.
import { Image as ExpoImage } from 'expo-image';
import Navbar from '@/components/Navbar';
import { currencySymbol } from '@/utils/currency';
import { getLevelProgress } from '@/utils/gamification';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Modal, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';
import PressableScale from '../ui/PressableScale';
import DonutChart from '../ui/DonutChart';
import Icon from '../ui/Icon';
import { fontFamily, palette } from '@/constants/design';
import { AMOUNT_DARK, GREEN, TEXT_MUTED } from './constants';
import { buildMonthlyComparison } from './compute';
import { s } from './style';
import { useSpendingData } from './useSpendingData';

const TREE_ART = require('@/assets/images/tree.webp');

// Gekko Guidance, Unlock Smart Saver, and Quick Tip are parked for a later
// version — flip this to re-enable them without re-plumbing anything.
const ENABLE_LATER_CARDS = false;

const iconForCategory = (label: string) => {
  const k = label.toLowerCase();
  if (k.includes('food') || k.includes('dining') || k.includes('grocery') || k.includes('restaurant')) return 'Utensils';
  if (k.includes('shop')) return 'ShoppingBag';
  if (k.includes('transport') || k.includes('travel') || k.includes('fuel') || k.includes('car')) return 'Car';
  if (k.includes('bill') || k.includes('util') || k.includes('rent') || k.includes('home')) return 'Zap';
  if (k.includes('entertain') || k.includes('fun') || k.includes('subscri')) return 'TrendingUp';
  return 'Coins';
};

export default function InsightsScreen() {
  const { profile, transactions, formatAmount, data, cycle, now } = useSpendingData();

  // Reflect the Home card's debt state so Insights never contradicts it (item 25).
  // Only meaningful once income is set up (salary or income logged this cycle) —
  // otherwise "remaining balance" is just negated spend, same gate Home uses.
  const hasIncomeSetup = (profile?.monthlyIncome ?? 0) > 0 || cycle.incomeThisMonth > 0;
  const inDebt = hasIncomeSetup && cycle.remainingBalance < 0;
  const { width: screenW } = useWindowDimensions();

  // ── Routes ──
  const goImpact = () => router.push('/(tabs)/spend-impact');
  const goFullReport = () =>
    router.push({
      pathname: '/(tabs)/spending-trend',
      params: { month: String(selectedMonth), year: String(selectedYear) },
    });
  const goWeekBreakdown = () => router.push({ pathname: '/(tabs)/spending-breakdown', params: { period: 'week' } });
  const goMonthBreakdown = () => router.push({ pathname: '/(tabs)/spending-breakdown', params: { period: 'month' } });
  const goTransactions = () => router.push('/(tabs)/NonGroupExpenses');

  const [firstName] = (profile?.name ?? 'Friend').split(' ');
  const weeklyProgressPct = Math.round(data.weeklyProgress * 100);
  const comparisonReady = data.expensesLastMonth > 0 || data.expensesThisMonth > 0;
  const deltaAbs = data.monthlyDeltaAbs;
  const deltaPercent = data.monthlyDeltaPercent;
  const isSaving = data.isSaving;

  // Header line — factual momentum, not flattery.
  const headerLine = !comparisonReady
    ? 'Add a few expenses to start seeing your trends.'
    : deltaPercent === 0
      ? `${firstName}, your spending matches last month so far.`
      : `${firstName}, you're spending ${deltaPercent}% ${isSaving ? 'less' : 'more'} than last month.`;

  const insightTitle = !comparisonReady
    ? 'Start tracking to compare months'
    : deltaPercent === 0
      ? 'Your spending matches last month'
      : `You're spending ${deltaPercent}% ${isSaving ? 'less' : 'more'} this month`;

  const insightSub = !comparisonReady
    ? 'Add a few expenses to unlock insights.'
    : deltaAbs === 0
      ? 'Keep tracking to spot trends.'
      : isSaving
        ? `That's like saving ${formatAmount(deltaAbs)} so far!`
        : `That's ${formatAmount(deltaAbs)} more so far.`;

  const currentMonthLabel = now.toLocaleString('en-US', { month: 'short' });
  const lastMonthLabel = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleString('en-US', {
    month: 'short',
  });

  const formatShortDate = (date: Date) => date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  const weekRangeLabel = `${formatShortDate(data.weekStart)} – ${formatShortDate(now)}`;

  // ── Month selector + comparison chart ──
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);

  const comparison = useMemo(
    () => buildMonthlyComparison(transactions, selectedYear, selectedMonth, now, data.avgThisMonth),
    [transactions, selectedYear, selectedMonth, now, data.avgThisMonth]
  );

  const viewingCurrent = comparison.isCurrentMonth;

  // Series mapping (same as the full report): the backbone drives the x-axis, so
  // the forecast — which spans the whole month — is series 1 for the current
  // month, with the actual line on top; a plain month line otherwise.
  const chartData1 = viewingCurrent ? comparison.expected ?? comparison.current : comparison.current;
  const chartData2 = viewingCurrent ? comparison.current : undefined;
  const chartData3 = viewingCurrent ? comparison.previous ?? undefined : undefined;

  const chartMaxValue = useMemo(() => {
    const allValues = [
      ...comparison.current.map((d) => d.value),
      ...(comparison.previous?.map((d) => d.value) ?? []),
      ...(comparison.expected?.map((d) => d.value) ?? []),
    ];
    const max = allValues.length > 0 ? Math.max(...allValues) : 0;
    return max > 0 ? max * 1.15 : 1;
  }, [comparison]);

  const chartViewportWidth = Math.max(240, Math.min(screenW, 640) - 88);

  // Fit the whole month inside the card (no inner horizontal scroll) so a vertical
  // drag over the chart scrolls the page instead of being swallowed by the chart.
  const chartInitialSpacing = 8;
  const chartEndSpacing = 12;
  const chartPointCount = Math.max(chartData1.length, 1);
  const fitSpacing =
    chartPointCount > 1
      ? Math.max(4, (chartViewportWidth - chartInitialSpacing - chartEndSpacing) / (chartPointCount - 1))
      : chartViewportWidth;
  // Thin the day labels so only ~6 show across the month without overlapping.
  const labelStep = Math.max(1, Math.ceil(comparison.labels.length / 6));
  const thinnedLabels = comparison.labels.map((l, i) =>
    i % labelStep === 0 || i === comparison.labels.length - 1 ? l : ''
  );

  // ── Weekly snapshot pie ──
  const hasWeekSpend = data.weekCategories.length > 0;
  const weekPie = hasWeekSpend
    ? data.weekCategories.map((c) => ({ value: c.amount, color: c.color }))
    : [{ value: 1, color: palette.track }];
  const weekLegend = data.weekCategories.slice(0, 5);

  // Compact money for chart labels (₹1.2k) so bars/bubbles stay legible. Uses the
  // active currency symbol (AUDIT item 17), not a hard-coded ₹.
  const compactAmount = (n: number) => {
    const sym = currencySymbol();
    const v = Math.round(n);
    if (v >= 100000) return `${sym}${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `${sym}${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
    return `${sym}${v}`;
  };

  // Day-by-day bar series (rounded-cap bars; today and the busiest day stand out).
  const barSpacing = Math.max(12, Math.floor((chartViewportWidth - 7 * 22) / 7));
  const barData = data.weekDaily.map((d) => ({
    value: d.amount,
    label: d.label,
    frontColor: d.isToday ? palette.primaryDeep : palette.primary,
    gradientColor: d.isToday ? palette.primary : palette.primaryBright,
    topLabelComponent:
      d.amount > 0 && d.amount === data.weekDailyMax
        ? () => <Text style={s.barTopLabel}>{compactAmount(d.amount)}</Text>
        : undefined,
  }));

  // ── Impact card visuals ──
  const savedTrees = data.savedAmount > 0 ? Math.max(1, Math.round(data.savedAmount / 1000)) : 0;
  const rewardTarget = 3000;
  const rewardCurrent = Math.min(rewardTarget, Math.max(0, data.savedAmount));
  const rewardProgress = rewardTarget > 0 ? rewardCurrent / rewardTarget : 0;
  const impactParticles = useMemo(
    () =>
      Array.from({ length: 48 }, (_, index) => ({
        id: `particle-${index}`,
        left: Math.random() * 140,
        top: Math.random() * 220,
        size: 1 + Math.random() * 2.4,
        opacity: 0.18 + Math.random() * 0.34,
      })),
    []
  );

  // month navigation
  const goPrevMonth = () => {
    const m = selectedMonth - 1;
    if (m < 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else setSelectedMonth(m);
  };
  const goNextMonth = () => {
    const maxMonth = now.getMonth();
    const maxYear = now.getFullYear();
    if (selectedYear > maxYear || (selectedYear === maxYear && selectedMonth >= maxMonth)) return;
    const m = selectedMonth + 1;
    if (m > 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else setSelectedMonth(m);
  };

  return (
    <SafeAreaView style={s.page}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.container}>
        <Navbar />

        {/* ── HEADER ─────────────────────────────────────────── */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.heading}>Insights</Text>
            <Text style={s.subHeading}>{headerLine}</Text>
          </View>
          <PressableScale
            style={s.weekChip}
            onPress={goWeekBreakdown}
            accessibilityRole="button"
            accessibilityLabel="See this week's breakdown"
          >
            <Icon name="Calendar" size={14} color={palette.primaryDeep} clickable={false} />
            <Text style={s.weekChipText}>This week</Text>
            <Icon name="ChevronRight" size={13} color={palette.primaryDeep} clickable={false} />
          </PressableScale>
        </View>

        {/* ── LEVEL / XP STRIP ─────────────────────────────────── */}
        {profile ? (
          (() => {
            const lp = getLevelProgress(profile.xp ?? 0);
            return (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              >
                <View
                  style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#EAF8E5', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 16 }}>⚡</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontFamily: fontFamily.extrabold, color: AMOUNT_DARK, fontSize: 13 }}>
                      Level {profile.level ?? lp.level}
                    </Text>
                    <Text style={{ color: TEXT_MUTED, fontSize: 12, fontFamily: fontFamily.medium }}>
                      {lp.xpIntoLevel} / {lp.xpForNextLevel} XP
                    </Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: '#EDEFEC', overflow: 'hidden' }}>
                    <View style={{ width: `${Math.round(lp.progress * 100)}%`, height: '100%', borderRadius: 3, backgroundColor: GREEN }} />
                  </View>
                </View>
              </View>
            );
          })()
        ) : null}

        {/* Month picker modal */}
        <Modal visible={monthPickerVisible} animationType="slide" transparent>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center' }}>
            <View style={{ margin: 20, backgroundColor: '#fff', borderRadius: 12, maxHeight: '70%' }}>
              <ScrollView contentContainerStyle={{ padding: 12 }}>
                {Array.from({ length: 60 }).map((_, i) => {
                  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                  const m = d.getMonth();
                  const y = d.getFullYear();
                  return (
                    <TouchableOpacity
                      key={`${m}-${y}`}
                      onPress={() => {
                        setSelectedMonth(m);
                        setSelectedYear(y);
                        setMonthPickerVisible(false);
                      }}
                      style={{ paddingVertical: 10 }}
                    >
                      <Text style={{ fontSize: 16, color: AMOUNT_DARK, fontFamily: fontFamily.semibold }}>{monthNames[m]} {y}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity onPress={() => setMonthPickerVisible(false)} style={{ padding: 12, alignItems: 'center' }}>
                <Text style={{ color: TEXT_MUTED, fontFamily: fontFamily.semibold }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── SPENDING COMPARISON ────────────────────────────── */}
        <View style={s.card}>
          <View style={s.trendHeaderRow}>
            <Text style={[s.sectionLabel, { marginBottom: 0 }]}>SPENDING COMPARISON</Text>
            <PressableScale
              style={s.fullReportBtn}
              onPress={goFullReport}
              accessibilityRole="button"
              accessibilityLabel="Open the full spending report"
            >
              <Icon name="TrendingUp" size={13} color={palette.primaryDeep} clickable={false} />
              <Text style={s.fullReportText}>Full report</Text>
              <Icon name="ChevronRight" size={13} color={palette.primaryDeep} clickable={false} />
            </PressableScale>
          </View>

          <View style={s.monthNavRow}>
            <TouchableOpacity onPress={goPrevMonth} hitSlop={8} accessibilityRole="button" accessibilityLabel="Previous month">
              <Text style={{ fontSize: 18, color: TEXT_MUTED, fontFamily: fontFamily.semibold }}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMonthPickerVisible(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Pick a month">
              <Text style={{ fontSize: 13, color: AMOUNT_DARK, fontFamily: fontFamily.bold }}>{monthNames[selectedMonth]} {selectedYear}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goNextMonth} hitSlop={8} accessibilityRole="button" accessibilityLabel="Next month">
              <Text style={{ fontSize: 18, color: TEXT_MUTED, fontFamily: fontFamily.semibold }}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Month amounts */}
          <View style={{ flexDirection: 'row', gap: 24, marginBottom: 14 }}>
            <View>
              <Text style={{ fontSize: 11, color: TEXT_MUTED, fontFamily: fontFamily.medium }}>{lastMonthLabel} (last month)</Text>
              <Text style={{ fontSize: 22, fontFamily: fontFamily.extrabold, color: AMOUNT_DARK, marginTop: 2, letterSpacing: -0.3 }}>
                {formatAmount(data.expensesLastMonth)}
              </Text>
              <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2, fontFamily: fontFamily.medium }}>
                avg {formatAmount(data.avgLastMonth)} / day
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 11, color: palette.primaryDeep, fontFamily: fontFamily.semibold }}>{currentMonthLabel} (this month)</Text>
              <Text style={{ fontSize: 22, fontFamily: fontFamily.extrabold, color: AMOUNT_DARK, marginTop: 2, letterSpacing: -0.3 }}>
                {formatAmount(data.expensesThisMonth)}
              </Text>
              <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2, fontFamily: fontFamily.medium }}>
                avg {formatAmount(data.avgThisMonth)} / day
              </Text>
            </View>
          </View>

          {/* Over-budget this cycle (AUDIT item 25) — mirrors the Home hero card's
              debt state so Insights never reads rosier than the real position. */}
          {inDebt && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginBottom: 14,
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: palette.dangerLight,
              }}
            >
              <Icon name="TrendingDown" size={13} color={palette.danger} clickable={false} />
              <Text style={{ flex: 1, fontSize: 12, color: AMOUNT_DARK, fontFamily: fontFamily.semibold }}>
                Over budget this cycle by {formatAmount(Math.abs(cycle.remainingBalance))}
              </Text>
            </View>
          )}

          {/* Recurring bills committed each month (AUDIT item 10) — keeps Insights
              consistent with what Home/Safe-to-Spend reserve against essentials. */}
          {data.monthlyEssentials > 0 && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginBottom: 14,
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: palette.warningLight,
              }}
            >
              <Icon name="ReceiptText" size={13} color={palette.warning} clickable={false} />
              <Text style={{ flex: 1, fontSize: 12, color: AMOUNT_DARK, fontFamily: fontFamily.medium }}>
                {formatAmount(data.monthlyEssentials)}/mo committed to bills
                {data.unpaidEssentials > 0 ? ` · ${formatAmount(data.unpaidEssentials)} still to pay` : ' · all paid'}
              </Text>
            </View>
          )}

          {/* Smooth trend lines: this month vs last month, plus a dashed forecast.
              No fill / no y-axis for a clean glance; the full report is interactive. */}
          <LineChart
            data={chartData1}
            data2={chartData2}
            data3={chartData3}
            height={130}
            width={chartViewportWidth}
            spacing={fitSpacing}
            color1={viewingCurrent ? 'rgba(102,204,68,0.45)' : palette.primary}
            color2={palette.primary}
            color3={palette.textTertiary}
            strokeDashArray1={viewingCurrent ? [5, 5] : undefined}
            thickness1={viewingCurrent ? 2 : 3}
            thickness2={3}
            thickness3={2}
            curved
            hideDataPoints
            hideYAxisText
            yAxisColor="transparent"
            xAxisColor={palette.border}
            yAxisThickness={0}
            xAxisThickness={1}
            rulesType="dashed"
            rulesColor="rgba(30,30,30,0.06)"
            dashWidth={4}
            dashGap={6}
            xAxisLabelTextStyle={{ color: palette.textTertiary, fontSize: 10, fontFamily: fontFamily.medium }}
            xAxisLabelTexts={thinnedLabels}
            noOfSections={4}
            initialSpacing={chartInitialSpacing}
            endSpacing={chartEndSpacing}
            adjustToWidth={false}
            disableScroll
            maxValue={chartMaxValue}
          />

          {/* Legend */}
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            {viewingCurrent ? (
              <>
                <LegendDot color={palette.primary} label="This month" />
                <LegendDot color={palette.textTertiary} label="Last month" />
                <LegendDot color="rgba(102,204,68,0.45)" label="Forecast" />
              </>
            ) : (
              <LegendDot color={palette.primary} label={`Spending (${monthNames[selectedMonth]} ${selectedYear})`} />
            )}
          </View>

          {/* Insight pill → Spend impact */}
          <PressableScale
            style={s.insightPill}
            onPress={goImpact}
            accessibilityRole="button"
            accessibilityLabel="Open spend impact detail"
          >
            <View style={s.insightPillLeft}>
              <Icon name="Target" color={palette.primaryDeep} size={18} clickable={false} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={s.insightPillTitle}>{insightTitle}</Text>
                <Text style={s.insightPillSub}>{insightSub}</Text>
              </View>
            </View>
            <View style={s.seeImpactBtn}>
              <Text style={s.seeImpactText}>See impact</Text>
              <Icon name="ChevronRight" size={14} color={palette.primaryDeep} clickable={false} />
            </View>
          </PressableScale>
        </View>

        {/* ── THIS WEEK, DAY BY DAY (rounded bars) ───────────── */}
        <View style={s.card}>
          <View style={s.chartHeaderRow}>
            <Text style={s.sectionLabel}>THIS WEEK, DAY BY DAY</Text>
            <PressableScale
              style={s.periodPill}
              onPress={goWeekBreakdown}
              accessibilityRole="button"
              accessibilityLabel="Open weekly breakdown"
            >
              <Text style={s.periodPillText}>This week</Text>
              <Icon name="ChevronDown" size={13} color={palette.textPrimary} clickable={false} />
            </PressableScale>
          </View>

          <View style={s.barHeadline}>
            <Text style={s.barHeadlineAmt} numberOfLines={1} adjustsFontSizeToFit>
              {formatAmount(data.weeklySpend)}
            </Text>
            <Text style={s.barHeadlineUnit}>spent this week</Text>
          </View>
          <View style={s.barMetaRow}>
            <View style={s.barMetaChip}>
              <Icon name="TrendingUp" size={12} color={palette.primaryDeep} clickable={false} />
              <Text style={s.barMetaChipText}>{formatAmount(data.weekDailyAvg)}/day avg</Text>
            </View>
            <Text style={s.barMetaMuted}>
              {data.weekBusiestDay.amount > 0
                ? `Busiest: ${data.weekBusiestDay.label} · ${formatAmount(data.weekBusiestDay.amount)}`
                : `${data.weekActiveDays} active ${data.weekActiveDays === 1 ? 'day' : 'days'}`}
            </Text>
          </View>

          {data.weeklySpend > 0 ? (
            <BarChart
              data={barData}
              height={132}
              width={chartViewportWidth}
              barWidth={22}
              spacing={barSpacing}
              initialSpacing={Math.floor(barSpacing / 2)}
              endSpacing={2}
              roundedTop
              barBorderRadius={7}
              showGradient
              frontColor={palette.primary}
              gradientColor={palette.primaryBright}
              maxValue={data.weekDailyMax > 0 ? data.weekDailyMax * 1.28 : 1}
              noOfSections={3}
              hideYAxisText
              yAxisThickness={0}
              xAxisColor={palette.border}
              xAxisThickness={1}
              rulesType="dashed"
              rulesColor="rgba(30,30,30,0.05)"
              dashWidth={4}
              dashGap={6}
              xAxisLabelTextStyle={{ color: palette.textTertiary, fontSize: 10, fontFamily: fontFamily.medium }}
              disableScroll
            />
          ) : (
            <View style={s.barEmpty}>
              <Text style={s.snapSub}>No spending logged this week yet.</Text>
            </View>
          )}
        </View>

        {/* ── WEEKLY SNAPSHOT ────────────────────────────────── */}
        <View style={s.card}>
          <View style={s.snapshotHeader}>
            <View style={s.snapshotTitleRow}>
              <Text style={s.sectionLabel}>WEEKLY SNAPSHOT</Text>
              <Text style={s.dateTag}>{weekRangeLabel}</Text>
            </View>
            <PressableScale
              style={s.thisWeekBtn}
              onPress={goWeekBreakdown}
              accessibilityRole="button"
              accessibilityLabel="Open weekly breakdown"
            >
              <Text style={s.thisWeekText}>Breakdown</Text>
              <Icon name="ChevronRight" size={13} color={palette.primaryDeep} clickable={false} />
            </PressableScale>
          </View>

          {/* Donut of where the week's money went + category legend (tap opens breakdown) */}
          <View style={s.snapshotBodyRow}>
            <PressableScale
              style={s.pieWrap}
              onPress={goWeekBreakdown}
              accessibilityRole="button"
              accessibilityLabel={`Weekly spending by category, ${formatAmount(data.weeklySpend)} spent this week. Opens breakdown.`}
            >
              <DonutChart
                data={weekPie}
                radius={58}
                showLabels={false}
                centerLabel={() => (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={s.pieCenterAmt} numberOfLines={1} adjustsFontSizeToFit>
                      {compactAmount(data.weeklySpend)}
                    </Text>
                    <Text style={s.pieCenterSub}>this week</Text>
                  </View>
                )}
              />
              <Text style={s.pieHint}>Tap for breakdown</Text>
            </PressableScale>

            <View style={s.snapLegendCol}>
              {hasWeekSpend ? (
                weekLegend.map((c) => (
                  <View key={c.label} style={s.weekLegendRow}>
                    <View style={[s.weekLegendDot, { backgroundColor: c.color }]} />
                    <Text style={s.weekLegendName} numberOfLines={1}>{c.label}</Text>
                    <Text style={[s.weekLegendPct, { color: c.color }]}>{c.share}%</Text>
                  </View>
                ))
              ) : (
                <Text style={s.snapSub}>No spending logged this week yet.</Text>
              )}
            </View>
          </View>

          {/* Weekly budget usage */}
          <View style={s.snapBudgetBlock}>
            <Text style={s.snapAmount}>
              {formatAmount(data.weeklySpend)} <Text style={s.snapOf}>of {formatAmount(data.weeklyBudget)}</Text>
            </Text>
            <Text style={s.snapSub}>weekly budget used</Text>
            <View style={s.snapBarBg}>
              <View style={[s.snapBarFill, { width: `${weeklyProgressPct}%` }]} />
            </View>
          </View>

          <View style={s.snapDivider} />

          {/* Tappable weekly stat tiles */}
          <View style={s.statsRow}>
            <PressableScale style={s.statTile} onPress={goTransactions} accessibilityRole="button" accessibilityLabel="See your biggest spend transactions">
              <Text style={s.statNum} numberOfLines={1} adjustsFontSizeToFit>{formatAmount(data.weekBiggestSpend)}</Text>
              <Text style={s.statLbl}>Biggest{'\n'}spend</Text>
            </PressableScale>
            <View style={s.statDivider} />
            <PressableScale style={s.statTile} onPress={goTransactions} accessibilityRole="button" accessibilityLabel="See this week's transactions">
              <Text style={s.statNum}>{data.weekTransactionCount}</Text>
              <Text style={s.statLbl}>This week&apos;s{'\n'}transactions</Text>
            </PressableScale>
            <View style={s.statDivider} />
            <PressableScale style={s.statTile} onPress={goImpact} accessibilityRole="button" accessibilityLabel="See spend impact">
              <Text style={s.statNum} numberOfLines={1} adjustsFontSizeToFit>{formatAmount(data.weeklyLeft)}</Text>
              <Text style={s.statLbl}>Left for{'\n'}the week</Text>
            </PressableScale>
          </View>
        </View>

        {/* ── TOP CATEGORIES + SPENDING IMPACT ──────────────── */}
        <View style={s.twoColRow}>
          <View style={[s.card, s.catCard]}>
            <View style={s.catHeader}>
              <Text style={s.sectionLabel}>TOP SPENDING CATEGORIES</Text>
              <Text style={s.thisMonthTag}>This Month</Text>
            </View>

            {data.categoryRows.length === 0 ? (
              <Text style={[s.snapSub, { paddingVertical: 8 }]}>Add expenses to see your category split.</Text>
            ) : (
              data.categoryRows.map((row) => {
                const color = row.color;
                return (
                  <View key={row.label} style={s.catItem}>
                    <View style={[s.catIcon, { backgroundColor: color + '22' }]}>
                      <Icon name={iconForCategory(row.label)} size={16} color={color} clickable={false} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={s.catNameRow}>
                        <Text style={s.catName} numberOfLines={1}>{row.label}</Text>
                        <Text style={s.catAmt}>{formatAmount(row.amount)}</Text>
                        <Text style={[s.catPct, { color }]}>{row.share ? `${row.share}%` : '0%'}</Text>
                      </View>
                      <View style={s.catBarBg}>
                        <View style={[s.catBarFill, { width: `${row.barPercent ?? 0}%`, backgroundColor: color }]} />
                      </View>
                    </View>
                  </View>
                );
              })
            )}

            <PressableScale style={s.viewAllBtn} onPress={goMonthBreakdown} accessibilityRole="button" accessibilityLabel="View all categories">
              <Text style={s.viewAllText}>View all categories</Text>
              <Icon name="ChevronRight" size={13} color={palette.primaryDeep} clickable={false} />
            </PressableScale>
          </View>

          {/* Spending Impact — tappable, routes to the detail page */}
          <PressableScale
            style={[s.impactCard, s.impactCardLayout]}
            onPress={goImpact}
            accessibilityRole="button"
            accessibilityLabel="Open spend impact detail"
          >
            <View style={s.visualSection}>
              {/* Was an SVG component (1.5MB source); now a 32KB WebP, which
                  also lets the platform decode it off the JS thread. */}
              <View style={s.treeImage} pointerEvents="none">
                <ExpoImage source={TREE_ART} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              </View>
              <LinearGradient
                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.15)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0.92)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.fadeOverlay}
                pointerEvents="none"
              />
              <View style={s.treeSeam} pointerEvents="none" />
              <View style={s.particlesContainer} pointerEvents="none">
                {impactParticles.map((particle) => (
                  <View
                    key={particle.id}
                    style={[s.particle, { left: particle.left, top: particle.top, opacity: particle.opacity, width: particle.size, height: particle.size }]}
                  />
                ))}
              </View>
            </View>

            <View style={s.impactTextContainer}>
              <Text style={s.impactLabel}>SPENDING{'\n'}IMPACT</Text>
              <View style={s.impactAmountBlock}>
                <Text style={s.impactAmt} numberOfLines={1} adjustsFontSizeToFit>{formatAmount(data.savedAmount)}</Text>
                <Text style={s.impactSub}>saved this month</Text>
              </View>
              <View style={s.impactGrowBlock}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Text style={s.impactGrowText}>{savedTrees > 0 ? `That's ${savedTrees} 🌳` : 'Keep saving 🌱'}</Text>
                  <Icon name="ChevronRight" size={14} color={palette.primaryDeep} clickable={false} />
                </View>
                <Text style={s.impactGrowText}>{savedTrees > 0 ? 'for a greener planet!' : 'to grow your impact'}</Text>
              </View>
            </View>
          </PressableScale>
        </View>

        {/* Gekko Guidance · Unlock Smart Saver · Quick Tip — parked for a later version */}
        {ENABLE_LATER_CARDS && (
          <>
            <TouchableOpacity style={s.guidanceCard} onPress={goImpact} activeOpacity={0.8}>
              <View style={s.guidanceImgWrap}>
                {/* WebP: Metro bundles this require() even though the card is behind
                    ENABLE_LATER_CARDS, so the old 252KB PNG was shipping unused. */}
                <ExpoImage source={require('../../assets/images/personality-strategist.webp')} style={s.guidanceImg} contentFit="contain" />
              </View>
              <View style={s.guidanceContent}>
                <Text style={s.guidanceLabel}>GEKKO GUIDANCE</Text>
                <Text style={s.guidanceMain}>Try a no-spend weekend!</Text>
                <Text style={s.guidanceSub}>
                  {data.weekendEstimate > 0
                    ? `You usually spend ${formatAmount(data.weekendEstimate)} on weekends.`
                    : 'Track a few weekend expenses to personalize this tip.'}
                </Text>
              </View>
              <Icon name="ChevronRight" size={18} color="#000000" clickable={false} />
            </TouchableOpacity>

            <LinearGradient colors={['#CFE7FF', '#DCEEFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.rewardCard}>
              <View style={s.rewardLeft}>
                <View style={s.rewardIconWrap}>
                  <Text style={{ fontSize: 26 }}>🎁</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.rewardTitle}>Unlock &quot;Smart Saver&quot; badge</Text>
                  <Text style={s.rewardSub}>Save {formatAmount(rewardTarget)} more this month</Text>
                  <View style={s.rewardBarBg}>
                    <View style={[s.rewardBarFill, { width: `${Math.round(rewardProgress * 100)}%` }]} />
                  </View>
                  <View style={s.rewardBarLabels}>
                    <Text style={s.rewardBarLbl}>{formatAmount(rewardCurrent)} / {formatAmount(rewardTarget)}</Text>
                  </View>
                </View>
              </View>
              <View style={s.rewardBadge}>
                <Text style={{ fontSize: 20 }}>🐷</Text>
                <Text style={s.rewardBadgeLbl}>Smart Saver</Text>
                <Text style={s.rewardBadgeSub}>Level 2</Text>
              </View>
            </LinearGradient>

            <TouchableOpacity style={s.tipCard} onPress={goImpact} activeOpacity={0.8}>
              <Text style={{ fontSize: 18 }}>💡</Text>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.tipTitle}>Quick tip</Text>
                <Text style={s.tipText}>Track subscriptions you don&apos;t use. You could save up to {currencySymbol()}600/month!</Text>
              </View>
              <Icon name="ChevronRight" size={16} color="#000000" clickable={false} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={s.legendRowFilled}>
      <View style={[s.legendDotFilled, { backgroundColor: color }]} />
      <Text style={s.legendText}>{label}</Text>
    </View>
  );
}
