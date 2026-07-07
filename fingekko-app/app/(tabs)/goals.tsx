import { useAuth } from '@clerk/clerk-expo';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Navbar from '@/components/Navbar';
import ConfirmDialog from '@/components/ConfirmDialog';
import BadgesRow from '@/components/goals/BadgesRow';
import GoalRewardModal, { type GoalRewardInfo } from '@/components/goals/GoalRewardModal';
import XpBar from '@/components/goals/XpBar';
import XpHistoryModal from '@/components/goals/XpHistoryModal';
import AppText from '@/components/ui/AppText';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import Input from '@/components/ui/Input';
import ProgressRing from '@/components/ui/ProgressRing';
import ScreenContainer from '@/components/ui/ScreenContainer';
import Toast from '@/components/ui/Toast';
import { useToast } from '@/hooks/useToast';
import { layout, palette, radius, spacing } from '@/constants/design';
import type {
  ApiGoal,
  BadgeDefinition,
  EarnedBadge,
  EarnedBadgeInfo,
  GoalsResponse,
  GoalStats,
  ProfileResponse,
  XpEventDto,
  XpEventsResponse,
} from '@/types';
import { apiRequest } from '@/utils/api';
import { formatCurrency } from '@/utils/helpers';

type GoalActionResponse = {
  goal: ApiGoal;
  xpEarned: number;
  justCompleted: boolean;
  xp?: number;
  level?: number;
  leveledUp?: boolean;
  milestonesHit?: number[];
  badgesEarned?: EarnedBadgeInfo[];
  goalStats?: GoalStats;
  streakIncreased?: boolean;
};

