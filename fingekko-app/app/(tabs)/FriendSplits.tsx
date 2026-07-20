import { useAuth } from '@clerk/clerk-expo';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiRequest } from '../../utils/api';
import { paidAmount, pairwiseBalance, pairwiseSettleTargets, roundMoney } from '../../utils/splitMath';
import { Ionicons } from '@expo/vector-icons';
import Icon from '../../components/ui/Icon';
import AnimatedIcon from '../../components/ui/AnimatedIcon';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import AppText from '../../components/ui/AppText';
import ConfirmDialog from '../../components/ConfirmDialog';
import ScreenContainer from '../../components/ui/ScreenContainer';
import Toast from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import { palette, spacing, radius, shadows, layout } from '../../constants/design';

type ParticipantShare = {
  userId: {
    id: string;
    name: string;
    email: string;
  };
  amount: number;
  settled: boolean;
};

type ExpenseItem = {
  id: string;
  groupId: string | null;
  description: string;
  amount: number;
  expenseDate: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  paidBy: {
    userId: { id: string; name: string; email: string } | null;
    amount: number;
  }[];
  participants: ParticipantShare[];
  netBalance: number;
  yourAmountPaid: number;
  yourAmountOwed: number;
  category?: string;
  icon?: string;
  notes?: string;
  isDeleted?: boolean;
  deletedBy?: { id: string; name: string; email: string } | null;
  deletedAt?: string | null;
  purgeInDays?: number | null;
};

// How many split rows to show before "Load more" — keeps a long history from
// growing the page without bound.
const PAGE_SIZE = 8;

const getCategoryIcon = (category?: string): { name: keyof typeof Ionicons.glyphMap; color: string } => {
  switch (category?.toLowerCase()) {
    case 'food':
    case 'dining':
      return { name: 'fast-food', color: '#F97316' };
    case 'travel':
    case 'transport':
    case 'cab':
      return { name: 'car-sport', color: '#3B82F6' };
    case 'shopping':
      return { name: 'bag-handle', color: '#EC4899' };
    case 'bills':
    case 'utilities':
      return { name: 'flash', color: '#EAB308' };
    case 'entertainment':
    case 'movies':
      return { name: 'film', color: '#8B5CF6' };
    default:
      return { name: 'cash', color: '#84CC16' };
  }
};

