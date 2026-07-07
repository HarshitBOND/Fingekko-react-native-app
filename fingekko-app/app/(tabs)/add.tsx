import { useUser, useAuth } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Icon from '../../components/ui/Icon';
import Navbar from '../../components/Navbar';
import ScreenContainer from '../../components/ui/ScreenContainer';
import Card from '../../components/ui/Card';
import AppText from '../../components/ui/AppText';
import PressableScale from '../../components/ui/PressableScale';
import { palette, spacing, layout, radius, shadows, gradients, fontFamily } from '../../constants/design';
import { apiRequest } from '../../utils/api';

type QuickAction = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  href: '/(tabs)/Friends' | '/(tabs)/AddNewExpense' | '/(tabs)/YourGroups' | '/(tabs)/NonGroupExpenses';
};

type ActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  amount?: string;
  amountColor?: string;
  iconType: 'up' | 'down' | 'group';
  hasChevron?: boolean;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'add-expense',
    title: 'Add New Expense',
    subtitle: 'Create a new expense entry',
    icon: 'Plus',
    href: '/(tabs)/AddNewExpense',
  },
  {
    id: 'your-groups',
    title: 'Your Groups',
    subtitle: 'Open the groups screen',
    icon: 'Users',
    href: '/(tabs)/YourGroups',
  },
  {
    id: 'non-group-expenses',
    title: 'Non Group Expenses',
    subtitle: 'Open the non-group screen',
    icon: 'ArrowDownLeft',
    href: '/(tabs)/NonGroupExpenses',
  },
  {
    id: 'friends',
    title: 'Friends',
    subtitle: 'Open the friends screen',
    icon: 'Handshake',
    href: '/(tabs)/Friends',
  },
];