// Kept in sync with the spending-category vocabulary used on the Insights screen
// (shopping / food / home / travel / transport / bills / entertainment) so a goal
// and its matching spending category read as the same visual language, plus the
// classic life-goal emojis (savings target, education, wedding, gift, health).
const EMOJI_OPTIONS = ['🎯', '🛍️', '🍽️', '🏠', '✈️', '🚗', '⚡', '🎬', '💻', '🎓', '💍', '🏖️', '🩺', '🎁'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const QUICK_DEADLINES = [
  { label: '1 month', months: 1 },
  { label: '3 months', months: 3 },
  { label: '6 months', months: 6 },
  { label: '1 year', months: 12 },
];

// Parses a "YYYY-MM-DD" deadline as a *local* calendar date. Deliberately
// avoids `new Date(string)` here — that parses date-only strings as UTC
// midnight, which then renders as the previous day in any timezone ahead of
// UTC (e.g. IST) once you read back getFullYear/getMonth/getDate.
function parseDeadline(deadline: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(deadline);
  if (match) {
    const [, y, m, d] = match;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(deadline);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysUntil(deadline: string): number | null {
  const date = parseDeadline(deadline);
  if (!date) return null;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((date.getTime() - startOfToday.getTime()) / 86400000);
}

// Formats Y/M/D straight into "YYYY-MM-DD" with no Date/UTC round-trip, so
// the date you picked is exactly the date that gets saved.
function toIsoDate(year: number, month: number, day: number): string {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const clampedDay = Math.min(day, daysInMonth);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function formatDeadlineLabel(deadline: string): string {
  const date = parseDeadline(deadline);
  if (!date) return 'Select a date';
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function GoalsScreen() {
  const { getToken, isSignedIn } = useAuth();
  const [goals, setGoals] = useState<ApiGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [createVisible, setCreateVisible] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const today = useMemo(() => new Date(), []);
  const [pickerYear, setPickerYear] = useState(today.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(today.getMonth());
  const [pickerDay, setPickerDay] = useState(today.getDate());

  const [contributeGoal, setContributeGoal] = useState<ApiGoal | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [contributing, setContributing] = useState(false);
  const [contributeError, setContributeError] = useState('');

  const [userXp, setUserXp] = useState(0);
  const [reward, setReward] = useState<GoalRewardInfo | null>(null);

  const [goalStats, setGoalStats] = useState<GoalStats>({ contributionStreak: 0, bestContributionStreak: 0 });
  const [badges, setBadges] = useState<EarnedBadge[]>([]);
  const [badgeCatalog, setBadgeCatalog] = useState<BadgeDefinition[]>([]);

  const [historyVisible, setHistoryVisible] = useState(false);
  const [xpEvents, setXpEvents] = useState<XpEventDto[]>([]);
  const [xpEventsLoading, setXpEventsLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ApiGoal | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast, showToast, dismissToast } = useToast();

  const fetchGoals = useCallback(async () => {
    if (!isSignedIn) {
      setGoals([]);
      return;
    }
    try {
      const token = await getToken();
      if (!token) return;
      const [goalsResponse, profileResponse] = await Promise.all([
        apiRequest<GoalsResponse>('/api/goals', {}, token),
        apiRequest<ProfileResponse>('/api/profile', {}, token),
      ]);
      setGoals(goalsResponse?.goals ?? []);
      setUserXp(profileResponse?.user?.xp ?? 0);
      setGoalStats(goalsResponse?.goalStats ?? { contributionStreak: 0, bestContributionStreak: 0 });
      setBadges(goalsResponse?.badges ?? []);
      setBadgeCatalog(goalsResponse?.badgeCatalog ?? []);
      setLoadError('');
    } catch (error) {
      console.warn('Failed to load goals:', error);
      setLoadError('Could not load your goals. Check your connection and try again.');
    }
  }, [getToken, isSignedIn]);

  const openHistory = async () => {
    setHistoryVisible(true);
    setXpEventsLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const response = await apiRequest<XpEventsResponse>('/api/goals/xp-events', {}, token);
      setXpEvents(response?.events ?? []);
    } catch (error) {
      console.warn('Failed to load XP history:', error);
    } finally {
      setXpEventsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchGoals().finally(() => setLoading(false));
    }, [fetchGoals])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchGoals();
    setRefreshing(false);
  };

  const sortedGoals = useMemo(() => {
    return [...goals].sort((a, b) => {
      const aDone = a.targetAmount > 0 && a.currentAmount >= a.targetAmount;
      const bDone = b.targetAmount > 0 && b.currentAmount >= b.targetAmount;
      if (aDone !== bDone) return aDone ? 1 : -1;

      const aTime = parseDeadline(a.deadline)?.getTime() ?? Infinity;
      const bTime = parseDeadline(b.deadline)?.getTime() ?? Infinity;
      return aTime - bTime;
    });
  }, [goals]);

  const summary = useMemo(() => {
    const activeGoals = goals.filter((g) => !(g.targetAmount > 0 && g.currentAmount >= g.targetAmount));
    const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
    return { activeCount: activeGoals.length, totalSaved };
  }, [goals]);

  const resetForm = () => {
    setEditingGoalId(null);
    setTitle('');
    setTargetAmount('');
    setDeadline('');
    setEmoji(EMOJI_OPTIONS[0]);
    setFormError('');
  };

  const openCreate = () => {
    resetForm();
    setCreateVisible(true);
  };

  const openEdit = (goal: ApiGoal) => {
    setEditingGoalId(goal.id);
    setTitle(goal.title);
    setTargetAmount(String(goal.targetAmount));
    setDeadline(goal.deadline);
    setEmoji(goal.emoji || EMOJI_OPTIONS[0]);
    setFormError('');
    setCreateVisible(true);
  };

  const openDatePicker = () => {
    const existing = parseDeadline(deadline);
    const base = existing ?? today;
    setPickerYear(base.getFullYear());
    setPickerMonth(base.getMonth());
    setPickerDay(base.getDate());
    setDatePickerVisible(true);
  };

  const applyQuickDeadline = (months: number) => {
    const next = addMonths(today, months);
    setDeadline(toIsoDate(next.getFullYear(), next.getMonth(), next.getDate()));
  };

  const confirmCustomDate = () => {
    setDeadline(toIsoDate(pickerYear, pickerMonth, pickerDay));
    setDatePickerVisible(false);
  };

  const handleSaveGoal = async () => {
    const amount = Number(targetAmount);
    if (!title.trim()) {
      setFormError('Give your goal a name.');
      return;
    }
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      setFormError('Enter a target amount greater than 0.');
      return;
    }
    if (!deadline.trim() || !parseDeadline(deadline)) {
      setFormError('Choose a target date.');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const token = await getToken();
      if (!token) return;
      const payload = {
        title: title.trim(),
        targetAmount: amount,
        deadline: deadline.trim(),
        emoji,
      };

      const response = editingGoalId
        ? await apiRequest<GoalActionResponse>({ method: 'put', url: `/api/goals/${editingGoalId}`, token, data: payload })
        : await apiRequest<GoalActionResponse>({ method: 'post', url: '/api/goals', token, data: payload });

      setCreateVisible(false);
      resetForm();
      await fetchGoals();

      if (response?.xpEarned > 0) {
        setUserXp(response.xp ?? userXp);
        setReward({
          xpEarned: response.xpEarned,
          justCompleted: response.justCompleted,
          leveledUp: !!response.leveledUp,
          newLevel: response.level,
          goalTitle: response.goal?.title,
          milestonesHit: response.milestonesHit,
          badgesEarned: response.badgesEarned,
          contributionStreak: response.goalStats?.contributionStreak,
          streakIncreased: response.streakIncreased,
        });
      }
    } catch (error: any) {
      setFormError(error?.message || 'Something went wrong saving this goal.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGoal = (goal: ApiGoal) => {
    setDeleteTarget(goal);
  };

  const confirmDeleteGoal = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const token = await getToken();
      if (!token) return;
      await apiRequest({ method: 'delete', url: `/api/goals/${deleteTarget.id}`, token });
      await fetchGoals();
      setDeleteTarget(null);
      showToast({ title: 'Goal deleted', tone: 'info', duration: 2200 });
    } catch (error: any) {
      showToast({ title: 'Could not delete goal', message: error?.message, tone: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const openContribute = (goal: ApiGoal) => {
    setContributeGoal(goal);
    setContributeAmount('');
    setContributeError('');
  };

  const handleContribute = async () => {
    if (!contributeGoal) return;
    const amount = Number(contributeAmount);
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      setContributeError('Enter an amount greater than 0.');
      return;
    }

    setContributing(true);
    setContributeError('');
    try {
      const token = await getToken();
      if (!token) return;
      const nextAmount = Math.min(contributeGoal.targetAmount, contributeGoal.currentAmount + amount);
      const now = new Date();
      const contributionDate = toIsoDate(now.getFullYear(), now.getMonth(), now.getDate());
      const response = await apiRequest<GoalActionResponse>({
        method: 'put',
        url: `/api/goals/${contributeGoal.id}`,
        token,
        data: { currentAmount: nextAmount, contributionDate },
      });
      setContributeGoal(null);
      setContributeAmount('');
      await fetchGoals();

      if (response?.xpEarned > 0) {
        setUserXp(response.xp ?? userXp);
        setReward({
          xpEarned: response.xpEarned,
          justCompleted: response.justCompleted,
          leveledUp: !!response.leveledUp,
          newLevel: response.level,
          goalTitle: response.goal?.title,
          milestonesHit: response.milestonesHit,
          badgesEarned: response.badgesEarned,
          contributionStreak: response.goalStats?.contributionStreak,
          streakIncreased: response.streakIncreased,
        });
      }
    } catch (error: any) {
      setContributeError(error?.message || 'Failed to update goal.');
    } finally {
      setContributing(false);
    }
  };

  const daysInPickerMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();

  return (
    <ScreenContainer
      header={
        <View style={{ paddingHorizontal: layout.gutter }}>
          <Navbar />
        </View>
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.primaryDeep} />
      }
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <AppText variant="title" color="textPrimary" weight="bold">
            Your Goals
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {goals.length === 0
              ? 'Save toward what matters, one goal at a time.'
              : `${summary.activeCount} active • ${formatCurrency(summary.totalSaved)} saved so far`}
          </AppText>
        </View>
        <Button variant="primary" size="sm" fullWidth={false} onPress={openCreate}>
          + New Goal
        </Button>
      </View>

      <XpBar xp={userXp} contributionStreak={goalStats.contributionStreak} onPressHistory={openHistory} />

      <BadgesRow earned={badges} catalog={badgeCatalog} />

      {loading && goals.length === 0 ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={palette.primaryDeep} />
        </View>
      ) : loadError && goals.length === 0 ? (
        <EmptyState
          icon="CircleAlert"
          title="Couldn't load goals"
          subtitle={loadError}
          actionLabel="Try again"
          onAction={fetchGoals}
        />
      ) : goals.length === 0 ? (
        <EmptyState
          icon="Target"
          title="No goals yet"
          subtitle="Create your first savings goal to start tracking progress toward it."
          actionLabel="Create a goal"
          onAction={openCreate}
        />
      ) : (
        sortedGoals.map((goal) => {
          const progress = goal.targetAmount > 0 ? Math.min(1, goal.currentAmount / goal.targetAmount) : 0;
          const pct = Math.round(progress * 100);
          const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
          const daysLeft = daysUntil(goal.deadline);
          const isComplete = goal.targetAmount > 0 && goal.currentAmount >= goal.targetAmount;
          const isOverdue = daysLeft !== null && daysLeft < 0 && !isComplete;

          return (
            <Card key={goal.id} variant="elevated" padding={16} style={styles.goalCard}>
              <Pressable style={styles.goalTopRow} onPress={() => openEdit(goal)} hitSlop={4}>
                <View style={styles.emojiBadge}>
                  <AppText style={{ fontSize: 22 }}>{goal.emoji || '🎯'}</AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodySm" color="textPrimary" weight="bold">
                    {goal.title}
                  </AppText>
                  <AppText variant="micro" color={isOverdue ? 'danger' : 'textSecondary'}>
                    {isComplete
                      ? 'Goal reached! 🎉'
                      : daysLeft === null
                        ? 'No deadline set'
                        : isOverdue
                          ? `Overdue by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'}`
                          : daysLeft === 0
                            ? 'Due today'
                            : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}
                  </AppText>
                </View>
                <ProgressRing progress={progress} size={54} strokeWidth={6} color={isComplete ? palette.success : palette.primary}>
                  <AppText variant="micro" color="textPrimary" weight="bold">
                    {pct}%
                  </AppText>
                </ProgressRing>
              </Pressable>

              <View style={styles.amountsRow}>
                <AppText variant="bodySm" color="textPrimary" weight="bold">
                  {formatCurrency(goal.currentAmount)}
                </AppText>
                <AppText variant="caption" color="textSecondary">
                  {' '}of {formatCurrency(goal.targetAmount)}
                </AppText>
              </View>

              {!isComplete && (
                <AppText variant="micro" color="textSecondary">
                  {formatCurrency(remaining)} to go
                </AppText>
              )}

              <View style={styles.goalActions}>
                {!isComplete && (
                  <Pressable style={styles.addFundsBtn} onPress={() => openContribute(goal)}>
                    <Icon name="Plus" size={14} color={palette.primaryDeep} />
                    <AppText variant="micro" color="primaryDeep" weight="bold">
                      Add funds
                    </AppText>
                  </Pressable>
                )}
                <Pressable style={styles.editBtn} onPress={() => openEdit(goal)}>
                  <Icon name="Settings" size={14} color={palette.textSecondary} />
                </Pressable>
                <Pressable style={styles.deleteBtn} onPress={() => handleDeleteGoal(goal)}>
                  <Icon name="Trash" size={14} color={palette.danger} />
                </Pressable>
              </View>
            </Card>
          );
        })
      )}

      {/* Create / edit goal modal */}
      <Modal visible={createVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <AppText variant="title" color="textPrimary" weight="bold" style={{ marginBottom: spacing.md }}>
              {editingGoalId ? 'Edit Goal' : 'New Goal'}
            </AppText>

            <Input label="Title" placeholder="e.g. Goa trip" value={title} onChangeText={setTitle} />
            <Input
              label="Target amount"
              placeholder="e.g. 25000"
              keyboardType="numeric"
              value={targetAmount}
              onChangeText={setTargetAmount}
              containerStyle={{ marginTop: spacing.md }}
            />

            <AppText variant="caption" color="textSecondary" style={{ marginTop: spacing.md, marginBottom: 6 }}>
              Deadline
            </AppText>
            <Pressable style={styles.deadlineField} onPress={openDatePicker}>
              <Icon name="CalendarDays" size={16} color={palette.textSecondary} />
              <AppText variant="bodySm" color={deadline ? 'textPrimary' : 'textTertiary'} style={{ flex: 1, marginLeft: 8 }}>
                {formatDeadlineLabel(deadline)}
              </AppText>
              <Icon name="ChevronRight" size={16} color={palette.textTertiary} />
            </Pressable>

            <AppText variant="caption" color="textSecondary" style={{ marginTop: spacing.md, marginBottom: 6 }}>
              Emoji
            </AppText>
            <View style={styles.emojiRow}>
              {EMOJI_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setEmoji(option)}
                  style={[styles.emojiOption, emoji === option && styles.emojiOptionActive]}
                >
                  <AppText style={{ fontSize: 20 }}>{option}</AppText>
                </Pressable>
              ))}
            </View>

            {!!formError && (
              <AppText variant="caption" color="danger" style={{ marginTop: spacing.sm }}>
                {formError}
              </AppText>
            )}

            <View style={styles.modalActions}>
              <Button
                variant="outline"
                size="md"
                onPress={() => {
                  setCreateVisible(false);
                  resetForm();
                }}
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button variant="primary" size="md" onPress={handleSaveGoal} disabled={saving} style={{ flex: 1 }}>
                {saving ? <ActivityIndicator color="#fff" /> : editingGoalId ? 'Save' : 'Create'}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date picker modal */}
      <Modal visible={datePickerVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <AppText variant="title" color="textPrimary" weight="bold" style={{ marginBottom: spacing.md }}>
              Choose a date
            </AppText>

            <View style={styles.quickRow}>
              {QUICK_DEADLINES.map((option) => (
                <Pressable key={option.label} style={styles.quickChip} onPress={() => applyQuickDeadline(option.months)}>
                  <AppText variant="caption" color="primaryDeep" weight="bold">
                    {option.label}
                  </AppText>
                </Pressable>
              ))}
            </View>

            <AppText variant="caption" color="textSecondary" style={{ marginTop: spacing.md, marginBottom: 6 }}>
              Or pick an exact date
            </AppText>

            <AppText variant="micro" color="textTertiary">
              Year
            </AppText>
            <View style={styles.pickerRow}>
              {[0, 1, 2, 3, 4].map((offset) => {
                const year = today.getFullYear() + offset;
                return (
                  <Pressable
                    key={year}
                    onPress={() => setPickerYear(year)}
                    style={[styles.pickerChip, pickerYear === year && styles.pickerChipActive]}
                  >
                    <AppText variant="caption" color={pickerYear === year ? 'onDark' : 'textPrimary'}>
                      {year}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <AppText variant="micro" color="textTertiary" style={{ marginTop: spacing.sm }}>
              Month
            </AppText>
            <View style={styles.pickerRow}>
              {MONTH_SHORT.map((label, index) => (
                <Pressable
                  key={label}
                  onPress={() => setPickerMonth(index)}
                  style={[styles.pickerChip, pickerMonth === index && styles.pickerChipActive]}
                >
                  <AppText variant="caption" color={pickerMonth === index ? 'onDark' : 'textPrimary'}>
                    {label}
                  </AppText>
                </Pressable>
              ))}
            </View>

            <AppText variant="micro" color="textTertiary" style={{ marginTop: spacing.sm }}>
              Day
            </AppText>
            <ScrollView style={styles.dayScroll} contentContainerStyle={styles.pickerRow}>
              {Array.from({ length: daysInPickerMonth }, (_, i) => i + 1).map((day) => (
                <Pressable
                  key={day}
                  onPress={() => setPickerDay(day)}
                  style={[styles.dayChip, pickerDay === day && styles.pickerChipActive]}
                >
                  <AppText variant="caption" color={pickerDay === day ? 'onDark' : 'textPrimary'}>
                    {day}
                  </AppText>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button variant="outline" size="md" onPress={() => setDatePickerVisible(false)} style={{ flex: 1 }}>
                Cancel
              </Button>
              <Button variant="primary" size="md" onPress={confirmCustomDate} style={{ flex: 1 }}>
                Use this date
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Contribute modal */}
      <Modal visible={!!contributeGoal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <AppText variant="title" color="textPrimary" weight="bold" style={{ marginBottom: spacing.sm }}>
              Add funds
            </AppText>
            <AppText variant="caption" color="textSecondary" style={{ marginBottom: spacing.md }}>
              {contributeGoal?.title} • {formatCurrency(Math.max(0, (contributeGoal?.targetAmount ?? 0) - (contributeGoal?.currentAmount ?? 0)))} left to reach the goal
            </AppText>
            <Input
              label="Amount"
              placeholder="e.g. 1000"
              keyboardType="numeric"
              value={contributeAmount}
              onChangeText={setContributeAmount}
            />
            {!!contributeError && (
              <AppText variant="caption" color="danger" style={{ marginTop: spacing.sm }}>
                {contributeError}
              </AppText>
            )}
            <View style={styles.modalActions}>
              <Button variant="outline" size="md" onPress={() => setContributeGoal(null)} style={{ flex: 1 }}>
                Cancel
              </Button>
              <Button variant="primary" size="md" onPress={handleContribute} disabled={contributing} style={{ flex: 1 }}>
                {contributing ? <ActivityIndicator color="#fff" /> : 'Add'}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <GoalRewardModal reward={reward} onDismiss={() => setReward(null)} />

      <XpHistoryModal
        visible={historyVisible}
        events={xpEvents}
        loading={xpEventsLoading}
        onClose={() => setHistoryVisible(false)}
      />

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Delete goal"
        message={`Delete "${deleteTarget?.title}"? This can't be undone.`}
        confirmText="Delete"
        destructive
        loading={deleting}
        onConfirm={confirmDeleteGoal}
        onCancel={() => setDeleteTarget(null)}
      />

      <Toast toast={toast} onDismiss={dismissToast} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  centerBox: { paddingVertical: spacing.xxxl, alignItems: 'center' },
  goalCard: { marginBottom: spacing.md, borderRadius: radius.lg },
  goalTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emojiBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountsRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.md },
  goalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.divider,
  },
  addFundsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    marginRight: 'auto',
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(235,90,79,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: palette.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '88%',
  },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiOption: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  emojiOptionActive: { borderColor: palette.primary, backgroundColor: palette.primaryLight },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  deadlineField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: palette.border,
    backgroundColor: palette.card,
  },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryLight,
  },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  pickerChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  pickerChipActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  dayScroll: { maxHeight: 130 },
  dayChip: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.border,
  },
});
