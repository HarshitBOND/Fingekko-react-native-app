import { useAuth, useUser } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '../../utils/api';
import Icon from '../../components/ui/Icon';

type BackendExpenseItem = {
  id: string;
  groupId: string | null;
  description: string;
  amount: number;
  netBalance: number;
  participants: {
    userId: {
      id: string;
      name: string;
      email: string;
    };
    amount: number;
    settled: boolean;
  }[];
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  category?: string;
};

export default function NonGroupExpenses() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const currentUserId = user?.id || '';

  const [activeTab, setActiveTab] = useState<'expenses' | 'friends'>('expenses');
  const [expenses, setExpenses] = useState<BackendExpenseItem[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchExpensesAndFriends = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      
      // Fetch expenses
      const response = await apiRequest<{ expenses: BackendExpenseItem[] }>({
        method: 'get',
        url: '/api/expenses',
        token,
      });
      // Filter out expenses that are part of a group
      const nonGroup = (response?.expenses || []).filter((e) => !e.groupId);
      setExpenses(nonGroup);

      // Fetch friends
      const friendsRes = await apiRequest<any>('/api/friends', {}, token);
      setFriends(friendsRes?.friends || []);
    } catch (error) {
      console.error('Error fetching non-group splits data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpensesAndFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getAmountColor = (balance: number) => {
    if (balance > 0) return '#148a46';
    if (balance < 0) return '#eb5a4f';
    return '#6b7280';
  };

  const getAmountLabel = (balance: number) => {
    if (balance > 0) return 'You are owed';
    if (balance < 0) return 'You owe';
    return 'You are settled up';
  };

  const getFriendBalance = (friendUserId: string) => {
    let balance = 0;
    expenses.forEach((exp) => {
      const creatorId = exp.createdBy?.id || exp.createdBy?.toString() || '';
      if (creatorId === currentUserId) {
        const friendPart = exp.participants?.find(
          (p: any) => (p.userId?.id || p.userId?.toString() || p.userId) === friendUserId
        );
        if (friendPart && !friendPart.settled) {
          balance += friendPart.amount;
        }
      } else if (creatorId === friendUserId) {
        const userPart = exp.participants?.find(
          (p: any) => (p.userId?.id || p.userId?.toString() || p.userId) === currentUserId
        );
        if (userPart && !userPart.settled) {
          balance -= userPart.amount;
        }
      }
    });
    return balance;
  };

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <View style={styles.heroSection}>
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            colors={['rgba(20,138,70,0.18)', 'rgba(20,138,70,0.05)', 'transparent']}
            locations={[0, 0.35, 1]}
            style={[
              StyleSheet.absoluteFill,
              {
                width: 240,
                height: 240,
                top: -70,
                left: -70,
                borderRadius: 200,
              },
            ]}
          />

          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <View style={styles.logoCircle}>
                <Icon name="ArrowDownLeft" size={18} color="#148a46" />
              </View>
              <Text style={styles.brandTitle}>Non Group Expenses</Text>
            </View>
            <Pressable style={styles.menuButton} onPress={() => router.back()}>
              <Icon name="Menu" size={20} color="#1f2937" />
            </Pressable>
          </View>

          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Personal splits</Text>
            <Text style={styles.heroSubtitle}>A simple view of expenses outside groups.</Text>
          </View>
        </View>

        {/* Tab Container */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tabButton, activeTab === 'expenses' && styles.tabButtonActive]}
            onPress={() => setActiveTab('expenses')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'expenses' && styles.tabButtonTextActive]}>
              Expenses
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, activeTab === 'friends' && styles.tabButtonActive]}
            onPress={() => setActiveTab('friends')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'friends' && styles.tabButtonTextActive]}>
              Friends Summary
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          {loading ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <ActivityIndicator color="#148a46" />
            </View>
          ) : activeTab === 'friends' ? (
            friends.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: '#6b7280', fontWeight: '700' }}>No friends added yet.</Text>
              </View>
            ) : (
              friends.map((item, index) => {
                const friendUser = item.friend;
                const friendUserId = friendUser?.id || friendUser?.toString() || '';
                const friendName = friendUser?.name || friendUser?.email || 'Friend';
                const balance = getFriendBalance(friendUserId);

                return (
                  <Pressable
                    key={item.id}
                    style={[styles.groupRow, index !== friends.length - 1 && styles.divider]}
                    onPress={() =>
                      router.push({
                        pathname: '/(tabs)/FriendSplits',
                        params: { friendId: friendUserId, friendName: friendName },
                      })
                    }
                  >
                    <View style={styles.groupIconWrap}>
                      <Text style={styles.groupIconEmoji}>👤</Text>
                    </View>
                    <View style={styles.groupTextWrap}>
                      <Text style={styles.groupName}>{friendName}</Text>
                      <Text style={styles.groupMembers}>{friendUser?.email || ''}</Text>
                    </View>
                    <View style={styles.groupRight}>
                      <Text style={styles.groupStatusLabel}>{getAmountLabel(balance)}</Text>
                      <Text style={[styles.groupAmount, { color: getAmountColor(balance) }]}>
                        ₹{Math.abs(balance).toFixed(2)}
                      </Text>
                    </View>
                    <Icon name="ChevronRight" size={16} color="#9ca3af" style={styles.groupChevron} />
                  </Pressable>
                );
              })
            )
          ) : expenses.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: '#6b7280', fontWeight: '700' }}>You have no non-group expenses.</Text>
            </View>
          ) : (
            expenses.map((item, index) => {
              const balance = item.netBalance;
              const participantNames = item.participants
                .map((p) => p.userId?.name)
                .filter(Boolean)
                .join(', ') || 'Self';

              return (
                <View
                  key={item.id}
                  style={[styles.groupRow, index !== expenses.length - 1 && styles.divider]}
                >
                  <View style={styles.groupIconWrap}>
                    <Text style={styles.groupIconEmoji}>💵</Text>
                  </View>
                  <View style={styles.groupTextWrap}>
                    <Text style={styles.groupName}>{item.description}</Text>
                    <Text style={styles.groupMembers}>{participantNames}</Text>
                  </View>
                  <View style={styles.groupRight}>
                    <Text style={styles.groupStatusLabel}>{getAmountLabel(balance)}</Text>
                    <Text style={[styles.groupAmount, { color: getAmountColor(balance) }]}>₹{Math.abs(balance).toFixed(2)}</Text>
                  </View>
                  <Icon name="ChevronRight" size={16} color="#9ca3af" style={styles.groupChevron} />
                </View>
              );
            })
          )}
        </View>

        <View style={styles.footerBanner}>
          <ImageBackground
            source={require('../../assets/images/bgadd.png')}
            style={styles.footerBannerBg}
            resizeMode="cover"
            imageStyle={styles.footerBannerBgImage}
          >
            <View style={styles.footerBannerOverlay} />
            <View style={styles.footerBannerContent}>
              <Text style={styles.footerBannerTitle}>Keep it simple.</Text>
              <Text style={styles.footerBannerTitle}>Keep it fair.</Text>
            </View>
          </ImageBackground>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push('/(tabs)/AddNewExpense')}
      >
        <Icon name="Plus" size={24} color="#000000" clickable={true} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  container: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 16,
  },
  heroSection: {
    width: '100%',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  heroCopy: {
    paddingTop: 24,
    gap: 4,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.8,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  divider: {
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 12,
  },
  groupIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#C3FFD8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  groupIconEmoji: {
    fontSize: 18,
  },
  groupTextWrap: {
    flex: 1,
    gap: 2,
  },
  groupName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
  groupMembers: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
  },
  groupRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  groupStatusLabel: {
    fontSize: 11,
    color: '#333333',
    fontWeight: '700',
  },
  groupAmount: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  groupChevron: {
    marginLeft: 4,
  },
  footerBanner: {
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#000000',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  footerBannerBg: {
    minHeight: 130,
    justifyContent: 'flex-end',
  },
  footerBannerBgImage: {
    borderRadius: 5,
  },
  footerBannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 222, 67, 0.45)',
    borderRadius: 5,
  },
  footerBannerContent: {
    padding: 20,
    paddingBottom: 18,
  },
  footerBannerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00FF66',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    elevation: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },
  tabButton: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  tabButtonActive: {
    backgroundColor: '#00FF66',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
  tabButtonTextActive: {
    fontWeight: '900',
  },
});