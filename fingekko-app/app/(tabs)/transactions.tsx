import { useAuth } from '@clerk/clerk-expo';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Navbar from '../../components/Navbar';
import ConfirmDialog from '../../components/ConfirmDialog';
import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Icon from '../../components/ui/Icon';
import PressableScale from '../../components/ui/PressableScale';
import ScreenContainer from '../../components/ui/ScreenContainer';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../constants/categories';
import { layout, palette, radius, shadows, spacing } from '../../constants/design';
import type { ApiTransaction, TransactionsResponse } from '../../types';
import { useAppEvent } from '../../hooks/use-app-event';
import { emitAppEvent } from '../../lib/appEvents';
import { apiRequest } from '../../utils/api';
import { formatMoney } from '../../utils/currency';

// Icon + colour for a category label, so each row reads at a glance. Falls back
// to a neutral tag when a label doesn't match a known category.
const CATEGORY_META = new Map(
  [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => [c.label, { lucide: c.lucide, color: c.color }]),
);

// Sign-aware, in the user's profile currency (AUDIT item 17).
const inr = (n: number) => formatMoney(n);

function formatDateLabel(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value ?? '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TransactionsScreen() {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<ApiTransaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!isSignedIn) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      const res = await apiRequest<TransactionsResponse>('/api/transactions', {}, token);
      setTransactions(res?.transactions ?? []);
    } catch {
      setError('Could not load your transactions. Pull to retry.');
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useAppEvent('transaction:changed', () => {
    load();
  });

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setDeleting(true);
    setError('');

    // Optimistic: drop it from the list immediately, restore if the call fails.
    const previous = transactions;
    setTransactions((current) => current.filter((t) => t.id !== target.id));

    try {
      const token = await getTokenRef.current();
      if (!token) throw new Error('Not signed in');
      await apiRequest({ method: 'delete', url: `/api/transactions/${target.id}`, token });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // Everything showing money (Home, Insights, Safe-to-Spend) re-reads now.
      emitAppEvent('transaction:changed', { type: target.type, date: target.date, amount: target.amount });
      setPendingDelete(null);
    } catch (e: any) {
      setTransactions(previous);
      setError(e?.message || 'Could not delete this transaction. Try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const startEdit = (t: ApiTransaction) => {
    Haptics.selectionAsync().catch(() => {});
    router.push({
      pathname: '/(tabs)/add',
      params: {
        editId: t.id,
        editType: t.type,
        editAmount: String(t.amount),
        editCategory: t.category,
        editDate: t.date,
      },
    });
  };

  return (
    <ScreenContainer
      contentStyle={{ gap: spacing.md }}
      header={
        <View style={{ paddingHorizontal: layout.gutter }}>
          <Navbar />
        </View>
      }
    >
      <View style={styles.topBar}>
        <PressableScale style={styles.iconButton} onPress={() => router.back()} accessibilityLabel="Go back">
          <Icon name="ChevronLeft" size={20} color={palette.textPrimary} />
        </PressableScale>
        <AppText variant="title" color="textPrimary" weight="bold">
          Your transactions
        </AppText>
        <View style={styles.iconPlaceholder} />
      </View>

      {error ? (
        <AppText variant="caption" weight="bold" style={{ color: palette.danger }}>
          {error}
        </AppText>
      ) : null}

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={palette.primaryDeep} />
        </View>
      ) : transactions.length === 0 ? (
        <EmptyState
          icon="ReceiptText"
          title="No transactions yet"
          subtitle="Anything you log will show up here, where you can edit or delete it."
          actionLabel="Add one"
          onAction={() => router.push('/(tabs)/add')}
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {transactions.map((t) => {
            const meta = CATEGORY_META.get(t.category);
            const isIncome = t.type === 'income';
            return (
              <Card key={t.id} variant="elevated" padding={14} style={styles.row}>
                <View
                  style={[
                    styles.rowIcon,
                    { backgroundColor: (meta?.color ?? palette.textTertiary) + '22' },
                  ]}
                >
                  <Icon
                    name={meta?.lucide ?? (isIncome ? 'ArrowDownLeft' : 'ReceiptText')}
                    size={20}
                    color={meta?.color ?? palette.textSecondary}
                    clickable={false}
                  />
                </View>

                <View style={styles.rowBody}>
                  <View style={styles.rowTitleLine}>
                    <AppText variant="bodySm" color="textPrimary" weight="bold" numberOfLines={1}>
                      {t.category}
                    </AppText>
                    {t.isSplit ? (
                      <View style={styles.splitTag}>
                        <Icon name="Users" size={10} color={palette.textSecondary} clickable={false} />
                        <AppText variant="micro" color="textSecondary">
                          Shared
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                  <AppText variant="micro" color="textSecondary">
                    {formatDateLabel(t.date)}
                  </AppText>
                </View>

                <AppText
                  numeric
                  variant="bodySm"
                  weight="bold"
                  color={isIncome ? 'success' : 'textPrimary'}
                  style={styles.rowAmount}
                >
                  {isIncome ? '+' : ''}{inr(t.amount)}
                </AppText>

                {t.isSplit ? (
                  // Shared rows are owned by the split — no edit/delete here.
                  <View style={styles.actionPlaceholder} />
                ) : (
                  <View style={styles.rowActions}>
                    <PressableScale
                      style={styles.actionButton}
                      onPress={() => startEdit(t)}
                      accessibilityLabel={`Edit ${t.category}`}
                    >
                      <Icon name="Pencil" size={16} color={palette.textSecondary} clickable={false} />
                    </PressableScale>
                    <PressableScale
                      style={styles.actionButton}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setPendingDelete(t);
                      }}
                      accessibilityLabel={`Delete ${t.category}`}
                    >
                      <Icon name="Trash2" size={16} color={palette.danger} clickable={false} />
                    </PressableScale>
                  </View>
                )}
              </Card>
            );
          })}
        </View>
      )}

      <ConfirmDialog
        visible={!!pendingDelete}
        title="Delete this transaction?"
        message={
          pendingDelete
            ? `${pendingDelete.category} • ${inr(pendingDelete.amount)} on ${formatDateLabel(pendingDelete.date)} will be removed. This can't be undone.`
            : ''
        }
        confirmText="Delete"
        cancelText="Keep it"
        destructive
        loading={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
  iconPlaceholder: { width: 38, height: 38 },
  loadingWrap: { paddingVertical: spacing.xxxl, alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  splitTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: palette.track,
  },
  rowAmount: { marginLeft: spacing.xs },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPlaceholder: { width: 8 },
});
