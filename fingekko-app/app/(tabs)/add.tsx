import { apiRequest } from '@/utils/api';
import { useAuth } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import {
    ArrowDownLeft,
    ArrowUpRight,
    ChevronRight,
    CircleDollarSign,
    Plus,
    ReceiptText,
    Search,
    Sparkles,
    Users,
    Wallet,
} from 'lucide-react-native';
import { type ElementType, useState } from 'react';
import {
    Alert,
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

type StatCard = {
  label: string;
  amount: string;
  detail: string;
  icon: ElementType;
  tint: string;
  background: string;
};

type GroupCard = {
  name: string;
  members: string;
  avatars: string[];
  amount: string;
  amountLabel: string;
  tint: string;
};

type ActivityCard = {
  name: string;
  detail: string;
  amount: string;
  amountColor: string;
  icon: ElementType;
  iconBackground: string;
  iconColor: string;
};

const OVERVIEW_CARDS: StatCard[] = [
  {
    label: 'You are owed',
    amount: '₹1,250',
    detail: 'from 2 people',
    icon: ArrowDownLeft,
    tint: '#148a46',
    background: '#edf9f1',
  },
  {
    label: 'You owe',
    amount: '₹850',
    detail: 'to 1 person',
    icon: ArrowUpRight,
    tint: '#eb5a4f',
    background: '#fff0ef',
  },
  {
    label: 'Total balance',
    amount: '₹400',
    detail: 'Net balance',
    icon: Wallet,
    tint: '#8b5cf6',
    background: '#f2edff',
  },
];

const GROUPS: GroupCard[] = [
  {
    name: 'Goa Trip',
    members: '4 members',
    avatars: ['🌴', '🧢', '☀️', '🧉'],
    amount: '₹1,250',
    amountLabel: 'You are owed',
    tint: '#148a46',
  },
  {
    name: 'Roommates',
    members: '3 members',
    avatars: ['🏠', '🪴', '☕'],
    amount: '₹850',
    amountLabel: 'You owe',
    tint: '#eb5a4f',
  },
  {
    name: 'Weekend Dinner',
    members: '5 members',
    avatars: ['🍕', '🍝', '🥤', '🧡', '🍰'],
    amount: '₹320',
    amountLabel: 'You are owed',
    tint: '#148a46',
  },
];

const ACTIVITY: ActivityCard[] = [
  {
    name: 'Weekend Dinner',
    detail: 'You paid ₹1,600',
    amount: '₹320',
    amountColor: '#148a46',
    icon: ReceiptText,
    iconBackground: '#fff1e2',
    iconColor: '#f97316',
  },
  {
    name: 'Goa Trip',
    detail: 'Alex paid ₹2,500',
    amount: '₹750',
    amountColor: '#148a46',
    icon: CircleDollarSign,
    iconBackground: '#edf5ff',
    iconColor: '#3b82f6',
  },
  {
    name: 'Groceries',
    detail: 'You paid ₹1,200',
    amount: '₹450',
    amountColor: '#eb5a4f',
    icon: Sparkles,
    iconBackground: '#fff1f4',
    iconColor: '#f43f5e',
  },
];

export default function AddScreen() {
  const { getToken, isSignedIn } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

      await apiRequest('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({
          type: transactionType,
          amount: amountValue,
          category: category.trim(),
          date: date.trim(),
        }),
      }, token);

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

  return (
    <SafeAreaView style={styles.page}>
      <LinearGradient
        colors={['#f1fbf4', '#fbfdfb', '#f8faf8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.orbTopLeft} />
      <View style={styles.orbBottomRight} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <View style={styles.topBar}>
          <View style={styles.brandBlock}>
            <Text style={styles.brandTitle}>Splitwise</Text>
            <View style={styles.brandBadge}>
              <Users size={12} color="#16813f" />
              <Text style={styles.brandBadgeText}>shared expenses</Text>
            </View>
          </View>

          <View style={styles.topBarActions}>
            <Pressable style={styles.iconButton}>
              <Search size={18} color="#1f2937" />
            </Pressable>
            <Pressable style={styles.primaryIconButton} onPress={openModal}>
              <Plus size={18} color="#ffffff" />
            </Pressable>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Track shared expenses</Text>
            <Text style={styles.heroTitleAccent}>and settle dues easily.</Text>
          </View>

          <View style={styles.heroIllustration}>
            <View style={[styles.heroAvatar, styles.heroAvatarLeft]}>
              <Text style={styles.heroAvatarEmoji}>🧑‍🤝‍🧑</Text>
            </View>
            <View style={[styles.heroAvatar, styles.heroAvatarRight]}>
              <Text style={styles.heroAvatarEmoji}>🧾</Text>
            </View>
            <View style={styles.heroSparkleOne} />
            <View style={styles.heroSparkleTwo} />
            <View style={styles.heroNoteBubble}>
              <Text style={styles.heroNoteText}>Split</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Overview</Text>
          <View style={styles.overviewRow}>
            {OVERVIEW_CARDS.map((card) => {
              const Icon = card.icon;

              return (
                <View key={card.label} style={styles.overviewCard}>
                  <View style={[styles.overviewIconWrap, { backgroundColor: card.background }]}>
                    <Icon size={16} color={card.tint} />
                  </View>
                  <Text style={[styles.overviewAmount, { color: card.tint }]}>{card.amount}</Text>
                  <Text style={styles.overviewLabel}>{card.label}</Text>
                  <Text style={styles.overviewDetail}>{card.detail}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>Your Groups</Text>
          <Text style={styles.sectionLink}>View all</Text>
        </View>

        <View style={styles.card}>
          {GROUPS.map((group, index) => (
            <View key={group.name} style={[styles.groupRow, index !== GROUPS.length - 1 && styles.divider]}>
              <View style={styles.groupLeft}>
                <View style={styles.groupAvatarWrap}>
                  {group.avatars.slice(0, 3).map((avatar, avatarIndex) => (
                    <View
                      key={`${group.name}-${avatar}`}
                      style={[
                        styles.groupAvatar,
                        {
                          backgroundColor: avatarIndex === 0 ? '#dcfce7' : avatarIndex === 1 ? '#eef2ff' : '#ffe4e6',
                          marginLeft: avatarIndex === 0 ? 0 : -8,
                          zIndex: 3 - avatarIndex,
                        },
                      ]}
                    >
                      <Text style={styles.groupAvatarEmoji}>{avatar}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.groupTextWrap}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupMembers}>{group.members}</Text>
                  <View style={styles.memberDots}>
                    {group.avatars.map((avatar, avatarIndex) => (
                      <View
                        key={`${group.name}-dot-${avatarIndex}`}
                        style={[
                          styles.memberDot,
                          {
                            marginLeft: avatarIndex === 0 ? 0 : -6,
                            backgroundColor:
                              avatarIndex % 3 === 0 ? '#d1fae5' : avatarIndex % 3 === 1 ? '#dbeafe' : '#fce7f3',
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.groupRight}>
                <Text style={styles.groupStatusLabel}>{group.amountLabel}</Text>
                <Text style={[styles.groupAmount, { color: group.tint }]}>{group.amount}</Text>
                <ChevronRight size={16} color="#9ca3af" />
              </View>
            </View>
          ))}
        </View>

        <LinearGradient
          colors={['#ecf9ef', '#f7fbf8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bannerCard}
        >
          <View style={styles.bannerLeft}>
            <View style={styles.bannerIconWrap}>
              <Text style={styles.bannerIcon}>₹</Text>
            </View>
            <View style={styles.bannerCopy}>
              <Text style={styles.bannerTitle}>Split any expense in seconds!</Text>
              <Text style={styles.bannerText}>Add an expense, split it with friends and settle up.</Text>
            </View>
          </View>

          <View style={styles.bannerActions}>
            <Pressable style={styles.bannerPrimaryButton} onPress={openModal}>
              <Text style={styles.bannerPrimaryButtonText}>+ Add Expense</Text>
            </Pressable>
            <Pressable style={styles.bannerSecondaryButton}>
              <Text style={styles.bannerSecondaryButtonText}>How it works</Text>
            </Pressable>
          </View>
        </LinearGradient>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>Recent Activity</Text>
          <Text style={styles.sectionLink}>View all</Text>
        </View>

        <View style={styles.card}>
          {ACTIVITY.map((item, index) => {
            const Icon = item.icon;

            return (
              <View
                key={item.name}
                style={[styles.activityRow, index !== ACTIVITY.length - 1 && styles.divider]}
              >
                <View style={[styles.activityIconWrap, { backgroundColor: item.iconBackground }]}>
                  <Icon size={16} color={item.iconColor} />
                </View>

                <View style={styles.activityTextWrap}>
                  <Text style={styles.activityTitle}>{item.name}</Text>
                  <Text style={styles.activityDetail}>{item.detail}</Text>
                </View>

                <View style={styles.activityAmountWrap}>
                  <Text style={[styles.activityStatus, { color: item.amountColor }]}>You are owed</Text>
                  <Text style={[styles.activityAmount, { color: item.amountColor }]}>{item.amount}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

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
    backgroundColor: '#f7fbf7',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 14,
  },
  orbTopLeft: {
    position: 'absolute',
    top: -36,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  orbBottomRight: {
    position: 'absolute',
    right: -52,
    bottom: 110,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(16, 185, 129, 0.07)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  brandBlock: {
    gap: 4,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.2,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#edf9f1',
    borderWidth: 1,
    borderColor: '#d6f2df',
  },
  brandBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: '#16813f',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8efe9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  primaryIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  heroCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e9f3ec',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 6,
    overflow: 'hidden',
  },
  heroCopy: {
    flex: 1,
    paddingRight: 12,
    gap: 2,
  },
  heroTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.4,
  },
  heroTitleAccent: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: '#15803d',
    letterSpacing: -0.4,
  },
  heroIllustration: {
    width: 118,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatar: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  heroAvatarLeft: {
    left: 0,
    top: 16,
    backgroundColor: '#dcfce7',
    transform: [{ rotate: '-6deg' }],
  },
  heroAvatarRight: {
    right: 4,
    top: 8,
    backgroundColor: '#fef3c7',
    transform: [{ rotate: '8deg' }],
  },
  heroAvatarEmoji: {
    fontSize: 26,
  },
  heroSparkleOne: {
    position: 'absolute',
    right: 8,
    bottom: 24,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#86efac',
  },
  heroSparkleTwo: {
    position: 'absolute',
    right: 38,
    top: 14,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
  },
  heroNoteBubble: {
    position: 'absolute',
    right: 12,
    bottom: 0,
    minWidth: 52,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1fae5',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  heroNoteText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803d',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9f3ec',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 18,
    elevation: 4,
  },
  sectionLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  overviewRow: {
    flexDirection: 'row',
    gap: 10,
  },
  overviewCard: {
    flex: 1,
    borderRadius: 18,
    padding: 12,
    backgroundColor: '#f8fbf9',
    gap: 5,
  },
  overviewIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewAmount: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  overviewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  overviewDetail: {
    fontSize: 10,
    color: '#6b7280',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16813f',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#eef4ef',
  },
  groupLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupAvatarWrap: {
    width: 42,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  groupAvatarEmoji: {
    fontSize: 16,
  },
  groupTextWrap: {
    flex: 1,
    gap: 1,
  },
  groupName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  groupMembers: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 6,
  },
  memberDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  groupRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  groupStatusLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6b7280',
  },
  groupAmount: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  bannerCard: {
    borderRadius: 22,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#daf0df',
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#eaf8ee',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d6f2df',
  },
  bannerIcon: {
    fontSize: 24,
    fontWeight: '800',
    color: '#16813f',
  },
  bannerCopy: {
    flex: 1,
    gap: 4,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#14532d',
  },
  bannerText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#4b5563',
  },
  bannerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  bannerPrimaryButton: {
    flex: 1,
    backgroundColor: '#16813f',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerPrimaryButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  bannerSecondaryButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbeee0',
  },
  bannerSecondaryButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
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
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  activityIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTextWrap: {
    flex: 1,
    gap: 2,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  activityDetail: {
    fontSize: 11,
    color: '#6b7280',
  },
  activityAmountWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  activityStatus: {
    fontSize: 10,
    fontWeight: '700',
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
