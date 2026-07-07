import type { FriendsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Icon from '../../components/ui/Icon';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import { palette, spacing, radius, shadows, fontFamily, layout } from '../../constants/design';

// NOTE: swap this out for the real illustration when you have it.
// Suggested path: assets/wallet.png
const WALLET_ILLUSTRATION = require('../../assets/images/bgadd.png');

const CATEGORIES = ['Food', 'Travel', 'Shopping', 'Bills', 'Entertainment', 'Other'];

export default function AddNewExpense() {
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId?: string | string[] }>();

  // ---- form state (unchanged field names -> unchanged API payload) ----
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<string>('');

  const [friends, setFriends] = useState<FriendsResponse>({
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
  });
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [selectedSplitType, setSelectedSplitType] = useState<
    'equalPaidByYou' | 'equalPaidByOthers' | 'fullyOwedPaidByOthers' | 'fullyOwedPaidByYou'
  >('equalPaidByYou');
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [friendPickerOpen, setFriendPickerOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const { toast, showToast, dismissToast } = useToast();

  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    let active = true;

    const loadFriends = async () => {
      if (!isSignedIn) {
        return;
      }

      setLoadingFriends(true);

      try {
        const token = await getTokenRef.current();
        if (!token) {
          return;
        }

        const response = await apiRequest<FriendsResponse>(`/api/friends`, {}, token);

        if (active) {
          setFriends(response);
        }
      } catch (fetchError) {
        if (active) {
          setError('Unable to load friends for splitting.');
        }
      } finally {
        if (active) {
          setLoadingFriends(false);
        }
      }
    };

    loadFriends();

    return () => {
      active = false;
    };
  }, [isSignedIn]);

  const acceptedFriends = useMemo(() => friends.friends, [friends.friends]);

  const selectedFriends = useMemo(
    () => acceptedFriends.filter((f) => selectedFriendIds.includes(f.friend.id)),
    [acceptedFriends, selectedFriendIds]
  );

  const toggleFriend = (friendId: string) => {
    setSelectedFriendIds((current) =>
      current.includes(friendId) ? current.filter((id) => id !== friendId) : [...current, friendId]
    );
  };

  const friendsSummaryLabel = useMemo(() => {
    if (loadingFriends) return 'Loading friends...';
    if (selectedFriends.length === 0) return 'Select friends to split with';
    if (selectedFriends.length === 1) return selectedFriends[0].friend.name;
    return `${selectedFriends[0].friend.name} + ${selectedFriends.length - 1} more`;
  }, [selectedFriends, loadingFriends]);

  const handleSave = async () => {
    setError('');

    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError('Enter a valid amount.');
      return;
    }

    if (!description.trim()) {
      setError('Description is required.');
      return;
    }

    if (!date.trim()) {
      setError('Date is required.');
      return;
    }

    if (selectedFriendIds.length === 0) {
      setError('Select at least one friend to split with.');
      return;
    }

    try {
      setSaving(true);
      const token = await getTokenRef.current();

      if (!token) {
        setError('Sign in again to save this expense.');
        return;
      }

      const friendId = selectedFriendIds[0];
      const isPaidByOther =
        selectedSplitType === 'equalPaidByOthers' ||
        selectedSplitType === 'fullyOwedPaidByOthers';

      const response = await apiRequest<{
        expense: unknown;
        xpAward: { xp: number; level: number; leveledUp: boolean; xpDelta: number } | null;
      }>({
        method: 'post',
        url: '/api/expenses',
        token,
        data: {
          description: description.trim(),
          amount: amountValue,
          expenseDate: date,
          participantIds: selectedFriendIds,
          notes: notes.trim(),
          currency: 'INR',
          splitType: selectedSplitType,
          paidBy: isPaidByOther ? friendId : undefined,
          category: category || undefined,
        },
      });

      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setCategory('');
      setSelectedFriendIds([]);
      setSelectedSplitType('equalPaidByYou');

      const award = response?.xpAward;
      const xpLine = award
        ? award.leveledUp
          ? `+${award.xpDelta} XP — you reached Level ${award.level}! 🎉`
          : `+${award.xpDelta} XP earned ⚡`
        : 'Expense added successfully.';

      showToast({ title: 'Saved! 🎉', message: xpLine, tone: 'success', duration: 1600 });
      setTimeout(() => router.back(), 700);
    } catch (saveError: any) {
      setError(saveError.message || 'Could not save expense.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <Toast toast={toast} onDismiss={dismissToast} />
      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={() => router.back()}>
          <Icon name="ChevronLeft" size={20} color="#148a46" />
        </Pressable>
        <Text style={styles.headerTitle}>Add Expense</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <View style={styles.balanceCard}>
          <View style={styles.balanceIconWrap}>
            <Icon name="Flame" size={24} color="#000000" />
          </View>
          <View style={styles.balanceCopy}>
            <Text style={styles.balanceLabel}>Let&apos;s GekkoSplit!</Text>
            <Text style={styles.balanceValue}>Keep the calculations clean & the friendships closer! 🌿</Text>
          </View>
        </View>

        {groupId ? (
          <Text style={styles.groupHint}>Group: {Array.isArray(groupId) ? groupId[0] : groupId}</Text>
        ) : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Amount</Text>
          <View style={styles.inputWrap}>
            <View style={styles.iconBubble}>
              <Text style={styles.prefix}>₹</Text>
            </View>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              style={styles.fieldInput}
              placeholder="Enter amount"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Description</Text>
          <View style={styles.inputWrap}>
            <View style={styles.iconBubble}>
              <Icon name="StickyNote" size={18} color="#148a46" />
            </View>
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={styles.fieldInput}
              placeholder="Dinner, cab, groceries"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Category</Text>
          <Pressable style={styles.inputWrap} onPress={() => setCategoryPickerOpen(true)}>
            <View style={styles.iconBubble}>
              <Icon name="ShoppingBag" size={18} color="#148a46" />
            </View>
            <Text style={[styles.fieldInput, !category && styles.placeholderText]}>
              {category || 'Select category'}
            </Text>
            <Icon name="ChevronDown" size={18} color="#9ca3af" />
          </Pressable>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Date</Text>
          <View style={styles.inputWrap}>
            <View style={styles.iconBubble}>
              <Icon name="Calendar" size={18} color="#148a46" />
            </View>
            <TextInput
              value={date}
              onChangeText={setDate}
              style={styles.fieldInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Split With</Text>
          <Pressable style={styles.inputWrap} onPress={() => setFriendPickerOpen(true)}>
            <View style={styles.iconBubble}>
              <Icon name="Users" size={18} color="#148a46" />
            </View>
            <Text style={[styles.fieldInput, selectedFriends.length === 0 && styles.placeholderText]}>
              {friendsSummaryLabel}
            </Text>
            <Icon name="ChevronDown" size={18} color="#9ca3af" />
          </Pressable>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Notes (Optional)</Text>
          <View style={[styles.inputWrap, styles.textAreaWrap]}>
            <View style={styles.iconBubble}>
              <Icon name="StickyNote" size={18} color="#148a46" />
            </View>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              style={[styles.fieldInput, styles.textArea]}
              placeholder="Add a note"
              placeholderTextColor="#9ca3af"
              multiline
            />
          </View>
        </View>
        {/* Split Option Selection */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Split Option</Text>
          <View style={styles.splitTypeGrid}>
            <Pressable
              style={[styles.splitTypeBtn, selectedSplitType === 'equalPaidByYou' && styles.splitTypeBtnActive]}
              onPress={() => setSelectedSplitType('equalPaidByYou')}
            >
              <Text style={[styles.splitTypeBtnText, selectedSplitType === 'equalPaidByYou' && styles.splitTypeBtnTextActive]}>
                Paid by you, split equally
              </Text>
            </Pressable>

            <Pressable
              style={[styles.splitTypeBtn, selectedSplitType === 'equalPaidByOthers' && styles.splitTypeBtnActive]}
              onPress={() => setSelectedSplitType('equalPaidByOthers')}
            >
              <Text style={[styles.splitTypeBtnText, selectedSplitType === 'equalPaidByOthers' && styles.splitTypeBtnTextActive]}>
                Paid by other, split equally
              </Text>
            </Pressable>

            <Pressable
              style={[styles.splitTypeBtn, selectedSplitType === 'fullyOwedPaidByOthers' && styles.splitTypeBtnActive]}
              onPress={() => setSelectedSplitType('fullyOwedPaidByOthers')}
            >
              <Text style={[styles.splitTypeBtnText, selectedSplitType === 'fullyOwedPaidByOthers' && styles.splitTypeBtnTextActive]}>
                You owe the amount
              </Text>
            </Pressable>

            <Pressable
              style={[styles.splitTypeBtn, selectedSplitType === 'fullyOwedPaidByYou' && styles.splitTypeBtnActive]}
              onPress={() => setSelectedSplitType('fullyOwedPaidByYou')}
            >
              <Text style={[styles.splitTypeBtnText, selectedSplitType === 'fullyOwedPaidByYou' && styles.splitTypeBtnTextActive]}>
                He owes the amount
              </Text>
            </Pressable>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable style={styles.primaryButton} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>Add Expense</Text>
              <Icon name="ChevronRight" size={18} color="#ffffff" />
            </>
          )}
        </Pressable>
      </ScrollView>

      {/* Friends multi-select modal */}
      <Modal visible={friendPickerOpen} animationType="slide" transparent onRequestClose={() => setFriendPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setFriendPickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Friends</Text>

            <ScrollView style={styles.modalList}>
              {loadingFriends ? (
                <ActivityIndicator color="#148a46" style={{ marginVertical: 20 }} />
              ) : acceptedFriends.length === 0 ? (
                <View style={styles.emptyFriendsBox}>
                  <Icon name="Users" size={18} color="#148a46" />
                  <Text style={styles.helperText}>Add friends first to split expenses with them.</Text>
                </View>
              ) : (
                acceptedFriends.map((friendship) => {
                  const friendId = friendship.friend.id;
                  const selected = selectedFriendIds.includes(friendId);

                  return (
                    <Pressable key={friendship.id} style={styles.friendRow} onPress={() => toggleFriend(friendId)}>
                      <View style={styles.friendIdentity}>
                        <Text style={styles.friendName}>{friendship.friend.name}</Text>
                        <Text style={styles.friendEmail}>{friendship.friend.email}</Text>
                      </View>
                      {selected ? (
                        <Icon name="CheckSquare2" size={22} color="#148a46" />
                      ) : (
                        <Icon name="Circle" size={22} color="#94a3b8" />
                      )}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            <Pressable style={styles.modalDoneButton} onPress={() => setFriendPickerOpen(false)}>
              <Text style={styles.modalDoneText}>Done ({selectedFriendIds.length})</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Category select modal */}
      <Modal visible={categoryPickerOpen} animationType="slide" transparent onRequestClose={() => setCategoryPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCategoryPickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Category</Text>

            <ScrollView style={styles.modalList}>
              {CATEGORIES.map((item) => {
                const selected = category === item;
                return (
                  <Pressable
                    key={item}
                    style={styles.categoryRow}
                    onPress={() => {
                      setCategory(item);
                      setCategoryPickerOpen(false);
                    }}
                  >
                    <Text style={styles.categoryRowText}>{item}</Text>
                    {selected ? (
                      <Icon name="CheckSquare2" size={20} color="#148a46" />
                    ) : (
                      <Icon name="Circle" size={20} color="#94a3b8" />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: palette.bg,
  },
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
  headerTitle: {
    fontSize: 18,
    fontFamily: fontFamily.bold,
    color: palette.textPrimary,
  },
  container: {
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.base,
    paddingBottom: layout.navBarHeight + layout.navBarBottomInset + 28,
    gap: spacing.base,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: palette.primaryLight,
    ...shadows.sm,
  },
  balanceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCopy: {
    flex: 1,
    gap: 2,
  },
  balanceLabel: {
    fontSize: 13,
    color: palette.textSecondary,
    fontFamily: fontFamily.semibold,
  },
  balanceValue: {
    fontSize: 20,
    fontFamily: fontFamily.bold,
    color: palette.textPrimary,
  },
  balanceImage: {
    width: 56,
    height: 56,
  },
  groupHint: {
    fontSize: 12,
    fontFamily: fontFamily.bold,
    color: palette.textSecondary,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: fontFamily.bold,
    color: palette.textPrimary,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 50,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    backgroundColor: palette.card,
    borderWidth: 1.5,
    borderColor: palette.border,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: palette.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefix: {
    fontSize: 15,
    fontFamily: fontFamily.bold,
    color: palette.textPrimary,
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    color: palette.textPrimary,
    paddingVertical: 0,
    fontFamily: fontFamily.semibold,
  },
  placeholderText: {
    color: palette.textTertiary,
  },
  textAreaWrap: {
    minHeight: 80,
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  textArea: {
    minHeight: 50,
    textAlignVertical: 'top',
  },
  errorText: {
    color: palette.danger,
    fontSize: 13,
    fontFamily: fontFamily.bold,
  },
  primaryButton: {
    marginTop: spacing.sm,
    minHeight: 52,
    borderRadius: radius.pill,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...shadows.primary,
  },
  primaryButtonText: {
    color: palette.white,
    fontSize: 15,
    fontFamily: fontFamily.bold,
  },
  helperText: {
    flex: 1,
    fontSize: 13,
    color: palette.textSecondary,
    fontFamily: fontFamily.semibold,
  },
  emptyFriendsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.warningLight,
    marginVertical: 8,
  },
  friendRow: {
    minHeight: 50,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: palette.card,
    borderWidth: 1.5,
    borderColor: palette.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  friendIdentity: {
    gap: 2,
  },
  friendName: {
    fontSize: 14,
    fontFamily: fontFamily.bold,
    color: palette.textPrimary,
  },
  friendEmail: {
    fontSize: 12,
    color: palette.textSecondary,
    fontFamily: fontFamily.semibold,
  },
  categoryRow: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: palette.card,
    borderWidth: 1.5,
    borderColor: palette.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  categoryRowText: {
    fontSize: 14,
    fontFamily: fontFamily.bold,
    color: palette.textPrimary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: palette.card,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    maxHeight: '70%',
    ...shadows.lg,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.border,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: fontFamily.bold,
    color: palette.textPrimary,
    marginBottom: 12,
  },
  modalList: {
    marginBottom: 8,
  },
  modalDoneButton: {
    minHeight: 50,
    borderRadius: radius.pill,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    ...shadows.primary,
  },
  modalDoneText: {
    color: palette.white,
    fontSize: 15,
    fontFamily: fontFamily.bold,
  },
  splitTypeGrid: {
    gap: 8,
    marginTop: 4,
  },
  splitTypeBtn: {
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    ...shadows.xs,
  },
  splitTypeBtnActive: {
    backgroundColor: palette.primaryLight,
    borderColor: palette.primary,
  },
  splitTypeBtnText: {
    fontSize: 13,
    fontFamily: fontFamily.bold,
    color: palette.textSecondary,
  },
  splitTypeBtnTextActive: {
    color: palette.primaryDeep,
  },
});