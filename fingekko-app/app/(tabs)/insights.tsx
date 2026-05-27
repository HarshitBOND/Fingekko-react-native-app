import type { Transaction } from '@/constants/types';
import type { ApiUser, ProfileResponse, TransactionsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { formatCurrency } from '@/utils/helpers';
import { useAuth } from '@clerk/clerk-expo';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronRight,
  Flame,
  Home,
  Lightbulb,
  ShoppingBag,
  Utensils
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Navbar from '../../components/Navbar';

// ─── Font scale (adjust to match your global FontSizes) ─────────────────────
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
        if (!token) {
          return;
        }

        try {
          const [profileResponse, transactionsResponse] = await Promise.all([
            apiRequest<ProfileResponse>('/api/profile', {}, token),
            apiRequest<TransactionsResponse>('/api/transactions', {}, token),
          ]);

          if (!isActive) {
            return;
          }

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
  const todayKey = new Date().toDateString();
  const now = useMemo(() => new Date(), [todayKey]);

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
    const maxCategory = Math.max(1, ...categories.map((c) => c.amount));

    const categoryRows = categories.map((item) => ({
      ...item,
      barPercent: Math.max(20, Math.round((item.amount / maxCategory) * 100)),
      share: totalExpenses > 0 ? Math.round((item.amount / totalExpenses) * 100) : 0,
    }));

    const weekendWindowStart = new Date(now);
    weekendWindowStart.setDate(now.getDate() - 27);
    weekendWindowStart.setHours(0, 0, 0, 0);

    const weekendDayKeys = new Set<string>();
    const weekendSpend = expenses.reduce((sum, item) => {
      const date = parse(item.date);
      if (!date || date < weekendWindowStart) {
        return sum;
      }

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
      biggestSpendsCount: Math.min(3, expenses.length),
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

  const categoryPalette = [
    { color: '#16A34A', bgColor: '#E9F7EC', Icon: ShoppingBag, iconColor: '#16A34A' },
    { color: '#8B5CF6', bgColor: '#F4E8FF', Icon: Utensils, iconColor: '#8B5CF6' },
    { color: '#F59E0B', bgColor: '#FFF3E1', Icon: Home, iconColor: '#F59E0B' },
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
        return {
          id: `particle-${index}`,
          left,
          top,
          size,
          opacity,
        };
      }),
    []
  );

  const showSignInAlert = () => {
    Alert.alert('Sign in required', 'Sign in to view insights data.');
  };

  const handleSeeImpact = () => {
    if (!isSignedIn) {
      showSignInAlert();
      return;
    }

    if (!comparisonReady) {
      Alert.alert('Monthly impact', 'Add a few expenses to compare month over month.');
      return;
    }

    const deltaLine = deltaAbs === 0
      ? 'You matched last month.'
      : `That's ${formatAmount(deltaAbs)} ${isSaving ? 'less' : 'more'} than last month.`;

    Alert.alert(
      'Monthly impact',
      `This month: ${formatAmount(insights.expensesThisMonth)}\nLast month: ${formatAmount(insights.expensesLastMonth)}\n${deltaLine}`
    );
  };

  const handleThisWeek = () => {
    if (!isSignedIn) {
      showSignInAlert();
      return;
    }

    Alert.alert(
      'This week',
      `You spent ${formatAmount(insights.weeklySpend)} of ${formatAmount(insights.weeklyBudget)}.\n${formatAmount(insights.weeklyLeft)} left for the week.`
    );
  };

  const handleViewCategories = () => {
    if (!isSignedIn) {
      showSignInAlert();
      return;
    }

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
    if (!isSignedIn) {
      showSignInAlert();
      return;
    }

    const message = insights.weekendEstimate > 0
      ? `You usually spend about ${formatAmount(insights.weekendEstimate)} on weekends.`
      : 'Track a few weekend expenses to personalize this tip.';

    Alert.alert('Gekko guidance', message);
  };

  const handleQuickTip = () => {
    Alert.alert(
      'Quick tip',
      "Track subscriptions you don't use. You could save up to ₹600/month!"
    );
  };

  return (
    <SafeAreaView style={s.page}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.container}
      >
        <Navbar />

        {/* ── HEADER ─────────────────────────────────────────── */}
        <View style={s.header}>
          <Text style={s.heading}>Insights</Text>
          <Text style={s.subHeading}>Understand. Improve. Level up. 🌿</Text>
        </View>

        {/* ── HERO CARD ──────────────────────────────────────── */}
        <LinearGradient
          colors={[
              '#D6ECFF',
              '#E4F3FF',
              '#EEF7FF',
              '#DCEEFF',
              '#C6E4FF',
              '#B5DBFF',
              '#A9D2FF',
              '#CFE8FF',
            ]}
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
              <Flame color="#fff" size={16} />
            </View>
            <Text style={s.streakTitle}>On fire!</Text>
            <Text style={s.streakSub}>{streakSub}</Text>
          </View>
        </LinearGradient>

        {/* ── SPENDING COMPARISON ────────────────────────────── */}
        <View style={s.card}>
          <Text style={s.sectionLabel}>SPENDING COMPARISON</Text>

          <View style={s.compareRow}>
            {/* Last Month */}
            <View style={s.compareCol}>
              <Text style={s.compareMonthLabel}>Last Month (Apr)</Text>
              <Text style={s.compareAmount}>{formatAmount(insights.expensesLastMonth)}</Text>
              <View style={s.blurLines}>
                {[100, 85, 70, 92].map((w, i) => (
                  <View key={i} style={[s.blurLine, { width: `${w}%` }]} />
                ))}
              </View>
              <Text style={s.avgText}>Monthly avg {formatAmount(insights.avgLastMonth)} / day</Text>
            </View>

            {/* This Month */}
            <View style={s.compareCol}>
              <Text style={[s.compareMonthLabel, { color: '#16A34A' }]}>This Month (May)</Text>
              <Text style={s.compareAmount}>{formatAmount(insights.expensesThisMonth)}</Text>

              {/* Bar chart */}
              <View style={s.chartWrap}>
                <View style={s.chartDash} />
                <Text style={s.youAreHere}>You are here</Text>
                <View style={s.barsRow}>
                  {/* Week 1 */}
                  {[38, 60, 45, 50].map((h, i) => (
                    <View key={`w1-${i}`} style={[s.barLight, { height: h }]} />
                  ))}
                  <View style={s.barGap} />
                  {/* Week 2 */}
                  {[40, 80, 42].map((h, i) => (
                    <View key={`w2-${i}`} style={[s.barLight, { height: h }]} />
                  ))}
                  <View style={s.barGap} />
                  {/* Week 3 – active */}
                  {[70, 95].map((h, i) => (
                    <View key={`w3-${i}`} style={[s.barDark, { height: h }]} />
                  ))}
                  <View style={s.barGap} />
                  {/* Week 4 */}
                  {[50, 65].map((h, i) => (
                    <View key={`w4-${i}`} style={[s.barLight, { height: h }]} />
                  ))}
                </View>
                {/* Week labels */}
                <View style={s.weekLabels}>
                  {['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((l) => (
                    <Text key={l} style={s.weekLabelText}>{l}</Text>
                  ))}
                </View>
              </View>

              <Text style={s.avgText}>Monthly avg {formatAmount(insights.avgThisMonth)} / day</Text>
            </View>
          </View>

          {/* Insight pill */}
          <TouchableOpacity style={s.insightPill} activeOpacity={0.8}>
            <View style={s.insightPillLeft}>
              <Lightbulb color="#F6B100" size={18} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={s.insightPillTitle}>You're spending 12% less this month</Text>
                <Text style={s.insightPillSub}>That's like saving ₹2,350 so far!</Text>
              </View>
            </View>
            <View style={s.seeImpactBtn}>
              <Text style={s.seeImpactText}>See impact</Text>
              <ChevronRight size={14} color="#16A34A" />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── WEEKLY SNAPSHOT ────────────────────────────────── */}
        <View style={s.card}>
          <View style={s.snapshotHeader}>
            <View style={s.snapshotTitleRow}>
              <Text style={s.sectionLabel}>WEEKLY SNAPSHOT</Text>
              <Text style={s.dateTag}>📅 12 – 18 May, 2024</Text>
            </View>
            <TouchableOpacity style={s.thisWeekBtn} activeOpacity={0.8}>
              <Text style={s.thisWeekText}>This week</Text>
              <ChevronRight size={13} color="#16A34A" />
            </TouchableOpacity>
          </View>

          <View style={s.snapshotBody}>
            {/* Circle */}
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
          {/* Categories */}
          <View style={[s.card, s.catCard]}>
            <View style={s.catHeader}>
              <Text style={s.sectionLabel}>TOP SPENDING CATEGORIES</Text>
              <Text style={s.thisMonthTag}>This Month</Text>
            </View>

            {[
              { label: 'Shopping', amount: insights.categoryRows[0]?.amount ?? 6240, pct: 70, color: '#16A34A', bgColor: '#E9F7EC', Icon: ShoppingBag, iconColor: '#16A34A', pctLabel: '38%' },
              { label: 'Food & Dining', amount: insights.categoryRows[1]?.amount ?? 4120, pct: 52, color: '#8B5CF6', bgColor: '#F4E8FF', Icon: Utensils, iconColor: '#8B5CF6', pctLabel: '25%' },
              { label: 'Home', amount: insights.categoryRows[2]?.amount ?? 2980, pct: 38, color: '#F59E0B', bgColor: '#FFF3E1', Icon: Home, iconColor: '#F59E0B', pctLabel: '18%' },
            ].map(({ label, amount, pct, color, bgColor, Icon, iconColor, pctLabel }) => (
              <View key={label} style={s.catItem}>
                <View style={[s.catIcon, { backgroundColor: bgColor }]}>
                  <Icon size={16} color={iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.catNameRow}>
                    <Text style={s.catName}>{label}</Text>
                    <Text style={s.catAmt}>{formatAmount(amount)}</Text>
                    <Text style={[s.catPct, { color }]}>{pctLabel}</Text>
                  </View>
                  <View style={s.catBarBg}>
                    <View style={[s.catBarFill, { width: `${pct}%`, backgroundColor: color }]} />
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity style={s.viewAllBtn} activeOpacity={0.8}>
              <Text style={s.viewAllText}>View all categories</Text>
              <ChevronRight size={13} color="#16A34A" />
            </TouchableOpacity>
          </View>


            <View style={[s.impactCard, s.impactCardLayout]}>

              {/* LEFT VISUAL */}
              <View style={s.visualSection}>

                {/* Tree */}
                <Image
                  source={require('../../assets/images/tree.png')}
                  style={s.treeImage}
                  resizeMode="cover"
                />

                {/* Fade to right */}
                <LinearGradient
                  colors={[
                    'rgba(255,255,255,0)',
                    'rgba(255,255,255,0.15)',
                    'rgba(255,255,255,0.55)',
                    '#fff',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.fadeOverlay}
                  pointerEvents="none"
                />

                <View style={s.treeSeam} pointerEvents="none" />

                {/* Dots */}
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

              {/* RIGHT TEXT */}
              <View style={s.impactTextContainer}>
                <Text style={s.impactLabel}>
                  SPENDING{'\n'}IMPACT
                </Text>

                <View style={s.impactAmountBlock}>
                  <Text style={s.impactAmt}>
                    {formatAmount(insights.savedAmount)}
                  </Text>

                  <Text style={s.impactSub}>
                    saved this month
                  </Text>
                </View>

                <View style={s.impactGrowBlock}>
                  <Text style={s.impactGrowText}>
                    That's {treesSaved} 🌳
                  </Text>

                  <Text style={s.impactGrowText}>
                    for a greener planet!
                  </Text>
                </View>
              </View>

            </View>
        </View>

        {/* ── GEKKO GUIDANCE ─────────────────────────────────── */}
        <TouchableOpacity style={s.guidanceCard} activeOpacity={0.8}>
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
            <Text style={s.guidanceSub}>You usually spend ₹1,200 on weekends.{'\n'}Save more by planning ahead.</Text>
          </View>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>

        {/* ── BADGE / REWARD CARD ────────────────────────────── */}
        <LinearGradient
          colors={['#0b5f4b', '#073943']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.rewardCard}
        >
          <View style={s.rewardLeft}>
            <View style={s.rewardIconWrap}>
              <Text style={{ fontSize: 26 }}>🎁</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.rewardTitle}>Unlock "Smart Saver" badge</Text>
              <Text style={s.rewardSub}>Save ₹3,000 more this month</Text>
              <View style={s.rewardBarBg}>
                <View style={s.rewardBarFill} />
              </View>
              <View style={s.rewardBarLabels}>
                <Text style={s.rewardBarLbl}>₹650 / ₹3,000</Text>
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
        <TouchableOpacity style={s.tipCard} activeOpacity={0.8}>
          <Text style={{ fontSize: 18 }}>💡</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.tipTitle}>Quick tip</Text>
            <Text style={s.tipText}>Track subscriptions you don't use. You could save up to ₹600/month!</Text>
          </View>
          <ChevronRight size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── STYLES ─────────────────────────────────────────────────────────────────
const GREEN = '#16A34A';
const DARK_GREEN = '#0b5f4b';
const CARD_BG = '#fff';
const PAGE_BG = '#F3F4F6';
const BORDER = '#E5E7EB';
const TEXT_PRIMARY = '#111827';
const TEXT_MUTED = '#6B7280';

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: PAGE_BG },
  container: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 32, gap: 10 },

  // Header
  header: { marginBottom: 2 },
  heading: { fontSize: F.lg, fontWeight: '800', color: TEXT_PRIMARY },
  subHeading: { marginTop: 2, fontSize: F.sm, fontWeight: '600', color: TEXT_MUTED },

  // Hero card
  heroCard: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 0,
    minHeight: 120,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  heroImageWrap: {
    width: 104,
    alignSelf: 'stretch',
    marginRight: 10,
    marginLeft: -2,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  heroImage: { width: 104, height: 128, marginTop: -6 },
  heroBody: { flex: 1, paddingVertical: 14 },
  heroTitle: { color: '#fff', fontSize: F.md, fontWeight: '700', marginBottom: 6 },
  heroText: { color: '#D8F5E0', fontSize: F.base, lineHeight: 18 },
  streakBox: { alignItems: 'center', marginLeft: 10, paddingVertical: 14 },
  fireBadge: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  streakTitle: { color: '#FDE68A', fontWeight: '700', fontSize: F.base },
  streakSub: { color: '#D1FAE5', fontSize: F.xs, marginTop: 3, textAlign: 'center' },

  // Card shell
  card: {
    backgroundColor: CARD_BG, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: BORDER,
  },
  sectionLabel: {
    fontSize: F.xs, fontWeight: '700', color: TEXT_PRIMARY,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
  },

  // Spending comparison
  compareRow: { flexDirection: 'row', gap: 12 },
  compareCol: { flex: 1 },
  compareMonthLabel: { fontSize: F.sm, color: TEXT_MUTED, fontWeight: '500' },
  compareAmount: { fontSize: F.xxl, fontWeight: '800', color: TEXT_PRIMARY, marginTop: 4 },
  blurLines: { marginTop: 14, gap: 8 },
  blurLine: { height: 9, borderRadius: 999, backgroundColor: '#E5E7EB' },
  avgText: { marginTop: 10, color: TEXT_MUTED, fontSize: F.xs },

  chartWrap: { marginTop: 10, height: 110, justifyContent: 'flex-end', position: 'relative' },
  chartDash: {
    position: 'absolute', top: '40%', left: 0, right: 0,
    borderStyle: 'dashed', borderWidth: 1, borderColor: GREEN,
  },
  youAreHere: {
    position: 'absolute', top: '22%', right: 0,
    fontSize: F.xs, color: GREEN, fontWeight: '600',
  },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  barLight: { width: 9, height: 38, borderRadius: 6, backgroundColor: '#C7F0CF' },
  barDark: { width: 10, height: 70, borderRadius: 6, backgroundColor: GREEN },
  barGap: { width: 6 },
  weekLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  weekLabelText: { fontSize: F.xs - 1, color: TEXT_MUTED },

  insightPill: {
    marginTop: 12,
    backgroundColor: '#F2FAF3',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  insightPillLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  insightPillTitle: { fontWeight: '700', color: TEXT_PRIMARY, fontSize: F.base },
  insightPillSub: { color: TEXT_MUTED, fontSize: F.xs, marginTop: 2 },
  seeImpactBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeImpactText: { fontSize: F.xs, color: GREEN, fontWeight: '700' },

  // Weekly snapshot
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
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 9, borderColor: GREEN,
    justifyContent: 'center', alignItems: 'center',
  },
  circleText: { fontSize: F.xl, fontWeight: '800', color: GREEN },

  snapAmount: { fontSize: F.xl, fontWeight: '800', color: TEXT_PRIMARY },
  snapOf: { fontSize: F.md, fontWeight: '500', color: TEXT_MUTED },
  snapSub: { color: TEXT_MUTED, fontSize: F.sm, marginTop: 2 },
  snapBarBg: { height: 8, borderRadius: 999, backgroundColor: '#E5E7EB', marginTop: 10 },
  snapBarFill: { height: '100%', backgroundColor: GREEN, borderRadius: 999 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statCol: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 36, backgroundColor: BORDER },
  statNum: { fontSize: F.xl, fontWeight: '800', color: TEXT_PRIMARY },
  statLbl: { fontSize: F.xs, color: TEXT_MUTED, textAlign: 'center', marginTop: 4, lineHeight: 14 },

  // Two-col row
  twoColRow: { gap: 10 },
  catCard: { flex: 1, paddingBottom: 10 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  thisMonthTag: { fontSize: F.xs, color: GREEN, fontWeight: '700' },

  catItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  catIcon: {
    width: 34, height: 34, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginRight: 8,
  },
  catNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catName: { fontSize: F.base, fontWeight: '600', color: TEXT_PRIMARY, flex: 1 },
  catAmt: { fontSize: F.base, fontWeight: '700', color: TEXT_PRIMARY, marginRight: 4 },
  catPct: { fontSize: F.xs, fontWeight: '700', minWidth: 28, textAlign: 'right' },
  catBarBg: { height: 6, borderRadius: 999, backgroundColor: '#E5E7EB', marginTop: 6 },
  catBarFill: { height: '100%', borderRadius: 999 },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4, gap: 2 },
  viewAllText: { fontSize: F.sm, color: GREEN, fontWeight: '700' },

  impactCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  impactCardLayout: {
    flexDirection: 'row',
    minHeight: 220,
    padding: 0,
    alignItems: 'stretch',
  },

  visualSection: {
    width: '60%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    alignSelf: 'stretch',
    backgroundColor: '#fff',
  },

  treeImage: {
    width: '108%',
    height: '108%',
    position: 'absolute',
    left: -6,
    top: -4,
  },

  fadeOverlay: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '92%',
  },

  treeSeam: {
    position: 'absolute',
    right: -6,
    top: 0,
    bottom: 0,
    width: 12,
    backgroundColor: '#fff',
  },

  particlesContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '70%',
    overflow: 'hidden',
    opacity: 0.85,
  },

  particle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(150,200,255,0.85)',
  },

  impactTextContainer: {
    flex: 1,
    paddingVertical: 18,
    paddingRight: 18,
    paddingLeft: 20,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginLeft: -8,
  },

  impactLabel: {
    fontSize: 11,
    letterSpacing: 1.8,
    fontWeight: '700',
    color: '#7a7a7a',
    textTransform: 'uppercase',
  },

  impactAmountBlock: {
    marginTop: 8,
  },

  impactAmt: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111',
  },

  impactSub: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },

  impactGrowBlock: {
    marginTop: 12,
  },

  impactGrowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d6cdf',
  },

  // Guidance
  guidanceCard: {
    backgroundColor: CARD_BG, borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 0,
    minHeight: 96,
    flexDirection: 'row', alignItems: 'stretch',
    borderWidth: 1, borderColor: BORDER, gap: 12,
    overflow: 'hidden',
  },
  guidanceImgWrap: {
    width: 78,
    marginRight: 8,
    marginLeft: -2,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  guidanceImg: { width: 78, height: 104, marginTop: -6 },
  guidanceContent: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  guidanceLabel: { fontSize: F.xs, fontWeight: '700', color: TEXT_MUTED, letterSpacing: 0.5, marginBottom: 4 },
  guidanceMain: { fontSize: F.md, fontWeight: '800', color: TEXT_PRIMARY },
  guidanceSub: { fontSize: F.xs, color: TEXT_MUTED, marginTop: 4, lineHeight: 16 },

  // Reward
  rewardCard: {
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  rewardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rewardIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  rewardTitle: { color: '#fff', fontWeight: '700', fontSize: F.base },
  rewardSub: { color: '#D1FAE5', fontSize: F.xs, marginTop: 3 },
  rewardBarBg: {
    height: 7, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 8, width: 130,
  },
  rewardBarFill: { height: '100%', width: '22%', backgroundColor: '#B7FF6A', borderRadius: 999 },
  rewardBarLabels: { marginTop: 4 },
  rewardBarLbl: { fontSize: F.xs, color: '#D1FAE5' },
  rewardBadge: {
    width: 72, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14, padding: 10, marginLeft: 10,
  },
  rewardBadgeLbl: { color: '#fff', fontWeight: '700', fontSize: F.xs, marginTop: 4, textAlign: 'center' },
  rewardBadgeSub: { color: '#D1FAE5', fontSize: F.xs, textAlign: 'center' },

  // Quick tip
  tipCard: {
    backgroundColor: '#FEFCE8', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#FDE68A', gap: 10,
  },
  tipTitle: { fontWeight: '700', color: TEXT_PRIMARY, fontSize: F.base },
  tipText: { fontSize: F.xs, color: TEXT_MUTED, marginTop: 2, lineHeight: 16 },
});