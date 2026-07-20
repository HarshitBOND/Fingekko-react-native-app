import type { FriendsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@clerk/clerk-expo';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../../../components/ui/AppText';
import Icon from '../../../components/ui/Icon';
import LoadingScreen from '../../../components/ui/LoadingScreen';
import Toast from '../../../components/ui/Toast';
import AdjustSplitModal from '../../../components/groups/AdjustSplitModal';
import WhoPaidModal from '../../../components/groups/WhoPaidModal';
import {
  PayerConfig,
  Person as SplitPerson,
  SplitConfig,
  payerLabel,
  resolvePayers,
  resolveSplit,
  splitLabel,
  sumValues,
} from '../../../components/groups/splitModel';
import { useToast } from '../../../hooks/useToast';
import { fontFamily, layout, palette, radius, shadows, spacing } from '../../../constants/design';

const CATEGORIES = ['Food', 'Travel', 'Shopping', 'Bills', 'Entertainment', 'Other'];

type Person = {
  id: string;
  name: string;
  email: string;
  dbId?: string;
};

type GroupDetailsResponse = {
  id: string;
  name: string;
  members: (Partial<Person> & { dbId?: string })[];
};

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default function AddGroupExpense() {
  const { userId, getToken, isSignedIn } = useAuth();
  const router = useRouter();
  const { groupId: groupIdParam } = useLocalSearchParams<{ groupId?: string | string[] }>();
  const groupId = Array.isArray(groupIdParam) ? groupIdParam[0] : groupIdParam;
  const isGroupMode = Boolean(groupId);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('');

  const [friends, setFriends] = useState<FriendsResponse>({
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
  });
  const [group, setGroup] = useState<GroupDetailsResponse | null>(null);
  const [loadingPeople, setLoadingPeople] = useState(true);

  // Split + payer are the Splitwise-style configs edited in the two sub-pages.
  const [splitConfig, setSplitConfig] = useState<SplitConfig>({ mode: 'equally', selectedIds: [] });
  const [payerConfig, setPayerConfig] = useState<PayerConfig>({ mode: 'single', id: '' });
  const [adjustSplitOpen, setAdjustSplitOpen] = useState(false);
  const [whoPaidOpen, setWhoPaidOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const { toast, showToast, dismissToast } = useToast();

  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  // Latest member ids, read at reset time so the cleared form re-selects everyone.
  const memberIdsRef = useRef<string[]>([]);

  // Expo Router keeps this screen mounted, so re-opening it to add a *second*
  // expense used to carry the previous one's amount/description/split. Wipe the
  // form to a clean slate every time the screen regains focus.
  useFocusEffect(
    useCallback(() => {
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setCategory('');
      setError('');
      setPayerConfig({ mode: 'single', id: '' });
      setAdjustSplitOpen(false);
      setWhoPaidOpen(false);
      setCategoryPickerOpen(false);
      setShowDate(false);
      setShowNotes(false);
      setSplitConfig({ mode: 'equally', selectedIds: memberIdsRef.current });
    }, [])
  );

  useEffect(() => {
    if (isGroupMode) return;
    let active = true;

    (async () => {
      if (!isSignedIn) return;
      try {
        const token = await getTokenRef.current();
        if (!token) return;
        const response = await apiRequest<FriendsResponse>('/api/friends', {}, token);
        if (active) setFriends(response);
      } catch {
        if (active) setError('Unable to load friends for splitting.');
      } finally {
        if (active) setLoadingPeople(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isSignedIn, isGroupMode]);

  useEffect(() => {
    if (!isGroupMode || !groupId) return;
    let active = true;

    (async () => {
      if (!isSignedIn) return;
      try {
        const token = await getTokenRef.current();
        if (!token) return;
        const response = await apiRequest<GroupDetailsResponse>(`/api/groups/${groupId}`, {}, token);
        if (!active) return;
        setGroup(response);
        // Default split: everyone owes an equal share; default payer: you.
        setSplitConfig({ mode: 'equally', selectedIds: (response.members ?? []).map((m: any) => String(m.id)) });
      } catch {
        if (active) setError('Unable to load group members for splitting.');
      } finally {
        if (active) setLoadingPeople(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isSignedIn, isGroupMode, groupId]);

  const peopleList: Person[] = useMemo(() => {
    if (isGroupMode) {
      return (group?.members ?? []).map((m: any) => ({
        id: String(m.id),
        name: m.name ?? String(m.id),
        email: m.email ?? '',
        dbId: m.dbId,
      }));
    }
    return friends.friends.map((f) => ({
      id: f.friend.id,
      name: f.friend.name,
      email: f.friend.email,
    }));
  }, [isGroupMode, group, friends.friends]);

  // Seed equal-split selection once people arrive (friends mode has no load hook
  // that sets it, and it keeps group mode correct if members change).
  useEffect(() => {
    memberIdsRef.current = peopleList.map((p) => p.id);
    setSplitConfig((cur) =>
      cur.mode === 'equally' && cur.selectedIds.length === 0 && peopleList.length > 0
        ? { mode: 'equally', selectedIds: peopleList.map((p) => p.id) }
        : cur
    );
  }, [peopleList]);

  // People passed to the sub-pages, with "you" flagged for friendly labels.
  const splitPeople: SplitPerson[] = useMemo(
    () => peopleList.map((p) => ({ id: p.id, name: p.name, isYou: p.id === userId })),
    [peopleList, userId]
  );

  const amountValue = Number(amount) || 0;

  // Exact owed amounts and payer list derived from the two configs.
  const owed = useMemo(() => resolveSplit(splitConfig, amountValue), [splitConfig, amountValue]);
  const owedTotal = sumValues(owed);
  const payers = useMemo(
    () => resolvePayers(payerConfig, amountValue, userId ?? ''),
    [payerConfig, amountValue, userId]
  );
  const payersTotal = sumValues(Object.fromEntries(payers.map((p) => [p.userId, p.amount])));

  const nameFor = (id: string) => (id === userId ? 'You' : peopleList.find((p) => p.id === id)?.name ?? 'Someone');

  // In percentages/equal modes owed always re-scales to the amount; only the
  // fixed-amount modes can drift when the total is edited afterwards.
  const splitMismatch = amountValue > 0 && Math.abs(owedTotal - amountValue) > 0.01;
  const payerMismatch = amountValue > 0 && Math.abs(payersTotal - amountValue) > 0.01;

  const canSave = !saving && amountValue > 0 && description.trim() !== '' && Object.keys(owed).length > 0;

  // One-line split preview for the minimal composer (e.g. "You: ₹100 · Ajay: ₹100").
  const splitPreview = Object.entries(owed)
    .map(([id, amt]) => `${nameFor(id) === 'You' ? 'You' : nameFor(id).split(' ')[0]}: ₹${amt.toFixed(0)}`)
    .join('  ·  ');

  const handleSave = async () => {
    setError('');

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError('Enter an amount greater than 0.');
      return;
    }
    if (!description.trim()) {
      setError('Add a short description so everyone knows what this was.');
      return;
    }
    if (Object.keys(owed).length === 0) {
      setError('Tap “split” to choose who owes a share.');
      return;
    }
    if (splitMismatch) {
      setError(`The split adds up to ${inr(owedTotal)}, not ${inr(amountValue)} — tap “split” to adjust.`);
      return;
    }
    if (payerMismatch) {
      setError(`Paid amounts add up to ${inr(payersTotal)}, not ${inr(amountValue)} — tap “Paid by” to adjust.`);
      return;
    }

    try {
      setSaving(true);
      const token = await getTokenRef.current();
      if (!token) {
        setError('Sign in again to save this expense.');
        return;
      }

      // Explicit contract: exact payers[] and participants[] so the backend
      // never has to re-derive the split from a type string.
      await apiRequest({
        method: 'post',
        url: '/api/expenses',
        token,
        data: {
          description: description.trim(),
          amount: amountValue,
          expenseDate: date,
          splitType: 'explicit',
          paidBy: payers,
          participants: Object.entries(owed).map(([id, amt]) => ({ userId: id, amount: amt })),
          notes: notes.trim(),
          currency: 'INR',
          ...(isGroupMode ? { groupId } : {}),
          category: category || undefined,
        },
      });

      showToast({ title: 'Expense added! 🎉', message: 'The split has been shared.', tone: 'success', duration: 1600 });
      setTimeout(() => router.back(), 700);
    } catch (saveError: any) {
      setError(saveError.message || 'Could not save expense.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingPeople) {
    return <LoadingScreen label={isGroupMode ? 'Loading group members...' : 'Loading friends...'} />;
  }

  return (
    <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
      <Toast toast={toast} onDismiss={dismissToast} />

      {/* Top bar: back / title / save-checkmark — matches the personal composer */}
      <View style={styles.header}>
        <Pressable
          style={styles.headerButton}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/YourGroups'))}
          hitSlop={6}
        >
          <Icon name="ArrowLeft" size={22} color={palette.textPrimary} clickable={false} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <AppText variant="title" weight="bold">Add expense</AppText>
          {isGroupMode && !!group?.name && (
            <AppText variant="micro" color="textTertiary" numberOfLines={1}>{group.name}</AppText>
          )}
        </View>
        <Pressable
          style={[styles.headerButton, !canSave && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={!canSave}
          hitSlop={6}
          accessibilityLabel="Save expense"
        >
          {saving ? (
            <ActivityIndicator size="small" color={palette.primaryDeep} />
          ) : (
            <Icon name="Check" size={24} color={canSave ? palette.primaryDeep : palette.textTertiary} clickable={false} />
          )}
        </Pressable>
      </View>

      {/* Who this is split with — the group's members */}
      <View style={styles.withRow}>
        <AppText style={styles.withLabel}>
          With <AppText style={styles.withYou}>you</AppText> and:
        </AppText>
        <AppText variant="bodySm" color="textSecondary" numberOfLines={1} style={{ flex: 1 }}>
          {peopleList.filter((p) => p.id !== userId).map((p) => p.name.split(' ')[0]).join(', ') || 'group members'}
        </AppText>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.composer} keyboardShouldPersistTaps="handled">
          <View style={styles.fieldRow}>
            <View style={styles.fieldIconBox}>
              <Icon name="StickyNote" size={22} color={palette.primaryDeep} clickable={false} />
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
              <AppText style={styles.rupee}>₹</AppText>
            </View>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={palette.textTertiary}
              keyboardType="decimal-pad"
              style={styles.amountInput}
            />
          </View>

          {/* Paid by [who paid] and split [adjust split] — each opens a screen */}
          <View style={styles.sentenceRow}>
            <AppText style={styles.sentenceText}>Paid by</AppText>
            <Pressable style={styles.sentencePill} onPress={() => setWhoPaidOpen(true)}>
              <AppText style={styles.sentencePillText} numberOfLines={1}>{payerLabel(payerConfig, splitPeople, userId ?? '')}</AppText>
              <Icon name="ChevronRight" size={13} color={palette.primaryDeep} clickable={false} />
            </Pressable>
            <AppText style={styles.sentenceText}>and split</AppText>
            <Pressable style={styles.sentencePill} onPress={() => setAdjustSplitOpen(true)}>
              <AppText style={styles.sentencePillText} numberOfLines={1}>{splitLabel(splitConfig.mode)}</AppText>
              <Icon name="ChevronRight" size={13} color={palette.primaryDeep} clickable={false} />
            </Pressable>
          </View>

          {amountValue > 0 && !!splitPreview && (
            <AppText style={[styles.splitHint, splitMismatch && { color: palette.danger }]} numberOfLines={2}>
              {splitPreview}
            </AppText>
          )}

          {showDate && (
            <View style={styles.extraField}>
              <Icon name="Calendar" size={16} color={palette.textSecondary} clickable={false} />
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
              <Icon name="StickyNote" size={16} color={palette.textSecondary} clickable={false} />
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

          {!!error && <AppText style={styles.errorText}>{error}</AppText>}
        </ScrollView>

        {/* Bottom utility bar: category left, date + notes toggles right */}
        <View style={styles.bottomBar}>
          <Pressable style={styles.categoryButton} onPress={() => setCategoryPickerOpen(true)}>
            <Icon name="Tag" size={16} color={palette.primaryDeep} clickable={false} />
            <AppText variant="caption" color="primaryDeep" weight="bold">{category || 'Category'}</AppText>
          </Pressable>
          <View style={styles.bottomIcons}>
            <Pressable
              style={[styles.bottomIconBtn, showDate && styles.bottomIconBtnActive]}
              onPress={() => setShowDate((v) => !v)}
              accessibilityLabel="Set date"
            >
              <Icon name="Calendar" size={19} color={showDate ? palette.primaryDeep : palette.textSecondary} clickable={false} />
            </Pressable>
            <Pressable
              style={[styles.bottomIconBtn, showNotes && styles.bottomIconBtnActive]}
              onPress={() => setShowNotes((v) => !v)}
              accessibilityLabel="Add note"
            >
              <Icon name="StickyNote" size={19} color={showNotes ? palette.primaryDeep : palette.textSecondary} clickable={false} />
            </Pressable>
          </View>
        </View>
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
        currentUserId={userId ?? ''}
        value={payerConfig}
        onClose={() => setWhoPaidOpen(false)}
        onDone={(cfg) => {
          setPayerConfig(cfg);
          setWhoPaidOpen(false);
        }}
      />

      <Modal visible={categoryPickerOpen} animationType="slide" transparent onRequestClose={() => setCategoryPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCategoryPickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <AppText variant="title" weight="bold" style={{ marginBottom: spacing.md }}>
              Select category
            </AppText>
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
                  <AppText variant="label">{item}</AppText>
                  {selected && <Icon name="Check" size={18} color={palette.primaryDeep} clickable={false} />}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingVertical: spacing.md,
  },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  withRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layout.gutter,
    paddingVertical: spacing.md,
    backgroundColor: palette.card,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.divider,
  },
  withLabel: { fontSize: 16, fontFamily: fontFamily.medium, color: palette.textPrimary },
  withYou: { fontFamily: fontFamily.bold },

  composer: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: layout.gutter,
    paddingBottom: spacing.xxl,
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
  rupee: { fontSize: 22, fontFamily: fontFamily.bold, color: palette.primaryDeep },
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
  sentenceText: { fontSize: 16, fontFamily: fontFamily.medium, color: palette.textPrimary },
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
    maxWidth: 200,
    ...shadows.xs,
  },
  sentencePillText: { fontSize: 15, fontFamily: fontFamily.semibold, color: palette.primaryDeep },
  splitHint: { fontSize: 13, fontFamily: fontFamily.medium, color: palette.textSecondary, textAlign: 'center' },
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
  errorText: { color: palette.danger, fontSize: 13, fontFamily: fontFamily.semibold, textAlign: 'center' },

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
  bottomIcons: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bottomIconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomIconBtnActive: { backgroundColor: palette.primaryLight },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: palette.card,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    ...shadows.lg,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.border,
    marginBottom: spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
  },
});
