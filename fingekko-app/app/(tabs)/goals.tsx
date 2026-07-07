import { useAuth } from '@clerk/clerk-expo';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Navbar from '@/components/Navbar';
import AppText from '@/components/ui/AppText';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import Input from '@/components/ui/Input';
import ProgressRing from '@/components/ui/ProgressRing';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { layout, palette, radius, spacing } from '@/constants/design';
import type { ApiGoal, GoalsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { formatCurrency } from '@/utils/helpers';

const EMOJI_OPTIONS = ['🎯', '✈️', '🏠', '🚗', '💻', '🎓', '💍', '🏖️', '🩺', '🎁'];

function parseDeadline(deadline: string): Date | null {
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

export default function GoalsScreen() {
  const { getToken, isSignedIn } = useAuth();
  const [goals, setGoals] = useState<ApiGoal[]>([]);
  const [loading, setLoading] = useState(false);

  const [createVisible, setCreateVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);
  const [saving, setSaving] = useState(false);

  const [contributeGoal, setContributeGoal] = useState<ApiGoal | null>(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [contributing, setContributing] = useState(false);

  const fetchGoals = useCallback(async () => {
    if (!isSignedIn) {
      setGoals([]);
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const response = await apiRequest<GoalsResponse>('/api/goals', {}, token);
      setGoals(response?.goals ?? []);
    } catch (error) {
      console.warn('Failed to load goals:', error);
    } finally {
      setLoading(false);
    }
  }, [getToken, isSignedIn]);

  useFocusEffect(
    useCallback(() => {
      fetchGoals();
    }, [fetchGoals])
  );

  const resetCreateForm = () => {
    setTitle('');
    setTargetAmount('');
    setDeadline('');
    setEmoji(EMOJI_OPTIONS[0]);
  };

  const handleCreateGoal = async () => {
    const amount = Number(targetAmount);
    if (!title.trim()) {
      Alert.alert('Missing title', 'Give your goal a name.');
      return;
    }
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter a target amount greater than 0.');
      return;
    }
    if (!deadline.trim()) {
      Alert.alert('Missing deadline', 'Enter a target date (YYYY-MM-DD).');
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      if (!token) return;
      await apiRequest({
        method: 'post',
        url: '/api/goals',
        token,
        data: {
          title: title.trim(),
          targetAmount: amount,
          deadline: deadline.trim(),
          emoji,
        },
      });
      setCreateVisible(false);
      resetCreateForm();
      await fetchGoals();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create goal.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGoal = (goal: ApiGoal) => {
    Alert.alert('Delete goal', `Delete "${goal.title}"? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await getToken();
            if (!token) return;
            await apiRequest({ method: 'delete', url: `/api/goals/${goal.id}`, token });
            await fetchGoals();
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to delete goal.');
          }
        },
      },
    ]);
  };

  const openContribute = (goal: ApiGoal) => {
    setContributeGoal(goal);
    setContributeAmount('');
  };

  const handleContribute = async () => {
    if (!contributeGoal) return;
    const amount = Number(contributeAmount);
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter an amount greater than 0.');
      return;
    }

    setContributing(true);
    try {
      const token = await getToken();
      if (!token) return;
      const nextAmount = Math.min(contributeGoal.targetAmount, contributeGoal.currentAmount + amount);
      await apiRequest({
        method: 'put',
        url: `/api/goals/${contributeGoal.id}`,
        token,
        data: { currentAmount: nextAmount },
      });
      setContributeGoal(null);
      setContributeAmount('');
      await fetchGoals();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update goal.');
    } finally {
      setContributing(false);
    }
  };

  return (
    <ScreenContainer
      header={
        <View style={{ paddingHorizontal: layout.gutter }}>
          <Navbar />
        </View>
      }
    >
      <View style={styles.headerRow}>
        <View>
          <AppText variant="title" color="textPrimary" weight="bold">
            Your Goals
          </AppText>
          <AppText variant="caption" color="textSecondary">
            Save toward what matters, one goal at a time.
          </AppText>
        </View>
        <Button variant="primary" size="sm" fullWidth={false} onPress={() => setCreateVisible(true)}>
          + New Goal
        </Button>
      </View>

      {loading && goals.length === 0 ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={palette.primaryDeep} />
        </View>
      ) : goals.length === 0 ? (
        <EmptyState
          icon="Target"
          title="No goals yet"
          subtitle="Create your first savings goal to start tracking progress toward it."
          actionLabel="Create a goal"
          onAction={() => setCreateVisible(true)}
        />
      ) : (
        goals.map((goal) => {
          const progress = goal.targetAmount > 0 ? Math.min(1, goal.currentAmount / goal.targetAmount) : 0;
          const pct = Math.round(progress * 100);
          const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
          const daysLeft = daysUntil(goal.deadline);
          const isComplete = goal.currentAmount >= goal.targetAmount && goal.targetAmount > 0;
          const isOverdue = daysLeft !== null && daysLeft < 0 && !isComplete;

          return (
            <Card key={goal.id} variant="elevated" padding={16} style={styles.goalCard}>
              <View style={styles.goalTopRow}>
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
              </View>

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
                <Pressable style={styles.addFundsBtn} onPress={() => openContribute(goal)}>
                  <Icon name="Plus" size={14} color={palette.primaryDeep} />
                  <AppText variant="micro" color="primaryDeep" weight="bold">
                    Add funds
                  </AppText>
                </Pressable>
                <Pressable style={styles.deleteBtn} onPress={() => handleDeleteGoal(goal)}>
                  <Icon name="Trash" size={14} color={palette.danger} />
                </Pressable>
              </View>
            </Card>
          );
        })
      )}

      {/* Create goal modal */}
      <Modal visible={createVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <AppText variant="title" color="textPrimary" weight="bold" style={{ marginBottom: spacing.md }}>
              New Goal
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
            <Input
              label="Deadline"
              placeholder="YYYY-MM-DD"
              value={deadline}
              onChangeText={setDeadline}
              containerStyle={{ marginTop: spacing.md }}
            />

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

            <View style={styles.modalActions}>
              <Button
                variant="outline"
                size="md"
                onPress={() => {
                  setCreateVisible(false);
                  resetCreateForm();
                }}
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button variant="primary" size="md" onPress={handleCreateGoal} disabled={saving} style={{ flex: 1 }}>
                {saving ? <ActivityIndicator color="#fff" /> : 'Create'}
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
              {contributeGoal?.title}
            </AppText>
            <Input
              label="Amount"
              placeholder="e.g. 1000"
              keyboardType="numeric"
              value={contributeAmount}
              onChangeText={setContributeAmount}
            />
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
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
    justifyContent: 'space-between',
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
});
