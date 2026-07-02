import { useAuth } from '@clerk/clerk-expo';
import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
    Briefcase,
    Car,
    CircleHelp,
    Coins,
    Home,
    Plane,
    Users,
    Utensils,
} from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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


const COLORS = {
  bg: '#F5F6F5',
  card: '#FFFFFF',
  green: '#1FA855',
  greenLight: '#E3F2E7',
  greenPale: '#CDE9D5',
  textDark: '#1A1A2E',
  textGray: '#8A8A9E',
  border: '#EFEFEF',
  overlay: 'rgba(0,0,0,0.4)',
};

// ---- Data (swap for real props / API data) ----
const MEMBERS = [
  {
    id: '1',
    initial: 'H',
    name: 'Harshit Prabhakar',
    isYou: true,
    paid: 2480,
    balance: 0, // positive = others owe you, negative = you owe them
  },
  {
    id: '2',
    initial: 'R',
    name: 'Rohan',
    isYou: false,
    paid: 0,
    balance: 0,
  },
];

const EXPENSES = [
  {
    id: '1',
    title: 'Dinner at Beach Shack',
    subtitle: 'Paid by you • 2h ago',
    group: 'Goa Trip',
    amount: '₹2,480',
    split: 'Split equally',
    icon: <Feather name="arrow-up-right" size={18} color={COLORS.green} />,
  },
  {
    id: '2',
    title: 'Cafe Coffee Day',
    subtitle: 'Paid by Rohan • Yesterday',
    group: 'Weekend Cafe',
    amount: '₹160',
    split: 'Split equally',
    icon: <Ionicons name="restaurant-outline" size={18} color={COLORS.green} />,
  },
  {
    id: '3',
    title: 'Taxi to Hotel',
    subtitle: 'Paid by you • 2 days ago',
    group: 'Goa Trip',
    amount: '₹540',
    split: 'Split equally',
    icon: <Ionicons name="car-outline" size={18} color={COLORS.green} />,
  },
];

type GroupItem = {
    id: string;
    name: string;
    description?: string;
    members: string[];
    icon: string;
    createdBy: string;
    balance?: number;
};

const GROUP_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  Plane,
  Home,
  Users,
  Car,
  Coins,
  Utensils,
  Briefcase,
};

function getGroupIcon(iconName?: string) {
  return GROUP_ICONS[iconName ?? ''] ?? CircleHelp;
}


// Reusable button that gives a pale press-feedback effect
type PressableActionProps = {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
};

