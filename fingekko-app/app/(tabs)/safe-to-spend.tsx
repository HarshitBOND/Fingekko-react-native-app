import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { BarChart, ChevronLeft, Plus, Target } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing } from '../../constants/Colors';
import { Goal, Transaction, UserProfile } from '../../constants/types';
import { formatCurrency } from '../../utils/helpers';
import { calculateSafeToSpend } from '../../utils/safe-to-spend';
import { getGoals, getProfile, getTransactions } from '../../utils/storage';

export default function SafeToSpendScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function loadData() {
        const [nextProfile, nextTransactions, nextGoals] = await Promise.all([
          getProfile(),
          getTransactions(),
          getGoals(),
        ]);

        if (!isActive) {
          return;
        }

        setProfile(nextProfile);
        setTransactions(nextTransactions);
        setGoals(nextGoals);
      }

      loadData();

      fadeAnim.setValue(0);
      slideAnim.setValue(16);
      glowAnim.setValue(0);

      Animated.parallel([
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
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();

      return () => {
        isActive = false;
      };
    }, [fadeAnim, glowAnim, slideAnim])
  );

  const safeSpendData = useMemo(
    () => calculateSafeToSpend({ profile, transactions, goals }),
    [goals, profile, transactions]
  );

  const currency = profile?.currency ?? '₹';
  const formatAmount = (amount: number, minZero = false) => {
    const value = minZero ? Math.max(0, amount) : amount;
    return formatCurrency(Math.round(value), currency);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <Animated.View style={[styles.blueGlow, { opacity: glowAnim }]} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
              <ChevronLeft size={20} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Safe to Spend</Text>
            <View style={styles.iconPlaceholder} />
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>You can safely spend</Text>
            </View>
            <View style={styles.heroAmountRow}>
              <Text style={styles.heroAmount}>{formatAmount(safeSpendData.safeToSpend, true)}</Text>
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blueGlow: {
    position: 'absolute',
    top: -140,
    left: -120,
    right: -120,
    height: 260,
    borderRadius: 200,
    backgroundColor: Colors.savings,
    opacity: 0.2,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  contentWrap: {
    paddingTop: Spacing.lg,
    gap: Spacing.xl,
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
    borderRadius: 24,
    padding: Spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
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
  },
  heroAmount: {
    fontSize: 46,
    fontWeight: '700',
    color: Colors.savings,
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
    marginTop: Spacing.lg,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
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
    borderRadius: 18,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionPrimary: {
    backgroundColor: Colors.savings,
    borderColor: Colors.savings,
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
    borderRadius: 20,
    padding: Spacing.lg,
    gap: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
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
