import type { ApiUser, GoalsResponse, ProfileResponse, TransactionsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@clerk/clerk-expo';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Navbar from '../../components/Navbar';
import { Colors, FontSizes, Spacing } from '../../constants/Colors';
import { Goal, Transaction } from '../../constants/types';
import { formatCurrency, formatDate } from '../../utils/helpers';

const EMOJI_OPTIONS = ['🎯', '🏠', '🚗', '🎓', '✈️', '💍', '📱'];
const MS_IN_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_FALLBACK_DAYS = 90;

function parseDate(value: string): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / MS_IN_DAY);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function toNumber(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function GoalScreen() {
  const { getToken, isSignedIn } = useAuth();
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);
  const [isSaving, setIsSaving] = useState(false);

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

        const token = await getToken();
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

      return () => {
        isActive = false;
      };
    }, [getToken, isSignedIn])
  );

  const currency = profile?.currency ?? '₹';
  const formatAmount = (value: number) => formatCurrency(Math.round(value), currency);

  const savingsSnapshot = useMemo(() => {
    const today = new Date();
    const start = addDays(today, -29);
    const recentTransactions = transactions.filter(transaction => {
      const parsed = parseDate(transaction.date);
      return parsed ? parsed >= start && parsed <= today : false;
    });

    let income = recentTransactions
      .filter(transaction => transaction.type === 'income')
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const expenses = recentTransactions
      .filter(transaction => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    if (income <= 0 && profile?.monthlyIncome) {
      income = profile.monthlyIncome;
    }

    const net = income - expenses;
    const daily = net / 30;

    return {
      income,
      expenses,
      net,
      daily,
      dailyAvailable: Math.max(0, daily),
    };
  }, [profile, transactions]);

  const preview = useMemo(() => {
    const targetValue = toNumber(targetAmount);
    if (!title.trim() || targetValue <= 0) {
      return null;
    }

    const currentValue = toNumber(currentAmount);
    const remaining = Math.max(0, targetValue - currentValue);
    const today = new Date();
    const deadlineDate = parseDate(deadline);
    const daysToDeadline = deadlineDate ? Math.max(1, daysBetween(today, deadlineDate)) : null;
    const requiredDaily = daysToDeadline ? remaining / daysToDeadline : null;
    const etaDays = savingsSnapshot.dailyAvailable > 0
      ? Math.ceil(remaining / savingsSnapshot.dailyAvailable)
      : null;
    const etaDate = etaDays ? addDays(today, etaDays) : null;

    return {
      remaining,
      requiredDaily,
      etaDays,
      etaDate,
      deadlineDate,
      daysToDeadline,
    };
  }, [currentAmount, deadline, savingsSnapshot.dailyAvailable, targetAmount, title]);

  async function handleSave() {
    const trimmedTitle = title.trim();
    const targetValue = toNumber(targetAmount);
    const currentValue = toNumber(currentAmount);

    if (!trimmedTitle) {
      Alert.alert('Goal needs a name', 'Give your goal a short title.');
      return;
    }

    if (targetValue <= 0) {
      Alert.alert('Target amount missing', 'Enter a target amount to save.');
      return;
    }

    const clampedCurrent = Math.min(Math.max(currentValue, 0), targetValue);
    let deadlineDate = parseDate(deadline);

    if (!deadlineDate) {
      const remaining = Math.max(0, targetValue - clampedCurrent);
      if (savingsSnapshot.dailyAvailable > 0) {
        const etaDays = Math.max(1, Math.ceil(remaining / savingsSnapshot.dailyAvailable));
        deadlineDate = addDays(new Date(), etaDays);
      } else {
        deadlineDate = addDays(new Date(), DEFAULT_FALLBACK_DAYS);
      }
    }

    const payload = {
      title: trimmedTitle,
      targetAmount: targetValue,
      currentAmount: clampedCurrent,
      deadline: toDateString(deadlineDate),
      emoji,
    };

    setIsSaving(true);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Missing auth token');
      }
      const response = await apiRequest<{ goal: Goal }>('/api/goals', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, token);
      setGoals(currentGoals => [response.goal, ...currentGoals]);
      setTitle('');
      setTargetAmount('');
      setCurrentAmount('');
      setDeadline('');
      setEmoji(EMOJI_OPTIONS[0]);
      Alert.alert('Goal added', 'We will keep you on track.');
    } catch (error) {
      Alert.alert('Oops', 'Could not save the goal.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={styles.page}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Navbar />
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Goals</Text>
            <Text style={styles.headerSubtitle}>Make the plan, we will track the pace.</Text>
          </View>

          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View>
                <Text style={styles.heroLabel}>Daily saving power</Text>
                <Text style={styles.heroValue}>{formatAmount(savingsSnapshot.dailyAvailable)}</Text>
                <Text style={styles.heroSub}>Average from the last 30 days</Text>
              </View>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>{formatAmount(savingsSnapshot.net)} net</Text>
              </View>
            </View>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Income</Text>
                <Text style={styles.heroStatValue}>{formatAmount(savingsSnapshot.income)}</Text>
              </View>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Expenses</Text>
                <Text style={styles.heroStatValue}>{formatAmount(savingsSnapshot.expenses)}</Text>
              </View>
            </View>
            {savingsSnapshot.daily <= 0 ? (
              <View style={styles.heroHint}>
                <Text style={styles.heroHintText}>
                  Spending is higher than income. Reduce expenses or add income to build savings.
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Create a goal</Text>
            <View style={styles.formCard}>
              <Text style={styles.sectionLabel}>Goal name</Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="New laptop, trip, emergency"
                placeholderTextColor={Colors.textSecondary}
              />

              <Text style={styles.sectionLabel}>Target amount</Text>
              <View style={styles.amountRow}>
                <Text style={styles.currencySymbol}>{currency}</Text>
                <TextInput
                  style={styles.amountInput}
                  value={targetAmount}
                  onChangeText={setTargetAmount}
                  placeholder="0"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <Text style={styles.sectionLabel}>Already saved</Text>
              <View style={styles.amountRow}>
                <Text style={styles.currencySymbol}>{currency}</Text>
                <TextInput
                  style={styles.amountInput}
                  value={currentAmount}
                  onChangeText={setCurrentAmount}
                  placeholder="0"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <Text style={styles.sectionLabel}>Target date</Text>
              <TextInput
                style={styles.textInput}
                value={deadline}
                onChangeText={setDeadline}
                placeholder="YYYY-MM-DD (optional)"
                placeholderTextColor={Colors.textSecondary}
                autoCapitalize="none"
              />
              <Text style={styles.helperText}>Leave it empty to auto-pick a realistic date.</Text>

              <Text style={styles.sectionLabel}>Pick a vibe</Text>
              <View style={styles.emojiRow}>
                {EMOJI_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.emojiChip,
                      option === emoji && styles.emojiChipSelected,
                    ]}
                    onPress={() => setEmoji(option)}
                  >
                    <Text style={styles.emojiText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Saving...' : 'Save goal'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Goal guidance</Text>
            <View style={styles.previewCard}>
              {preview ? (
                <>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Remaining</Text>
                    <Text style={styles.previewValue}>{formatAmount(preview.remaining)}</Text>
                  </View>
                  {preview.requiredDaily !== null ? (
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Required per day</Text>
                      <Text style={styles.previewValue}>{formatAmount(preview.requiredDaily)}</Text>
                    </View>
                  ) : null}
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>At your pace</Text>
                    <Text style={styles.previewValue}>
                      {preview.etaDays ? `${preview.etaDays} days` : 'Need surplus'}
                    </Text>
                  </View>
                  {preview.etaDate ? (
                    <Text style={styles.previewFoot}>
                      Estimated finish: {formatDate(preview.etaDate.toISOString())}
                    </Text>
                  ) : null}
                  {preview.deadlineDate ? (
                    <Text style={styles.previewFoot}>
                      Deadline: {formatDate(preview.deadlineDate.toISOString())} ({preview.daysToDeadline} days)
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text style={styles.previewEmpty}>
                  Fill the form to see how much to save per day and the expected finish date.
                </Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your goals</Text>
            {goals.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No goals yet</Text>
                <Text style={styles.emptySubtitle}>Add your first goal to see the plan here.</Text>
              </View>
            ) : (
              goals.map(goal => {
                const target = goal.targetAmount;
                const current = goal.currentAmount;
                const remaining = Math.max(0, target - current);
                const progress = target > 0 ? Math.min(1, current / target) : 0;
                const deadlineDate = parseDate(goal.deadline);
                const today = new Date();
                const daysToDeadline = deadlineDate ? Math.max(0, daysBetween(today, deadlineDate)) : null;
                const requiredDaily = deadlineDate && remaining > 0
                  ? remaining / Math.max(1, daysToDeadline ?? 1)
                  : null;
                const etaDays = savingsSnapshot.dailyAvailable > 0
                  ? Math.ceil(remaining / savingsSnapshot.dailyAvailable)
                  : null;
                const etaDate = etaDays ? addDays(today, etaDays) : null;
                const isComplete = remaining <= 0;
                const isOverdue = Boolean(deadlineDate && deadlineDate < today && !isComplete);
                const isOnTrack = requiredDaily !== null
                  ? savingsSnapshot.dailyAvailable >= requiredDaily
                  : null;

                let status = 'Active';
                let statusStyle = styles.statusActive;

                if (isComplete) {
                  status = 'Completed';
                  statusStyle = styles.statusComplete;
                } else if (isOverdue) {
                  status = 'Overdue';
                  statusStyle = styles.statusBehind;
                } else if (isOnTrack !== null) {
                  status = isOnTrack ? 'On track' : 'Behind';
                  statusStyle = isOnTrack ? styles.statusOnTrack : styles.statusBehind;
                }

                return (
                  <View key={goal.id} style={styles.goalCard}>
                    <View style={styles.goalHeader}>
                      <View style={styles.goalTitleRow}>
                        <Text style={styles.goalEmoji}>{goal.emoji}</Text>
                        <Text style={styles.goalTitle}>{goal.title}</Text>
                      </View>
                      <View style={[styles.statusChip, statusStyle]}>
                        <Text style={styles.statusText}>{status}</Text>
                      </View>
                    </View>

                    <Text style={styles.goalSubtitle}>
                      Target {formatAmount(target)} · Saved {formatAmount(current)}
                    </Text>

                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                    </View>

                    <View style={styles.goalStatsRow}>
                      <View style={styles.goalStat}>
                        <Text style={styles.goalStatLabel}>Remaining</Text>
                        <Text style={styles.goalStatValue}>{formatAmount(remaining)}</Text>
                      </View>
                      <View style={styles.goalStat}>
                        <Text style={styles.goalStatLabel}>ETA</Text>
                        <Text style={styles.goalStatValue}>
                          {etaDays ? `${etaDays} days` : 'No surplus'}
                        </Text>
                      </View>
                      <View style={styles.goalStat}>
                        <Text style={styles.goalStatLabel}>Needed/day</Text>
                        <Text style={styles.goalStatValue}>
                          {requiredDaily !== null ? formatAmount(requiredDaily) : formatAmount(savingsSnapshot.dailyAvailable)}
                        </Text>
                      </View>
                    </View>

                    {etaDate ? (
                      <Text style={styles.goalFootnote}>
                        Estimated finish: {formatDate(etaDate.toISOString())}
                      </Text>
                    ) : null}
                    {deadlineDate ? (
                      <Text style={styles.goalFootnote}>
                        Deadline: {formatDate(deadlineDate.toISOString())} ({daysToDeadline} days left)
                      </Text>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  page: {
    flex: 1,
    backgroundColor: '#f4f6f5',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  header: {
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: FontSizes.sm,
    color: '#6b7280',
  },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
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
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  heroSub: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  heroBadge: {
    backgroundColor: 'rgba(52, 152, 219, 0.14)',
    borderRadius: 999,
    paddingHorizontal: Spacing.base,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(52, 152, 219, 0.24)',
  },
  heroBadgeText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.savings,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginTop: Spacing.md,
  },
  heroStat: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heroStatLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  heroStatValue: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 6,
  },
  heroHint: {
    marginTop: Spacing.base,
    padding: Spacing.base,
    borderRadius: 14,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.2)',
  },
  heroHintText: {
    fontSize: FontSizes.sm,
    color: Colors.expense,
    borderRadius: 12,
  },
  section: {
    marginTop: Spacing.xl,
    gap: Spacing.base,
  },
  sectionTitle: {
    marginTop: Spacing.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.base,
  },
  sectionLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: Spacing.base,
    borderWidth: 1.5,
    borderColor: Colors.border,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: Spacing.base,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  currencySymbol: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginRight: Spacing.xs,
  },
  amountInput: {
    flex: 1,
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
  },
  helperText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: -Spacing.xs,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  emojiChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    backgroundColor: Colors.background,
  },
  emojiChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  emojiText: {
    fontSize: 18,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: Spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.textLight,
    fontSize: FontSizes.base,
    fontWeight: '700',
  },
  previewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  previewValue: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  previewFoot: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  previewEmpty: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  goalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  goalEmoji: {
    fontSize: 20,
  },
  goalTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  goalSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 999,
  },
  goalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.base,
  },
  goalStat: {
    flex: 1,
  },
  goalStatLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  goalStatValue: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 4,
  },
  goalFootnote: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  statusChip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.textLight,
  },
  statusActive: {
    backgroundColor: Colors.savings,
  },
  statusOnTrack: {
    backgroundColor: Colors.primary,
  },
  statusBehind: {
    backgroundColor: Colors.expense,
  },
  statusComplete: {
    backgroundColor: Colors.primaryDark,
  },
});