function PressableAction({ icon, label, onPress }: PressableActionProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionItem,
        pressed && { opacity: 0.55 },
      ]}
    >
      {({ pressed }) => (
        <>
          <View style={[styles.actionIconWrap, pressed && { backgroundColor: COLORS.greenPale }]}>
            {icon}
          </View>
          <Text style={styles.actionLabel}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export default function GroupDetailScreen( ) {
  const scrollRef = useRef<ScrollView | null>(null);
  const membersY = useRef(0);
  const [settleUpVisible, setSettleUpVisible] = useState(false);

  const [group, setGroup] = useState<GroupItem | null>(null);
  const [loading, setLoading] = useState(false);

  const { userId, getToken } = useAuth();
  const { groupId } = useLocalSearchParams<{ groupId?: string | string[] }>();
  const resolvedGroupId = Array.isArray(groupId) ? groupId[0] : groupId;
  const GroupIcon = useMemo(() => getGroupIcon(group?.icon), [group?.icon]);

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
  }

  useEffect(() => {
    if (resolvedGroupId) {
      fetchGroupDetails(resolvedGroupId);
    }
  }, [resolvedGroupId]);

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
      pathname: '/(tabs)/AddExpense',
      params: { groupId: group.id },
    });
  };

  const handleSettleUp = () => {
    setSettleUpVisible(true);
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
          <Ionicons name="arrow-back" size={20} color={COLORS.textDark} />
        </Pressable>

        <View style={styles.avatarLg}>
          <Text style={styles.avatarLgText}>H</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{group?.name ?? 'Group details'}</Text>
          <Text style={styles.headerSubtitle}>{subtitle}</Text>
        </View>

        <Pressable style={({ pressed }) => [styles.circleBtn, pressed && styles.circleBtnPressed]}>
          <Ionicons name="ellipsis-vertical" size={18} color={COLORS.textDark} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Group balance</Text>
          <View style={styles.balanceMainRow}>
            <Text style={styles.balanceTitle}>{loading ? 'Loading group...' : group ? 'No balance data yet' : 'Group not found'}</Text>
            <Text style={styles.balanceAmount}>₹{group?.balance ?? 0}</Text>
          </View>
          <Text style={styles.balanceNote}>{isCreator ? 'Created by you' : 'Created by another member'}</Text>
        </View>

        {/* Action row */}
        <View style={styles.actionsCard}>
          <PressableAction
            icon={<Ionicons name="add" size={22} color={COLORS.green} />}
            label="Add Expense"
            onPress={handleAddExpense}
          />
          <View style={styles.actionDivider} />
          <PressableAction
            icon={<FontAwesome5 name="hand-holding-usd" size={18} color={COLORS.green} />}
            label="Settle Up"
            onPress={handleSettleUp}
          />
          <View style={styles.actionDivider} />
          <PressableAction
            icon={<Ionicons name="people-outline" size={22} color={COLORS.green} />}
            label="Members"
            onPress={scrollToMembers}
          />
          <View style={styles.actionDivider} />
          <PressableAction
            icon={<Ionicons name="settings-outline" size={22} color={COLORS.green} />}
            label="Group Settings"
            onPress={() => {
              Alert.alert('Group Settings', 'Group settings are not connected yet.');
            }}
          />
        </View>

        {/* Group summary */}
        <Text style={styles.sectionTitle}>Group summary</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Group ID</Text>
            <Text style={styles.summaryValue}>{group?.id ?? '—'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Members</Text>
            <Text style={[styles.summaryValue, styles.greenText]}>{memberCount}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Icon</Text>
            <Text style={styles.summaryValue}>{group?.icon ?? 'Coins'}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Role</Text>
            <Text style={[styles.summaryValue, styles.greenText]}>{isCreator ? 'Creator' : 'Member'}</Text>
          </View>
        </View>

        {/* Recent expenses */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent expenses</Text>
          <TouchableOpacity>
            <Text style={styles.viewAll}>View all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listCard}>
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={22} color={COLORS.green} />
            <Text style={styles.emptyStateTitle}>No expenses yet</Text>
            <Text style={styles.emptyStateText}>This screen is connected to the backend, but expenses are not loaded here yet.</Text>
          </View>
        </View>

        {/* Members */}
        <View onLayout={(evt) => { membersY.current = evt.nativeEvent.layout.y; }}>
          <Text style={styles.sectionTitle}>Members ({memberCount})</Text>
          <View style={styles.listCard}>
            {(group?.members ?? []).map((memberId, i) => (
              <React.Fragment key={memberId}>
                <View style={styles.memberRow}>
                  <View style={styles.avatarSm}>
                    <Text style={styles.avatarSmText}>{(memberId === userId ? 'You' : memberId.slice(0, 2)).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>{memberId === userId ? 'You' : memberId}</Text>
                      {memberId === userId && (
                        <View style={styles.youBadge}>
                          <Text style={styles.youBadgeText}>You</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.memberSub}>{memberId === userId ? 'Current account' : 'Member ID'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.memberRightLabel}>{memberId === userId ? 'Current user' : 'Member'}</Text>
                    <Text style={styles.memberAmount}>{memberId.slice(0, 6)}...</Text>
                  </View>
                </View>
                {i < (group?.members.length ?? 0) - 1 && <View style={styles.rowDivider} />}
              </React.Fragment>
            ))}
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
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Settle Up</Text>

            <View style={styles.modalEmptyState}>
              <Ionicons name="information-circle-outline" size={40} color={COLORS.green} />
              <Text style={styles.modalEmptyText}>Settle up is connected, but balance data is not loaded yet.</Text>
            </View>

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
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: COLORS.bg,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBtnPressed: { backgroundColor: COLORS.border },
  avatarLg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLgText: { fontSize: 18, fontWeight: '700', color: COLORS.textDark },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark },
  headerSubtitle: { fontSize: 13, color: COLORS.textGray, marginTop: 2 },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  balanceCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,
  },
  balanceLabel: { fontSize: 13, color: COLORS.textGray, marginBottom: 10 },
  balanceMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceTitle: { fontSize: 19, fontWeight: '700', color: COLORS.textDark },
  balanceAmount: { fontSize: 22, fontWeight: '700', color: COLORS.green },
  balanceNote: { fontSize: 12, color: COLORS.textGray, marginTop: 6 },

  actionsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 28,
  },
  actionItem: {
    flex: 1,
    alignItems: 'center',
    gap: 9,
    paddingVertical: 4,
    borderRadius: 14,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 11, color: COLORS.textGray, textAlign: 'center' },
  actionDivider: { width: 1, height: 28, backgroundColor: COLORS.border },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textDark, marginBottom: 12 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewAll: { fontSize: 14, color: COLORS.green, fontWeight: '600', marginBottom: 12 },

  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },
  summaryLabel: { fontSize: 14, color: COLORS.textGray },
  summaryValue: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  summaryDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
  greenText: { color: COLORS.green },

  listCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    paddingHorizontal: 18,
    marginBottom: 28,
  },
  rowDivider: { height: 1, backgroundColor: COLORS.border },

  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    gap: 14,
  },
  expenseIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  expenseSubtitle: { fontSize: 12, color: COLORS.textGray, marginTop: 3 },
  expenseGroup: { fontSize: 12, color: COLORS.textGray, marginTop: 1 },
  expenseAmount: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  expenseSplit: { fontSize: 12, color: COLORS.textGray, marginTop: 3 },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyStateTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  emptyStateText: { fontSize: 12, color: COLORS.textGray, textAlign: 'center', lineHeight: 17 },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    gap: 14,
  },
  avatarSm: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSmText: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberName: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  youBadge: {
    backgroundColor: COLORS.green,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  youBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  memberSub: { fontSize: 12, color: COLORS.textGray, marginTop: 4 },
  memberRightLabel: { fontSize: 12, color: COLORS.textGray },
  memberAmount: { fontSize: 15, fontWeight: '700', color: COLORS.textDark, marginTop: 3 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark, marginBottom: 18 },
  modalEmptyState: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  modalEmptyText: { fontSize: 14, color: COLORS.textGray, textAlign: 'center' },
  settleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settleText: { flex: 1, fontSize: 14, color: COLORS.textDark },
  settleAmount: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  modalCloseBtn: {
    marginTop: 20,
    backgroundColor: COLORS.greenLight,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseText: { fontSize: 15, fontWeight: '700', color: COLORS.green },
});