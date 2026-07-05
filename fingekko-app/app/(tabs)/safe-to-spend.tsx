import type { ApiUser, GoalsResponse, ProfileResponse, TransactionsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@clerk/clerk-expo';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../components/ui/Icon';
import Navbar from '../../components/Navbar';
import { Colors, FontSizes, Spacing } from '../../constants/Colors';
import { Goal, Transaction, UserProfile } from '../../constants/types';
import { formatCurrency } from '../../utils/helpers';
import { calculateSafeToSpend } from '../../utils/safe-to-spend';

export default function SafeToSpendScreen() {
  const { getToken, isSignedIn } = useAuth();
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const getTokenRef = useRef(getToken);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadData() {
        if (!isSignedIn) {
          setProfile(null);
          setTransactions([]);
          setGoals([]);
          return;
        }

        const token = await getTokenRef.current();
        if (!token) {
          return;
        }

        const [profileResponse, transactionsResponse, goalsResponse] = await Promise.all([
          apiRequest<ProfileResponse>('/api/profile', {}, token),
          apiRequest<TransactionsResponse>('/api/transactions', {}, token),
          apiRequest<GoalsResponse>('/api/goals', {}, token),
        ]);

        if (!isActive) {
          return;
        }

        setProfile(profileResponse.user);
        setTransactions(transactionsResponse.transactions);
        setGoals(goalsResponse.goals);
      }

      loadData();

      fadeAnim.setValue(0);
      slideAnim.setValue(16);
      const introAnim = Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
      ]);

      introAnim.start();

      return () => {
        isActive = false;
        try {
          introAnim.stop();
        } catch (e) {
          // ignore if stop is not supported or has already finished
        }
      };
    }, [fadeAnim, isSignedIn, slideAnim])
  );

  const profileSnapshot = useMemo<UserProfile | null>(() => {
    if (!profile) {
      return null;
    }

    return {
      name: profile.name,
      monthlyIncome: profile.monthlyIncome ?? 0,
      currency: profile.currency ?? '₹',
      xp: profile.xp,
      level: profile.level,
      personalityType: null,
      streak: {
        currentStrak: 0,
        bestStreak: 0,
        lastTrackedDate: '',
        trackedDates: [],
      },
      achievements: [],
    };
  }, [profile]);

  const safeSpendData = useMemo(
    () => calculateSafeToSpend({ profile: profileSnapshot, transactions, goals }),
    [goals, profileSnapshot, transactions]
  );

  const currency = profile?.currency ?? '₹';
  const formatAmount = (amount: number, minZero = false) => {
    const value = minZero ? Math.max(0, amount) : amount;
    return formatCurrency(Math.round(value), currency);
  };

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Navbar />
        <Animated.View
          style={[
            styles.contentWrap,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.back()}
              accessibilityLabel="Go back"
            >
              <Icon name="ChevronLeft" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Safe to Spend</Text>
            <View style={styles.iconPlaceholder} />
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>You can safely spend</Text>
            </View>
            <View style={styles.heroAmountRow}>
                <Text
                  style={styles.heroAmount}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {formatAmount(safeSpendData.safeToSpend, true)}
                </Text>
              <Text style={styles.heroAmountSuffix}>today</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${safeSpendData.progress * 100}%` }]} />
            </View>
            <Text style={styles.heroFootnote}>
              Based on your current balance, expenses, and goals.
            </Text>

            <View style={styles.metricRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Next income in</Text>
                <Text style={styles.metricValue}>{safeSpendData.daysLeft} days</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Goal reserve/day</Text>
                <Text style={styles.metricValue}>
                  {formatAmount(safeSpendData.goalDailyReserve, true)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Monthly Summary</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <View style={[styles.summaryDot, { backgroundColor: Colors.income }]} />
                <Text style={styles.summaryLabel}>Income</Text>
                <Text style={styles.summaryValue}>
                  {formatAmount(safeSpendData.cycleIncome, true)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <View style={[styles.summaryDot, { backgroundColor: Colors.expense }]} />
                <Text style={styles.summaryLabel}>Expenses</Text>
                <Text style={styles.summaryValue}>
                  {formatAmount(safeSpendData.cycleExpenses, true)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <View style={[styles.summaryDot, { backgroundColor: Colors.savings }]} />
                <Text style={styles.summaryLabel}>Savings</Text>
                <Text style={[styles.summaryValue, styles.summaryValuePositive]}>
                  {formatAmount(safeSpendData.savings)}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f4f6f5',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  contentWrap: {
    gap: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  iconPlaceholder: {
    width: 36,
    height: 36,
  },
  screenTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: Spacing.base,
    shadowColor: '#000000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#000000',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: Spacing.base,
    paddingVertical: 6,
    backgroundColor: 'rgba(52, 152, 219, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.24)',
  },
  heroBadgeText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.savings,
    letterSpacing: 0.2,
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.base,
    minWidth: 0,
  },
  heroAmount: {
    fontSize: 46,
    fontWeight: '700',
    color: Colors.savings,
    flexShrink: 1,
  },
  heroAmountSuffix: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  progressTrack: {
    height: 10,
    backgroundColor: Colors.border,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: Spacing.base,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.savings,
    borderRadius: 999,
  },
  heroFootnote: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
  metricRow: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginTop: Spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: Spacing.base,
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  metricLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  metricValue: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.base,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  actionPrimary: {
    backgroundColor: Colors.primary,
    borderColor: '#000000',
  },
  actionLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  actionLabelLight: {
    color: Colors.textLight,
  },
  section: {
    gap: Spacing.base,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: Spacing.base,
    gap: Spacing.base,
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  summaryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  summaryLabel: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  summaryValuePositive: {
    color: Colors.savings,
  },
});
