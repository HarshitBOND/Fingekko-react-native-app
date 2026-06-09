import type { Transaction } from '@/constants/types';
import type { ApiUser, ProfileResponse, TransactionsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { formatCurrency } from '@/utils/helpers';
import { useAuth } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import {
    CalendarRange,
    ChevronRight,
    Flame,
    Home,
    Lightbulb,
    ShoppingBag,
    Utensils
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';
import Navbar from '../../components/Navbar';
import { appendDummyExpense, createDummyProfile, createDummyTransactions } from '../../utils/demo-finance';

const F = {
  xs: 10,
  sm: 11,
  base: 12,
  md: 13,
  lg: 18,
  xl: 16,
  xxl: 22,
};

export default function InsightsScreen() {
  const { getToken, isSignedIn } = useAuth();
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [useDummyData, setUseDummyData] = useState(false);
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadData = async () => {
        if (useDummyData) return;
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
    }, [isSignedIn, useDummyData])
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
    const weeklyBudget = monthlyIncome > 0 ? monthlyIncome / 4 : Math.max(weeklySpend * 1.2, 1);
    const weeklyLeft = Math.max(0, weeklyBudget - weeklySpend);
    const weeklyProgress = weeklyBudget > 0 ? Math.min(1, weeklySpend / weeklyBudget) : 0;

    const monthlyDelta = expensesLastMonth - expensesThisMonth;
    const monthlyDeltaAbs = Math.abs(monthlyDelta);
    const monthlyDeltaPercent =
      expensesLastMonth > 0 ? Math.round((monthlyDeltaAbs / expensesLastMonth) * 100) : 0;
    const isSaving = monthlyDelta >= 0;

    const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);

    const categoryTotals = expenses.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] ?? 0) + item.amount;
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label, amount]) => ({ label, amount }));

    const fallbackCategories = [
      { label: 'Shopping', amount: 0 },
      { label: 'Food', amount: 0 },
      { label: 'Home', amount: 0 },
    ];

    const categories = [...topCategories, ...fallbackCategories].slice(0, 3);

    const categoryRows = categories.map((item) => {
      const share = totalExpenses > 0 ? Math.round((item.amount / totalExpenses) * 100) : 0;
      return {
        ...item,
        share,
        // use share-of-total for bar percent so 0% = empty, 100% = full
        barPercent: share,
      };
    });

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

    // ── Chart data ────────────────────────────────────────
    const buildCumulative = (expList: Transaction[], start: Date, end: Date) => {
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

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const lastMonthLine = buildCumulative(expenses, lastMonthStart, lastMonthEnd);
    const thisMonthLine = buildCumulative(expenses, thisMonthStart, now);

    const daysLeftInMonth =
      new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

    const expectedLine: { value: number }[] = [
      ...new Array(Math.max(0, thisMonthLine.length - 1)).fill({ value: 0 }),
      ...Array.from({ length: daysLeftInMonth + 1 }, (_, i) => ({
        value: Math.round(expensesThisMonth + avgThisMonth * i),
      })),
    ];

    const chartData = {
      lastMonth: lastMonthLine,
      thisMonth: thisMonthLine,
      expected: expectedLine,
    };

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
      biggestSpendsCount: Math.min(3, expenses.length),
      transactionCount: expenses.length,
      monthlyDelta,
      monthlyDeltaAbs,
      monthlyDeltaPercent,
      isSaving,
      totalExpenses,
      weekStart,
      weekendEstimate,
      chartData,
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
    'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'
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

  const categoryPalette = [
    { color: '#7FB3FF', bgColor: 'rgba(127,179,255,0.16)', Icon: ShoppingBag, iconColor: '#7FB3FF' },
    { color: '#B89CFF', bgColor: 'rgba(184,156,255,0.16)', Icon: Utensils, iconColor: '#B89CFF' },
    { color: '#F2C078', bgColor: 'rgba(242,192,120,0.18)', Icon: Home, iconColor: '#F2C078' },
  ];

  const categoryDisplay = insights.categoryRows.map((row, index) => ({
    ...row,
    ...categoryPalette[index % categoryPalette.length],
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

  // --- Dummy data / testing helpers -------------------------------------------------
  const [dummyAmount, setDummyAmount] = useState('');
  const dummyCategory = 'Shopping';

  const enableDummy = () => {
    setProfile(createDummyProfile());
    setTransactions(createDummyTransactions());
    setUseDummyData(true);
  };

  const disableDummy = () => {
    setUseDummyData(false);
    setProfile(null);
    setTransactions([]);
  };

  const addDummyExpense = () => {
    const amt = Number(dummyAmount);
    if (!amt || Number.isNaN(amt)) { Alert.alert('Invalid amount'); return; }
    const nowD = new Date();
    setTransactions((t) => appendDummyExpense(t, amt, dummyCategory || 'Misc', nowD));
    setDummyAmount('');
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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={s.heading}>Insights</Text>
              <Text style={s.subHeading}>Understand. Improve. Level up. 🌿</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {!useDummyData ? (
                <TouchableOpacity onPress={enableDummy} style={s.dummyBtn}>
                  <Text style={s.dummyBtnText}>Use dummy data</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={disableDummy} style={[s.dummyBtn, s.dummyBtnActive]}>
                  <Text style={[s.dummyBtnText, { color: '#fff' }]}>Disable dummy</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {useDummyData && (
          <View style={s.dummyControls}>
            <Text style={{ fontSize: 12, color: TEXT_MUTED, marginBottom: 6 }}>Quick test: add a dummy expense</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                placeholder="Amount"
                keyboardType="numeric"
                value={dummyAmount}
                onChangeText={setDummyAmount}
                style={s.input}
              />
              <TouchableOpacity style={s.addBtn} onPress={addDummyExpense}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.clearBtn} onPress={() => { setTransactions([]); }}>
                <Text style={{ color: TEXT_MUTED }}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
                      <Text style={{ fontSize: 16 }}>{monthNames[m]} {y}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity onPress={() => setMonthPickerVisible(false)} style={{ padding: 12, alignItems: 'center' }}>
                <Text style={{ color: TEXT_MUTED }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── HERO CARD ──────────────────────────────────────── */}
        <LinearGradient
          colors={['#CFE7FF','#D9EEFF','#E7F4FF','#EEF7FF','#DCEEFF','#C6E4FF','#B5DBFF','#CFE8FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroCard}
        >
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
              <Flame color="rgba(255,255,255,0.92)" size={16} />
            </View>
            <Text style={s.streakTitle}>On fire!</Text>
            <Text style={s.streakSub}>{streakSub}</Text>
          </View>
        </LinearGradient>

        {/* ── SPENDING COMPARISON ────────────────────────────── */}
        <View style={s.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={s.sectionLabel}>SPENDING COMPARISON</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity onPress={goPrevMonth}>
                <Text style={{ fontSize: 16, color: TEXT_MUTED }}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={openMonthPicker}>
                <Text style={{ fontWeight: '700' }}>{monthNames[selectedMonth]} {selectedYear}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={goNextMonth}>
                <Text style={{ fontSize: 16, color: TEXT_MUTED }}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Month amounts row */}
          <View style={{ flexDirection: 'row', gap: 24, marginBottom: 14 }}>
            <View>
              <Text style={{ fontSize: 11, color: TEXT_MUTED }}>{lastMonthLabel} (last month)</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: AMOUNT_DARK, marginTop: 2 }}>
                {formatAmount(insights.expensesLastMonth)}
              </Text>
              <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>
                avg {formatAmount(insights.avgLastMonth)} / day
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 11, color: GREEN }}>{currentMonthLabel} (this month)</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: AMOUNT_DARK, marginTop: 2 }}>
                {formatAmount(insights.expensesThisMonth)}
              </Text>
              <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>
                avg {formatAmount(insights.avgThisMonth)} / day
              </Text>
            </View>
          </View>

          {/* Line chart */}
          <LineChart
            data={chartDisplay.data}
            data2={chartDisplay.data2}
            data3={chartDisplay.data3}
            height={110}
            spacing={12}
            color1="rgba(160,175,190,0.7)"
            color2={GREEN}
            color3="rgba(120,194,109,0.45)"
            strokeDashArray1={[4, 2]}
            strokeDashArray3={[4, 2]}
            thickness1={1.5}
            thickness2={2}
            thickness3={1.5}
            hideDataPoints
            yAxisTextStyle={{ color: TEXT_MUTED, fontSize: 9 }}
            xAxisLabelTextStyle={{ color: TEXT_MUTED, fontSize: 9 }}
            xAxisLabelTexts={chartDisplay.labels}
            noOfSections={4}
            curved
            initialSpacing={6}
            endSpacing={6}
            adjustToWidth={false}
            showScrollIndicator
            scrollAnimation
            maxValue={Math.max(insights.expensesLastMonth, insights.expensesThisMonth) * 1.2}
            yAxisLabelPrefix={currency}
            formatYLabel={(v) => {
              const n = Number(v);
              return n >= 1000 ? Math.round(n / 1000) + 'k' : String(Math.round(n));
            }}
          />

          {/* Chart legend */}
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
            {viewingCurrent ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 16, height: 2, backgroundColor: 'rgba(160,175,190,0.7)' }} />
                  <Text style={{ fontSize: 11, color: TEXT_MUTED }}>Last month</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 16, height: 2, backgroundColor: GREEN }} />
                  <Text style={{ fontSize: 11, color: TEXT_MUTED }}>This month</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 16, height: 2, backgroundColor: 'rgba(120,194,109,0.45)' }} />
                  <Text style={{ fontSize: 11, color: TEXT_MUTED }}>Expected</Text>
                </View>
              </>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <View style={{ width: 16, height: 2, backgroundColor: 'rgba(160,175,190,0.7)' }} />
                <Text style={{ fontSize: 11, color: TEXT_MUTED }}>Spending ({monthNames[selectedMonth]} {selectedYear})</Text>
              </View>
            )}
          </View>

          {/* Insight pill */}
          <TouchableOpacity style={s.insightPill} onPress={handleSeeImpact} activeOpacity={0.8}>
            <View style={s.insightPillLeft}>
              <Lightbulb color="#F2C078" size={18} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={s.insightPillTitle}>{insightTitle}</Text>
                <Text style={s.insightPillSub}>{insightSub}</Text>
              </View>
            </View>
            <View style={s.seeImpactBtn}>
              <Text style={s.seeImpactText}>See impact</Text>
              <ChevronRight size={14} color={GREEN} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── WEEKLY SNAPSHOT ────────────────────────────────── */}
        <View style={s.card}>
          <View style={s.snapshotHeader}>
            <View style={s.snapshotTitleRow}>
              <Text style={s.sectionLabel}>WEEKLY SNAPSHOT</Text>
              <Text style={s.dateTag}>
                <CalendarRange size={16} color="#91c6f8" /> {weekRangeLabel}
              </Text>
            </View>
            <TouchableOpacity style={s.thisWeekBtn} onPress={handleThisWeek} activeOpacity={0.8}>
              <Text style={s.thisWeekText}>This week</Text>
              <ChevronRight size={13} color={GREEN} />
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
              const bgColor = row.bgColor ?? 'rgba(127,179,255,0.16)';
              const Icon = row.Icon ?? ShoppingBag;
              const iconColor = row.iconColor ?? color;
              const pctLabel = row.share ? `${row.share}%` : '0%';
              return (
                <View key={row.label} style={s.catItem}>
                  <View style={[s.catIcon, { backgroundColor: bgColor }]}> 
                    <Icon size={16} color={iconColor} />
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
              <ChevronRight size={13} color={GREEN} />
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
          <ChevronRight size={18} color={TEXT_MUTED} />
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
          <ChevronRight size={16} color={TEXT_MUTED} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── STYLES ─────────────────────────────────────────────────────────────────
const GREEN = '#78C26D';
const CARD_BG = 'rgba(255,255,255,0.82)';
const PAGE_BG = '#F5F9FD';
const BORDER = 'rgba(255,255,255,0.4)';
const TEXT_PRIMARY = '#183B56';
const TEXT_SECONDARY = '#52708A';
const TEXT_MUTED = '#7D97AD';
const TEXT_HELPER = '#9FB4C7';
const AMOUNT_DARK = '#0D2A4D';

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: PAGE_BG },
  container: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 32, gap: 10 },

  header: { marginBottom: 2 },
  heading: { fontSize: F.lg, fontWeight: '800', color: TEXT_PRIMARY },
  subHeading: { marginTop: 2, fontSize: F.sm, fontWeight: '600', color: TEXT_SECONDARY },

  heroCard: {
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 0,
    minHeight: 120, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', overflow: 'hidden',
  },
  heroImageWrap: {
    width: 104, alignSelf: 'stretch', marginRight: 10, marginLeft: -2,
    justifyContent: 'flex-end', alignItems: 'center',
  },
  heroImage: { width: 104, height: 128, marginTop: -6 },
  heroBody: { flex: 1, paddingVertical: 14 },
  heroTitle: { color: TEXT_PRIMARY, fontSize: F.md, fontWeight: '800', marginBottom: 6 },
  heroText: { color: 'rgba(24,59,86,0.72)', fontSize: F.base, lineHeight: 18 },
  streakBox: { alignItems: 'center', marginLeft: 10, paddingVertical: 14 },
  fireBadge: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center',
    marginBottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)',
  },
  streakTitle: { color: TEXT_PRIMARY, fontWeight: '700', fontSize: F.base },
  streakSub: { color: TEXT_SECONDARY, fontSize: F.xs, marginTop: 3 },

  card: {
    backgroundColor: CARD_BG, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: BORDER,
  },
  sectionLabel: {
    fontSize: F.xs, fontWeight: '700', color: TEXT_HELPER,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },

  insightPill: {
    marginTop: 12, backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: 'rgba(216,236,255,0.8)',
  },
  insightPillLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  insightPillTitle: { fontWeight: '700', color: TEXT_PRIMARY, fontSize: F.base },
  insightPillSub: { color: TEXT_MUTED, fontSize: F.xs, marginTop: 2 },
  seeImpactBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeImpactText: { fontSize: F.xs, color: GREEN, fontWeight: '700' },

  snapshotHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 12,
  },
  snapshotTitleRow: { gap: 2 },
  dateTag: { fontSize: F.xs, color: TEXT_MUTED },
  thisWeekBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  thisWeekText: { fontSize: F.sm, color: GREEN, fontWeight: '600' },

  snapshotBody: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  circleWrap: { justifyContent: 'center', alignItems: 'center' },
  circleOuter: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 9, borderColor: GREEN,
    justifyContent: 'center', alignItems: 'center',
  },
  circleText: { fontSize: F.xl, fontWeight: '800', color: GREEN },

  snapAmount: { fontSize: F.xl, fontWeight: '800', color: AMOUNT_DARK },
  snapOf: { fontSize: F.md, fontWeight: '500', color: TEXT_MUTED },
  snapSub: { color: TEXT_MUTED, fontSize: F.sm, marginTop: 2 },
  snapBarBg: { height: 8, borderRadius: 999, backgroundColor: 'rgba(176,198,219,0.28)', marginTop: 10 },
  snapBarFill: { height: '100%', backgroundColor: GREEN, borderRadius: 999 },

  /* Dummy controls */
  dummyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(24,59,86,0.08)',
    backgroundColor: 'transparent',
  },
  dummyBtnActive: { backgroundColor: GREEN, borderColor: GREEN },
  dummyBtnText: { color: TEXT_PRIMARY, fontWeight: '700' },
  dummyControls: { marginBottom: 8 },
  input: {
    minWidth: 90,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(176,198,219,0.28)',
  },
  addBtn: {
    backgroundColor: GREEN,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtn: { justifyContent: 'center', paddingHorizontal: 10 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statCol: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(176,198,219,0.35)' },
  statNum: { fontSize: F.xl, fontWeight: '800', color: AMOUNT_DARK },
  statLbl: { fontSize: F.xs, color: TEXT_MUTED, textAlign: 'center', marginTop: 4, lineHeight: 14 },

  twoColRow: { gap: 10 },
  catCard: { flex: 1, paddingBottom: 10 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  thisMonthTag: { fontSize: F.xs, color: GREEN, fontWeight: '700' },

  catItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  catIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  catNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catName: { fontSize: F.base, fontWeight: '600', color: TEXT_PRIMARY, flex: 1 },
  catAmt: { fontSize: F.base, fontWeight: '700', color: AMOUNT_DARK, marginRight: 4 },
  catPct: { fontSize: F.xs, fontWeight: '700', minWidth: 28, textAlign: 'right' },
  catBarBg: { height: 6, borderRadius: 999, backgroundColor: 'rgba(176,198,219,0.28)', marginTop: 6 },
  catBarFill: { height: '100%', borderRadius: 999 },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4, gap: 2 },
  viewAllText: { fontSize: F.sm, color: GREEN, fontWeight: '700' },

  impactCard: {
    backgroundColor: CARD_BG, borderRadius: 14,
    borderWidth: 1, borderColor: BORDER, overflow: 'hidden',
  },
  impactCardLayout: {
    flexDirection: 'row', minHeight: 220, padding: 0, alignItems: 'stretch',
  },
  visualSection: {
    width: '60%', position: 'relative', justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden', alignSelf: 'stretch', backgroundColor: 'rgba(243,248,253,0.95)',
  },
  treeImage: { width: '108%', height: '108%', position: 'absolute', left: -6, top: -4 },
  fadeOverlay: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '92%' },
  treeSeam: { position: 'absolute', right: -6, top: 0, bottom: 0, width: 12, backgroundColor: 'rgba(255,255,255,0.88)' },
  particlesContainer: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '70%', overflow: 'hidden', opacity: 0.85 },
  particle: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(181,219,255,0.86)' },

  impactTextContainer: {
    flex: 1, paddingVertical: 18, paddingRight: 18, paddingLeft: 20,
    justifyContent: 'center', alignItems: 'flex-start', marginLeft: -8,
  },
  impactLabel: { fontSize: 11, letterSpacing: 1.8, fontWeight: '700', color: TEXT_HELPER, textTransform: 'uppercase' },
  impactAmountBlock: { marginTop: 8 },
  impactAmt: { fontSize: 30, fontWeight: '800', color: AMOUNT_DARK },
  impactSub: { fontSize: 12, color: TEXT_MUTED, marginTop: 4 },
  impactGrowBlock: { marginTop: 12 },
  impactGrowText: { fontSize: 14, fontWeight: '600', color: TEXT_SECONDARY },

  guidanceCard: {
    backgroundColor: CARD_BG, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 0,
    minHeight: 96, flexDirection: 'row', alignItems: 'stretch',
    borderWidth: 1, borderColor: BORDER, gap: 12, overflow: 'hidden',
  },
  guidanceImgWrap: { width: 78, marginRight: 8, marginLeft: -2, justifyContent: 'flex-end', alignItems: 'center' },
  guidanceImg: { width: 78, height: 104, marginTop: -6 },
  guidanceContent: { flex: 1, justifyContent: 'center', paddingVertical: 14 },
  guidanceLabel: { fontSize: F.xs, fontWeight: '700', color: TEXT_HELPER, letterSpacing: 0.5, marginBottom: 4 },
  guidanceMain: { fontSize: F.md, fontWeight: '800', color: TEXT_PRIMARY },
  guidanceSub: { fontSize: F.xs, color: TEXT_MUTED, marginTop: 4, lineHeight: 16 },

  rewardCard: {
    borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', overflow: 'hidden',
  },
  rewardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rewardIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center' },
  rewardTitle: { color: TEXT_PRIMARY, fontWeight: '700', fontSize: F.base },
  rewardSub: { color: TEXT_SECONDARY, fontSize: F.xs, marginTop: 3 },
  rewardBarBg: { height: 7, borderRadius: 999, backgroundColor: 'rgba(176,198,219,0.28)', marginTop: 8, width: 130 },
  rewardBarFill: { height: '100%', width: '22%', backgroundColor: GREEN, borderRadius: 999 },
  rewardBarLabels: { marginTop: 4 },
  rewardBarLbl: { fontSize: F.xs, color: TEXT_SECONDARY },
  rewardBadge: { width: 72, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 14, padding: 10, marginLeft: 10 },
  rewardBadgeLbl: { color: TEXT_PRIMARY, fontWeight: '700', fontSize: F.xs, marginTop: 4, textAlign: 'center' },
  rewardBadgeSub: { color: TEXT_SECONDARY, fontSize: F.xs, textAlign: 'center' },

  tipCard: {
    backgroundColor: 'rgba(255,255,255,0.82)', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', gap: 10,
  },
  tipTitle: { fontWeight: '700', color: TEXT_PRIMARY, fontSize: F.base },
  tipText: { fontSize: F.xs, color: TEXT_MUTED, marginTop: 2, lineHeight: 16 },
});