import Navbar from '@/components/Navbar';
import type { Transaction } from '@/constants/types';
import type { ApiUser, ProfileResponse, TransactionsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { getLevelProgress } from '@/utils/gamification';
import { formatCurrency } from '@/utils/helpers';
import { useAuth } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../ui/Icon';
import { fontFamily, palette } from '@/constants/design';
import { GREEN, TEXT_MUTED, AMOUNT_DARK } from './constants';
import { s } from './style';

export default function InsightsScreen() {
  const { getToken, isSignedIn } = useAuth();
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadData = async () => {
        if (!isSignedIn) {
          setProfile(null);
          setTransactions([]);
          return;
        }

        const token = await getTokenRef.current();
        if (!token) return;

        try {
          const [profileResponse, transactionsResponse] = await Promise.all([
            apiRequest<ProfileResponse>('/api/profile', {}, token),
            apiRequest<TransactionsResponse>('/api/transactions', {}, token),
          ]);

          if (!isActive) return;

          setProfile(profileResponse.user);
          setTransactions(transactionsResponse.transactions);
        } catch (error) {
          console.warn('Failed to load insights:', error);
        }
      };

      loadData();

      return () => {
        isActive = false;
      };
    }, [isSignedIn])
  );

  const currency = profile?.currency ?? '₹';
  const formatAmount = (value: number) => formatCurrency(Math.round(value), currency);
  const now = useMemo(() => new Date(), []);

  const insights = useMemo(() => {
    const expenses = transactions.filter((item) => item.type === 'expense');

    const parse = (value: string) => {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const inRange = (date: Date | null, start: Date, end: Date) =>
      date ? date >= start && date <= end : false;

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const expensesThisMonth = expenses.reduce((sum, item) => {
      const date = parse(item.date);
      return inRange(date, startOfMonth, now) ? sum + item.amount : sum;
    }, 0);

    const expensesLastMonth = expenses.reduce((sum, item) => {
      const date = parse(item.date);
      return inRange(date, startOfLastMonth, endOfLastMonth) ? sum + item.amount : sum;
    }, 0);

    const daysInLastMonth = endOfLastMonth.getDate() || 1;
    const daysInThisMonth = Math.max(1, now.getDate());
    const avgLastMonth = expensesLastMonth / daysInLastMonth;
    const avgThisMonth = expensesThisMonth / daysInThisMonth;

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const weeklySpend = expenses.reduce((sum, item) => {
      const date = parse(item.date);
      return date && date >= weekStart ? sum + item.amount : sum;
    }, 0);

    const monthlyIncome = profile?.monthlyIncome ?? 0;
    // Without a set income, base the weekly budget on last month's real spend
    // instead of inflating this week's own number (which always lands ~83% used).
    const weeklyBudget = monthlyIncome > 0
      ? monthlyIncome / 4
      : expensesLastMonth > 0
        ? expensesLastMonth / 4
        : Math.max(weeklySpend, 1);
    const weeklyLeft = Math.max(0, weeklyBudget - weeklySpend);
    const weeklyProgress = weeklyBudget > 0 ? Math.min(1, weeklySpend / weeklyBudget) : 0;

    const monthlyDelta = expensesLastMonth - expensesThisMonth;
    const monthlyDeltaAbs = Math.abs(monthlyDelta);
    const monthlyDeltaPercent =
      expensesLastMonth > 0 ? Math.round((monthlyDeltaAbs / expensesLastMonth) * 100) : 0;
    const isSaving = monthlyDelta >= 0;

    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);

    // Scoped to the current calendar month so it actually matches the "This Month" label.
    const expensesForCategoryBreakdown = expenses.filter((item) => inRange(parse(item.date), startOfMonth, now));
    const totalExpensesThisMonth = expensesForCategoryBreakdown.reduce((sum, item) => sum + item.amount, 0);

    const categoryTotals = expensesForCategoryBreakdown.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] ?? 0) + item.amount;
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label, amount]) => ({ label, amount }));

    const categoryRows = topCategories.map((item) => {
      const share = totalExpensesThisMonth > 0 ? Math.round((item.amount / totalExpensesThisMonth) * 100) : 0;
      return {
        ...item,
        share,
        // use share-of-total for bar percent so 0% = empty, 100% = full
        barPercent: share,
      };
    });

    // "Big" spends = this month's expenses notably above this month's own average,
    // rather than a stat that doesn't actually measure anything.
    const avgExpenseThisMonth = expensesForCategoryBreakdown.length > 0
      ? totalExpensesThisMonth / expensesForCategoryBreakdown.length
      : 0;
    const biggestSpendsCount = avgExpenseThisMonth > 0
      ? expensesForCategoryBreakdown.filter((item) => item.amount > avgExpenseThisMonth * 1.5).length
      : 0;

    const weekendWindowStart = new Date(now);
    weekendWindowStart.setDate(now.getDate() - 27);
    weekendWindowStart.setHours(0, 0, 0, 0);

    const weekendDayKeys = new Set<string>();
    const weekendSpend = expenses.reduce((sum, item) => {
      const date = parse(item.date);
      if (!date || date < weekendWindowStart) return sum;
      const day = date.getDay();
      if (day === 0 || day === 6) {
        weekendDayKeys.add(date.toDateString());
        return sum + item.amount;
      }
      return sum;
    }, 0);

    const weekendAvgPerDay = weekendDayKeys.size > 0 ? weekendSpend / weekendDayKeys.size : 0;
    const weekendEstimate = weekendAvgPerDay * 2;

    return {
      expensesThisMonth,
      expensesLastMonth,
      avgLastMonth,
      avgThisMonth,
      savedAmount: isSaving ? monthlyDeltaAbs : 0,
      savedPercent: isSaving ? monthlyDeltaPercent : 0,
      weeklySpend,
      weeklyBudget,
      weeklyLeft,
      weeklyProgress,
      categoryRows,
      biggestSpendsCount,
      transactionCount: expenses.length,
      monthlyDelta,
      monthlyDeltaAbs,
      monthlyDeltaPercent,
      isSaving,
      totalExpenses,
      weekStart,
      weekendEstimate,
    };
  }, [now, profile?.monthlyIncome, transactions]);

  const [firstName] = (profile?.name ?? 'Friend').split(' ');
  const weeklyProgressPct = Math.round(insights.weeklyProgress * 100);
  const comparisonReady = insights.expensesLastMonth > 0 || insights.expensesThisMonth > 0;
  const deltaAbs = insights.monthlyDeltaAbs;
  const deltaPercent = insights.monthlyDeltaPercent;
  const isSaving = insights.isSaving;

  const heroLine = !comparisonReady
    ? 'Add expenses to start seeing insights.'
    : deltaAbs === 0
      ? 'You matched last month. Keep it up!'
      : `You spent ${formatAmount(deltaAbs)} ${isSaving ? 'less' : 'more'} than\nlast month. Keep it up!`;

  const streakSub = !comparisonReady
    ? 'No data yet'
    : deltaPercent === 0
      ? 'No change yet'
      : `${deltaPercent}% ${isSaving ? 'leaner' : 'higher'}`;

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

  const formatShortDate = (date: Date) =>
    date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

  const weekRangeLabel = `${formatShortDate(insights.weekStart)} - ${formatShortDate(now)}, ${now.getFullYear()}`;

  // Month selector state & helpers
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const nowMonth = now.getMonth();
  const nowYear = now.getFullYear();
  const [selectedMonth, setSelectedMonth] = useState<number>(nowMonth);
  const [selectedYear, setSelectedYear] = useState<number>(nowYear);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);

  const buildCumulativeForRange = (expList: Transaction[], start: Date, end: Date) => {
    const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    const result: { value: number }[] = [];
    let running = 0;
    for (let d = 0; d < totalDays; d++) {
      const dayStart = new Date(start);
      dayStart.setDate(start.getDate() + d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      expList.forEach((item) => {
        const date = new Date(item.date);
        if (date >= dayStart && date <= dayEnd) running += item.amount;
      });
      result.push({ value: running });
    }
    return result;
  };

  // Compute displayed chart series and x-axis labels based on selected month/year
  const { chartDisplay } = useMemo(() => {
    const start = new Date(selectedYear, selectedMonth, 1);
    const end = new Date(selectedYear, selectedMonth + 1, 0);
    const selectedLine = buildCumulativeForRange(transactions.filter(t => t.type === 'expense'), start, end);
    const labels = Array.from({ length: selectedLine.length }, (_, i) => String(i + 1));

    // if viewing current month, include thisMonth, expected and lastMonth as before
    const isCurrent = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();
    if (isCurrent) {
      const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const lastLine = buildCumulativeForRange(transactions.filter(t => t.type === 'expense'), lastStart, lastEnd);
      const thisStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisLine = buildCumulativeForRange(transactions.filter(t => t.type === 'expense'), thisStart, now);

      const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
      const expectedLine = [
        ...new Array(Math.max(0, thisLine.length - 1)).fill({ value: 0 }),
        ...Array.from({ length: daysLeft + 1 }, (_, i) => ({ value: Math.round(insights.expensesThisMonth + insights.avgThisMonth * i) })),
      ];

      return { chartDisplay: { data: lastLine, data2: thisLine, data3: expectedLine, labels } };
    }

    // previous month or any month: show single series (gray)
    return { chartDisplay: { data: selectedLine, data2: undefined, data3: undefined, labels } };
  }, [transactions, selectedMonth, selectedYear, now, insights.expensesThisMonth, insights.avgThisMonth]);

  const viewingCurrent = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();

  // Scale the chart to whichever series is actually on screen, so browsing a
  // historical month doesn't clip against the current/last month's totals.
  const chartMaxValue = useMemo(() => {
    const allValues = [
      ...chartDisplay.data.map((d) => d.value),
      ...(chartDisplay.data2?.map((d) => d.value) ?? []),
      ...(chartDisplay.data3?.map((d) => d.value) ?? []),
    ];
    const max = allValues.length > 0 ? Math.max(...allValues) : 0;
    return max > 0 ? max * 1.2 : 1;
  }, [chartDisplay]);

  // Keyed by category name (not row position) so a given category always gets
  // the same icon/color, however it ranks against the user's other spending.
  const CATEGORY_STYLES: Record<string, { color: string; bgColor: string; iconName: string; iconColor: string }> = {
    shopping: { color: '#7FB3FF', bgColor: '#C3FFD8', iconName: 'ShoppingBag', iconColor: '#000000' },
    food: { color: '#B89CFF', bgColor: '#F1E9FF', iconName: 'Utensils', iconColor: '#000000' },
    dining: { color: '#B89CFF', bgColor: '#F1E9FF', iconName: 'Utensils', iconColor: '#000000' },
    home: { color: '#F2C078', bgColor: '#FFF8E7', iconName: 'Home', iconColor: '#000000' },
    travel: { color: '#6FCF97', bgColor: '#E6FAEF', iconName: 'Plane', iconColor: '#000000' },
    transport: { color: '#6FCF97', bgColor: '#E6FAEF', iconName: 'Car', iconColor: '#000000' },
    bills: { color: '#F2994A', bgColor: '#FFF1E5', iconName: 'Zap', iconColor: '#000000' },
    utilities: { color: '#F2994A', bgColor: '#FFF1E5', iconName: 'Zap', iconColor: '#000000' },
    entertainment: { color: '#EB5757', bgColor: '#FDE7E7', iconName: 'TrendingUp', iconColor: '#000000' },
  };
  const FALLBACK_PALETTE = [
    { color: '#7FB3FF', bgColor: '#C3FFD8', iconName: 'ShoppingBag', iconColor: '#000000' },
    { color: '#B89CFF', bgColor: '#F1E9FF', iconName: 'Coins', iconColor: '#000000' },
    { color: '#F2C078', bgColor: '#FFF8E7', iconName: 'CircleAlert', iconColor: '#000000' },
  ];
  const styleForCategory = (label: string) => {
    const known = CATEGORY_STYLES[label.toLowerCase()];
    if (known) return known;
    let hash = 0;
    for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
    return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
  };

  const categoryDisplay = insights.categoryRows.map((row) => ({
    ...row,
    ...styleForCategory(row.label),
  }));

  const rewardTarget = 3000;
  const rewardCurrent = Math.min(rewardTarget, Math.max(0, insights.savedAmount));
  const rewardProgress = rewardTarget > 0 ? rewardCurrent / rewardTarget : 0;
  const treesSaved = insights.savedAmount > 0 ? Math.max(1, Math.round(insights.savedAmount / 1000)) : 0;
  const particleFieldWidth = 140;
  const particleFieldHeight = 220;
  const impactParticles = useMemo(
    () =>
      Array.from({ length: 48 }, (_, index) => {
        const left = Math.random() * particleFieldWidth;
        const top = Math.random() * particleFieldHeight;
        const size = 1 + Math.random() * 2.4;
        const opacity = 0.18 + Math.random() * 0.34;
        return { id: `particle-${index}`, left, top, size, opacity };
      }),
    []
  );

  const showSignInAlert = () => {
    Alert.alert('Sign in required', 'Sign in to view insights data.');
  };

  const handleSeeImpact = () => {
    if (!isSignedIn) { showSignInAlert(); return; }
    if (!comparisonReady) {
      Alert.alert('Monthly impact', 'Add a few expenses to compare month over month.');
      return;
    }
    const deltaLine =
      deltaAbs === 0
        ? 'You matched last month.'
        : `That's ${formatAmount(deltaAbs)} ${isSaving ? 'less' : 'more'} than last month.`;
    Alert.alert(
      'Monthly impact',
      `This month: ${formatAmount(insights.expensesThisMonth)}\nLast month: ${formatAmount(insights.expensesLastMonth)}\n${deltaLine}`
    );
  };

  const handleThisWeek = () => {
    if (!isSignedIn) { showSignInAlert(); return; }
    Alert.alert(
      'This week',
      `You spent ${formatAmount(insights.weeklySpend)} of ${formatAmount(insights.weeklyBudget)}.\n${formatAmount(insights.weeklyLeft)} left for the week.`
    );
  };

  const handleViewCategories = () => {
    if (!isSignedIn) { showSignInAlert(); return; }
    if (insights.totalExpenses === 0) {
      Alert.alert('Top categories', 'No expenses yet. Add a few to see the breakdown.');
      return;
    }
    const lines = insights.categoryRows
      .filter((row) => row.amount > 0)
      .map((row) => `${row.label}: ${formatAmount(row.amount)} (${row.share}%)`)
      .join('\n');
    Alert.alert('Top categories', lines || 'No expenses yet.');
  };

  const handleGuidance = () => {
    if (!isSignedIn) { showSignInAlert(); return; }
    const message =
      insights.weekendEstimate > 0
        ? `You usually spend about ${formatAmount(insights.weekendEstimate)} on weekends.`
        : 'Track a few weekend expenses to personalize this tip.';
    Alert.alert('Gekko guidance', message);
  };

  const handleQuickTip = () => {
    Alert.alert('Quick tip', "Track subscriptions you don't use. You could save up to ₹600/month!");
  };

  // month navigation helpers
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
  const openMonthPicker = () => setMonthPickerVisible(true);
  const selectMonthYear = (m: number, y: number) => { setSelectedMonth(m); setSelectedYear(y); setMonthPickerVisible(false); };

  return (
    <SafeAreaView style={s.page}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.container}>
        <Navbar />

        {/* ── HEADER ─────────────────────────────────────────── */}
        <View style={s.header}>
          <Text style={s.heading}>Insights</Text>
          <Text style={s.subHeading}>Understand. Improve. Level up. 🌿</Text>
        </View>

        {/* ── LEVEL / XP STRIP — updates as expenses earn XP ──── */}
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
                  marginBottom: 14,
                }}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: '#EAF8E5',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
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
                    <View
                      style={{
                        width: `${Math.round(lp.progress * 100)}%`,
                        height: '100%',
                        borderRadius: 3,
                        backgroundColor: GREEN,
                      }}
                    />
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
                    <TouchableOpacity key={`${m}-${y}`} onPress={() => selectMonthYear(m, y)} style={{ paddingVertical: 10 }}>
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

        {/* ── HERO CARD ──────────────────────────────────────── */}
        <View style={s.heroCard}>
          <View style={s.heroImageWrap}>
            <Image
              source={require('../../assets/images/cardImagePlannergekko.png')}
              style={s.heroImage}
              resizeMode="contain"
            />
          </View>
          <View style={s.heroBody}>
            <Text style={s.heroTitle}>Great job, {firstName}! 👋</Text>
            <Text style={s.heroText}>{heroLine}</Text>
          </View>
          <View style={s.streakBox}>
            <View style={s.fireBadge}>
              <Icon name="Flame" color="#000000" size={20} />
            </View>
            <Text style={s.streakTitle}>On fire!</Text>
            <Text style={s.streakSub}>{streakSub}</Text>
          </View>
        </View>

        {/* ── SPENDING COMPARISON ────────────────────────────── */}
        <View style={s.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={s.sectionLabel}>SPENDING COMPARISON</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity onPress={goPrevMonth}>
                <Text style={{ fontSize: 16, color: TEXT_MUTED, fontFamily: fontFamily.semibold }}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={openMonthPicker}>
                <Text style={{ fontSize: 13, color: AMOUNT_DARK, fontFamily: fontFamily.bold }}>{monthNames[selectedMonth]} {selectedYear}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={goNextMonth}>
                <Text style={{ fontSize: 16, color: TEXT_MUTED, fontFamily: fontFamily.semibold }}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Month amounts row */}
          <View style={{ flexDirection: 'row', gap: 24, marginBottom: 14 }}>
            <View>
              <Text style={{ fontSize: 11, color: TEXT_MUTED, fontFamily: fontFamily.medium }}>{lastMonthLabel} (last month)</Text>
              <Text style={{ fontSize: 22, fontFamily: fontFamily.extrabold, color: AMOUNT_DARK, marginTop: 2, letterSpacing: -0.3 }}>
                {formatAmount(insights.expensesLastMonth)}
              </Text>
              <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2, fontFamily: fontFamily.medium }}>
                avg {formatAmount(insights.avgLastMonth)} / day
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 11, color: palette.primaryDeep, fontFamily: fontFamily.semibold }}>{currentMonthLabel} (this month)</Text>
              <Text style={{ fontSize: 22, fontFamily: fontFamily.extrabold, color: AMOUNT_DARK, marginTop: 2, letterSpacing: -0.3 }}>
                {formatAmount(insights.expensesThisMonth)}
              </Text>
              <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2, fontFamily: fontFamily.medium }}>
                avg {formatAmount(insights.avgThisMonth)} / day
              </Text>
            </View>
          </View>

          {/* Line chart — brand green focus line with a soft area fill, recessive
              neutral comparison line, and dashed projection, all on the app palette. */}
          <LineChart
            data={chartDisplay.data}
            data2={chartDisplay.data2}
            data3={chartDisplay.data3}
            height={120}
            spacing={12}
            // When viewing a past month there's a single series — make it the green
            // focus line (with fill). For the current month, data (last month) stays
            // a recessive neutral and data2 (this month) becomes the green focus.
            color1={viewingCurrent ? palette.textTertiary : palette.primary}
            color2={palette.primary}
            color3="rgba(102,204,68,0.4)"
            strokeDashArray1={viewingCurrent ? [5, 4] : undefined}
            strokeDashArray3={[5, 4]}
            thickness1={viewingCurrent ? 1.5 : 2.5}
            thickness2={2.5}
            thickness3={1.5}
            areaChart={!viewingCurrent}
            startFillColor={palette.primary}
            endFillColor={palette.primary}
            startOpacity={0.16}
            endOpacity={0.01}
            areaChart2
            startFillColor2={palette.primary}
            endFillColor2={palette.primary}
            startOpacity2={0.18}
            endOpacity2={0.01}
            hideDataPoints
            hideYAxisText={false}
            yAxisColor="transparent"
            xAxisColor={palette.border}
            yAxisThickness={0}
            xAxisThickness={1}
            rulesType="dashed"
            rulesColor="rgba(30,30,30,0.05)"
            dashWidth={4}
            dashGap={6}
            yAxisTextStyle={{ color: palette.textTertiary, fontSize: 10, fontFamily: fontFamily.medium }}
            xAxisLabelTextStyle={{ color: palette.textTertiary, fontSize: 10, fontFamily: fontFamily.medium }}
            xAxisLabelTexts={chartDisplay.labels}
            noOfSections={4}
            curved
            initialSpacing={8}
            endSpacing={8}
            adjustToWidth={false}
            showScrollIndicator
            scrollAnimation
            maxValue={chartMaxValue}
            yAxisLabelPrefix={currency}
            formatYLabel={(v) => {
              const n = Number(v);
              return n >= 1000 ? Math.round(n / 1000) + 'k' : String(Math.round(n));
            }}
          />

          {/* Chart legend */}
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
            {viewingCurrent ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 16, height: 3, borderRadius: 2, backgroundColor: palette.textTertiary }} />
                  <Text style={{ fontSize: 11, color: TEXT_MUTED, fontFamily: fontFamily.medium }}>Last month</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 16, height: 3, borderRadius: 2, backgroundColor: palette.primary }} />
                  <Text style={{ fontSize: 11, color: TEXT_MUTED, fontFamily: fontFamily.medium }}>This month</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 16, height: 3, borderRadius: 2, backgroundColor: 'rgba(102,204,68,0.4)' }} />
                  <Text style={{ fontSize: 11, color: TEXT_MUTED, fontFamily: fontFamily.medium }}>Expected</Text>
                </View>
              </>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 16, height: 3, borderRadius: 2, backgroundColor: palette.primary }} />
                <Text style={{ fontSize: 11, color: TEXT_MUTED, fontFamily: fontFamily.medium }}>Spending ({monthNames[selectedMonth]} {selectedYear})</Text>
              </View>
            )}
          </View>

          {/* Insight pill */}
          <TouchableOpacity style={s.insightPill} onPress={handleSeeImpact} activeOpacity={0.8}>
            <View style={s.insightPillLeft}>
              <Icon name="Target" color="#000000" size={18} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={s.insightPillTitle}>{insightTitle}</Text>
                <Text style={s.insightPillSub}>{insightSub}</Text>
              </View>
            </View>
            <View style={s.seeImpactBtn}>
              <Text style={s.seeImpactText}>See impact</Text>
              <Icon name="ChevronRight" size={14} color="#000000" />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── WEEKLY SNAPSHOT ────────────────────────────────── */}
        <View style={s.card}>
          <View style={s.snapshotHeader}>
            <View style={s.snapshotTitleRow}>
              <Text style={s.sectionLabel}>WEEKLY SNAPSHOT</Text>
              <Text style={s.dateTag}>
                <Icon name="Calendar" size={16} color="#000000" /> {weekRangeLabel}
              </Text>
            </View>
            <TouchableOpacity style={s.thisWeekBtn} onPress={handleThisWeek} activeOpacity={0.8}>
              <Text style={s.thisWeekText}>This week</Text>
              <Icon name="ChevronRight" size={13} color="#000000" />
            </TouchableOpacity>
          </View>

          <View style={s.snapshotBody}>
            <View style={s.circleWrap}>
              <View style={s.circleOuter}>
                <Text style={s.circleText}>{weeklyProgressPct}%</Text>
              </View>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={s.snapAmount}>
                {formatAmount(insights.weeklySpend)}{' '}
                <Text style={s.snapOf}>of {formatAmount(insights.weeklyBudget)}</Text>
              </Text>
              <Text style={s.snapSub}>weekly budget used</Text>
              <View style={s.snapBarBg}>
                <View style={[s.snapBarFill, { width: `${weeklyProgressPct}%` }]} />
              </View>
            </View>
          </View>

          <View style={s.statsRow}>
            <View style={s.statCol}>
              <Text style={s.statNum}>{insights.biggestSpendsCount}</Text>
              <Text style={s.statLbl}>Biggest{'\n'}spends</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCol}>
              <Text style={s.statNum}>{insights.transactionCount}</Text>
              <Text style={s.statLbl}>Transactions</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCol}>
              <Text style={s.statNum}>{formatAmount(insights.weeklyLeft)}</Text>
              <Text style={s.statLbl}>Left for{'\n'}the week</Text>
            </View>
          </View>
        </View>

        {/* ── TOP CATEGORIES + SPENDING IMPACT ──────────────── */}
        <View style={s.twoColRow}>
          <View style={[s.card, s.catCard]}>
            <View style={s.catHeader}>
              <Text style={s.sectionLabel}>TOP SPENDING CATEGORIES</Text>
              <Text style={s.thisMonthTag}>This Month</Text>
            </View>

            {categoryDisplay.map((row) => {
              const pct = row.barPercent ?? 0;
              const color = row.color ?? '#7FB3FF';
              const bgColor = row.bgColor ?? '#C3FFD8';
              const iconName = row.iconName ?? 'ShoppingBag';
              const iconColor = row.iconColor ?? '#000000';
              const pctLabel = row.share ? `${row.share}%` : '0%';
              return (
                <View key={row.label} style={s.catItem}>
                  <View style={[s.catIcon, { backgroundColor: bgColor }]}>
                    <Icon name={iconName} size={16} color={iconColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.catNameRow}>
                      <Text style={s.catName}>{row.label}</Text>
                      <Text style={s.catAmt}>{formatAmount(row.amount)}</Text>
                      <Text style={[s.catPct, { color }]}>{pctLabel}</Text>
                    </View>
                    <View style={s.catBarBg}>
                      <View style={[s.catBarFill, { width: `${pct}%`, backgroundColor: color }]} />
                    </View>
                  </View>
                </View>
              );
            })}

            <TouchableOpacity style={s.viewAllBtn} onPress={handleViewCategories} activeOpacity={0.8}>
              <Text style={s.viewAllText}>View all categories</Text>
              <Icon name="ChevronRight" size={13} color="#000000" />
            </TouchableOpacity>
          </View>

          <View style={[s.impactCard, s.impactCardLayout]}>
            <View style={s.visualSection}>
              <Image
                source={require('../../assets/images/tree.png')}
                style={s.treeImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0)',
                  'rgba(255,255,255,0.15)',
                  'rgba(255,255,255,0.55)',
                  'rgba(255,255,255,0.92)',
                ]}
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
                    style={[
                      s.particle,
                      {
                        left: particle.left,
                        top: particle.top,
                        opacity: particle.opacity,
                        width: particle.size,
                        height: particle.size,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>

            <View style={s.impactTextContainer}>
              <Text style={s.impactLabel}>SPENDING{'\n'}IMPACT</Text>
              <View style={s.impactAmountBlock}>
                <Text style={s.impactAmt}>{formatAmount(insights.savedAmount)}</Text>
                <Text style={s.impactSub}>saved this month</Text>
              </View>
              <View style={s.impactGrowBlock}>
                <Text style={s.impactGrowText}>That&apos;s {treesSaved} 🌳</Text>
                <Text style={s.impactGrowText}>for a greener planet!</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── GEKKO GUIDANCE ─────────────────────────────────── */}
        <TouchableOpacity style={s.guidanceCard} onPress={handleGuidance} activeOpacity={0.8}>
          <View style={s.guidanceImgWrap}>
            <Image
              source={require('../../assets/images/cardImageMonkgekko.png')}
              style={s.guidanceImg}
              resizeMode="contain"
            />
          </View>
          <View style={s.guidanceContent}>
            <Text style={s.guidanceLabel}>GEKKO GUIDANCE</Text>
            <Text style={s.guidanceMain}>Try a no-spend weekend!</Text>
            <Text style={s.guidanceSub}>
              {insights.weekendEstimate > 0
                ? `You usually spend ${formatAmount(insights.weekendEstimate)} on weekends.\nSave more by planning ahead.`
                : 'Track a few weekend expenses to personalize this tip.'}
            </Text>
          </View>
          <Icon name="ChevronRight" size={18} color="#000000" />
        </TouchableOpacity>

        {/* ── BADGE / REWARD CARD ────────────────────────────── */}
        <LinearGradient
          colors={['#CFE7FF', '#DCEEFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.rewardCard}
        >
          <View style={s.rewardLeft}>
            <View style={s.rewardIconWrap}>
              <Text style={{ fontSize: 26 }}>🎁</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.rewardTitle}>Unlock &quot;Smart Saver&quot; badge</Text>
              <Text style={s.rewardSub}>Save ₹3,000 more this month</Text>
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

        {/* ── QUICK TIP ──────────────────────────────────────── */}
        <TouchableOpacity style={s.tipCard} onPress={handleQuickTip} activeOpacity={0.8}>
          <Text style={{ fontSize: 18 }}>💡</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.tipTitle}>Quick tip</Text>
            <Text style={s.tipText}>Track subscriptions you don&apos;t use. You could save up to ₹600/month!</Text>
          </View>
          <Icon name="ChevronRight" size={16} color="#000000" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}