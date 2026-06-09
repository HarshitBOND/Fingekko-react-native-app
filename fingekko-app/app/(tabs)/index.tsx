import TodaysProgress from '@/components/TodaysProgress';
import type { Transaction } from '@/constants/types';
import type { HomeResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  BarChart3, CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Eye, Flame,
  PiggyBank,
  Shield,
  Star,
  Target, TrendingUp, Wallet, Zap
} from 'lucide-react-native';
import { type ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Divider from '../../components/Divider';
import Navbar from '../../components/Navbar';
import { Colors, FontSizes, Spacing } from '../../constants/Colors';
import { appendDummyExpense, createDummyProfile, createDummyTransactions, summarizeExpenses } from '../../utils/demo-finance';

// ─── THEME COLORS (soft dreamy nature palette) ─────────────────────────────
const Theme = {
  primary:       '#6DBB5A',
  primaryHover:  '#5AA64A',
  primaryDark:   '#2F6B4F',
  primaryLight:  '#BFE7C1',
  mistBlue:      '#CBE8E7',
  mountainTeal:  '#5BA89B',
  sunlight:      '#E8F2B6',
  background:    '#F4FAF3',
  background2:   '#EAF5EE',
  darkSection:   '#17352B',
  cardBg:        '#F8FCF7',
  cardBorder:    '#DDE8DD',
  cardBorderSoft:'#DDE8DD',
  glassBorder:   'rgba(255,255,255,0.38)',
  textMain:      '#1D2B24',
  textMuted:     '#557064',
  textFaint:     '#8AA198',
  white:         '#F9FFFA',
  whiteSoft:     'rgba(249,255,250,0.82)',
  greenBadge:    '#EAF5EE',
  greenBadgeText:'#2F6B4F',
  forestDeep:    '#1E3B31',
  forestSoft:    '#355E50',
  mintSurface:   '#EDF8F0',
  shadow:        '#17352B',
};

const WEEK_DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function TabIndex() {
  const now = useMemo(() => new Date(), []);
  const { width } = useWindowDimensions();
  const scale = Math.min(1, width / 420);
  const ringSize = Math.max(56, Math.round(72 * scale));
  const ringStroke = Math.max(4, Math.round(6 * scale));
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const { getToken, isSignedIn } = useAuth();
  const [homeData, setHomeData] = useState<HomeResponse | null>(null);
  const getTokenRef = useRef(getToken);
  const [useDummyData, setUseDummyData] = useState(true);
  const [demoTransactions, setDemoTransactions] = useState<Transaction[]>(() => createDummyTransactions(now));
  const [dummyAmount, setDummyAmount] = useState('');
  const [dummyCategory, setDummyCategory] = useState('Shopping');
  const demoProfile = useMemo(() => createDummyProfile(), []);
  const activeProfile = useMemo(
    () => (useDummyData ? demoProfile : homeData?.user ?? null),
    [useDummyData, demoProfile, homeData?.user]
  );
  const activeTransactions = useMemo(
    () => (useDummyData ? demoTransactions : []),
    [useDummyData, demoTransactions]
  );
  const spending = useMemo(
    () => summarizeExpenses(activeTransactions, activeProfile ?? demoProfile, now),
    [activeProfile, activeTransactions, demoProfile, now]
  );
  const spendProgress = useDummyData ? spending.spendProgress : 0.43;
  const remainingProgress = useDummyData ? spending.remainingProgress : 1 - spendProgress;
  const ringOffset = ringCircumference * (1 - spendProgress);
  const balanceAmount = useDummyData ? spending.remainingBalance : 12450;
  const monthlySpend = useDummyData ? spending.expensesThisMonth : 8560;
  const monthlyBudget = useDummyData ? spending.monthlyBudget : 20000;
  const daysLeftInMonth = useDummyData ? spending.daysLeftInMonth : 11;
  const avgDailySpend = useDummyData ? spending.avgDailySpend : 1120;
  const currentDateLabel = now.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  // streak calendar state
  const [calendarMonth, setCalendarMonth] = useState({ month: now.getMonth(), year: now.getFullYear() });
  const completedDays = useMemo(() => {
    if (!useDummyData) return [13, 14, 15, 16, 17, 18];

    const days = new Set<number>();
    activeTransactions.forEach((item) => {
      const date = new Date(item.date);
      if (date.getFullYear() === calendarMonth.year && date.getMonth() === calendarMonth.month) {
        days.add(date.getDate());
      }
    });
    return Array.from(days).sort((a, b) => a - b);
  }, [activeTransactions, calendarMonth.month, calendarMonth.year, useDummyData]);
  const weekChecked = useMemo(() => {
    if (!useDummyData) return [true, true, true, true, true, false, false];

    return WEEK_DAY_LABELS.map((_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - 6 + index);
      return activeTransactions.some((item) => new Date(item.date).toDateString() === date.toDateString());
    });
  }, [activeTransactions, now, useDummyData]);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    let isActive = true;
    const loadHome = async () => {
      if (!isSignedIn) { setHomeData(null); return; }
      try {
        const token = await getTokenRef.current();
        if (!token) return;
        const response = await apiRequest<HomeResponse>('/api/home', {}, token);
        if (isActive) setHomeData(response);
      } catch (error) {
        console.warn('Failed to load home data:', error);
      }
    };
    loadHome();
    return () => { isActive = false; };
  }, [isSignedIn]);

  const stats = homeData?.stats ?? null;
  const demoStats = useMemo(() => {
    if (!useDummyData) return null;
    const categoryCount = new Set(activeTransactions.map((item) => item.category)).size;
    return {
      dayStreak: Math.max(1, 12 - Math.min(4, Math.floor(spending.expensesThisMonth / 4000))),
      totalXp: demoProfile.xp + Math.round(spending.expensesThisMonth / 10),
      questsDone: Math.min(9, Math.max(1, categoryCount)),
      questsTarget: 9,
      betterThanYesterday: Math.max(0, Math.min(99, 55 + Math.round((spending.expensesLastMonth - spending.expensesThisMonth) / 400))),
    };
  }, [activeTransactions, demoProfile.xp, spending.expensesLastMonth, spending.expensesThisMonth, useDummyData]);
  const visibleStats = useDummyData ? demoStats : stats;

  const progressItems = useMemo(() => {
    if (!visibleStats) return undefined;
    return [
      { icon: Flame,    value: String(visibleStats.dayStreak),                       label: 'Day Streak',            color: Theme.primaryDark },
      { icon: Zap,      value: String(visibleStats.totalXp),                         label: 'Total XP',              color: Theme.mountainTeal },
      { icon: Target,   value: `${visibleStats.questsDone} / ${visibleStats.questsTarget}`, label: 'Quests Done',           color: Theme.primary },
      { icon: BarChart3, value: `${visibleStats.betterThanYesterday}%`,              label: 'Better than\nyesterday', color: Theme.forestSoft },
    ];
  }, [visibleStats]);

  // ── helpers for streak calendar ──────────────────────────────────────────
  const monthNames = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];

  const getDaysInMonth = (month: number, year: number) =>
    new Date(year, month + 1, 0).getDate();

  const getFirstDayOfMonth = (month: number, year: number) =>
    new Date(year, month, 1).getDay();

  const renderCalendarDays = () => {
    const daysInMonth  = getDaysInMonth(calendarMonth.month, calendarMonth.year);
    const firstDay     = getFirstDayOfMonth(calendarMonth.month, calendarMonth.year);
    // Sunday = 0 → shift so Mon = 0
    const startOffset  = firstDay === 0 ? 6 : firstDay - 1;
    const cells: ReactElement[] = [];

    for (let i = 0; i < startOffset; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.calDay} />);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const done = completedDays.includes(d);
      cells.push(
        <View key={d} style={[styles.calDay, done && styles.calDayDone]}>
          <Text style={[styles.calDayText, done && styles.calDayTextDone]}>{d}</Text>
        </View>
      );
    }
    return cells;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Theme.background }}>
      <ScrollView contentContainerStyle={styles.containerCard}>
        <Navbar />

        {/* ── Greeting ─────────────────────────────────────────────────── */}
        <View style={styles.greetingPlaceholder}>
          <View style={{ flexDirection: 'column', flex: 1 }}>
            <Text style={{ fontSize: FontSizes.sm, color: Theme.textMuted, marginBottom: 4, fontWeight: '500' }}>
              Good Morning, {activeProfile?.name?.split(' ')[0] ?? 'Arjun'}!
            </Text>
            <Text style={{ fontSize: FontSizes.xl, fontWeight: '800', color: Theme.textMain, marginTop: 2 }}>
              Let&apos;s make today
            </Text>
            <Text style={{ fontSize: FontSizes.xl, color: Theme.textMuted, fontWeight: '500' }}>
              a <Text style={{ color: Theme.primaryDark, fontWeight: '800' }}>smart money</Text> day
            </Text>
          </View>
          <View style={styles.datePill}>
            <CalendarDays style={{ marginHorizontal: 2 }} size={12} strokeWidth={1.5} color={Theme.textMuted} />
            <Text style={{ color: Theme.textMuted, fontSize: 12 }}>{currentDateLabel}</Text>
          </View>
        </View>

        <View style={styles.demoCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.demoTitle}>{useDummyData ? 'Demo data is on' : 'Demo data is off'}</Text>
            <Text style={styles.demoSubTitle}>
              Add a dummy expense to watch the balance, ring, and weekly numbers update.
            </Text>
          </View>
          <Pressable
            onPress={() => {
              if (useDummyData) {
                setUseDummyData(false);
                return;
              }
              setDemoTransactions(createDummyTransactions(now));
              setUseDummyData(true);
            }}
            style={[styles.demoToggle, useDummyData && styles.demoToggleActive]}
          >
            <Text style={[styles.demoToggleText, useDummyData && styles.demoToggleTextActive]}>
              {useDummyData ? 'Disable demo' : 'Use demo data'}
            </Text>
          </Pressable>
        </View>

        {useDummyData && (
          <View style={styles.demoControls}>
            <View style={styles.demoInputRow}>
              <TextInput
                placeholder="Amount"
                placeholderTextColor="rgba(85,112,100,0.55)"
                keyboardType="numeric"
                value={dummyAmount}
                onChangeText={setDummyAmount}
                style={styles.demoInput}
              />
              <Pressable
                style={styles.demoAction}
                onPress={() => {
                  const amount = Number(dummyAmount);
                  if (!amount || Number.isNaN(amount)) {
                    Alert.alert('Invalid amount', 'Enter a number to add a dummy expense.');
                    return;
                  }
                  setDemoTransactions((current) => appendDummyExpense(current, amount, dummyCategory || 'Misc', new Date()));
                  setDummyAmount('');
                }}
              >
                <Text style={styles.demoActionText}>Add expense</Text>
              </Pressable>
            </View>

            <View style={styles.demoCategoryRow}>
              {['Shopping', 'Food', 'Home'].map((category) => {
                const selected = dummyCategory === category;
                return (
                  <Pressable
                    key={category}
                    onPress={() => setDummyCategory(category)}
                    style={[styles.categoryChip, selected && styles.categoryChipActive]}
                  >
                    <Text style={[styles.categoryChipText, selected && styles.categoryChipTextActive]}>{category}</Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setDemoTransactions(createDummyTransactions(now))}
                style={styles.resetDemoButton}
              >
                <Text style={styles.resetDemoText}>Reset sample</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ── Balance Card ─────────────────────────────────────────────── */}
        <View style={styles.balanceCardPlaceholder}>
          <ImageBackground
            source={require('../../assets/images/bgHomePage.png')}
            resizeMode="cover"
            style={styles.balanceBackgroundImage}
            imageStyle={styles.balanceBackgroundImageStyle}
          >
            <LinearGradient
              colors={['rgba(203,232,231,0.12)', 'rgba(91,168,155,0.34)', 'rgba(23,53,43,0.88)']}
              locations={[0, 0.58, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.balanceFadeOverlay}
            />
            <View style={styles.balanceContent}>
              <View style={styles.balanceTopRow}>
                <View style={styles.balanceTopLeft}>
                  <View style={styles.balanceLabelRow}>
                    <Text style={styles.balanceLabel} numberOfLines={2}>Remaining 
                      Balance</Text>
                      <Eye style={styles.balanceEye} size={16} color={Theme.textMain} />
                  </View>
                  <Text style={styles.balanceValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                    ₹{Math.round(balanceAmount).toLocaleString('en-IN')}
                  </Text>
                  <View style={styles.healthBadge}>
                    <Text style={styles.healthBadgeText}>{spendProgress < 0.5 ? 'Healthy' : 'Watch'}</Text>
                  </View>
                </View>

                <Divider orientation="vertical" thickness={1} color="rgba(249,255,250,0.22)" inset={8} />

                <View style={styles.balanceTopRight}>
                  <View style={styles.spendInfo}>
                    <Text style={styles.spendLabel}>This Month&apos;s Spend</Text>
                    <Text style={styles.spendValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                      ₹{Math.round(monthlySpend).toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.spendSubLabel}>of ₹{Math.round(monthlyBudget).toLocaleString('en-IN')} budget</Text>
                  </View>
                  <View style={styles.circularChart}>
                    <Svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
                      <Circle cx={ringSize/2} cy={ringSize/2} r={ringRadius}
                        stroke="rgba(249,255,250,0.18)" strokeWidth={ringStroke} fill="none" />
                      <Circle cx={ringSize/2} cy={ringSize/2} r={ringRadius}
                        stroke={Theme.primaryLight} strokeWidth={ringStroke} fill="none"
                        strokeDasharray={[ringCircumference]} strokeDashoffset={ringOffset}
                        strokeLinecap="round" transform={`rotate(-90 ${ringSize/2} ${ringSize/2})`} />
                    </Svg>
                    <View style={styles.circularText}>
                      <Text style={styles.circularValue}>{Math.round(spendProgress * 100)}%</Text>
                      <Text style={styles.circularLabel}>used</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <LinearGradient
                  colors={[Theme.primary, Theme.primaryDark]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${remainingProgress * 100}%` }]}
                />
              </View>

              <View style={styles.balanceBottomDivider} />

              <LinearGradient
                colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.08)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bottomRow}
              >
                <View style={styles.bottomItems}>
                  <View style={styles.bottomItem}>
                    <View style={styles.bottomIconWrap}>
                      <CalendarDays size={18} color={Theme.forestDeep} />
                    </View>
                    <View style={styles.bottomText}>
                      <Text style={styles.bottomValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                        {daysLeftInMonth}
                      </Text>
                      <Text style={styles.bottomLabel} numberOfLines={1} >
                        Days left in month
                      </Text>
                    </View>
                  </View>
                  <View style={styles.bottomItemDivider} />
                  <View style={styles.bottomItem}>
                    <View style={styles.bottomIconWrap}>
                      <Wallet size={18} color={Theme.forestDeep} />
                    </View>
                    <View style={styles.bottomText}>
                      <Text style={styles.bottomValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                        ₹{Math.round(avgDailySpend).toLocaleString('en-IN')}
                      </Text>
                      <Text style={styles.bottomLabel}>Avg. daily spend</Text>
                    </View>
                  </View>
                </View>
                <ChevronRight size={18} color={Theme.forestDeep} />
              </LinearGradient>
            </View>
          </ImageBackground>
        </View>

        {/* ── Today's Progress ─────────────────────────────────────────── */}
        <TodaysProgress items={progressItems} />

        {/* ── Insight Grid — NOW COLUMN ────────────────────────────────── */}
        <View style={styles.insightGrid}>

          {/* ── Planner Card ─────────────────────────────────────────── */}
          <View style={styles.PlannerPlaceholder}>

            {/* header */}
            <View style={styles.balanceLabelRow}>
              <Text style={{ fontSize: FontSizes.sm, color: Theme.textMuted, fontWeight: '600' }}>
                Your Financial Personality
              </Text>
              <CircleAlert size={18} color={Theme.mountainTeal} style={{ marginLeft: 4 }} />
            </View>

            {/* personality type + character image */}
            <View style={styles.plannerHeroRow}>
              {/* LEFT: type label + trait icons */}
              <View style={styles.plannerLeft}>
                <Text style={styles.plannerTypeName}>The Monk Spender</Text>

                {/* icon grid – placeholder image: personalityIconBudget.png etc. */}
                <View style={styles.plannerIconGrid}>
                  <View style={styles.plannerIconBox}>
                    {/* TODO: replace with <Image source={require('../../assets/images/personalityIconCalendar.png')} style={styles.plannerIconImg}/> */}
                    <CalendarDays size={20} color={Theme.primaryDark} />
                  </View>
                  <View style={styles.plannerIconBox}>
                    {/* TODO: replace with <Image source={require('../../assets/images/personalityIconChart.png')} style={styles.plannerIconImg}/> */}
                    <BarChart3 size={20} color={Theme.mountainTeal} />
                  </View>
                  <View style={styles.plannerIconBox}>
                    {/* TODO: replace with <Image source={require('../../assets/images/personalityIconTarget.png')} style={styles.plannerIconImg}/> */}
                    <Target size={20} color={Theme.primary} />
                  </View>
                  <View style={styles.plannerIconBox}>
                    {/* TODO: replace with <Image source={require('../../assets/images/personalityIconShield.png')} style={styles.plannerIconImg}/> */}
                    <Shield size={20} color={Theme.primaryDark} />
                  </View>
                </View>
              </View>

              {/* RIGHT: character image */}
              <View style={styles.plannerImageContainer}>
                <Image
                  source={require('../../assets/images/cardImageMonkgekko.png')}
                  style={styles.plannerImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* "you plan ahead" banner */}
            <View style={styles.plannerBanner}>
              <View style={styles.plannerBannerIcon}>
                {/* TODO: replace with <Image source={require('../../assets/images/plannerBannerIcon.png')} style={{width:22,height:22}}/> */}
                <TrendingUp size={16} color={Theme.primaryDark} />
              </View>
              <Text style={styles.plannerBannerText}>You plan ahead and make smart money moves.</Text>
            </View>

            {/* "you are good at" traits */}
            <Text style={styles.goodAtLabel}>You are good at:</Text>
            <View style={styles.traitRow}>
              <View style={styles.traitPill}>
                {/* TODO: replace icon with <Image source={require('../../assets/images/traitIconBudgeting.png')} style={{width:14,height:14}}/> */}
                <PiggyBank size={13} color={Theme.primaryDark} />
                <Text style={styles.traitText}>Budgeting</Text>
              </View>
              <View style={styles.traitPill}>
                {/* TODO: replace icon with <Image source={require('../../assets/images/traitIconSaving.png')} style={{width:14,height:14}}/> */}
                <Star size={13} color={Theme.primary} />
                <Text style={styles.traitText}>Saving</Text>
              </View>
            </View>
            <View style={[styles.traitRow, { marginTop: 6 }]}>
              <View style={styles.traitPill}>
                {/* TODO: replace icon with <Image source={require('../../assets/images/traitIconDebt.png')} style={{width:14,height:14}}/> */}
                <Shield size={13} color={Theme.primaryDark} />
                <Text style={styles.traitText}>Avoiding Debt</Text>
              </View>
            </View>

            {/* footer button */}
            <Pressable
              onPress={() => router.push('/insights')}
              style={styles.plannerBtn}
            >
              <Text style={styles.plannerBtnText}>View Full Insights</Text>
              <ChevronRight size={16} color={Theme.primaryDark} />
            </Pressable>
          </View>

          {/* ── Streak Card ──────────────────────────────────────────── */}
          <View style={styles.streakPlaceholder}>

            {/* header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Flame size={20} color={Theme.primaryDark} />
              <Text style={styles.streakHeaderText}>You&apos;re on a roll!</Text>
            </View>

            {/* big number */}
            <View style={styles.streakRow}>
              <Text style={styles.streakNumber}>{visibleStats?.dayStreak ?? 12}</Text>
              <Text style={styles.daysText}>Days</Text>
            </View>
            <Text style={styles.onTrackLabel}>On track streak</Text>

            {/* week dot row */}
            <View style={styles.weekDotsRow}>
              {WEEK_DAY_LABELS.map((lbl, i) => (
                <View key={i} style={styles.weekDotCol}>
                  <View style={[styles.weekDot, weekChecked[i] && styles.weekDotDone]}>
                    {weekChecked[i]
                      ? <Check size={11} color="#fff" strokeWidth={3} />
                      : null}
                  </View>
                  <Text style={styles.weekDayLbl}>{lbl}</Text>
                </View>
              ))}
            </View>

            {/* best streak row */}
            <View style={styles.bestStreakRow}>
              <View style={styles.bestStreakIconWrap}>
                {/* TODO: replace with <Image source={require('../../assets/images/bestStreakIcon.png')} style={{width:28,height:28}}/> */}
                <Flame size={18} color={Theme.primaryDark} />
              </View>
              <View>
                <Text style={styles.bestStreakTitle}>Best Streak</Text>
                <Text style={styles.bestStreakVal}>{visibleStats?.dayStreak ?? 12} Days</Text>
              </View>
            </View>

            {/* gecko motivation row */}
            <View style={styles.geckoMotivRow}>
              <View style={styles.geckoAvatarWrap}>
                {/* TODO: replace with <Image source={require('../../assets/images/geckoStreakAvatar.png')} style={{width:36,height:36,borderRadius:10}}/> */}
                <Star size={18} color={Theme.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.geckoMotivLine}>Discipline today.</Text>
                <Text style={styles.geckoMotivLine}>Freedom tomorrow.</Text>
              </View>
            </View>

            {/* ── Streak Calendar ────────────────────────────────────── */}
            <View style={styles.calendarSection}>
              <View style={styles.calendarHeader}>
                <Text style={styles.calendarTitle}>Streak Calendar</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => setCalendarMonth(prev => {
                      const m = prev.month === 0 ? 11 : prev.month - 1;
                      const y = prev.month === 0 ? prev.year - 1 : prev.year;
                      return { month: m, year: y };
                    })}
                  >
                    <ChevronLeft size={18} color={Theme.textMuted} />
                  </Pressable>
                  <Pressable
                    onPress={() => setCalendarMonth(prev => {
                      const m = prev.month === 11 ? 0 : prev.month + 1;
                      const y = prev.month === 11 ? prev.year + 1 : prev.year;
                      return { month: m, year: y };
                    })}
                  >
                    <ChevronRight size={18} color={Theme.textMuted} />
                  </Pressable>
                </View>
              </View>

              <Text style={styles.calendarMonthLabel}>
                {monthNames[calendarMonth.month]} {calendarMonth.year}
              </Text>

              {/* day-of-week headers */}
              <View style={styles.calWeekRow}>
                {['M','T','W','T','F','S','S'].map((d, i) => (
                  <Text key={i} style={styles.calWeekLbl}>{d}</Text>
                ))}
              </View>

              {/* calendar grid */}
              <View style={styles.calGrid}>
                {renderCalendarDays()}
              </View>
            </View>
          </View>
        </View>

        {/* ── Suggestions Bar ──────────────────────────────────────────── */}
        <View style={styles.SuggestionsPlaceholder}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 }}>
            <View style={styles.suggIconWrap}>
              <TrendingUp color={Theme.primaryDark} size={22} />
            </View>
            <View>
              <Text style={{ fontSize: FontSizes.md, color: Theme.textMain, fontWeight: '800' }}>
                Better choice?
              </Text>
              <Text style={{ fontSize: FontSizes.sm, color: Theme.textMuted }}>
                Cook at home more often to save ₹850!
              </Text>
              <Text style={{ fontSize: FontSizes.sm, color: Theme.textMuted }}>
                Move 2 days closer to Goa Trip
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/insights')}
            style={styles.seeImpactBtn}
          >
            <Text style={{ color: Theme.white, fontWeight: '600', fontSize: FontSizes.xs, padding: 8 }}>
              See Impact
            </Text>
            <ChevronRight size={18} color="rgba(249,255,250,0.86)" />
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  // ── layout ────────────────────────────────────────────────────────────────
  containerCard: {
    paddingHorizontal: 10,
    paddingBottom: 10,
    backgroundColor: Theme.background,
  },

  // ── greeting ──────────────────────────────────────────────────────────────
  greetingPlaceholder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: Theme.cardBg,
    borderRadius: 24,
    padding: 10,
    borderWidth: 1,
    borderColor: Theme.glassBorder,
    shadowColor: Theme.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 2,
  },

  demoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Theme.cardBg,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 5,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Theme.cardBorderSoft,
  },
  demoTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '800',
    color: Theme.textMain,
  },
  demoSubTitle: {
    marginTop: 4,
    fontSize: FontSizes.xs,
    lineHeight: 16,
    color: Theme.textMuted,
  },
  demoToggle: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Theme.cardBorder,
    backgroundColor: Theme.white,
  },
  demoToggleActive: {
    backgroundColor: Theme.primaryDark,
    borderColor: Theme.primaryDark,
  },
  demoToggleText: {
    color: Theme.textMuted,
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
  demoToggleTextActive: {
    color: Theme.white,
  },
  demoControls: {
    backgroundColor: Theme.cardBg,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 5,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Theme.cardBorderSoft,
    gap: 10,
  },
  demoInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  demoInput: {
    flex: 1,
    minWidth: 0,
    backgroundColor: Theme.white,
    borderWidth: 1,
    borderColor: Theme.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Theme.textMain,
    fontSize: FontSizes.sm,
  },
  demoAction: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Theme.primaryDark,
  },
  demoActionText: {
    color: Theme.white,
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
  demoCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(191,231,193,0.24)',
    borderWidth: 1,
    borderColor: 'rgba(191,231,193,0.5)',
  },
  categoryChipActive: {
    backgroundColor: Theme.primary,
    borderColor: Theme.primary,
  },
  categoryChipText: {
    color: Theme.primaryDark,
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
  categoryChipTextActive: {
    color: Theme.white,
  },
  resetDemoButton: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  resetDemoText: {
    color: Theme.textMuted,
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },

  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(191,231,193,0.7)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.45)',
    gap: 4,
  },

  // ── balance card (unchanged structure, colour tweaks only) ────────────────
  balanceCardPlaceholder: {
    borderRadius: 18,
    marginHorizontal: 5,
    shadowColor: Theme.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(249,255,250,0.16)',
  },

  balanceBackgroundImage: { minHeight: 220, width: '100%' },
  balanceBackgroundImageStyle: { borderRadius: 18 },
  balanceFadeOverlay: { ...StyleSheet.absoluteFillObject },

  balanceContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 12,
  },

  balanceTopRow: { flexDirection: 'row', alignItems: 'flex-start' },
  balanceTopLeft: { flex: 1, minWidth: 0 },
  balanceTopRight: { flex: 1.5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', minWidth: 0 },

  balanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    width: '100%',
  },

  balanceEye: { marginLeft: 8, alignSelf: 'center' },
  balanceLabel: {
    color: Theme.textMain,
    fontSize: FontSizes.sm,
    fontWeight: '500',
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  balanceValue: { color: Theme.textMain, fontSize: 30, fontWeight: '700', flexShrink: 1 },

  healthBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(91, 176, 105, 0.16)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(249,255,250,0.18)',
  },
  healthBadgeText: { color: Theme.textMuted, fontSize: FontSizes.sm, fontWeight: '600' },

  spendInfo: { flex: 1, paddingRight: 8, minWidth: 0 },
  spendLabel: { color: Theme.textMain, fontSize: FontSizes.sm, fontWeight: '500' },
  spendValue: { color: Theme.textMain, fontSize: 24, fontWeight: '600', marginTop: 8, marginBottom: 4, flexShrink: 1 },
  spendSubLabel: { color: Theme.textMain, fontSize: FontSizes.xs, marginTop: 4 },

  circularChart: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  circularText: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  circularValue: { color: Colors.textLight, fontSize: 16, fontWeight: '700' },
  circularLabel: { color: Theme.whiteSoft, fontSize: FontSizes.xs },

  progressTrack: {
    width: '100%', height: 8, borderRadius: 999,
    backgroundColor: 'rgba(249,255,250,0.14)', overflow: 'hidden', marginTop: 16,
  },
  progressFill: { height: '100%', borderRadius: 999 },
  balanceBottomDivider: { height: 1, backgroundColor: 'rgba(249,255,250,0.14)', marginVertical: 14 },

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 72,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: Theme.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    overflow: 'hidden',
    marginTop: 4,
  },
  bottomItems: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  bottomItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  bottomItemDivider: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.18)', marginHorizontal: 12 },
  bottomIconWrap: {
    width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
 bottomText: {
  flexShrink: 1,
  minWidth: 0,
},
  bottomValue: { color: Theme.textMain, fontSize: 18, fontWeight: '700', flexShrink: 1 },
  bottomLabel: { color: Theme.textMuted, fontSize: FontSizes.xs, lineHeight: 16, marginTop: 2 },

  // ── insight grid → COLUMN ─────────────────────────────────────────────────
  insightGrid: {
    flexDirection: 'column',   // ← changed from 'row'
    gap: 12,  
    padding: 18,
    shadowColor: Theme.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    position: 'relative',
  },

  PlannerPlaceholder: {
    backgroundColor: Theme.cardBg,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: Theme.cardBorderSoft,
    shadowColor: Theme.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    position: 'relative',
    overflow: 'visible',
  },

  plannerHeroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    gap: 8,
    paddingRight: 140, // leave room for the floating character image
  },

  plannerLeft: { flex: 1 },

  plannerTypeName: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Theme.primaryDark,
    marginBottom: 12,
  },

  plannerIconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  plannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(232,242,182,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(191,231,193,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // placeholder style for when images replace lucide icons inside plannerIconBox
  plannerIconImg: { width: 22, height: 22 },

  plannerImageContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 14,
    top: -8,
  },

  plannerImage: {
    width: '100%',
    height: '100%',
  },

  plannerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(203,232,231,0.34)',
    borderRadius: 12,
    padding: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(91,168,155,0.16)',
    overflow: 'hidden',
  },

  plannerBannerIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(191,231,193,0.52)',
    alignItems: 'center', justifyContent: 'center',
  },

  plannerBannerText: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Theme.textMain,
    fontWeight: '600',
    lineHeight: 18,
  },

  goodAtLabel: {
    fontSize: FontSizes.sm,
    color: Theme.textMuted,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 8,
  },

  traitRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },

  traitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(232,242,182,0.34)',
    borderWidth: 1,
    borderColor: 'rgba(191,231,193,0.8)',
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 11,
  },

  traitText: {
    fontSize: FontSizes.xs,
    color: Theme.primaryDark,
    fontWeight: '700',
  },

  plannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Theme.primaryDark,
    backgroundColor: 'rgba(234,245,238,0.66)',
    alignSelf: 'stretch',
  },

  plannerBtnText: {
    fontSize: FontSizes.sm,
    color: Theme.primaryDark,
    fontWeight: '700',
  },

  // ── streak card ───────────────────────────────────────────────────────────
  streakPlaceholder: {
    backgroundColor: Theme.cardBg,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: Theme.cardBorderSoft,
    shadowColor: Theme.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 2,
  },

  streakHeaderText: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Theme.textMain,
  },

  streakRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
    marginTop: 6,
  },

  streakNumber: {
    fontSize: FontSizes.xxxxl,
    fontWeight: '800',
    color: Theme.primaryDark,
    lineHeight: 52,
  },

  daysText: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Theme.mountainTeal,
    marginBottom: 6,
  },

  onTrackLabel: {
    fontSize: FontSizes.sm,
    color: Theme.textMuted,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 14,
  },

  // week dots
  weekDotsRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  weekDotCol: { alignItems: 'center', gap: 4 },
  weekDot: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(234,245,238,0.92)',
    borderWidth: 1, borderColor: 'rgba(191,231,193,0.72)',
    alignItems: 'center', justifyContent: 'center',
  },
  weekDotDone: {
    backgroundColor: Theme.primary,
    borderColor: Theme.primary,
  },
  weekDayLbl: {
    fontSize: 10,
    color: Theme.textFaint,
    fontWeight: '600',
  },

  // best streak
  bestStreakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(232,242,182,0.42)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(232,242,182,0.92)',
    marginBottom: 10,
  },

  bestStreakIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.48)',
    alignItems: 'center', justifyContent: 'center',
    // TODO: replace with <Image source={require('../../assets/images/bestStreakIcon.png')} style={{width:40,height:40,borderRadius:12}}/>
  },

  bestStreakTitle: {
    fontSize: FontSizes.xs,
    color: Theme.textMuted,
    fontWeight: '500',
  },

  bestStreakVal: {
    fontSize: FontSizes.md,
    fontWeight: '800',
    color: Theme.textMain,
  },

  // gecko motivation
  geckoMotivRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(203,232,231,0.34)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(91,168,155,0.16)',
  },

  geckoAvatarWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(191,231,193,0.48)',
    alignItems: 'center', justifyContent: 'center',
    // TODO: replace with <Image source={require('../../assets/images/geckoStreakAvatar.png')} style={{width:40,height:40,borderRadius:12}}/>
  },

  geckoMotivLine: {
    fontSize: FontSizes.sm,
    color: Theme.textMuted,
    fontWeight: '600',
    lineHeight: 18,
  },

  // calendar
  calendarSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(191,231,193,0.72)',
    paddingTop: 14,
  },

  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  calendarTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Theme.textMain,
  },

  calendarMonthLabel: {
    fontSize: FontSizes.xs,
    color: Theme.textMuted,
    fontWeight: '600',
    marginBottom: 10,
  },

  calWeekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },

  calWeekLbl: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: Theme.textFaint,
  },

  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  calDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  calDayDone: {
    backgroundColor: Theme.primary,
    borderRadius: 999,
  },

  calDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.textMuted,
  },

  calDayTextDone: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // ── suggestions bar ───────────────────────────────────────────────────────
  SuggestionsPlaceholder: {
    minHeight: 80,
    backgroundColor: 'rgba(234,245,238,0.84)',
    borderRadius: 20,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(191,231,193,0.86)',
    shadowColor: Theme.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
  },

  suggIconWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(203,232,231,0.72)',
    alignItems: 'center', justifyContent: 'center',
  },

  seeImpactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.primaryDark,
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: 12,
    margin: 8,
    minHeight: 60,
    borderWidth: 1,
    borderColor: 'rgba(249,255,250,0.12)',
  },

});