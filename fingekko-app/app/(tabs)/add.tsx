import { useUser } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Handshake,
  Menu,
  Plus,
  Scroll,
  Users,
} from 'lucide-react-native';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type QuickAction = {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
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
    icon: Plus,
    href: '/(tabs)/AddNewExpense',
  },
  {
    id: 'your-groups',
    title: 'Your Groups',
    subtitle: 'Open the groups screen',
    icon: Users,
    href: '/(tabs)/YourGroups',
  },
  {
    id: 'non-group-expenses',
    title: 'Non Group Expenses',
    subtitle: 'Open the non-group screen',
    icon: ArrowDownLeft,
    href: '/(tabs)/NonGroupExpenses',
  },
  {
    id: 'friends',
    title: 'Friends',
    subtitle: 'Open the friends screen',
    icon: Handshake,
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

  const renderActivityIcon = (type: ActivityItem['iconType']) => {
    if (type === 'up') {
      return (
        <View style={[styles.activityIconWrap, { backgroundColor: '#edf9f1' }]}>
          <ArrowUpRight size={18} color="#148a46" />
        </View>
      );
    }
    if (type === 'down') {
      return (
        <View style={[styles.activityIconWrap, { backgroundColor: '#edf9f1' }]}>
          <ArrowDownLeft size={18} color="#148a46" />
        </View>
      );
    }
    return (
      <View style={[styles.activityIconWrap, { backgroundColor: '#edf9f1' }]}>
        <Users size={18} color="#148a46" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <View style={styles.heroSection}>
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            colors={['rgba(34,197,94,0.25)', 'rgba(34,197,94,0.08)', 'transparent']}
            locations={[0, 0.35, 1]}
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

          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <View style={styles.logoCircle}>
                <Text style={styles.logoEmoji}>🌿</Text>
              </View>
              <Text style={styles.brandTitle}>GekkoSplit</Text>
            </View>
            <Pressable style={styles.menuButton}>
              <Menu size={20} color="#1f2937" />
            </Pressable>
          </View>

          <View style={styles.greetingBlock}>
            <Text style={styles.greetingSmall}>Good Morning,</Text>
            <View style={styles.greetingNameRow}>
              <Text style={styles.greetingName}>{user?.fullName || 'User'}</Text>
              <Text style={styles.greetingLeaf}>🌿</Text>
            </View>
            <Text style={styles.greetingTagline}>
              {'Split expenses, not friendships.\nKeep it simple, keep it fair.'}
            </Text>
          </View>
        </View>

        <View style={styles.quickActionsGrid}>
          {QUICK_ACTIONS.map((action) => {
            const ActionIcon = action.icon;

            return (
              <Pressable
                key={action.id}
                style={styles.quickActionCard}
                onPress={() => router.push(action.href)}
              >
                <View style={styles.quickActionIconWrap}>
                  <ActionIcon size={22} color="#148a46" />
                </View>
                <Text style={styles.quickActionTitle}>{action.title}</Text>
                <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>Recent Activity</Text>
          <Text style={styles.sectionLink}>View all</Text>
        </View>

        <View style={styles.card}>
          {ACTIVITY.map((item, index) => (
            <View
              key={item.id}
              style={[styles.activityRow, index !== ACTIVITY.length - 1 && styles.divider]}
            >
              {renderActivityIcon(item.iconType)}
              <View style={styles.activityTextWrap}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
                <Text style={styles.activityMeta}>{item.meta}</Text>
              </View>
              {item.amount ? (
                <Text style={[styles.activityAmount, { color: item.amountColor }]}>
                  {item.amount}
                </Text>
              ) : (
                item.hasChevron && <ChevronRight size={16} color="#9ca3af" />
              )}
            </View>
          ))}
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
              <Text style={styles.footerBannerTitle}>Stay light.</Text>
              <Text style={styles.footerBannerTitle}>We'll handle the splits.</Text>
              <Text style={styles.footerBannerWave}>{'〜'}</Text>
            </View>
          </ImageBackground>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f5f8f5',
  },
  container: {
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
    paddingHorizontal: 20,
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
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  logoEmoji: {
    fontSize: 18,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.2,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  greetingBlock: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 4,
  },
  greetingSmall: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  greetingNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingName: {
    fontSize: 40,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -1,
  },
  greetingLeaf: {
    fontSize: 28,
    marginTop: 4,
  },
  greetingTagline: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 19,
    marginTop: 6,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    rowGap: 12,
  },
  quickActionCard: {
    width: '48%',
    minHeight: 118,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e9f3ec',
    padding: 16,
    gap: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  quickActionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eaf6ee',
    borderWidth: 1,
    borderColor: '#d4edda',
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 18,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#148a46',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e9f3ec',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f5f1',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  activityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTextWrap: {
    flex: 1,
    gap: 1,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  activityMeta: {
    fontSize: 11,
    color: '#9ca3af',
  },
  activityAmount: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  footerBanner: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  footerBannerBg: {
    minHeight: 130,
    justifyContent: 'flex-end',
  },
  footerBannerBgImage: {
    borderRadius: 20,
  },
  footerBannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(240, 250, 242, 0.45)',
    borderRadius: 20,
  },
  footerBannerContent: {
    padding: 20,
    paddingBottom: 18,
  },
  footerBannerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  footerBannerWave: {
    fontSize: 20,
    color: '#148a46',
    marginTop: 8,
  },
});