export default function FriendSplitsScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [dbUserId, setDbUserId] = useState<string>('');

  const { friendId, friendName } = useLocalSearchParams<{ friendId: string; friendName: string }>();

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [settling, setSettling] = useState(false);
  const [settleConfirm, setSettleConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { toast, showToast, dismissToast } = useToast();

  const fetchFriendExpenses = async () => {
    if (!friendId) return;
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      // Get DB User ID first
      const meRes = await apiRequest<any>('/api/me', {}, token);
      const myDbId = meRes?.user?._id || meRes?.user?.id || '';
      setDbUserId(myDbId);

      // includeDeleted keeps soft-deleted splits in the list as greyed records.
      const response = await apiRequest<{ expenses: ExpenseItem[] }>({
        method: 'get',
        url: '/api/expenses?includeDeleted=true',
        token,
      });

      // Filter:
      // 1. Non-group expense (groupId is null)
      // 2. Either created by user AND friend is participant, OR created by friend AND user is participant
      const filtered = (response?.expenses || []).filter((exp) => {
        if (exp.groupId) return false;

        const creatorId = exp.createdBy?.id || exp.createdBy?.toString() || '';
        const friendIsParticipant = exp.participants?.some(
          (p) => (p.userId?.id || p.userId?.toString()) === friendId
        );
        const userIsParticipant = exp.participants?.some(
          (p) => (p.userId?.id || p.userId?.toString()) === myDbId
        );

        if (creatorId === myDbId && friendIsParticipant) return true;
        if (creatorId === friendId && userIsParticipant) return true;
        return false;
      });

      setExpenses(filtered);
    } catch (err) {
      console.error('Error fetching friend splits:', err);
    } finally {
      setLoading(false);
    }
  };

  // Refresh on focus so newly added or settled splits show up on return.
  useFocusEffect(
    useCallback(() => {
      fetchFriendExpenses();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [friendId])
  );

  // The signed amount THIS expense contributes to the balance between me and
  // this one friend — shared math (utils/splitMath) so this page always agrees
  // with the Split hub's friend list.
  const pairwiseAmount = (exp: ExpenseItem): number => pairwiseBalance(exp, dbUserId, friendId);

  // Overall balance with this friend (deleted expenses never move it).
  const totalBalance = roundMoney(expenses.reduce((sum, exp) => sum + pairwiseAmount(exp), 0));

  const handleSettleUp = () => {
    if (Math.abs(totalBalance) < 0.01) {
      showToast({ title: 'All settled up! 🎉', message: 'Nothing to settle with this friend.', tone: 'info' });
      return;
    }
    setSettleConfirm(true);
  };

  const confirmSettleUp = async () => {
    setSettling(true);
    try {
      const token = await getToken();
      if (!token) return;

      // Settle BOTH directions on each expense where either side still owes
      // something. On multi-payer bills both shares can carry a balance at
      // once — settling only the net direction would leave money behind.
      for (const exp of expenses) {
        for (const targetUserId of pairwiseSettleTargets(exp, dbUserId, friendId)) {
          await apiRequest({
            method: 'post',
            url: `/api/expenses/${exp.id}/settle`,
            token,
            data: { userId: targetUserId },
          });
        }
      }

      setSettleConfirm(false);
      showToast({ title: 'Balances settled! 🎉', message: 'You are all square now.', tone: 'success' });
      fetchFriendExpenses();
    } catch (err: any) {
      showToast({ title: 'Could not settle', message: err.message || 'Please try again.', tone: 'error' });
    } finally {
      setSettling(false);
    }
  };

  const confirmDeleteExpense = async () => {
    if (!deleteTargetId) return;
    setDeleting(true);
    try {
      const token = await getToken();
      if (!token) return;

      await apiRequest({
        method: 'delete',
        url: `/api/expenses/${deleteTargetId}`,
        token,
      });

      setDeleteTargetId(null);
      showToast({ title: 'Expense deleted', message: 'Kept as a record for 30 days.', tone: 'info', duration: 2200 });
      fetchFriendExpenses();
    } catch (err: any) {
      showToast({ title: 'Could not delete', message: err.message || 'Please try again.', tone: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
    <Toast toast={toast} onDismiss={dismissToast} />
    <ScreenContainer
      contentStyle={{ paddingBottom: (insets.bottom || layout.navBarBottomInset) + layout.navBarHeight + 90 }}
      header={
        <View style={styles.header}>
          <Pressable style={styles.headerButton} onPress={() => router.back()}>
            <Icon name="ChevronLeft" size={22} color={palette.textPrimary} />
          </Pressable>
          <AppText variant="title" color="textPrimary" weight="bold">
            {friendName || 'Friend'}
          </AppText>
          <View style={styles.headerButton} />
        </View>
      }
    >
      {/* Balance Card */}
      <Card
        variant="elevated"
        padding={20}
        style={{
          ...styles.balanceCard,
          backgroundColor: totalBalance > 0 ? palette.successLight : totalBalance < 0 ? palette.dangerLight : palette.card
        }}
      >
        <AppText variant="caption" color="textSecondary" weight="bold">
          Overall Balance
        </AppText>
        <AppText
          variant="title"
          weight="bold"
          style={{
            color: totalBalance > 0 ? palette.success : totalBalance < 0 ? palette.danger : palette.textSecondary
          }}
        >
          {totalBalance > 0 ? `Owes you ₹${totalBalance.toFixed(2)}` : totalBalance < 0 ? `You owe ₹${Math.abs(totalBalance).toFixed(2)}` : 'All settled up 🎉'}
        </AppText>
        <AppText variant="micro" color="textTertiary" align="center">
          Personal splits only — group balances are settled inside each group.
        </AppText>

        {Math.abs(totalBalance) >= 0.01 && (
          <Button
            variant={totalBalance > 0 ? 'success' : 'danger'}
            size="md"
            style={styles.settleBtn}
            onPress={handleSettleUp}
            disabled={settling}
          >
            {settling ? <ActivityIndicator color="#fff" /> : 'Settle Up Balance'}
          </Button>
        )}
      </Card>

      <AppText variant="title" color="textPrimary" weight="bold" style={styles.sectionHeader}>
        Split Details
      </AppText>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={palette.primaryDeep} />
        </View>
      ) : expenses.length === 0 ? (
        <View style={styles.emptyState}>
          <AppText variant="caption" color="textSecondary">
            No personal splits history with this friend.
          </AppText>
        </View>
      ) : (
        <>
        {expenses.slice(0, visibleCount).map((item) => {
          const deleted = !!item.isDeleted;
          const userPaid = paidAmount(item, dbUserId) > 0;
          // Name the actual payer(s) — the creator isn't always who paid.
          const payerNames = (item.paidBy ?? [])
            .map((p) => (p.userId?.id === dbUserId ? 'You' : p.userId?.name?.split(' ')[0]))
            .filter(Boolean);
          const paidByLabel = userPaid
            ? payerNames.length > 1
              ? 'You & others'
              : 'You'
            : payerNames.join(' & ') || friendName || 'them';

          // Pairwise amount for THIS friend on THIS expense (their share only,
          // never the whole bill): + they owe me, − I owe them.
          const pair = pairwiseAmount(item);
          const owesYou = pair > 0.01;
          const iOwe = pair < -0.01;
          const settledPair = !deleted && Math.abs(pair) < 0.01;
          const amountColor = iOwe ? palette.danger : owesYou ? palette.success : palette.textSecondary;

          return (
            <Card
              key={item.id}
              variant="elevated"
              style={[styles.expenseCard, deleted && styles.deletedCard]}
              padding={16}
              onPress={() => router.push({ pathname: '/(tabs)/ExpenseDetail', params: { expenseId: item.id } })}
            >
              {deleted && (
                <View style={styles.deletedBanner}>
                  <Icon name="Trash2" size={13} color={palette.danger} />
                  <AppText variant="micro" color="danger" weight="bold" style={{ flex: 1 }} numberOfLines={1}>
                    Deleted by {item.deletedBy?.name ?? 'a member'}
                    {item.purgeInDays != null ? ` · removed in ${item.purgeInDays}d` : ''}
                  </AppText>
                </View>
              )}
              <View style={styles.row}>
                <View style={styles.iconWrap}>
                  {item.icon?.trim() ? (
                    <Icon name={item.icon} size={20} color={palette.primaryDeep} clickable={false} />
                  ) : (
                    <AnimatedIcon {...getCategoryIcon(item.category)} size={20} mode="pulse" />
                  )}
                </View>
                <View style={styles.body}>
                  <AppText variant="bodySm" color="textPrimary" weight="bold">
                    {item.description}
                  </AppText>
                  <AppText variant="micro" color="textSecondary">
                    Paid by {paidByLabel} on {new Date(item.expenseDate).toLocaleDateString('en-IN')}
                  </AppText>
                </View>
                <View style={styles.right}>
                  <AppText variant="micro" color="textSecondary" weight="bold">
                    {deleted ? '—' : settledPair ? 'Settled' : owesYou ? `${friendName || 'They'} owe` : 'You owe'}
                  </AppText>
                  <AppText
                    variant="bodySm"
                    weight="bold"
                    style={{ color: deleted ? palette.textTertiary : amountColor, textDecorationLine: deleted ? 'line-through' : 'none' }}
                  >
                    ₹{Math.abs(pair).toFixed(2)}
                  </AppText>
                </View>
              </View>

              {/* Additional split summary details */}
              <View style={styles.splitsDetailRow}>
                <AppText variant="caption" color="textSecondary">
                  Total Expense: <AppText variant="caption" color="textPrimary" weight="bold">₹{item.amount?.toFixed(2)}</AppText>
                </AppText>
                <View style={styles.tagBadge}>
                  <AppText variant="micro" color="textSecondary" weight="bold" style={styles.tagBadgeText}>
                    {item.category || 'Others'}
                  </AppText>
                </View>
              </View>

              {/* Notes section (if provided) */}
              {!!item.notes && item.notes.trim() !== '' && (
                <View style={styles.notesContainer}>
                  <AppText variant="caption" style={styles.notesText}>
                    📝 {item.notes.trim()}
                  </AppText>
                </View>
              )}

              <View style={styles.cardFooter}>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: deleted ? palette.border : settledPair ? palette.successLight : palette.warningLight }
                  ]}
                >
                  <AppText
                    variant="micro"
                    weight="bold"
                    style={{ color: deleted ? palette.textTertiary : settledPair ? palette.success : palette.warning }}
                  >
                    {deleted ? 'Deleted' : settledPair ? 'Settled' : 'Unsettled'}
                  </AppText>
                </View>
                {/* Either party can delete a live split; a deleted one is numb. */}
                {!deleted && (
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => setDeleteTargetId(item.id)}
                    hitSlop={6}
                  >
                    <Icon name="Trash2" size={16} color={palette.danger} />
                  </Pressable>
                )}
              </View>
            </Card>
          );
        })}

        {expenses.length > visibleCount && (
          <Button
            variant="secondary"
            size="md"
            onPress={() => setVisibleCount((c) => c + PAGE_SIZE)}
            style={{ marginTop: spacing.sm }}
          >
            {`Show more (${expenses.length - visibleCount} left)`}
          </Button>
        )}
        </>
      )}

      <ConfirmDialog
        visible={settleConfirm}
        title="Settle up"
        message={`Settle the balance of ₹${Math.abs(totalBalance).toFixed(2)} with ${friendName || 'this friend'}?`}
        confirmText="Settle"
        loading={settling}
        onConfirm={confirmSettleUp}
        onCancel={() => setSettleConfirm(false)}
      />

      <ConfirmDialog
        visible={!!deleteTargetId}
        title="Delete expense"
        message="This split will be greyed out as a record and permanently removed after 30 days. Everyone in it will be notified."
        confirmText="Delete"
        destructive
        loading={deleting}
        onConfirm={confirmDeleteExpense}
        onCancel={() => setDeleteTargetId(null)}
      />
    </ScreenContainer>

    {/* Add an expense with this friend — sits clear above the floating nav. */}
    <Pressable
      style={[styles.fab, { bottom: (insets.bottom || layout.navBarBottomInset) + layout.navBarHeight + 22 }]}
      onPress={() =>
        router.push({ pathname: '/(tabs)/AddNewExpense', params: { friendId: friendId ?? '', friendName: friendName ?? '' } })
      }
    >
      <Icon name="Plus" size={20} color={palette.white} clickable={false} />
      <AppText variant="label" color="onDark">Add expense</AppText>
    </Pressable>
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
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    alignItems: 'center',
    gap: 8,
  },
  settleBtn: {
    width: '100%',
    marginTop: 8,
  },
  sectionHeader: {
    marginTop: 8,
  },
  centerContainer: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: layout.gutter,
    // `bottom` is set inline (safe-area aware) so it clears the floating nav.
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.primaryDeep,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 20,
    ...shadows.lg,
  },
  expenseCard: {
    gap: 12,
    marginBottom: 14,
  },
  deletedCard: {
    opacity: 0.6,
    backgroundColor: palette.cardMuted,
  },
  deletedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.dangerLight,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 18,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: palette.divider,
    paddingTop: 10,
    alignItems: 'center',
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  deleteBtn: {
    marginLeft: 'auto',
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.xs,
  },
  splitsDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: palette.divider,
    marginTop: 6,
    marginBottom: 4,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  tagBadgeText: {
    textTransform: 'uppercase',
  },
  notesContainer: {
    padding: 8,
    backgroundColor: palette.warningLight,
    borderRadius: radius.md,
    marginTop: 6,
    marginBottom: 8,
  },
  notesText: {
    color: palette.warning,
  },
});
