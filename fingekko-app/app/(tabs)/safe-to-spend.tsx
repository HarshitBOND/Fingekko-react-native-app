import type { ApiUser, GoalsResponse, ProfileResponse, TransactionsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@clerk/clerk-expo';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Icon from '../../components/ui/Icon';
import Navbar from '../../components/Navbar';
import ScreenContainer from '../../components/ui/ScreenContainer';
import Card from '../../components/ui/Card';
import AppText from '../../components/ui/AppText';
import ProgressBar from '../../components/ProgressBar';
import PressableScale from '../../components/ui/PressableScale';
import { palette, spacing, layout, radius, shadows, gradients } from '../../constants/design';
import { Goal, Transaction } from '../../constants/types';
import { formatMoney } from '../../utils/currency';
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

  // Feed the raw profile straight in — calculateSafeToSpend now shares Home's
  // pay-cycle engine (AUDIT item 19), which needs the real `payday`, so the old
  // hand-built snapshot (which dropped it) is gone.
  const safeSpendData = useMemo(
    () => calculateSafeToSpend({ profile, transactions, goals }),
    [goals, profile, transactions]
  );

  // Personal figures format in the user's profile currency (AUDIT item 17),
  // set app-wide by useCurrencySync.
  const formatAmount = (amount: number, minZero = false) => {
    const value = minZero ? Math.max(0, amount) : amount;
    return formatMoney(value);
  };

  return (
    <ScreenContainer
      contentStyle={{ gap: spacing.lg }}
      header={
        <View style={{ paddingHorizontal: layout.gutter }}>
          <Navbar />
        </View>
      }
    >
      <Animated.View
        style={[
          styles.contentWrap,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.topBar}>
          <PressableScale
            style={styles.iconButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Icon name="ChevronLeft" size={20} color={palette.textPrimary} />
          </PressableScale>
          <AppText variant="title" color="textPrimary" weight="bold">
            Safe to Spend
          </AppText>
          <View style={styles.iconPlaceholder} />
        </View>

        <Card variant="elevated" padding={20} style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <AppText variant="micro" color="primaryDeep" weight="bold" style={styles.heroBadgeText}>
              YOU CAN SAFELY SPEND
            </AppText>
          </View>
          <View style={styles.heroAmountRow}>
            <AppText numeric
              variant="display"
              color="primaryDeep"
              weight="extrabold"
              style={styles.heroAmount}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {formatAmount(safeSpendData.safeToSpend, true)}
            </AppText>
            <AppText variant="body" color="textSecondary" weight="semibold" style={styles.heroAmountSuffix}>
              today
            </AppText>
          </View>

          <View style={styles.progressWrap}>
            <ProgressBar
              progress={safeSpendData.progress}
              height={8}
              radius={radius.pill}
              colors={gradients.brand}
              trackColor={palette.primaryLight}
            />
          </View>

          <AppText variant="caption" color="textSecondary" style={styles.heroFootnote}>
            Based on your current balance, expenses, and goals.
          </AppText>

          <View style={styles.metricRow}>
            <Card variant="flat" padding={12} style={styles.metricCard}>
              <AppText variant="micro" color="textSecondary" style={styles.metricLabel}>
                Next income in
              </AppText>
              <AppText variant="body" color="textPrimary" weight="bold" style={styles.metricValue}>
                {safeSpendData.daysLeft} days
              </AppText>
            </Card>
            <Card variant="flat" padding={12} style={styles.metricCard}>
              <AppText variant="micro" color="textSecondary" style={styles.metricLabel}>
                Goal reserve/day
              </AppText>
              <AppText numeric variant="body" color="textPrimary" weight="bold" style={styles.metricValue}>
                {formatAmount(safeSpendData.goalDailyReserve, true)}
              </AppText>
            </Card>
          </View>
        </Card>

        <View style={styles.section}>
          <AppText variant="title" color="textPrimary" weight="bold">
            Monthly Summary
          </AppText>
          <Card variant="elevated" padding={20} style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryDot, { backgroundColor: palette.primary }]} />
              <AppText variant="bodySm" color="textSecondary" style={styles.summaryLabel}>
                Income
              </AppText>
              <AppText numeric variant="bodySm" color="textPrimary" weight="bold">
                {formatAmount(safeSpendData.cycleIncome, true)}
              </AppText>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryDot, { backgroundColor: palette.danger }]} />
              <AppText variant="bodySm" color="textSecondary" style={styles.summaryLabel}>
                Expenses
              </AppText>
              <AppText numeric variant="bodySm" color="textPrimary" weight="bold">
                {formatAmount(safeSpendData.cycleExpenses, true)}
              </AppText>
            </View>
            {safeSpendData.unpaidEssentials > 0 && (
              <View style={styles.summaryItem}>
                <View style={[styles.summaryDot, { backgroundColor: palette.warning }]} />
                <AppText variant="bodySm" color="textSecondary" style={styles.summaryLabel}>
                  Bills to pay
                </AppText>
                <AppText numeric variant="bodySm" color="textPrimary" weight="bold">
                  {formatAmount(safeSpendData.unpaidEssentials, true)}
                </AppText>
              </View>
            )}
            <View style={styles.summaryItem}>
              <View
                style={[
                  styles.summaryDot,
                  { backgroundColor: safeSpendData.savings < 0 ? palette.danger : palette.success },
                ]}
              />
              <AppText variant="bodySm" color="textSecondary" style={styles.summaryLabel}>
                {safeSpendData.savings < 0 ? 'Over budget' : 'Savings'}
              </AppText>
              <AppText numeric variant="bodySm" color={safeSpendData.savings < 0 ? 'danger' : 'success'} weight="bold">
                {formatAmount(safeSpendData.savings)}
              </AppText>
            </View>
          </Card>
        </View>
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contentWrap: {
    gap: spacing.base,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  iconPlaceholder: {
    width: 38,
    height: 38,
  },
  heroCard: {
    gap: spacing.sm,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: palette.primaryLight,
  },
  heroBadgeText: {
    letterSpacing: 0.5,
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  heroAmount: {
    lineHeight: 46,
  },
  heroAmountSuffix: {
    marginBottom: 4,
  },
  progressWrap: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  heroFootnote: {
    lineHeight: 18,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  metricCard: {
    flex: 1,
  },
  metricLabel: {
    letterSpacing: 0.2,
  },
  metricValue: {
    marginTop: 4,
  },
  section: {
    gap: spacing.sm,
  },
  summaryCard: {
    gap: spacing.md,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
  summaryLabel: {
    flex: 1,
  },
});
