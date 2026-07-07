import { useAuth } from '@clerk/clerk-expo';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Icon from '../../../components/ui/Icon';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '../../../utils/api';

import { palette, spacing, radius, shadows, fontFamily, layout } from '../../../constants/design';

const COLORS = {
  bg: palette.bg,
  card: palette.card,
  green: palette.primaryDeep,
  greenLight: palette.primaryLight,
  greenPale: 'rgba(102, 204, 68, 0.2)',
  textDark: palette.textPrimary,
  textGray: palette.textSecondary,
  border: palette.border,
  overlay: 'rgba(0,0,0,0.4)',
};

type GroupItem = {
  id: string;
  name: string;
  description?: string;
  members: {
    id: string;
    dbId: string;
    name: string;
    email: string;
  }[];
  icon: string;
  createdBy: string;
  balance?: number;
};

interface MappedUser {
  id: string;
  name: string;
  email: string;
}

interface Settlement {
  fromUser: MappedUser;
  toUser: MappedUser;
  amount: number;
}

interface GroupBalance {
  userId: string;
  name: string;
  email: string;
  netBalance: number;
}

interface BalancesResponse {
  balances: GroupBalance[];
  settlements: Settlement[];
  totalSpent: number;
  expenseCount: number;
}

interface GroupExpenseItem {
  id: string;
  groupId: string | null;
  description: string;
  amount: number;
  expenseDate: string;
  createdBy: { id: string; name: string; email: string };
}

function getGroupIconName(iconName?: string): string {
  const nameMap: Record<string, string> = {
    Plane: 'Plane',
    Home: 'Home',
    Users: 'Users',
    Car: 'Car',
    Coins: 'Coins',
    Utensils: 'Utensils',
    Briefcase: 'Briefcase',
  };
  return nameMap[iconName ?? ''] ?? 'CircleAlert';
}

const getInitials = (name: string): string => {
  if (!name) return 'M';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'M';
};

