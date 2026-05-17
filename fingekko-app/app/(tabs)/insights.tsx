import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { EXPENSE_CATEGORIES } from '../../constants/categories';
import { Colors, FontSizes, Spacing } from '../../constants/Colors';
import { Transaction, UserProfile } from '../../constants/types';
import { formatCurrency, isSameDay } from '../../utils/helpers';
import { getProfile, getTransactions } from '../../utils/storage';

const CATEGORY_COLORS = [
  Colors.primary,
  Colors.savings,
  '#F39C12',
  Colors.expense,
  '#1ABC9C',
];

const DONUT_SIZE = 140;
const DONUT_RADIUS = 48;
const DONUT_STROKE = 16;

export default function InsightsScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadData() {
        const [nextProfile, nextTransactions] = await Promise.all([
          getProfile(),
          getTransactions(),
        ]);

        if (!isActive) {
          return;
        }

        setProfile(nextProfile);
        setTransactions(nextTransactions);
      }

      loadData();

      return () => {
        isActive = false;
      };
    }, [])
  );

  const currency = profile?.currency ?? '₹';
  const formatAmount = (amount: number) => formatCurrency(Math.round(amount), currency);

  const monthStats = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const inMonth = transactions.filter(transaction => {
      const date = new Date(transaction.date);
      if (Number.isNaN(date.getTime())) {
        return false;
      }
      return date.getMonth() === month && date.getFullYear() === year;
    });

    const income = inMonth
      .filter(transaction => transaction.type === 'income')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const expenses = inMonth
      .filter(transaction => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const net = income - expenses;
    const savingsRate = income > 0 ? Math.max(0, net / income) : 0;

    return {
      monthLabel: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      income,
      expenses,
      net,
      savingsRate,
    };
  }, [transactions]);

  const weeklySpend = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      const dateString = date.toISOString().split('T')[0];
      const expenseTotal = transactions
        .filter(transaction => transaction.type === 'expense')
        .filter(transaction => isSameDay(transaction.date, dateString))
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      return {
        date,
        dateString,
        expenseTotal,
      };
    });

    const values = days.map(day => day.expenseTotal);
    const maxValue = Math.max(...values, 1);
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;

    return { days, values, maxValue, average };
  }, [transactions]);

  const categoryStats = useMemo(() => {
    const totals = new Map<string, number>();
    const expenseTransactions = transactions.filter(transaction => transaction.type === 'expense');

    expenseTransactions.forEach(transaction => {
      const current = totals.get(transaction.category) ?? 0;
      totals.set(transaction.category, current + transaction.amount);
    });

    const sorted = Array.from(totals.entries())
      .map(([id, value]) => ({ id, value }))
      .sort((a, b) => b.value - a.value);

    const top = sorted.slice(0, 4);
    const rest = sorted.slice(4);
    const otherTotal = rest.reduce((sum, item) => sum + item.value, 0);
    const mappedTop = top.map((item, index) => {
      const meta = EXPENSE_CATEGORIES.find(category => category.id === item.id);
      const label = meta?.label ?? item.id.charAt(0).toUpperCase() + item.id.slice(1);

      return {
        id: item.id,
        label,
        value: item.value,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      };
    });

    if (otherTotal > 0) {
      mappedTop.push({
        id: 'other',
        label: 'Other',
        value: otherTotal,
        color: CATEGORY_COLORS[mappedTop.length % CATEGORY_COLORS.length],
      });
    }

    const total = expenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

    return {
      total,
      segments: total > 0 ? mappedTop : [{ id: 'none', label: 'No data', value: 1, color: Colors.border }],
    };
  }, [transactions]);

  const donutSegments = useMemo(() => {
    const circumference = 2 * Math.PI * DONUT_RADIUS;
    let offset = 0;

    return categoryStats.segments.map(segment => {
      const total = categoryStats.total > 0 ? categoryStats.total : segment.value;
      const length = (segment.value / total) * circumference;
      const dashArray = `${length} ${circumference - length}`;
      const dashOffset = circumference - offset;
      offset += length;

      return {
        ...segment,
        dashArray,
        dashOffset,
      };
    });
  }, [categoryStats]);

  const lineChart = useMemo(() => {
    const width = 320;
    const height = 160;
    const padding = 24;
    const innerWidth = width - padding * 2;
    const innerHeight = height - padding * 2;

    const points = weeklySpend.values.map((value, index) => {
      const x = padding + (index / (weeklySpend.values.length - 1)) * innerWidth;
      const y = padding + innerHeight - (value / weeklySpend.maxValue) * innerHeight;
      return { x, y };
    });

    const linePath = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ');
    const areaPath = `${linePath} L ${padding + innerWidth} ${padding + innerHeight} L ${padding} ${padding + innerHeight} Z`;

    return { width, height, points, linePath, areaPath };
  }, [weeklySpend]);

  const barChart = useMemo(() => {
    const width = 320;
    const height = 160;
    const baseline = height - 24;
    const maxValue = Math.max(monthStats.income, monthStats.expenses, 1);
    const barWidth = 46;
    const spacing = 90;

    const incomeHeight = (monthStats.income / maxValue) * (height - 60);
    const expenseHeight = (monthStats.expenses / maxValue) * (height - 60);

    return {
      width,
      height,
      baseline,
      barWidth,
      spacing,
      incomeHeight,
      expenseHeight,
    };
  }, [monthStats]);

  return (
    <SafeAreaView style={styles.container}>
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <View style={styles.greenGlow} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Insights</Text>
          <Text style={styles.headerSubtitle}>{monthStats.monthLabel}</Text>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.heroLabel}>Net this month</Text>
              <Text
                style={[
                  styles.heroValue,
                  monthStats.net >= 0 ? styles.positiveValue : styles.negativeValue,
                ]}
              >
                {formatAmount(Math.abs(monthStats.net))}
              </Text>
              <Text style={styles.heroSub}>{monthStats.net >= 0 ? 'Surplus' : 'Deficit'}</Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>
                {Math.round(monthStats.savingsRate * 100)}% saved
              </Text>
            </View>
          </View>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Income</Text>
              <Text style={styles.heroStatValue}>{formatAmount(monthStats.income)}</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Expenses</Text>
              <Text style={styles.heroStatValue}>{formatAmount(monthStats.expenses)}</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(monthStats.savingsRate * 100, 100)}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Spending trend</Text>
            <Text style={styles.sectionValue}>{formatAmount(weeklySpend.average)} avg/day</Text>
          </View>
          <View style={styles.chartCard}>
            <Svg width="100%" height={lineChart.height} viewBox={`0 0 ${lineChart.width} ${lineChart.height}`}>
              <Defs>
                <LinearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={Colors.expense} stopOpacity={0.25} />
                  <Stop offset="100%" stopColor={Colors.expense} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Path d={lineChart.areaPath} fill="url(#spendGradient)" />
              <Path d={lineChart.linePath} stroke={Colors.expense} strokeWidth={3} fill="none" />
              {lineChart.points.map((point, index) => (
                <Circle key={`dot-${index}`} cx={point.x} cy={point.y} r={4} fill={Colors.expense} />
              ))}
            </Svg>
            <View style={styles.axisRow}>
              {weeklySpend.days.map(day => (
                <Text key={day.dateString} style={styles.axisLabel}>
                  {day.date.toLocaleDateString('en-IN', { weekday: 'short' })}
                </Text>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Category split</Text>
            <Text style={styles.sectionValue}>{formatAmount(categoryStats.total)} spent</Text>
          </View>
          <View style={styles.chartCard}>
            <View style={styles.donutRow}>
              <View style={styles.donutWrap}>
                <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
                  <G rotation="-90" origin={`${DONUT_SIZE / 2} ${DONUT_SIZE / 2}`}>
                    {donutSegments.map(segment => (
                      <Circle
                        key={segment.id}
                        cx={DONUT_SIZE / 2}
                        cy={DONUT_SIZE / 2}
                        r={DONUT_RADIUS}
                        stroke={segment.color}
                        strokeWidth={DONUT_STROKE}
                        strokeDasharray={segment.dashArray}
                        strokeDashoffset={segment.dashOffset}
                        strokeLinecap="round"
                        fill="none"
                      />
                    ))}
                  </G>
                </Svg>
                <View style={styles.donutCenter}>
                  <Text style={styles.donutValue}>{formatAmount(categoryStats.total)}</Text>
                  <Text style={styles.donutLabel}>spent</Text>
                </View>
              </View>
              <View style={styles.legendList}>
                {categoryStats.total > 0 ? (
                  categoryStats.segments.map(segment => (
                    <View key={segment.id} style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
                      <Text style={styles.legendLabel}>{segment.label}</Text>
                      <Text style={styles.legendValue}>{formatAmount(segment.value)}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No expense data yet.</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Income vs expenses</Text>
            <Text style={styles.sectionValue}>{formatAmount(monthStats.net)} net</Text>
          </View>
          <View style={styles.chartCard}>
            <Svg width="100%" height={barChart.height} viewBox={`0 0 ${barChart.width} ${barChart.height}`}>
              <Line
                x1={20}
                y1={barChart.baseline}
                x2={barChart.width - 20}
                y2={barChart.baseline}
                stroke={Colors.border}
                strokeWidth={1}
              />
              <Rect
                x={barChart.width / 2 - barChart.spacing}
                y={barChart.baseline - barChart.incomeHeight}
                width={barChart.barWidth}
                height={barChart.incomeHeight}
                rx={12}
                fill={Colors.income}
              />
              <Rect
                x={barChart.width / 2 + barChart.spacing - barChart.barWidth}
                y={barChart.baseline - barChart.expenseHeight}
                width={barChart.barWidth}
                height={barChart.expenseHeight}
                rx={12}
                fill={Colors.expense}
              />
            </Svg>
            <View style={styles.barLegendRow}>
              <View style={styles.barLegendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.income }]} />
                <View>
                  <Text style={styles.legendLabel}>Income</Text>
                  <Text style={styles.legendValue}>{formatAmount(monthStats.income)}</Text>
                </View>
              </View>
              <View style={styles.barLegendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.expense }]} />
                <View>
                  <Text style={styles.legendLabel}>Expenses</Text>
                  <Text style={styles.legendValue}>{formatAmount(monthStats.expenses)}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  greenGlow: {
    position: 'absolute',
    top: -120,
    right: -140,
    width: 280,
    height: 240,
    borderRadius: 200,
    backgroundColor: Colors.primary,
    opacity: 0.18,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.base,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  heroValue: {
    fontSize: 34,
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  positiveValue: {
    color: Colors.income,
  },
  negativeValue: {
    color: Colors.expense,
  },
  heroSub: {
    marginTop: 2,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  heroBadge: {
    backgroundColor: 'rgba(46, 204, 113, 0.14)',
    borderRadius: 999,
    paddingHorizontal: Spacing.base,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(46, 204, 113, 0.24)',
  },
  heroBadgeText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginTop: Spacing.lg,
  },
  heroStat: {
    flex: 1,
    padding: Spacing.base,
    backgroundColor: Colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heroStatLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  heroStatValue: {
    marginTop: 6,
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: Spacing.base,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 999,
  },
  section: {
    marginTop: Spacing.xl,
    gap: Spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionValue: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  axisRow: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  donutWrap: {
    width: DONUT_SIZE,
    height: DONUT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  donutValue: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  donutLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  legendList: {
    flex: 1,
    gap: Spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  legendValue: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  barLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.base,
  },
  barLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
