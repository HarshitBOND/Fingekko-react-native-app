import type { FriendsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import Icon from '../../components/ui/Icon';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import Toast from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import { palette, spacing, radius, shadows, fontFamily, layout } from '../../constants/design';

const CATEGORIES = ['Food', 'Travel', 'Shopping', 'Bills', 'Entertainment', 'Other'];

const getInitials = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

/**
 * Splitwise-style expense composer: participants go in an inline "With you and:"
 * field with chips, the description/amount sit centered as the hero, and the
 * split terms read as a sentence — "Paid by [you] and split [equally]".
 *
 * The two pills map onto the backend's four splitType values, so the payload
 * is byte-for-byte what the old form sent:
 *   you   + equally -> equalPaidByYou
 *   them  + equally -> equalPaidByOthers
 *   you   + full    -> fullyOwedPaidByYou      (they owe the whole amount)
 *   them  + full    -> fullyOwedPaidByOthers   (you owe the whole amount)
 */
export default function AddNewExpense() {
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();

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
  const [paidByYou, setPaidByYou] = useState(true);
  const [splitEqually, setSplitEqually] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [participantsFocused, setParticipantsFocused] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const { toast, showToast, dismissToast } = useToast();

  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    let active = true;

    const loadFriends = async () => {
      if (!isSignedIn) return;
      setLoadingFriends(true);
      try {
        const token = await getTokenRef.current();
        if (!token) return;
        const response = await apiRequest<FriendsResponse>(`/api/friends`, {}, token);
        if (active) setFriends(response);
      } catch {
        if (active) setError('Unable to load friends for splitting.');
      } finally {
        if (active) setLoadingFriends(false);
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

  // Suggestions under the "With you and:" field — everyone while browsing,
  // narrowed as you type, minus people already picked.
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return acceptedFriends.filter((f) => {
      if (selectedFriendIds.includes(f.friend.id)) return false;
      if (!q) return true;
      return (
        f.friend.name.toLowerCase().includes(q) || f.friend.email.toLowerCase().includes(q)
      );
    });
  }, [acceptedFriends, selectedFriendIds, query]);

  const suggestionsVisible = participantsFocused || query.trim() !== '';

  const addFriend = (friendId: string) => {
    setSelectedFriendIds((current) =>
      current.includes(friendId) ? current : [...current, friendId]
    );
    setQuery('');
  };

  const removeFriend = (friendId: string) => {
    setSelectedFriendIds((current) => current.filter((id) => id !== friendId));
  };

  const selectedSplitType = paidByYou
    ? splitEqually
      ? 'equalPaidByYou'
      : 'fullyOwedPaidByYou'
    : splitEqually
      ? 'equalPaidByOthers'
      : 'fullyOwedPaidByOthers';

  const canSave =
    !saving &&
    Number(amount) > 0 &&
    description.trim() !== '' &&
    selectedFriendIds.length > 0;

  const handleSave = async () => {
    setError('');

    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (!description.trim()) {
      setError('Enter a description.');
      return;
    }
    if (!date.trim()) {
      setError('Date is required.');
      return;
    }
    if (selectedFriendIds.length === 0) {
      setError('Add at least one person to split with.');
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
      const isPaidByOther = !paidByYou;

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
      setPaidByYou(true);
      setSplitEqually(true);

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

  const otherName = selectedFriends[0]?.friend.name.split(' ')[0] ?? 'them';

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <Toast toast={toast} onDismiss={dismissToast} />

      {/* Top bar: back / title / save-checkmark, Splitwise-style */}
      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={() => router.back()} hitSlop={6}>
          <Icon name="ArrowLeft" size={22} color={palette.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Add expense</Text>
        <Pressable
          style={[styles.headerButton, !canSave && styles.headerButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          hitSlop={6}
          accessibilityLabel="Save expense"
        >
          {saving ? (
            <ActivityIndicator size="small" color={palette.primaryDeep} />
          ) : (
            <Icon name="Check" size={24} color={canSave ? palette.primaryDeep : palette.textTertiary} />
          )}
        </Pressable>
      </View>

      {/* With you and: [chips + inline input] */}
      <View style={styles.withRow}>
        <Text style={styles.withLabel}>
          With <Text style={styles.withYou}>you</Text> and:
        </Text>
        <View style={styles.chipsAndInput}>
          {selectedFriends.map((f) => (
            <Pressable
              key={f.friend.id}
              style={styles.participantChip}
              onPress={() => removeFriend(f.friend.id)}
            >
              <Text style={styles.participantChipText} numberOfLines={1}>
                {f.friend.name.split(' ')[0]}
              </Text>
              <Icon name="X" size={12} color={palette.primaryDeep} />
            </Pressable>
          ))}
          <TextInput
            value={query}
            onChangeText={setQuery}
            onFocus={() => setParticipantsFocused(true)}
            onBlur={() => setParticipantsFocused(false)}
            placeholder={selectedFriends.length === 0 ? 'Enter names or emails' : 'Add more'}
            placeholderTextColor={palette.textTertiary}
            style={styles.participantInput}
            autoCapitalize="none"
          />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {suggestionsVisible ? (
          /* People list takes over while picking — same as Splitwise */
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.sectionLabel}>Friends</Text>
            {loadingFriends ? (
              <ActivityIndicator color={palette.primaryDeep} style={{ marginTop: spacing.lg }} />
            ) : suggestions.length === 0 ? (
              <Text style={styles.emptyText}>
                {acceptedFriends.length === 0
                  ? 'Add friends first to split expenses with them.'
                  : query.trim()
                    ? 'No one matches that search.'
                    : 'Everyone is already added.'}
              </Text>
            ) : (
              suggestions.map((friendship) => (
                <Pressable
                  key={friendship.id}
                  style={({ pressed }) => [styles.suggestionRow, pressed && { opacity: 0.6 }]}
                  onPress={() => addFriend(friendship.friend.id)}
                >
                  <View style={styles.suggestionAvatar}>
                    <Text style={styles.suggestionAvatarText}>{getInitials(friendship.friend.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suggestionName}>{friendship.friend.name}</Text>
                    <Text style={styles.suggestionEmail}>{friendship.friend.email}</Text>
                  </View>
                  <Icon name="Plus" size={18} color={palette.primaryDeep} />
                </Pressable>
              ))
            )}
          </ScrollView>
        ) : (
          /* The composer itself: centered description + amount + split sentence */
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.composer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.fieldRow}>
              <View style={styles.fieldIconBox}>
                <Icon name="StickyNote" size={22} color={palette.primaryDeep} />
              </View>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Enter a description"
                placeholderTextColor={palette.textTertiary}
                style={styles.descriptionInput}
              />
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldIconBox}>
                <Text style={styles.rupee}>₹</Text>
              </View>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={palette.textTertiary}
                style={styles.amountInput}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Paid by [you] and split [equally] */}
            <View style={styles.sentenceRow}>
              <Text style={styles.sentenceText}>Paid by</Text>
              <Pressable style={styles.sentencePill} onPress={() => setPaidByYou((v) => !v)}>
                <Text style={styles.sentencePillText}>{paidByYou ? 'you' : otherName}</Text>
              </Pressable>
              <Text style={styles.sentenceText}>and split</Text>
              <Pressable style={styles.sentencePill} onPress={() => setSplitEqually((v) => !v)}>
                <Text style={styles.sentencePillText}>{splitEqually ? 'equally' : 'full amount'}</Text>
              </Pressable>
            </View>
            {!splitEqually && (
              <Text style={styles.splitHint}>
                {paidByYou
                  ? `${otherName} owes you the full amount`
                  : `You owe ${otherName} the full amount`}
              </Text>
            )}

            {showDate && (
              <View style={styles.extraField}>
                <Icon name="Calendar" size={16} color={palette.textSecondary} />
                <TextInput
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={palette.textTertiary}
                  style={styles.extraInput}
                />
              </View>
            )}

            {showNotes && (
              <View style={[styles.extraField, styles.notesField]}>
                <Icon name="StickyNote" size={16} color={palette.textSecondary} />
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add a note"
                  placeholderTextColor={palette.textTertiary}
                  style={styles.extraInput}
                  multiline
                />
              </View>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>
        )}

        {/* Bottom utility bar: category on the left, date + notes icons right */}
        {!suggestionsVisible && (
          <View style={styles.bottomBar}>
            <Pressable style={styles.categoryButton} onPress={() => setCategoryPickerOpen(true)}>
              <Icon name="Utensils" size={16} color={palette.primaryDeep} />
              <Text style={styles.categoryButtonText}>{category || 'Category'}</Text>
            </Pressable>
            <View style={styles.bottomIcons}>
              <Pressable
                style={[styles.bottomIconBtn, showDate && styles.bottomIconBtnActive]}
                onPress={() => setShowDate((v) => !v)}
                accessibilityLabel="Set date"
              >
                <Icon name="Calendar" size={19} color={showDate ? palette.primaryDeep : palette.textSecondary} />
              </Pressable>
              <Pressable
                style={[styles.bottomIconBtn, showNotes && styles.bottomIconBtnActive]}
                onPress={() => setShowNotes((v) => !v)}
                accessibilityLabel="Add note"
              >
                <Icon name="StickyNote" size={19} color={showNotes ? palette.primaryDeep : palette.textSecondary} />
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Category select sheet (unchanged behavior) */}
      <Modal visible={categoryPickerOpen} animationType="slide" transparent onRequestClose={() => setCategoryPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCategoryPickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Category</Text>
            <ScrollView style={{ marginBottom: 8 }}>
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
                      <Icon name="CheckSquare2" size={20} color={palette.primaryDeep} />
                    ) : (
                      <Icon name="Circle" size={20} color={palette.textTertiary} />
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
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonDisabled: { opacity: 0.6 },
  headerTitle: {
    fontSize: 19,
    fontFamily: fontFamily.bold,
    color: palette.textPrimary,
  },

  withRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: layout.gutter,
    paddingVertical: spacing.md,
    backgroundColor: palette.card,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.divider,
  },
  withLabel: {
    fontSize: 16,
    fontFamily: fontFamily.medium,
    color: palette.textPrimary,
  },
  withYou: { fontFamily: fontFamily.bold },
  chipsAndInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    minWidth: 140,
  },
  participantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: palette.primaryLight,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
    maxWidth: 140,
  },
  participantChipText: {
    fontSize: 13,
    fontFamily: fontFamily.semibold,
    color: palette.primaryDeep,
    flexShrink: 1,
  },
  participantInput: {
    flexGrow: 1,
    minWidth: 110,
    fontSize: 15,
    color: palette.textPrimary,
    fontFamily: fontFamily.medium,
    paddingVertical: 4,
  },

  suggestionsList: {
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: fontFamily.semibold,
    color: palette.textSecondary,
    marginBottom: spacing.sm,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  suggestionAvatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionAvatarText: {
    fontSize: 15,
    fontFamily: fontFamily.bold,
    color: palette.primaryDeep,
  },
  suggestionName: {
    fontSize: 15,
    fontFamily: fontFamily.semibold,
    color: palette.textPrimary,
  },
  suggestionEmail: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    color: palette.textSecondary,
    marginTop: 1,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: palette.textSecondary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },

  composer: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: layout.gutter,
    gap: spacing.lg,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
    maxWidth: 340,
  },
  fieldIconBox: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.xs,
  },
  rupee: {
    fontSize: 22,
    fontFamily: fontFamily.bold,
    color: palette.primaryDeep,
  },
  descriptionInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: fontFamily.medium,
    color: palette.textPrimary,
    borderBottomWidth: 1.5,
    borderBottomColor: palette.borderStrong,
    paddingVertical: spacing.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: 30,
    fontFamily: fontFamily.bold,
    color: palette.textPrimary,
    borderBottomWidth: 1.5,
    borderBottomColor: palette.borderStrong,
    paddingVertical: spacing.xs,
  },
  sentenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  sentenceText: {
    fontSize: 16,
    fontFamily: fontFamily.medium,
    color: palette.textPrimary,
  },
  sentencePill: {
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: palette.card,
    ...shadows.xs,
  },
  sentencePillText: {
    fontSize: 15,
    fontFamily: fontFamily.semibold,
    color: palette.primaryDeep,
  },
  splitHint: {
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: palette.textSecondary,
  },
  extraField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    backgroundColor: palette.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  notesField: { alignItems: 'flex-start', minHeight: 70 },
  extraInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: palette.textPrimary,
    paddingVertical: 2,
  },
  errorText: {
    color: palette.danger,
    fontSize: 13,
    fontFamily: fontFamily.semibold,
    textAlign: 'center',
  },

  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.divider,
    backgroundColor: palette.card,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryLight,
  },
  categoryButtonText: {
    fontSize: 14,
    fontFamily: fontFamily.semibold,
    color: palette.primaryDeep,
  },
  bottomIcons: { flexDirection: 'row', gap: spacing.sm },
  bottomIconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  bottomIconBtnActive: {
    backgroundColor: palette.primaryLight,
    borderColor: palette.primary,
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
});