export default function GroupDetailScreen() {
  const scrollRef = useRef<ScrollView | null>(null);
  const membersY = useRef(0);
  const [settleUpVisible, setSettleUpVisible] = useState(false);

  const [group, setGroup] = useState<GroupItem | null>(null);
  const [loading, setLoading] = useState(false);

  const { userId, getToken } = useAuth();
  const { groupId } = useLocalSearchParams<{ groupId?: string | string[] }>();
  const resolvedGroupId = Array.isArray(groupId) ? groupId[0] : groupId;
  const GroupIconName = useMemo(() => getGroupIconName(group?.icon), [group?.icon]);

  const [balancesData, setBalancesData] = useState<BalancesResponse | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(false);

  const [recentExpenses, setRecentExpenses] = useState<GroupExpenseItem[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);

  const fetchGroupDetails = async (groupId: string) => {
    setLoading(true);
    const token = await getToken();
    if (!token) {
      console.error('User is not authenticated');
      setLoading(false);
      return;
    }
    try {
      const response = await apiRequest<GroupItem>({
        method: 'get',
        url: `/api/groups/${groupId}`,
        token: token,
      });
      setGroup(response);
    } catch (error) {
      console.error('Error fetching group details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupBalances = async (groupId: string) => {
    setBalancesLoading(true);
    const token = await getToken();
    if (!token) {
      setBalancesLoading(false);
      return;
    }
    try {
      const response = await apiRequest<BalancesResponse>({
        method: 'get',
        url: `/api/groups/${groupId}/balances`,
        token: token,
      });
      setBalancesData(response);
    } catch (error) {
      console.error('Error fetching group balances:', error);
    } finally {
      setBalancesLoading(false);
    }
  };

  const fetchGroupExpenses = async (groupId: string) => {
    setExpensesLoading(true);
    const token = await getToken();
    if (!token) {
      setExpensesLoading(false);
      return;
    }
    try {
      const response = await apiRequest<{ expenses: GroupExpenseItem[] }>({
        method: 'get',
        url: '/api/expenses',
        token,
      });
      const forThisGroup = (response?.expenses || [])
        .filter((exp) => exp.groupId === groupId)
        .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
      setRecentExpenses(forThisGroup);
    } catch (error) {
      console.error('Error fetching group expenses:', error);
    } finally {
      setExpensesLoading(false);
    }
  };

  useEffect(() => {
    if (resolvedGroupId) {
      fetchGroupDetails(resolvedGroupId);
      fetchGroupBalances(resolvedGroupId);
      fetchGroupExpenses(resolvedGroupId);
    }
  }, [resolvedGroupId]);

  // Refresh balances/expenses whenever the screen regains focus (e.g. after
  // adding a new expense or settling up), not just on first mount.
  useFocusEffect(
    useCallback(() => {
      if (resolvedGroupId) {
        fetchGroupBalances(resolvedGroupId);
        fetchGroupExpenses(resolvedGroupId);
      }
    }, [resolvedGroupId])
  );

  const memberCount = group?.members.length ?? 0;
  const subtitle = group?.description?.trim() || `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`;
  const isCreator = Boolean(group && userId && group.createdBy === userId);


  const scrollToMembers = () => {
    scrollRef.current?.scrollTo({ y: membersY.current, animated: true });
  };

  const handleAddExpense = () => {
    if (!group?.id) {
      return;
    }

    router.push({
      pathname: '/(tabs)/group/AddGroupExpense',
      params: { groupId: group.id },
    });
  };

  const handleSettleUp = () => {
    setSettleUpVisible(true);
  };

  const getMemberGroupBalance = (memberId: string) => {
    if (!balancesData) return { amount: 0, label: 'Settled' };
    
    const directSettlement = balancesData.settlements.find(
      s => (s.fromUser.id === userId && s.toUser.id === memberId) ||
           (s.fromUser.id === memberId && s.toUser.id === userId)
    );

    if (directSettlement) {
      if (directSettlement.fromUser.id === userId) {
        return { amount: -directSettlement.amount, label: 'You owe them' };
      } else {
        return { amount: directSettlement.amount, label: 'Owes you' };
      }
    }

    return { amount: 0, label: 'Settled' };
  };




  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      {/* Header stays outside the scroll so it never collides with the status bar / notch */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.circleBtn, pressed && styles.circleBtnPressed]}
          onPress={() => router.back()}
        >
          <Icon name="ChevronLeft" size={20} color={COLORS.textDark} />
        </Pressable>

        <View style={styles.avatarLg}>
          <Icon name={GroupIconName} size={24} color={COLORS.green} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{group?.name ?? 'Group details'}</Text>
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        </View>

        <Pressable style={({ pressed }) => [styles.circleBtn, pressed && styles.circleBtnPressed]}>
          <Icon name="Menu" size={18} color={COLORS.textDark} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Group Balance Overview</Text>
          <View style={styles.balanceMainRow}>
            <Text style={styles.balanceTitle}>
              {loading ? 'Loading...' : `Total Spent: ₹${balancesData?.totalSpent ?? 0}`}
            </Text>
            {(() => {
              const myBalance = balancesData?.balances.find(b => b.userId === userId);
              if (!myBalance) return <Text style={[styles.balanceAmount, { color: '#6b7280' }]}>₹0.00</Text>;
              
              const isPositive = myBalance.netBalance > 0;
              const isNegative = myBalance.netBalance < 0;
              const color = isPositive ? '#1FA855' : isNegative ? '#FF3366' : '#6b7280';
              const label = isPositive ? 'You are owed' : isNegative ? 'You owe' : 'Settled';
              
              return (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.balanceAmount, { color }]}>
                    ₹{Math.abs(myBalance.netBalance).toFixed(2)}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#333333', marginTop: 2 }}>
                    {label}
                  </Text>
                </View>
              );
            })()}
          </View>
          <Text style={styles.balanceNote}>{isCreator ? 'Created by you' : 'Created by another member'}</Text>
        </View>

        {/* Action Grid (Neobrutalism Style) */}
        <View style={styles.quickActionsGrid}>
          <Pressable style={styles.quickActionCard} onPress={handleAddExpense}>
            <View style={styles.quickActionIconWrap}>
              <Icon name="Plus" size={22} color="#1FA855" />
            </View>
            <Text style={styles.quickActionTitle}>Add Expense</Text>
            <Text style={styles.quickActionSubtitle}>Split a new bill</Text>
          </Pressable>

          <Pressable style={styles.quickActionCard} onPress={handleSettleUp}>
            <View style={styles.quickActionIconWrap}>
              <Icon name="Coins" size={20} color="#1FA855" />
            </View>
            <Text style={styles.quickActionTitle}>Settle Up</Text>
            <Text style={styles.quickActionSubtitle}>Pay back debts</Text>
          </Pressable>

          <Pressable style={styles.quickActionCard} onPress={scrollToMembers}>
            <View style={styles.quickActionIconWrap}>
              <Icon name="Users" size={22} color="#1FA855" />
            </View>
            <Text style={styles.quickActionTitle}>Members</Text>
            <Text style={styles.quickActionSubtitle}>View group members</Text>
          </Pressable>

          <Pressable
            style={styles.quickActionCard}
            onPress={() => {
              Alert.alert('Group Settings', 'Group settings are not connected yet.');
            }}
          >
            <View style={styles.quickActionIconWrap}>
              <Icon name="Settings" size={22} color="#1FA855" />
            </View>
            <Text style={styles.quickActionTitle}>Settings</Text>
            <Text style={styles.quickActionSubtitle}>Manage options</Text>
          </Pressable>
        </View>

        {/* Suggested settlements (Simplify Debt) */}
        <Text style={styles.sectionTitle}>Group Settlements</Text>
        <View style={styles.listCard}>
          {!balancesData || balancesData.settlements.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="CircleCheck" size={24} color={COLORS.green} />
              <Text style={styles.emptyStateTitle}>All settled up!</Text>
              <Text style={styles.emptyStateText}>No transactions are needed to settle the group.</Text>
            </View>
          ) : (
            balancesData.settlements.map((s, idx) => {
              const isFromYou = s.fromUser.id === userId;
              const isToYou = s.toUser.id === userId;

              return (
                <React.Fragment key={idx}>
                  <View style={styles.settleRow}>
                    <View style={styles.settleIconWrap}>
                      <Icon name="ArrowRight" size={16} color="#000000" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.settleText}>
                        <Text style={{ fontWeight: '900', color: isFromYou ? '#FF3366' : '#000000' }}>
                          {isFromYou ? 'You' : s.fromUser.name}
                        </Text>
                        {' owes '}
                        <Text style={{ fontWeight: '900', color: isToYou ? '#1FA855' : '#000000' }}>
                          {isToYou ? 'You' : s.toUser.name}
                        </Text>
                      </Text>
                    </View>
                    <Text style={styles.settleAmount}>
                      ₹{s.amount.toFixed(2)}
                    </Text>
                  </View>
                  {idx < balancesData.settlements.length - 1 && (
                    <View style={styles.rowDivider} />
                  )}
                </React.Fragment>
              );
            })
          )}
        </View>

        {/* Recent expenses */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent expenses</Text>
          {recentExpenses.length > 0 && (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(tabs)/GroupExpenses', params: { groupId: resolvedGroupId, groupName: group?.name ?? '' } })}
            >
              <Text style={styles.viewAll}>View all</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.listCard}>
          {expensesLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Loading expenses...</Text>
            </View>
          ) : recentExpenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="StickyNote" size={22} color={COLORS.green} />
              <Text style={styles.emptyStateTitle}>No expenses yet</Text>
              <Text style={styles.emptyStateText}>Add your first group expense to see it here.</Text>
            </View>
          ) : (
            recentExpenses.slice(0, 5).map((exp, idx) => (
              <React.Fragment key={exp.id}>
                <View style={styles.settleRow}>
                  <View style={styles.settleIconWrap}>
                    <Icon name="Receipt" size={16} color="#000000" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settleText}>{exp.description}</Text>
                    <Text style={{ fontSize: 11, color: COLORS.textGray, marginTop: 2 }}>
                      Paid by {exp.createdBy?.id === userId ? 'You' : exp.createdBy?.name} on {new Date(exp.expenseDate).toLocaleDateString('en-IN')}
                    </Text>
                  </View>
                  <Text style={styles.settleAmount}>₹{exp.amount.toFixed(2)}</Text>
                </View>
                {idx < Math.min(recentExpenses.length, 5) - 1 && <View style={styles.rowDivider} />}
              </React.Fragment>
            ))
          )}
        </View>

        {/* Members */}
        <View onLayout={(evt) => { membersY.current = evt.nativeEvent.layout.y; }}>
          <Text style={styles.sectionTitle}>Members ({memberCount})</Text>
          <View style={styles.listCard}>
            {(group?.members ?? []).map((member, i) => {
              const isYou = member.id === userId;
              const mBalance = !isYou ? getMemberGroupBalance(member.id) : null;

              return (
                <React.Fragment key={member.id}>
                  <Pressable
                    style={styles.memberRow}
                    onPress={() => {
                      if (!isYou && member.dbId) {
                        router.push({
                          pathname: '/(tabs)/FriendSplits',
                          params: { friendId: member.dbId, friendName: member.name },
                        });
                      }
                    }}
                  >
                    <View style={styles.avatarSm}>
                      <Text style={styles.avatarSmText}>
                        {getInitials(isYou ? "You" : member.name)}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.memberNameRow}>
                        <Text style={styles.memberName}>
                          {isYou ? "You" : member.name}
                        </Text>

                        {isYou && (
                          <View style={styles.youBadge}>
                            <Text style={styles.youBadgeText}>You</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.memberSub}>
                        {member.email}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {!isYou && mBalance && (
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[
                            styles.memberBalanceLabel,
                            mBalance.amount > 0 ? styles.owesYouText : mBalance.amount < 0 ? styles.youOweText : styles.settledText
                          ]}>
                            {mBalance.label}
                          </Text>
                          {mBalance.amount !== 0 && (
                            <Text style={[
                              styles.memberBalanceAmount,
                              mBalance.amount > 0 ? styles.owesYouText : styles.youOweText
                            ]}>
                              ₹{Math.abs(mBalance.amount).toFixed(2)}
                            </Text>
                          )}
                        </View>
                      )}
                      {isYou && (
                        <Text style={styles.memberRightLabel}>Current user</Text>
                      )}
                      {!isYou && (
                        <Icon name="ChevronRight" size={18} color="#000000" />
                      )}
                    </View>
                  </Pressable>

                  {i < (group?.members.length ?? 0) - 1 && (
                    <View style={styles.rowDivider} />
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Settle Up modal — shows who you owe / who owes you */}
      <Modal
        visible={settleUpVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSettleUpVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSettleUpVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={() => { }}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Settle Up</Text>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {(() => {
                const mySettlements = balancesData?.settlements.filter(
                  s => s.fromUser.id === userId || s.toUser.id === userId
                ) ?? [];

                if (mySettlements.length === 0) {
                  return (
                    <View style={styles.modalEmptyState}>
                      <Icon name="CircleCheck" size={40} color={COLORS.green} />
                      <Text style={styles.modalEmptyText}>You are all settled up with everyone in the group!</Text>
                    </View>
                  );
                }

                return mySettlements.map((s, idx) => {
                  const isFromYou = s.fromUser.id === userId;
                  const targetUser = isFromYou ? s.toUser : s.fromUser;
                  
                  return (
                    <View key={idx} style={styles.settleModalRow}>
                      <View style={[styles.avatarSm, { backgroundColor: isFromYou ? '#FFD4D4' : '#C3FFD8' }]}>
                        <Text style={styles.avatarSmText}>
                          {getInitials(targetUser.name)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#000000' }}>
                          {targetUser.name}
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#555555' }}>
                          {isFromYou ? 'You owe them' : 'Owes you'}
                        </Text>
                      </View>
                      <Text style={[
                        { fontSize: 16, fontWeight: '900' },
                        isFromYou ? { color: '#FF3366' } : { color: '#1FA855' }
                      ]}>
                        ₹{s.amount.toFixed(2)}
                      </Text>
                    </View>
                  );
                });
              })()}
            </ScrollView>

            <Pressable
              style={({ pressed }) => [styles.modalCloseBtn, pressed && { opacity: 0.7 }]}
              onPress={() => setSettleUpVisible(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: COLORS.bg,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  circleBtnPressed: { backgroundColor: COLORS.border },
  avatarLg: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: COLORS.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLgText: { fontSize: 18, fontFamily: fontFamily.bold, color: COLORS.textDark },
  headerTitle: { fontSize: 18, fontFamily: fontFamily.bold, color: COLORS.textDark },
  headerSubtitle: { fontSize: 13, color: COLORS.textGray, marginTop: 2, fontFamily: fontFamily.semibold },

  scrollContent: { paddingHorizontal: layout.gutter, paddingBottom: 40 },

  balanceCard: {
    backgroundColor: COLORS.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  balanceLabel: { fontSize: 13, color: COLORS.textGray, marginBottom: 10, fontFamily: fontFamily.semibold },
  balanceMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceTitle: { fontSize: 17, fontFamily: fontFamily.bold, color: COLORS.textDark, flex: 1, marginRight: 8 },
  balanceAmount: { fontSize: 20, fontFamily: fontFamily.bold, color: COLORS.green },
  balanceNote: { fontSize: 12, color: COLORS.textGray, marginTop: 6, fontFamily: fontFamily.medium },

  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 24,
  },
  quickActionCard: {
    width: '48%',
    minHeight: 110,
    borderRadius: radius.lg,
    backgroundColor: '#ffffff',
    padding: spacing.md,
    gap: spacing.xs,
    ...shadows.xs,
  },
  quickActionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.greenLight,
  },
  quickActionTitle: {
    fontSize: 14,
    fontFamily: fontFamily.bold,
    color: '#000000',
  },
  quickActionSubtitle: {
    fontSize: 11,
    color: palette.textSecondary,
    fontFamily: fontFamily.semibold,
  },

  sectionTitle: { fontSize: 17, fontFamily: fontFamily.bold, color: COLORS.textDark, marginBottom: 12 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAll: { fontSize: 14, color: COLORS.green, fontFamily: fontFamily.bold, marginBottom: 12 },

  listCard: {
    backgroundColor: COLORS.card,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.base,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  rowDivider: { height: 1, backgroundColor: palette.divider },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyStateTitle: { fontSize: 15, fontFamily: fontFamily.bold, color: COLORS.textDark },
  emptyStateText: { fontSize: 12, color: COLORS.textGray, textAlign: 'center', lineHeight: 17, fontFamily: fontFamily.medium },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  avatarSm: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: COLORS.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmText: { fontSize: 15, fontFamily: fontFamily.bold, color: COLORS.textDark },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberName: { fontSize: 15, fontFamily: fontFamily.bold, color: COLORS.textDark },
  youBadge: {
    backgroundColor: COLORS.green,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  youBadgeText: { fontSize: 11, fontFamily: fontFamily.bold, color: '#fff' },
  memberSub: { fontSize: 12, color: COLORS.textGray, marginTop: 4, fontFamily: fontFamily.semibold },
  memberRightLabel: { fontSize: 12, color: COLORS.textGray, fontFamily: fontFamily.semibold },
  
  memberBalanceLabel: { fontSize: 11, fontFamily: fontFamily.bold },
  memberBalanceAmount: { fontSize: 14, fontFamily: fontFamily.bold, marginTop: 2 },
  owesYouText: { color: palette.success },
  youOweText: { color: palette.danger },
  settledText: { color: palette.textTertiary },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    ...shadows.lg,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontFamily: fontFamily.bold, color: COLORS.textDark, marginBottom: 18 },
  modalEmptyState: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  modalEmptyText: { fontSize: 14, color: COLORS.textGray, textAlign: 'center', fontFamily: fontFamily.semibold },
  
  settleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  settleIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: '#FFE999',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settleText: { fontSize: 14, color: COLORS.textDark, fontFamily: fontFamily.semibold },
  settleAmount: { fontSize: 16, fontFamily: fontFamily.bold, color: COLORS.green },

  settleModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
  },

  modalCloseBtn: {
    marginTop: 20,
    backgroundColor: palette.primary,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    ...shadows.sm,
  },
  modalCloseText: { fontSize: 15, fontFamily: fontFamily.bold, color: palette.white },
});