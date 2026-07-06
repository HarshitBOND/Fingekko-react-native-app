import { useAuth, useUser } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '../../utils/api';
import Icon from '../../components/ui/Icon';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

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
  participants: ParticipantShare[];
  netBalance: number;
  yourAmountPaid: number;
  yourAmountOwed: number;
  category?: string;
  notes?: string;
};

const getCategoryEmoji = (category?: string) => {
  switch (category?.toLowerCase()) {
    case 'food':
    case 'dining':
      return '🍔';
    case 'travel':
    case 'transport':
    case 'cab':
      return '🚗';
    case 'shopping':
      return '🛍️';
    case 'bills':
    case 'utilities':
      return '⚡';
    case 'entertainment':
    case 'movies':
      return '🎬';
    default:
      return '💵';
  }
};

export default function FriendSplitsScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [dbUserId, setDbUserId] = useState<string>('');

  const { friendId, friendName } = useLocalSearchParams<{ friendId: string; friendName: string }>();

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [settling, setSettling] = useState(false);

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

      const response = await apiRequest<{ expenses: ExpenseItem[] }>({
        method: 'get',
        url: '/api/expenses',
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

  useEffect(() => {
    fetchFriendExpenses();
  }, [friendId]);

  // Compute overall balance with this friend
  const totalBalance = expenses.reduce((sum, exp) => {
    const creatorId = exp.createdBy?.id || exp.createdBy?.toString() || '';
    
    if (creatorId === dbUserId) {
      const friendPart = exp.participants?.find(p => (p.userId?.id || p.userId?.toString()) === friendId);
      if (friendPart && !friendPart.settled) {
        return sum + friendPart.amount;
      }
    } else if (creatorId === friendId) {
      const userPart = exp.participants?.find(p => (p.userId?.id || p.userId?.toString()) === dbUserId);
      if (userPart && !userPart.settled) {
        return sum - userPart.amount;
      }
    }
    return sum;
  }, 0);

  const handleSettleUp = async () => {
    if (totalBalance === 0) {
      Alert.alert('Settled', 'You are already fully settled up!');
      return;
    }



    Alert.alert(
      'Settle Up',
      `Are you sure you want to settle the balance of ₹${Math.abs(totalBalance).toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Settle',
          onPress: async () => {
            setSettling(true);
            try {
              const token = await getToken();
              if (!token) return;

              // Find unsettled expenses with this friend
              const unsettled = expenses.filter(exp => {
                const creatorId = exp.createdBy?.id || exp.createdBy?.toString() || '';
                if (creatorId === dbUserId) {
                  const friendPart = exp.participants?.find(p => (p.userId?.id || p.userId?.toString()) === friendId);
                  return friendPart && !friendPart.settled;
                } else if (creatorId === friendId) {
                  const userPart = exp.participants?.find(p => (p.userId?.id || p.userId?.toString()) === dbUserId);
                  return userPart && !userPart.settled;
                }
                return false;
              });

              // Call settle endpoint for each unsettled expense
              for (const exp of unsettled) {
                await apiRequest({
                  method: 'post',
                  url: `/api/expenses/${exp.id}/settle`,
                  token,
                  data: {
                    userId: totalBalance > 0 ? friendId : dbUserId
                  }
                });
              }

              Alert.alert('Success', 'Balances successfully settled!');
              fetchFriendExpenses();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to settle balance.');
            } finally {
              setSettling(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteExpense = async (expenseId: string) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await getToken();
              if (!token) return;

              await apiRequest({
                method: 'delete',
                url: `/api/expenses/${expenseId}`,
                token,
              });

              Alert.alert('Deleted', 'Expense deleted successfully.');
              fetchFriendExpenses();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete expense.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={() => router.back()}>
          <Icon name="ChevronLeft" size={20} color="#000000" />
        </Pressable>
        <Text style={styles.headerTitle}>{friendName || 'Friend'}</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* Balance Card */}
        <Card variant="tactile" style={{ ...styles.balanceCard, backgroundColor: totalBalance > 0 ? '#eef6f0' : totalBalance < 0 ? '#fdf2f2' : '#ffffff' }}>
          <Text style={styles.balanceLabel}>Overall Balance</Text>
          <Text style={[styles.balanceValue, { color: totalBalance > 0 ? '#148a46' : totalBalance < 0 ? '#eb5a4f' : '#6b7280' }]}>
            {totalBalance > 0 ? `Owes you ₹${totalBalance.toFixed(2)}` : totalBalance < 0 ? `You owe ₹${Math.abs(totalBalance).toFixed(2)}` : 'Settle Up'}
          </Text>

          {totalBalance !== 0 && (
            <Button
              variant={totalBalance > 0 ? 'success' : 'danger'}
              size="md"
              style={styles.settleBtn}
              onPress={handleSettleUp}
              disabled={settling}
            >
              {settling ? <ActivityIndicator color="#000" /> : 'Settle Up Balance'}
            </Button>
          )}
        </Card>

        <Text style={styles.sectionHeader}>Split Details</Text>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#148a46" />
          </View>
        ) : expenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No personal splits history with this friend.</Text>
          </View>
        ) : (
          expenses.map((item) => {
            const creatorId = item.createdBy?.id || item.createdBy?.toString() || '';
            const userPaid = creatorId === dbUserId;
            
            // Get friend participant share
            const friendPart = item.participants?.find(p => (p.userId?.id || p.userId?.toString()) === friendId);
            const userPart = item.participants?.find(p => (p.userId?.id || p.userId?.toString()) === dbUserId);
            
            const isSettled = userPaid ? friendPart?.settled : userPart?.settled;
            const splitAmount = userPaid ? friendPart?.amount : userPart?.amount;

            return (
              <Card key={item.id} variant="tactile" style={styles.expenseCard}>
                <View style={styles.row}>
                  <View style={styles.iconWrap}>
                    <Text style={styles.emoji}>{getCategoryEmoji(item.category)}</Text>
                  </View>
                  <View style={styles.body}>
                    <Text style={styles.title}>{item.description}</Text>
                    <Text style={styles.meta}>
                      Paid by {userPaid ? 'You' : friendName} on {new Date(item.expenseDate).toLocaleDateString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.right}>
                    <Text style={styles.shareLabel}>{userPaid ? 'Friend owes' : 'You owe'}</Text>
                    <Text style={[styles.shareValue, { color: userPaid ? '#148a46' : '#eb5a4f' }]}>
                      ₹{splitAmount?.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Additional split summary details */}
                <View style={styles.splitsDetailRow}>
                  <Text style={styles.detailLabel}>
                    Total Expense: <Text style={styles.detailValue}>₹{item.amount?.toFixed(2)}</Text>
                  </Text>
                  <View style={styles.tagBadge}>
                    <Text style={styles.tagBadgeText}>{item.category || 'Others'}</Text>
                  </View>
                </View>

                {/* Notes section (if provided) */}
                {!!item.notes && item.notes.trim() !== '' && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesText}>📝 {item.notes.trim()}</Text>
                  </View>
                )}

                <View style={styles.cardFooter}>
                  <View style={[styles.badge, { backgroundColor: isSettled ? '#C3FFD8' : '#FFF2C2' }]}>
                    <Text style={styles.badgeText}>{isSettled ? 'Settled' : 'Unsettled'}</Text>
                  </View>
                  {userPaid && (
                    <Pressable
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteExpense(item.id)}
                    >
                      <Icon name="Trash2" size={16} color="#eb5a4f" clickable={true} />
                    </Pressable>
                  )}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  balanceCard: {
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  settleBtn: {
    width: '100%',
    marginTop: 8,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
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
  emptyText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },
  expenseCard: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#ffffff',
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
  title: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
  },
  meta: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  shareLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '800',
  },
  shareValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    borderTopWidth: 1.5,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#000000',
  },
  deleteBtn: {
    marginLeft: 'auto',
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 1.5, height: 1.5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  splitsDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1.5,
    borderTopColor: '#e5e7eb',
    marginTop: 10,
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '700',
  },
  detailValue: {
    fontWeight: '900',
    color: '#000000',
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  tagBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000000',
    textTransform: 'uppercase',
  },
  notesContainer: {
    padding: 8,
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#000000',
    marginTop: 6,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 12,
    color: '#b45309',
    fontWeight: '700',
  },
});