const ACTIVITY: ActivityItem[] = [
  {
    id: 'act1',
    title: 'You added an expense',
    subtitle: 'Dinner at Beach Shack',
    meta: 'Goa Trip • 2h ago',
    amount: '₹2,480',
    amountColor: '#111827',
    iconType: 'up',
  },
  {
    id: 'act2',
    title: 'Rohan paid you back',
    subtitle: 'Cafe Coffee Day',
    meta: 'Weekend Cafe • Yesterday',
    amount: '₹160',
    amountColor: '#148a46',
    iconType: 'down',
  },
  {
    id: 'act3',
    title: 'New group created',
    subtitle: 'Office Team Lunch',
    meta: '3 members • 2 days ago',
    iconType: 'group',
    hasChevron: true,
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecentActivity = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      const response = await apiRequest<{ expenses: any[] }>({
        method: 'get',
        url: '/api/expenses',
        token,
      });

      // Sort by creation date descending, take top 5
      const sorted = (response?.expenses || [])
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      const items = sorted.map((exp) => {
        const creatorId = exp.createdBy?.id || exp.createdBy?.toString() || '';
        const userPaid = creatorId === user?.id;
        const groupName = exp.groupName || 'Personal Split';
        
        let dateStr = 'Recent';
        if (exp.createdAt) {
          const diffMs = new Date().getTime() - new Date(exp.createdAt).getTime();
          const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
          if (diffHrs < 1) {
            dateStr = 'Just now';
          } else if (diffHrs < 24) {
            dateStr = `${diffHrs}h ago`;
          } else {
            dateStr = `${Math.floor(diffHrs / 24)}d ago`;
          }
        }

        return {
          id: exp.id,
          title: userPaid ? 'You added an expense' : `${exp.createdBy?.name || 'A friend'} added an expense`,
          subtitle: exp.description,
          meta: `${groupName} • ${dateStr}`,
          amount: `₹${exp.amount.toFixed(2)}`,
          amountColor: userPaid ? '#111827' : '#eb5a4f',
          iconType: userPaid ? 'up' : 'down',
        };
      });

      setActivities(items);
    } catch (error) {
      console.error('Failed to fetch recent activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRecentActivity();
    }
  }, [user]);

  const renderActivityIcon = (type: ActivityItem['iconType']) => {
    if (type === 'up') {
      return (
        <View style={[styles.activityIconWrap, { backgroundColor: palette.primaryLight }]}>
          <Icon name="ArrowUpRight" size={18} color={palette.primaryDeep} />
        </View>
      );
    }
    if (type === 'down') {
      return (
        <View style={[styles.activityIconWrap, { backgroundColor: palette.primaryLight }]}>
          <Icon name="ArrowDownLeft" size={18} color={palette.primaryDeep} />
        </View>
      );
    }
    return (
      <View style={[styles.activityIconWrap, { backgroundColor: palette.primaryLight }]}>
        <Icon name="Users" size={18} color={palette.primaryDeep} />
      </View>
    );
  };

  const greetingFor = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <ScreenContainer
      contentStyle={{ gap: spacing.lg }}
      header={
        <View style={{ paddingHorizontal: layout.gutter }}>
          <Navbar />
        </View>
      }
    >
      <View style={styles.heroSection}>
        <LinearGradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          colors={['rgba(102, 204, 68, 0.16)', 'rgba(102, 204, 68, 0.04)', 'transparent']}
          locations={[0, 0.4, 1]}
          style={[
            StyleSheet.absoluteFill,
            {
              width: 250,
              height: 250,
              top: -80,
              left: -80,
              borderRadius: 200,
            },
          ]}
        />

        <View style={styles.greetingBlock}>
          <AppText variant="caption" color="textSecondary">
            {greetingFor()},
          </AppText>
          <View style={styles.greetingNameRow}>
            <AppText variant="display" color="textPrimary" weight="bold">
              {user?.fullName || 'User'}
            </AppText>
            <AppText style={styles.greetingLeaf}>🌿</AppText>
          </View>
          <AppText variant="caption" color="textSecondary" style={styles.greetingTagline}>
            {'Split expenses, not friendships.\nKeep it simple, keep it fair.'}
          </AppText>
        </View>
      </View>

      <View style={styles.quickActionsGrid}>
        {QUICK_ACTIONS.map((action) => {
          return (
            <Card
              key={action.id}
              variant="elevated"
              padding={16}
              style={styles.quickActionCard}
              onPress={() => router.push(action.href)}
            >
              <View style={styles.quickActionIconWrap}>
                <Icon name={action.icon} size={22} color={palette.primaryDeep} />
              </View>
              <AppText variant="bodySm" color="textPrimary" weight="bold" style={styles.quickActionTitle}>
                {action.title}
              </AppText>
              <AppText variant="micro" color="textSecondary" style={styles.quickActionSubtitle}>
                {action.subtitle}
              </AppText>
            </Card>
          );
        })}
      </View>

      <View style={styles.sectionHeaderRow}>
        <AppText variant="title" color="textPrimary" weight="bold">
          Recent Activity
        </AppText>
        <Pressable onPress={() => router.push('/(tabs)/NonGroupExpenses')}>
          <AppText variant="caption" color="primaryDeep" weight="bold">
            View all
          </AppText>
        </Pressable>
      </View>

      <Card variant="elevated" padding={0} style={styles.activitiesCard}>
        {loading ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <ActivityIndicator color={palette.primaryDeep} />
          </View>
        ) : activities.length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <AppText variant="caption" color="textSecondary">
              No recent activity.
            </AppText>
          </View>
        ) : (
          activities.map((item, index) => (
            <View
              key={item.id}
              style={[styles.activityRow, index !== activities.length - 1 && styles.divider]}
            >
              {renderActivityIcon(item.iconType)}
              <View style={styles.activityTextWrap}>
                <AppText variant="bodySm" color="textPrimary" weight="bold" numberOfLines={1}>
                  {item.title}
                </AppText>
                <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                  {item.subtitle}
                </AppText>
                <AppText variant="micro" color="textTertiary">
                  {item.meta}
                </AppText>
              </View>
              <AppText
                variant="bodySm"
                weight="bold"
                style={{ color: item.amountColor === '#eb5a4f' ? palette.danger : palette.textPrimary }}
              >
                {item.amount}
              </AppText>
            </View>
          ))
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
              Stay light.
            </AppText>
            <AppText variant="title" color="textPrimary" weight="bold">
              {"We'll handle the splits."}
            </AppText>
            <AppText style={styles.footerBannerWave}>{'〜'}</AppText>
          </View>
        </ImageBackground>
      </View>

      {/* Floating Add Expense Button */}
      <PressableScale
        style={styles.addExpenseRectBtn}
        onPress={() => router.push('/(tabs)/AddNewExpense')}
      >
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.btnContent}>
          <Icon name="Plus" size={16} color={palette.white} />
          <AppText variant="bodySm" color="onDark" weight="bold">
            Add Expense
          </AppText>
        </View>
      </PressableScale>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    width: '100%',
  },
  greetingBlock: {
    paddingTop: spacing.sm,
    gap: 2,
  },
  greetingNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  greetingLeaf: {
    fontSize: 24,
    marginLeft: 4,
  },
  greetingTagline: {
    marginTop: 6,
    lineHeight: 18,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.sm,
  },
  quickActionCard: {
    width: '48%',
    minHeight: 110,
    gap: spacing.xs,
  },
  quickActionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primaryLight,
  },
  quickActionTitle: {
    lineHeight: 18,
    marginTop: 2,
  },
  quickActionSubtitle: {
    lineHeight: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  activitiesCard: {
    paddingHorizontal: spacing.base,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  activityIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTextWrap: {
    flex: 1,
    gap: 1,
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
  footerBannerWave: {
    fontSize: 16,
    color: palette.primaryDeep,
    marginTop: 4,
  },
  addExpenseRectBtn: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: radius.pill,
    overflow: 'hidden',
    ...shadows.primary,
    zIndex: 999,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: '100%',
  },
});