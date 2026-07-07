import { useAuth, useUser } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { apiRequest } from '../../utils/api';
import Icon from '../../components/ui/Icon';
import ScreenContainer from '../../components/ui/ScreenContainer';
import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import PressableScale from '../../components/ui/PressableScale';
import { palette, spacing, radius, shadows, fontFamily, layout, gradients } from '../../constants/design';

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
  const [dbUserId, setDbUserId] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'expenses' | 'friends'>('expenses');
  const [expenses, setExpenses] = useState<BackendExpenseItem[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchExpensesAndFriends = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      // Get DB User ID
      const meRes = await apiRequest<any>('/api/me', {}, token);
      const myDbId = meRes?.user?._id || meRes?.user?.id || '';
      setDbUserId(myDbId);
      
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

  // Refresh whenever the screen regains focus so newly added splits appear.
  useFocusEffect(
    useCallback(() => {
      fetchExpensesAndFriends();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

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
      if (creatorId === dbUserId) {
        const friendPart = exp.participants?.find(
          (p: any) => (p.userId?.id || p.userId?.toString() || p.userId) === friendUserId
        );
        if (friendPart && !friendPart.settled) {
          balance += friendPart.amount;
        }
      } else if (creatorId === friendUserId) {
        const userPart = exp.participants?.find(
          (p: any) => (p.userId?.id || p.userId?.toString() || p.userId) === dbUserId
        );
        if (userPart && !userPart.settled) {
          balance -= userPart.amount;
        }
      }
    });
    return balance;
  };

  return (
    <ScreenContainer
      contentStyle={{ gap: spacing.lg }}
      header={
        <View style={styles.header}>
          <Pressable style={styles.headerButton} onPress={() => router.back()}>
            <Icon name="ChevronLeft" size={22} color={palette.textPrimary} />
          </Pressable>
          <AppText variant="title" color="textPrimary" weight="bold">
            Non Group Expenses
          </AppText>
          <View style={{ width: 40 }} />
        </View>
      }
    >
      <View style={styles.heroSection}>
        <LinearGradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          colors={['rgba(102, 204, 68, 0.16)', 'rgba(102, 204, 68, 0.04)', 'transparent']}
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

        <View style={styles.heroCopy}>
          <AppText variant="display" color="textPrimary" weight="bold">
            Personal splits
          </AppText>
          <AppText variant="caption" color="textSecondary">
            A simple view of expenses outside groups.
          </AppText>
        </View>
      </View>

      {/* Tab Container */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tabButton, activeTab === 'expenses' && styles.tabButtonActive]}
          onPress={() => setActiveTab('expenses')}
        >
          <AppText
            variant="bodySm"
            weight="bold"
            style={[styles.tabButtonText, activeTab === 'expenses' && styles.tabButtonTextActive]}
          >
            Expenses
          </AppText>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === 'friends' && styles.tabButtonActive]}
          onPress={() => setActiveTab('friends')}
        >
          <AppText
            variant="bodySm"
            weight="bold"
            style={[styles.tabButtonText, activeTab === 'friends' && styles.tabButtonTextActive]}
          >
            Friends Summary
          </AppText>
        </Pressable>
      </View>

      <Card variant="elevated" padding={0} style={styles.listCard}>
        {loading ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <ActivityIndicator color={palette.primaryDeep} />
          </View>
        ) : activeTab === 'friends' ? (
          friends.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <AppText variant="caption" color="textSecondary">
                No friends added yet.
              </AppText>
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
                    <AppText style={styles.groupIconEmoji}>👤</AppText>
                  </View>
                  <View style={styles.groupTextWrap}>
                    <AppText variant="bodySm" color="textPrimary" weight="bold">
                      {friendName}
                    </AppText>
                    <AppText variant="micro" color="textSecondary">
                      {friendUser?.email || ''}
                    </AppText>
                  </View>
                  <View style={styles.groupRight}>
                    <AppText variant="micro" color="textSecondary" weight="bold">
                      {getAmountLabel(balance)}
                    </AppText>
                    <AppText
                      variant="bodySm"
                      weight="bold"
                      style={{ color: getAmountColor(balance) === '#eb5a4f' ? palette.danger : (getAmountColor(balance) === '#148a46' ? palette.success : palette.textPrimary) }}
                    >
                      ₹{Math.abs(balance).toFixed(2)}
                    </AppText>
                  </View>
                  <Icon name="ChevronRight" size={16} color={palette.textSecondary} style={styles.groupChevron} />
                </Pressable>
              );
            })
          )
        ) : expenses.length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <AppText variant="caption" color="textSecondary">
              You have no non-group expenses.
            </AppText>
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
                  <AppText style={styles.groupIconEmoji}>💵</AppText>
                </View>
                <View style={styles.groupTextWrap}>
                  <AppText variant="bodySm" color="textPrimary" weight="bold">
                    {item.description}
                  </AppText>
                  <AppText variant="micro" color="textSecondary">
                    {participantNames}
                  </AppText>
                </View>
                <View style={styles.groupRight}>
                  <AppText variant="micro" color="textSecondary" weight="bold">
                    {getAmountLabel(balance)}
                  </AppText>
                  <AppText
                    variant="bodySm"
                    weight="bold"
                    style={{ color: getAmountColor(balance) === '#eb5a4f' ? palette.danger : (getAmountColor(balance) === '#148a46' ? palette.success : palette.textPrimary) }}
                  >
                    ₹{Math.abs(balance).toFixed(2)}
                  </AppText>
                </View>
              </View>
            );
          })
        )}
      </Card>

      <View style={styles.footerBanner}>
        <ImageBackground
          source={require('../../assets/images/bgadd.png')}
          style={styles.footerBannerBg}
          resizeMode="cover"
          imageStyle={styles.footerBannerBgImage}
        >
          <View style={styles.footerBannerOverlay} />
          <View style={styles.footerBannerContent}>
            <AppText variant="title" color="textPrimary" weight="bold">
              Keep it simple.
            </AppText>
            <AppText variant="title" color="textPrimary" weight="bold">
              Keep it fair.
            </AppText>
          </View>
        </ImageBackground>
      </View>

      {/* Floating Action Button */}
      <PressableScale
        style={styles.fab}
        onPress={() => router.push('/(tabs)/AddNewExpense')}
      >
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.btnContent}>
          <Icon name="Plus" size={24} color={palette.white} />
        </View>
      </PressableScale>
    </ScreenContainer>
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
  heroSection: {
    width: '100%',
  },
  heroCopy: {
    paddingTop: spacing.sm,
    gap: 2,
  },
  listCard: {
    paddingHorizontal: spacing.base,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  groupIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupIconEmoji: {
    fontSize: 18,
  },
  groupTextWrap: {
    flex: 1,
    gap: 2,
  },
  groupRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  groupChevron: {
    marginLeft: 4,
  },
  footerBanner: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.sm,
    marginBottom: spacing.xxl,
  },
  footerBannerBg: {
    minHeight: 120,
    justifyContent: 'flex-end',
  },
  footerBannerBgImage: {
    borderRadius: radius.xl,
  },
  footerBannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(102, 204, 68, 0.12)',
    borderRadius: radius.xl,
  },
  footerBannerContent: {
    padding: spacing.lg,
  },
  fab: {
    position: 'absolute',
    // Sits above the floating tab bar (which occupies the bottom ~76px) so the
    // add button is actually visible and tappable.
    bottom: layout.navBarHeight + layout.navBarBottomInset + 16,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    ...shadows.primary,
    zIndex: 999,
  },
  btnContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  tabButton: {
    flex: 1,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.xs,
  },
  tabButtonActive: {
    backgroundColor: palette.primaryLight,
    borderColor: palette.primary,
  },
  tabButtonText: {
    color: palette.textSecondary,
  },
  tabButtonTextActive: {
    color: palette.primaryDeep,
  },
});