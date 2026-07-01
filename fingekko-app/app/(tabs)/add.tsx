import { apiRequest } from '@/utils/api';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Menu,
  Plus,
  Users,
} from 'lucide-react-native';
import { useState, useEffect } from 'react';
import {
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing } from '../../constants/Colors';

type GroupFromAPI = {
  id: string;
  name: string;
  members: string[];
  balance: number;
};


type GroupItem = {
  id: string;
  name: string;
  members: string;
  icon: string;
  amountLabel: string;
  amount: string;
  amountColor: string;
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

const GROUPS: GroupItem[] = [
  {
    id: 'goa',
    name: 'Goa Trip',
    members: '4 members',
    icon: '👥',
    amountLabel: 'You are owed',
    amount: '₹1,250',
    amountColor: '#148a46',
  },
  {
    id: 'cafe',
    name: 'Weekend Cafe',
    members: '3 members',
    icon: '☕',
    amountLabel: 'You owe',
    amount: '₹320',
    amountColor: '#eb5a4f',
  },
  {
    id: 'pg',
    name: 'PG Expenses',
    members: '2 members',
    icon: '🏠',
    amountLabel: 'You are settled up',
    amount: '₹0',
    amountColor: '#148a46',
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
  const { getToken, isSignedIn } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [group, setGroup] = useState<GroupItem[]>([]);

  const { user } = useUser();

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Missing auth token');

        const response = await apiRequest<GroupFromAPI[]>({
          method: 'get',
          url: '/api/groups',
          token,
        });
        const formattedGroups: GroupItem[] = response.map((g) => ({
          id: g.id,
          name: g.name,
          members: `${g.members.length} members`,
          icon: '👥',
          amountLabel: g.balance >= 0 ? 'You are owed' : 'You owe',
          amount: `₹${Math.abs(g.balance)}`,
          amountColor: g.balance >= 0 ? '#148a46' : '#eb5a4f',
        }));

        setGroup(formattedGroups);
      } catch (err) {
        console.error('Error fetching groups:', err);
        Alert.alert('Error', 'Failed to load groups');
      }
    };

    if (isSignedIn) {
      fetchGroups();
    }
  }, [isSignedIn, getToken]);

  const openModal = () => {
    setError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSave = async () => {
    setError('');

    if (!isSignedIn) {
      setError('Please sign in to add an expense.');
      return;
    }

    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError('Enter a valid amount.');
      return;
    }

    if (!category.trim()) {
      setError('Category is required.');
      return;
    }

    if (!date.trim()) {
      setError('Date is required.');
      return;
    }

    setIsSaving(true);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Missing auth token');
      }

      /*await apiRequest(
        '/api/transactions',
        {
          method: 'POST',
          body: JSON.stringify({
            type: transactionType,
            amount: amountValue,
            category: category.trim(),
            date: date.trim(),
          }),
        },
        token,
      );*/

      setAmount('');
      setCategory('');
      setTransactionType('expense');
      setDate(new Date().toISOString().split('T')[0]);
      setIsModalOpen(false);
      Alert.alert('Saved', 'Expense added successfully.');
    } catch (saveError) {
      setError('Unable to save the expense.');
    } finally {
      setIsSaving(false);
    }
  };

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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* ─── Hero / Header with background image ─── */}
        <View style={styles.heroSection}>
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            colors={[
              'rgba(34,197,94,0.25)',
              'rgba(34,197,94,0.08)',
              'transparent'
            ]}
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
          {/* Top bar */}
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

          {/* Greeting */}
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

        {/* ─── Add New Expense CTA Card ─── */}
        <Pressable style={styles.addExpenseCard} onPress={openModal}>
          <View style={styles.addExpenseIconWrap}>
            <Plus size={24} color="#148a46" />
          </View>
          <View style={styles.addExpenseCopy}>
            <Text style={styles.addExpenseTitle}>Add New Expense</Text>
            <Text style={styles.addExpenseSubtitle}>
              Add an expense and{'\n'}split with your group
            </Text>
          </View>
          <ChevronRight size={18} color="#9ca3af" />
        </Pressable>

        {/* ─── Your Groups ─── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>Your Groups</Text>
          <Text style={styles.sectionLink}>View all</Text>
        </View>

        <View style={styles.card}>
          {group.map((item, index) => (
            <Pressable
              key={item.id}
              style={[
                styles.groupRow,
                index !== group.length - 1 && styles.divider,
              ]}
            >
              <View style={styles.groupIconWrap}>
                <Text style={styles.groupIconEmoji}>{item.icon}</Text>
              </View>
              <View style={styles.groupTextWrap}>
                <Text style={styles.groupName}>{item.name}</Text>
                <Text style={styles.groupMembers}>{item.members}</Text>
              </View>
              <View style={styles.groupRight}>
                <Text style={styles.groupStatusLabel}>{item.amountLabel}</Text>
                <Text style={[styles.groupAmount, { color: item.amountColor }]}>
                  {item.amount}
                </Text>
              </View>
              <ChevronRight size={16} color="#9ca3af" style={styles.groupChevron} />
            </Pressable>
          ))}
        </View>

        {/* ─── Recent Activity ─── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>Recent Activity</Text>
          <Text style={styles.sectionLink}>View all</Text>
        </View>

        <View style={styles.card}>
          {ACTIVITY.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.activityRow,
                index !== ACTIVITY.length - 1 && styles.divider,
              ]}
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

        {/* ─── Footer Banner ─── */}
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

      {/* ─── Add Expense Modal ─── */}
      <Modal transparent visible={isModalOpen} animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add expense</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Amount</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                style={styles.fieldInput}
                placeholder="0"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Category</Text>
              <TextInput
                value={category}
                onChangeText={setCategory}
                style={styles.fieldInput}
                placeholder="Dinner, Rent, Taxi"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Date</Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                style={styles.fieldInput}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.typeRow}>
              <Pressable
                style={[
                  styles.typeButton,
                  transactionType === 'expense' && styles.typeButtonActive,
                ]}
                onPress={() => setTransactionType('expense')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    transactionType === 'expense' && styles.typeButtonTextActive,
                  ]}
                >
                  Expense
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.typeButton,
                  transactionType === 'income' && styles.typeButtonActive,
                ]}
                onPress={() => setTransactionType('income')}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    transactionType === 'income' && styles.typeButtonTextActive,
                  ]}
                >
                  Income
                </Text>
              </Pressable>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable style={styles.secondaryButton} onPress={closeModal}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                <Text style={styles.primaryButtonText}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  // ── Hero ──
  heroSection: {
    width: '100%',
  },
  heroBg: {
    width: '100%',
    minHeight: 280,
    paddingBottom: 32,
  },
  heroBgImage: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },

  // ── Top Bar ──
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

  // ── Greeting ──
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

  // ── Add Expense CTA ──
  addExpenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#e9f3ec',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 4,
  },
  addExpenseIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#eaf6ee',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d4edda',
  },
  addExpenseCopy: {
    flex: 1,
    gap: 3,
  },
  addExpenseTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  addExpenseSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 17,
  },

  // ── Section Headers ──
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

  // ── Card ──
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

  // ── Groups ──
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 12,
  },
  groupIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#eaf6ee',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d4edda',
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
    fontWeight: '700',
    color: '#111827',
  },
  groupMembers: {
    fontSize: 12,
    color: '#6b7280',
  },
  groupRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  groupStatusLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  groupAmount: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  groupChevron: {
    marginLeft: 4,
  },

  // ── Activity ──
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

  // ── Footer Banner ──
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

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: Spacing.base,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  typeButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(50, 198, 114, 0.12)',
  },
  typeButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  typeButtonTextActive: {
    color: Colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  secondaryButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  primaryButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textLight,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  errorText: {
    color: Colors.expense,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
});