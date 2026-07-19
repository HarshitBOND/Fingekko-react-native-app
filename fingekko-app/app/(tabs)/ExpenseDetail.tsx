import { useAuth } from '@clerk/clerk-expo';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import AppText from '../../components/ui/AppText';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ConfirmDialog from '../../components/ConfirmDialog';
import Icon from '../../components/ui/Icon';
import ScreenContainer from '../../components/ui/ScreenContainer';
import Toast from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import { apiRequest } from '../../utils/api';
import { layout, palette, radius, spacing } from '../../constants/design';

type Party = { id: string; name: string; email: string } | null;

type HistoryEntry = {
  action: 'CREATED' | 'UPDATED' | 'SETTLED' | 'DELETED';
  note: string;
  performedBy: Party;
  performedAt: string | null;
};

type ExpenseDetail = {
  id: string;
  groupId: string | null;
  groupName: string | null;
  description: string;
  amount: number;
  currency: string;
  category: string;
  notes: string;
  expenseDate: string | null;
  createdBy: Party;
  paidBy: { userId: Party; amount: number }[];
  participants: { userId: Party; amount: number; settled: boolean }[];
  netBalance: number;
  isDeleted: boolean;
  deletedBy: Party;
  deletedAt: string | null;
  purgeInDays: number | null;
  history: HistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

const inr = (n: number) => `₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

const formatDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const ACTION_META: Record<HistoryEntry['action'], { label: string; icon: string; color: string }> = {
  CREATED: { label: 'Created', icon: 'Plus', color: palette.primaryDeep },
  UPDATED: { label: 'Edited', icon: 'Pencil', color: palette.info },
  SETTLED: { label: 'Settled', icon: 'Check', color: palette.success },
  DELETED: { label: 'Deleted', icon: 'Trash2', color: palette.danger },
};

export default function ExpenseDetailScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { expenseId } = useLocalSearchParams<{ expenseId: string }>();

  const [expense, setExpense] = useState<ExpenseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast, showToast, dismissToast } = useToast();

  const fetchExpense = useCallback(async () => {
    if (!expenseId) return;
    try {
      const token = await getToken();
      if (!token) return;
      const res = await apiRequest<{ expense: ExpenseDetail }>({
        method: 'get',
        url: `/api/expenses/${expenseId}`,
        token,
      });
      setExpense(res.expense);
    } catch (err) {
      console.warn('Error loading expense detail:', err);
    } finally {
      setLoading(false);
    }
  }, [expenseId, getToken]);

  useFocusEffect(
    useCallback(() => {
      fetchExpense();
    }, [fetchExpense])
  );

  const confirmDelete = async () => {
    if (!expense) return;
    setDeleting(true);
    try {
      const token = await getToken();
      if (!token) return;
      await apiRequest({ method: 'delete', url: `/api/expenses/${expense.id}`, token });
      setDeleteConfirm(false);
      showToast({ title: 'Expense deleted', message: 'It stays as a record for 30 days.', tone: 'info', duration: 2200 });
      fetchExpense();
    } catch (err: any) {
      showToast({ title: 'Could not delete', message: err.message || 'Please try again.', tone: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const header = (
    <View style={styles.header}>
      <Pressable style={styles.headerButton} onPress={() => router.back()} hitSlop={6}>
        <Icon name="ChevronLeft" size={22} color={palette.textPrimary} clickable={false} />
      </Pressable>
      <AppText variant="title" weight="bold">Expense details</AppText>
      <View style={styles.headerButton} />
    </View>
  );

  if (loading) {
    return (
      <ScreenContainer header={header} scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={palette.primaryDeep} />
        </View>
      </ScreenContainer>
    );
  }

  if (!expense) {
    return (
      <ScreenContainer header={header} scroll={false}>
        <View style={styles.center}>
          <AppText variant="bodySm" color="textSecondary">This expense could not be found.</AppText>
        </View>
      </ScreenContainer>
    );
  }

  const deleted = expense.isDeleted;
  const net = expense.netBalance ?? 0;
  const netColor = net < 0 ? palette.danger : net > 0 ? palette.success : palette.textSecondary;
  const netLabel = deleted ? 'No longer counts' : net > 0 ? 'You are owed' : net < 0 ? 'You owe' : 'Settled';
  const payerName = expense.paidBy?.[0]?.userId?.name ?? 'Someone';

  return (
    <>
      <Toast toast={toast} onDismiss={dismissToast} />
      <ScreenContainer header={header}>
        {/* Deleted / numb banner */}
        {deleted && (
          <View style={styles.deletedBanner}>
            <Icon name="TriangleAlert" size={18} color={palette.danger} clickable={false} />
            <View style={{ flex: 1 }}>
              <AppText variant="label" color="danger">
                Deleted by {expense.deletedBy?.name ?? 'a member'}
              </AppText>
              <AppText variant="caption" color="textSecondary">
                {formatDateTime(expense.deletedAt)} · This is now a frozen record.
                {expense.purgeInDays != null &&
                  ` It will be permanently removed in ${expense.purgeInDays} day${expense.purgeInDays === 1 ? '' : 's'}.`}
              </AppText>
            </View>
          </View>
        )}

        {/* Hero */}
        <Card variant="elevated" padding={20} style={[styles.heroCard, deleted && styles.numb]}>
          <AppText variant="h2" weight="bold" numberOfLines={2}>{expense.description}</AppText>
          <AppText variant="hero" weight="bold" style={{ marginTop: spacing.xs }}>{inr(expense.amount)}</AppText>
          <View style={styles.metaRow}>
            {!!expense.category && (
              <View style={styles.tag}>
                <AppText variant="micro" color="textSecondary" weight="bold">{expense.category}</AppText>
              </View>
            )}
            <AppText variant="caption" color="textSecondary">{formatDate(expense.expenseDate)}</AppText>
          </View>
          <View style={styles.netRow}>
            <AppText variant="caption" color="textSecondary" weight="bold">{netLabel}</AppText>
            {!deleted && net !== 0 && (
              <AppText variant="title" weight="bold" style={{ color: netColor }}>{inr(net)}</AppText>
            )}
          </View>
        </Card>

        {/* Who paid / who owes */}
        <AppText variant="label" style={styles.sectionHeader}>Paid by</AppText>
        <Card variant="flat" padding={16} style={deleted && styles.numb}>
          <AppText variant="bodySm" weight="bold">{payerName} paid {inr(expense.amount)}</AppText>
        </Card>

        <AppText variant="label" style={styles.sectionHeader}>Split breakdown</AppText>
        <Card variant="flat" padding={0} style={deleted && styles.numb}>
          {expense.participants.map((p, i) => (
            <View
              key={(p.userId?.id ?? '') + i}
              style={[styles.breakdownRow, i !== expense.participants.length - 1 && styles.rowDivider]}
            >
              <AppText variant="bodySm" numberOfLines={1} style={{ flex: 1 }}>
                {p.userId?.name ?? 'Unknown'}
              </AppText>
              {p.settled && (
                <View style={styles.settledPill}>
                  <AppText variant="micro" color="success" weight="bold">SETTLED</AppText>
                </View>
              )}
              <AppText variant="bodySm" weight="bold">{inr(p.amount)}</AppText>
            </View>
          ))}
        </Card>

        {!!expense.notes && (
          <>
            <AppText variant="label" style={styles.sectionHeader}>Note</AppText>
            <Card variant="flat" padding={16} style={deleted && styles.numb}>
              <AppText variant="bodySm" color="textSecondary">📝 {expense.notes}</AppText>
            </Card>
          </>
        )}

        {/* Audit trail */}
        <AppText variant="label" style={styles.sectionHeader}>Activity</AppText>
        <Card variant="flat" padding={16}>
          {expense.history.length === 0 ? (
            <AppText variant="caption" color="textSecondary">No activity recorded.</AppText>
          ) : (
            [...expense.history].reverse().map((h, i) => {
              const meta = ACTION_META[h.action] ?? ACTION_META.UPDATED;
              return (
                <View key={i} style={[styles.timelineRow, i !== 0 && { marginTop: spacing.md }]}>
                  <View style={[styles.timelineDot, { backgroundColor: meta.color }]}>
                    <Icon name={meta.icon} size={12} color={palette.white} clickable={false} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodySm" weight="bold">
                      {meta.label}
                      {h.performedBy?.name ? ` · ${h.performedBy.name}` : ''}
                    </AppText>
                    {!!h.note && (
                      <AppText variant="caption" color="textSecondary">{h.note}</AppText>
                    )}
                    <AppText variant="micro" color="textTertiary">{formatDateTime(h.performedAt)}</AppText>
                  </View>
                </View>
              );
            })
          )}
        </Card>

        {/* Actions — hidden once numb */}
        {deleted ? (
          <AppText variant="caption" color="textTertiary" align="center" style={{ marginTop: spacing.lg }}>
            A deleted expense can no longer be edited or settled.
          </AppText>
        ) : (
          <View style={styles.actions}>
            {/* Editing routes through the personal composer, which is
                friend-based — so it's only offered for personal splits. Group
                expenses can still be deleted. */}
            {!expense.groupId && (
              <Button
                variant="secondary"
                size="md"
                style={{ flex: 1 }}
                onPress={() =>
                  router.push({ pathname: '/(tabs)/AddNewExpense', params: { expenseId: expense.id } })
                }
              >
                Edit
              </Button>
            )}
            <Button variant="danger" size="md" style={{ flex: 1 }} onPress={() => setDeleteConfirm(true)}>
              Delete
            </Button>
          </View>
        )}
      </ScreenContainer>

      <ConfirmDialog
        visible={deleteConfirm}
        title="Delete expense"
        message="This expense will be greyed out as a record and permanently removed after 30 days. Everyone in the split will be notified."
        confirmText="Delete"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingVertical: spacing.md,
    backgroundColor: palette.card,
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
  },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },

  deletedBanner: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: palette.dangerLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  numb: { opacity: 0.55 },

  heroCard: { gap: spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  tag: {
    backgroundColor: palette.primaryLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  netRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.divider,
  },

  sectionHeader: { marginTop: spacing.lg, marginBottom: spacing.sm },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: palette.divider },
  settledPill: {
    backgroundColor: palette.successLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },

  timelineRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },

  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
});
