import type { FriendsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Icon from '../../components/ui/Icon';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
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
import Button from '../../components/ui/Button';
import IconPickerModal from '../../components/ui/IconPickerModal';
import AdjustSplitModal from '../../components/groups/AdjustSplitModal';
import WhoPaidModal from '../../components/groups/WhoPaidModal';
import {
  PayerConfig,
  Person as SplitPerson,
  SplitConfig,
  payerLabel,
  resolvePayers,
  resolveSplit,
  splitLabel,
  sumValues,
} from '../../components/groups/splitModel';
import { useToast } from '../../hooks/useToast';
import { palette, spacing, radius, shadows, fontFamily, layout } from '../../constants/design';

// Each category carries a lucide icon (rendered via the Icon lucide fallback),
// shown in the picker and reflected on the category button once chosen.
const CATEGORY_ICONS: Record<string, string> = {
  Food: 'Utensils',
  Groceries: 'ShoppingCart',
  Travel: 'Plane',
  Transport: 'Car',
  Shopping: 'ShoppingBag',
  Bills: 'ReceiptText',
  Rent: 'House',
  Entertainment: 'Clapperboard',
  Health: 'HeartPulse',
  Gifts: 'Gift',
  Other: 'Tag',
};
const CATEGORIES = Object.keys(CATEGORY_ICONS);

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
  // When an expenseId is passed we're editing an existing split (PUT), not
  // creating one (POST). Reached from the expense detail screen's Edit button.
  const { expenseId, friendId } = useLocalSearchParams<{ expenseId?: string; friendId?: string }>();
  const isEditing = Boolean(expenseId);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<string>('');
  const [expenseIcon, setExpenseIcon] = useState<string>('');
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const [friends, setFriends] = useState<FriendsResponse>({
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
  });
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [myDbId, setMyDbId] = useState('');
  // Splitwise-style configs edited in the two sub-screens (Who paid / Adjust split).
  const [splitConfig, setSplitConfig] = useState<SplitConfig>({ mode: 'equally', selectedIds: [] });
  const [payerConfig, setPayerConfig] = useState<PayerConfig>({ mode: 'single', id: '' });
  const [adjustSplitOpen, setAdjustSplitOpen] = useState(false);
  const [whoPaidOpen, setWhoPaidOpen] = useState(false);
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
        const [response, meRes] = await Promise.all([
          apiRequest<FriendsResponse>(`/api/friends`, {}, token),
          apiRequest<any>('/api/me', {}, token),
        ]);
        if (!active) return;
        setFriends(response);
        setMyDbId(meRes?.user?._id || meRes?.user?.id || '');
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

  // Edit mode: load the expense and restore the composer configs from its stored
  // paidBy[]/participants[]. Amounts are kept verbatim (unequally + explicit
  // payers), so re-saving preserves exactly what was there.
  useEffect(() => {
    if (!isEditing || !expenseId) return;
    let active = true;

    (async () => {
      try {
        const token = await getTokenRef.current();
        if (!token) return;

        const [meRes, expRes] = await Promise.all([
          apiRequest<any>('/api/me', {}, token),
          apiRequest<{ expense: any }>({ method: 'get', url: `/api/expenses/${expenseId}`, token }),
        ]);
        if (!active) return;

        const dbId = meRes?.user?._id || meRes?.user?.id || '';
        setMyDbId(dbId);
        const exp = expRes.expense;
        if (!exp) return;

        setDescription(exp.description ?? '');
        setAmount(String(exp.amount ?? ''));
        setDate((exp.expenseDate ?? new Date().toISOString()).split('T')[0]);
        setNotes(exp.notes ?? '');
        setCategory(exp.category ?? '');
        setExpenseIcon(exp.icon ?? '');
        if (exp.notes) setShowNotes(true);

        // Everyone in the split except me becomes a selected friend chip.
        const others = (exp.participants ?? [])
          .map((p: any) => p.userId?.id)
          .filter((id: string) => id && id !== dbId);
        setSelectedFriendIds(Array.from(new Set(others)));

        // Restore exact owed amounts and payer(s).
        const amounts: Record<string, number> = {};
        (exp.participants ?? []).forEach((p: any) => {
          if (p.userId?.id) amounts[p.userId.id] = p.amount ?? 0;
        });
        setSplitConfig({ mode: 'unequally', amounts });

        const payList = exp.paidBy ?? [];
        if (payList.length > 1) {
          const payAmounts: Record<string, number> = {};
          payList.forEach((p: any) => {
            if (p.userId?.id) payAmounts[p.userId.id] = p.amount ?? 0;
          });
          setPayerConfig({ mode: 'multiple', amounts: payAmounts });
        } else {
          setPayerConfig({ mode: 'single', id: payList[0]?.userId?.id ?? dbId });
        }
      } catch {
        if (active) setError('Could not load this expense to edit.');
      }
    })();

    return () => {
      active = false;
    };
  }, [isEditing, expenseId]);

  const acceptedFriends = useMemo(() => friends.friends, [friends.friends]);

  // Deep-linked from a friend's split screen — preselect that friend once loaded.
  const preselectedRef = useRef(false);
  useEffect(() => {
    if (isEditing || preselectedRef.current || !friendId) return;
    if (acceptedFriends.some((f) => f.friend.id === friendId)) {
      preselectedRef.current = true;
      setSelectedFriendIds((cur) => (cur.includes(friendId) ? cur : [...cur, friendId]));
    }
  }, [friendId, acceptedFriends, isEditing]);

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

  // The picker is an explicit mode now (opened by tapping the field, closed by
  // Confirm), so it doesn't flicker when the in-picker search grabs focus.
  const suggestionsVisible = participantsFocused;

  const addFriend = (friendId: string) => {
    setSelectedFriendIds((current) =>
      current.includes(friendId) ? current : [...current, friendId]
    );
    setQuery('');
  };

  const removeFriend = (friendId: string) => {
    setSelectedFriendIds((current) => current.filter((id) => id !== friendId));
  };

  // You + the picked friends, in the id space the backend resolves (DB ids).
  const splitPeople: SplitPerson[] = useMemo(() => {
    const list: SplitPerson[] = [];
    if (myDbId) list.push({ id: myDbId, name: 'You', isYou: true });
    selectedFriends.forEach((f) => list.push({ id: f.friend.id, name: f.friend.name }));
    return list;
  }, [myDbId, selectedFriends]);

  const peopleKey = splitPeople.map((p) => p.id).join(',');

  // Keep the split in sync with who's in the expense: equally always covers
  // everyone; the amount/percentage modes just drop people who were removed.
  useEffect(() => {
    const ids = peopleKey ? peopleKey.split(',') : [];
    setSplitConfig((cur) => {
      if (cur.mode === 'equally') return { mode: 'equally', selectedIds: ids };
      if (cur.mode === 'unequally') {
        return { mode: 'unequally', amounts: Object.fromEntries(Object.entries(cur.amounts).filter(([id]) => ids.includes(id))) };
      }
      return { mode: 'percentages', percents: Object.fromEntries(Object.entries(cur.percents).filter(([id]) => ids.includes(id))) };
    });
  }, [peopleKey]);

  const amountValue = Number(amount) || 0;
  const owed = useMemo(() => resolveSplit(splitConfig, amountValue), [splitConfig, amountValue]);
  const owedTotal = sumValues(owed);
  const payers = useMemo(() => resolvePayers(payerConfig, amountValue, myDbId), [payerConfig, amountValue, myDbId]);
  const payersTotal = sumValues(Object.fromEntries(payers.map((p) => [p.userId, p.amount])));

  const splitMismatch = amountValue > 0 && Math.abs(owedTotal - amountValue) > 0.01;
  const payerMismatch = amountValue > 0 && Math.abs(payersTotal - amountValue) > 0.01;

  const canSave =
    !saving &&
    Number(amount) > 0 &&
    description.trim() !== '' &&
    selectedFriendIds.length > 0;

  const handleSave = async () => {
    setError('');

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
    if (Object.keys(owed).length === 0 || splitMismatch) {
      setError('Tap “split” — the shares must add up to the total.');
      return;
    }
    if (payerMismatch) {
      setError('Tap “Paid by” — the paid amounts must add up to the total.');
      return;
    }

    try {
      setSaving(true);
      const token = await getTokenRef.current();
      if (!token) {
        setError('Sign in again to save this expense.');
        return;
      }

      // Explicit contract: exact payers[] and participants[], same as the group
      // composer — the split is stored verbatim.
      const payload = {
        description: description.trim(),
        amount: amountValue,
        expenseDate: date,
        participants: Object.entries(owed).map(([userId, amt]) => ({ userId, amount: amt })),
        notes: notes.trim(),
        currency: 'INR',
        splitType: 'explicit',
        paidBy: payers,
        category: category || undefined,
        icon: expenseIcon || undefined,
      };

      const response = await apiRequest<{
        expense: unknown;
        xpAward: { xp: number; level: number; leveledUp: boolean; xpDelta: number } | null;
      }>({
        method: isEditing ? 'put' : 'post',
        url: isEditing ? `/api/expenses/${expenseId}` : '/api/expenses',
        token,
        data: payload,
      });

      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setCategory('');
      setExpenseIcon('');
      setSelectedFriendIds([]);
      setSplitConfig({ mode: 'equally', selectedIds: [] });
      setPayerConfig({ mode: 'single', id: '' });

      const award = response?.xpAward;
      const xpLine = isEditing
        ? 'Everyone in the split has been notified.'
        : award
          ? award.leveledUp
            ? `+${award.xpDelta} XP — you reached Level ${award.level}! 🎉`
            : `+${award.xpDelta} XP earned ⚡`
          : 'Expense added successfully.';

      showToast({ title: isEditing ? 'Changes saved ✅' : 'Saved! 🎉', message: xpLine, tone: 'success', duration: 1600 });
      setTimeout(() => router.back(), 700);
    } catch (saveError: any) {
      setError(saveError.message || 'Could not save expense.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
      <Toast toast={toast} onDismiss={dismissToast} />

      {/* Top bar: back / title / save-checkmark, Splitwise-style */}
      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
          <Icon name="ArrowLeft" size={22} color={palette.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit expense' : 'Add expense'}</Text>
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
          <Pressable style={styles.participantInputTrigger} onPress={() => setParticipantsFocused(true)}>
            <Text style={styles.participantTriggerText}>
              {selectedFriends.length === 0 ? 'Enter names or emails' : 'Add more'}
            </Text>
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {suggestionsVisible ? (
          /* People list takes over while picking — same as Splitwise */
          <View style={{ flex: 1 }}>
            {/* Dedicated search bar so finding friends is obvious */}
            <View style={styles.pickerSearchBar}>
              <Icon name="Search" size={16} color={palette.textTertiary} clickable={false} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search friends"
                placeholderTextColor={palette.textTertiary}
                style={styles.pickerSearchInput}
                autoCapitalize="none"
                autoFocus
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <Icon name="X" size={16} color={palette.textTertiary} clickable={false} />
                </Pressable>
              )}
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.suggestionsList}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.sectionLabel}>{selectedFriends.length > 0 ? `Added (${selectedFriends.length}) · tap to remove` : 'Friends'}</Text>
              {selectedFriends.map((friendship) => (
                <Pressable
                  key={`sel-${friendship.id}`}
                  style={({ pressed }) => [styles.suggestionRow, pressed && { opacity: 0.6 }]}
                  onPress={() => removeFriend(friendship.friend.id)}
                >
                  <View style={[styles.suggestionAvatar, { backgroundColor: palette.primary }]}>
                    <Text style={[styles.suggestionAvatarText, { color: palette.white }]}>{getInitials(friendship.friend.name)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.suggestionName}>{friendship.friend.name}</Text>
                    <Text style={styles.suggestionEmail}>{friendship.friend.email}</Text>
                  </View>
                  <Icon name="Check" size={18} color={palette.primaryDeep} clickable={false} />
                </Pressable>
              ))}

              {suggestions.length > 0 && <Text style={styles.sectionLabel}>Add people</Text>}
              {loadingFriends ? (
                <ActivityIndicator color={palette.primaryDeep} style={{ marginTop: spacing.lg }} />
              ) : suggestions.length === 0 && selectedFriends.length === 0 ? (
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
                    <Icon name="Plus" size={18} color={palette.primaryDeep} clickable={false} />
                  </Pressable>
                ))
              )}
            </ScrollView>

            {/* Confirm button — leaves the picker and returns to the composer */}
            <View style={styles.pickerFooter}>
              <Button
                variant="primary"
                size="lg"
                disabled={selectedFriends.length === 0}
                onPress={() => {
                  Keyboard.dismiss();
                  setQuery('');
                  setParticipantsFocused(false);
                }}
              >
                {selectedFriends.length > 0 ? `Confirm ${selectedFriends.length} ${selectedFriends.length === 1 ? 'person' : 'people'}` : 'Select people to split with'}
              </Button>
            </View>
          </View>
        ) : (
          /* The composer itself: centered description + amount + split sentence */
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.composer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.fieldRow}>
              {/* Tap the icon box to choose a custom icon for this expense. */}
              <Pressable style={styles.fieldIconBox} onPress={() => setIconPickerOpen(true)}>
                <Icon name={expenseIcon || 'StickyNote'} size={22} color={palette.primaryDeep} clickable={false} />
              </Pressable>
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

            {/* Paid by [who paid] and split [adjust split] — each opens a screen */}
            <View style={styles.sentenceRow}>
              <Text style={styles.sentenceText}>Paid by</Text>
              <Pressable
                style={styles.sentencePill}
                onPress={() => (selectedFriendIds.length ? setWhoPaidOpen(true) : setParticipantsFocused(true))}
              >
                <Text style={styles.sentencePillText}>{payerLabel(payerConfig, splitPeople, myDbId)}</Text>
                <Icon name="ChevronRight" size={13} color={palette.primaryDeep} />
              </Pressable>
              <Text style={styles.sentenceText}>and split</Text>
              <Pressable
                style={styles.sentencePill}
                onPress={() => (selectedFriendIds.length ? setAdjustSplitOpen(true) : setParticipantsFocused(true))}
              >
                <Text style={styles.sentencePillText}>{splitLabel(splitConfig.mode)}</Text>
                <Icon name="ChevronRight" size={13} color={palette.primaryDeep} />
              </Pressable>
            </View>
            {selectedFriendIds.length > 0 && amountValue > 0 && (
              <Text style={[styles.splitHint, splitMismatch && { color: palette.danger }]}>
                {Object.entries(owed)
                  .map(([id, amt]) => `${splitPeople.find((p) => p.id === id)?.name?.split(' ')[0] ?? '?'}: ₹${amt.toFixed(2)}`)
                  .join('  ·  ')}
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
              <Icon name={category ? CATEGORY_ICONS[category] ?? 'Tag' : 'Tag'} size={16} color={palette.primaryDeep} clickable={false} />
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

      <AdjustSplitModal
        visible={adjustSplitOpen}
        totalAmount={amountValue}
        people={splitPeople}
        value={splitConfig}
        onClose={() => setAdjustSplitOpen(false)}
        onDone={(cfg) => {
          setSplitConfig(cfg);
          setAdjustSplitOpen(false);
        }}
      />

      <WhoPaidModal
        visible={whoPaidOpen}
        totalAmount={amountValue}
        people={splitPeople}
        currentUserId={myDbId}
        value={payerConfig}
        onClose={() => setWhoPaidOpen(false)}
        onDone={(cfg) => {
          setPayerConfig(cfg);
          setWhoPaidOpen(false);
        }}
      />

      <IconPickerModal
        visible={iconPickerOpen}
        value={expenseIcon}
        onClose={() => setIconPickerOpen(false)}
        onSelect={(name) => {
          setExpenseIcon(name);
          setIconPickerOpen(false);
        }}
      />

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
                    <View style={styles.categoryIconWrap}>
                      <Icon name={CATEGORY_ICONS[item] ?? 'Tag'} size={18} color={palette.primaryDeep} clickable={false} />
                    </View>
                    <Text style={[styles.categoryRowText, { flex: 1 }]}>{item}</Text>
                    {selected && <Icon name="Check" size={20} color={palette.primaryDeep} clickable={false} />}
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
  participantInputTrigger: { flexGrow: 1, minWidth: 110, paddingVertical: 6 },
  participantTriggerText: { fontSize: 15, color: palette.textTertiary, fontFamily: fontFamily.medium },

  pickerSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: layout.gutter,
    marginTop: spacing.md,
    backgroundColor: palette.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  pickerSearchInput: { flex: 1, fontSize: 14, color: palette.textPrimary, padding: 0, fontFamily: fontFamily.medium },
  pickerFooter: {
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.divider,
    backgroundColor: palette.card,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    minHeight: 52,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: palette.card,
    borderWidth: 1.5,
    borderColor: palette.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  categoryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryRowText: {
    fontSize: 14,
    fontFamily: fontFamily.bold,
    color: palette.textPrimary,
  },
});
