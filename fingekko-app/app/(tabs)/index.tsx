import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import {
  BarChart,
  Check,
  ChevronRight,
  Flame,
  MoreHorizontal,
  Plus,
  Target,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing } from '../../constants/Colors';
import { Goal, Transaction, UserProfile } from '../../constants/types';
import { formatCurrency } from '../../utils/helpers';
import { calculateSafeToSpend } from '../../utils/safe-to-spend';
import { getGoals, getProfile, getTransactions } from '../../utils/storage';

const streakDays = [
  { label: 'M', done: true },
  { label: 'T', done: true },
  { label: 'W', done: true },
  { label: 'T', done: true },
  { label: 'F', done: true },
  { label: 'S', done: false },
  { label: 'S', done: false },
];

const calendarDays = [13, 14, 15, 16, 17, 18, 19];

export default function HomeScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

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

      return () => {
        isActive = false;
      };
    }, [])
  );

  const safeSpendData = useMemo(
    () => calculateSafeToSpend({ profile, transactions, goals }),
    [goals, profile, transactions]
  );

  const currency = profile?.currency ?? '₹';
  const formatAmount = (amount: number) => formatCurrency(Math.round(amount), currency);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} accessibilityLabel="Go back">
            <ChevronRight size={20} color={Colors.textPrimary} style={styles.iconBack} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Streaks</Text>
          <TouchableOpacity style={styles.iconButton} accessibilityLabel="More options">
            <MoreHorizontal size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.safeCard}
          onPress={() => router.push('/(tabs)/safe-to-spend')}
          accessibilityLabel="Open safe to spend details"
        >
          <View style={styles.safeHeader}>
            <Text style={styles.safeTitle}>Safe to Spend</Text>
            <View style={styles.safeBadge}>
              <Text style={styles.safeBadgeText}>Details</Text>
              <ChevronRight size={14} color={Colors.savings} />
            </View>
          </View>
          <Text style={styles.safeAmount}>{formatAmount(safeSpendData.safeToSpend)}</Text>
          <Text style={styles.safeSub}>today</Text>
          <View style={styles.safeProgressTrack}>
            <View style={[styles.safeProgressFill, { width: `${safeSpendData.progress * 100}%` }]} />
          </View>
          <Text style={styles.safeFootnote}>Based on income, expenses, and goals</Text>
        </TouchableOpacity>

        

        <View style={styles.heroCard}>
          <Text style={styles.heroOverline}>You're on a roll!</Text>
          <View style={[styles.heroNumberRow, { paddingBottom: Spacing.xl, paddingTop: Spacing.xl }]}
          >
            <Text style={styles.heroNumber}>12</Text>
            <Text style={styles.heroUnit}>Days</Text>
          </View>
          <Text style={styles.heroSub}>On track streak</Text>

          <View style={styles.weekRow}>
            {streakDays.map((day, index) => (
              <View key={`${day.label}-${index}`} style={styles.dayColumn}>
                <View style={[styles.dayCircle, day.done && styles.dayCircleActive]}>
                  {day.done ? <Check size={14} color={Colors.textLight} /> : null}
                </View>
                <Text style={styles.dayLabel}>{day.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.bestCard}>
            <View style={styles.bestIcon}>
              <Flame size={16} color={Colors.primary} />
            </View>
            <View>
              <Text style={styles.bestLabel}>Best Streak</Text>
              <Text style={styles.bestValue}>12 Days</Text>
            </View>
          </View>
        </View>

        

        <View style={styles.tipCard}>
          <Image
            source={require('../../assets/images/gekko.png')}
            style={styles.tipImage}
            resizeMode="contain"
          />
          <View style={styles.tipTextBlock}>
            <Text style={styles.tipTitle}>Discipline today</Text>
            <Text style={styles.tipSubtitle}>Freedom tomorrow.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Streak Calendar</Text>
          <Text style={styles.sectionSubtitle}>May 2024</Text>
          <View style={styles.calendarHeaderRow}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(label => (
              <Text key={label} style={styles.calendarLabel}>
                {label}
              </Text>
            ))}
          </View>
          <View style={styles.calendarRow}>
            {calendarDays.map(day => (
              <View key={day} style={[styles.calendarDay, styles.calendarDayActive]}>
                <Text style={styles.calendarDayText}>{day}</Text>
              </View>
            ))}
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
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.base,
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
  iconBack: {
    transform: [{ rotate: '180deg' }],
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  safeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  safeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  safeTitle: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  safeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.background,
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  safeBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.savings,
  },
  safeAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.savings,
    marginTop: Spacing.sm,
  },
  safeSub: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  safeProgressTrack: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: Spacing.base,
  },
  safeProgressFill: {
    height: '100%',
    backgroundColor: Colors.savings,
    borderRadius: 999,
  },
  safeFootnote: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  quickRow: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginTop: Spacing.lg,
  },
  quickButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: Spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginTop: Spacing.lg,
  },
  heroOverline: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  heroNumberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  heroNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.primary,
  },
  heroUnit: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  heroSub: {
    marginTop: Spacing.xs,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  weekRow: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  dayCircleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  bestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    backgroundColor: Colors.background,
    padding: Spacing.base,
    borderRadius: 18,
    marginTop: Spacing.lg,
  },
  bestIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bestLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  bestValue: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tipImage: {
    width: 64,
    height: 64,
  },
  tipTextBlock: {
    flex: 1,
  },
  tipTitle: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  tipSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  section: {
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.base,
  },
  calendarLabel: {
    width: 32,
    textAlign: 'center',
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  calendarDay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayActive: {
    backgroundColor: Colors.primary,
  },
  calendarDayText: {
    fontSize: FontSizes.xs,
    color: Colors.textLight,
    fontWeight: '600',
  },
});