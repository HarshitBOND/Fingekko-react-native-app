import type { FriendsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
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
import Button from '../../../components/ui/Button';
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

const getInitials = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

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
  const { toast, showToast, dismissToast } = useToast();

  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

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
    <SafeAreaView style={styles.page} edges={['top']}>
      <Toast toast={toast} onDismiss={dismissToast} />

      <View style={styles.header}>
        <Pressable
          style={styles.headerButton}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/YourGroups'))}
          hitSlop={6}
        >
          <Icon name="ArrowLeft" size={22} color={palette.textPrimary} clickable={false} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <AppText variant="title" weight="bold">
            Add expense
          </AppText>
          {isGroupMode && !!group?.name && (
            <AppText variant="micro" color="textTertiary" numberOfLines={1}>
              {group.name}
            </AppText>
          )}
        </View>
        <View style={styles.headerButton} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Amount + description hero */}
          <View style={styles.heroFields}>
            <View style={styles.amountRow}>
              <AppText variant="hero" color="textTertiary">
                ₹
              </AppText>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor={palette.textTertiary}
                keyboardType="decimal-pad"
                style={styles.amountInput}
              />
            </View>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What was this for?"
              placeholderTextColor={palette.textTertiary}
              style={styles.descriptionInput}
            />
          </View>

          {/* Category + date */}
          <View style={styles.metaRow}>
            <Pressable style={styles.metaChip} onPress={() => setCategoryPickerOpen(true)}>
              <Icon name="Tag" size={15} color={palette.primaryDeep} clickable={false} />
              <AppText variant="caption" color="primaryDeep">
                {category || 'Category'}
              </AppText>
            </Pressable>
            <View style={styles.metaChip}>
              <Icon name="Calendar" size={15} color={palette.textSecondary} clickable={false} />
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={palette.textTertiary}
                style={styles.dateInput}
              />
            </View>
          </View>

          {/* Paid by [____] and split [____] — the two buttons open the sub-pages */}
          <View style={styles.sentenceCard}>
            <View style={styles.sentenceLine}>
              <AppText variant="label" color="textSecondary">Paid by</AppText>
              <Pressable style={styles.sentencePill} onPress={() => setWhoPaidOpen(true)}>
                <AppText variant="label" color="primaryDeep" numberOfLines={1}>
                  {payerLabel(payerConfig, splitPeople, userId ?? '')}
                </AppText>
                <Icon name="ChevronRight" size={14} color={palette.primaryDeep} clickable={false} />
              </Pressable>
            </View>
            <View style={styles.sentenceLine}>
              <AppText variant="label" color="textSecondary">and split</AppText>
              <Pressable style={styles.sentencePill} onPress={() => setAdjustSplitOpen(true)}>
                <AppText variant="label" color="primaryDeep" numberOfLines={1}>
                  {splitLabel(splitConfig.mode)}
                </AppText>
                <Icon name="ChevronRight" size={14} color={palette.primaryDeep} clickable={false} />
              </Pressable>
            </View>
          </View>

          {/* Live breakdown of who owes what */}
          <AppText variant="label" style={styles.sectionHeader}>
            Breakdown ({Object.keys(owed).length})
          </AppText>
          <View style={styles.peopleCard}>
            {Object.keys(owed).length === 0 ? (
              <AppText variant="bodySm" color="textSecondary" align="center" style={{ padding: spacing.lg }}>
                Enter an amount, then tap “split” to choose who owes.
              </AppText>
            ) : (
              Object.entries(owed).map(([id, amt], index, arr) => (
                <View key={id} style={[styles.personRow, index !== arr.length - 1 && styles.personDivider]}>
                  <View style={styles.personAvatar}>
                    <AppText variant="caption" color="primaryDeep">{getInitials(nameFor(id))}</AppText>
                  </View>
                  <AppText variant="label" style={{ flex: 1 }} numberOfLines={1}>
                    {nameFor(id)}
                  </AppText>
                  <AppText variant="label" weight="bold" style={{ color: splitMismatch ? palette.danger : palette.textPrimary }}>
                    {inr(amt)}
                  </AppText>
                </View>
              ))
            )}
          </View>
          {payers.length > 1 && (
            <AppText variant="caption" color="textSecondary" style={styles.payerNote}>
              Paid by {payers.map((p) => `${nameFor(p.userId)} (${inr(p.amount)})`).join(', ')}
            </AppText>
          )}

          {/* Notes */}
          <View style={styles.notesWrap}>
            <Icon name="StickyNote" size={16} color={palette.textSecondary} clickable={false} />
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add a note (optional)"
              placeholderTextColor={palette.textTertiary}
              style={styles.notesInput}
              multiline
            />
          </View>

          {!!error && (
            <AppText variant="caption" color="danger" align="center">
              {error}
            </AppText>
          )}

          <Button variant="primary" size="lg" onPress={handleSave} loading={saving}>
            Add expense
          </Button>
        </ScrollView>
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
    paddingHorizontal: layout.gutter,
    paddingVertical: spacing.md,
  },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  container: {
    paddingHorizontal: layout.gutter,
    paddingBottom: spacing.xxl,
    gap: spacing.base,
  },

  heroFields: {
    backgroundColor: palette.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontFamily: fontFamily.extrabold,
    color: palette.textPrimary,
    padding: 0,
  },
  descriptionInput: {
    fontSize: 16,
    fontFamily: fontFamily.medium,
    color: palette.textPrimary,
    borderTopWidth: 1,
    borderTopColor: palette.divider,
    paddingTop: spacing.md,
  },

  metaRow: { flexDirection: 'row', gap: spacing.sm },
  metaChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: palette.border,
  },
  dateInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontFamily.medium,
    color: palette.textPrimary,
    padding: 0,
  },

  sentenceCard: {
    backgroundColor: palette.card,
    borderRadius: radius.lg,
    padding: spacing.base,
    gap: spacing.md,
    ...shadows.xs,
  },
  sentenceLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sentencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: 200,
  },

  sectionHeader: { marginTop: spacing.xs },
  peopleCard: {
    backgroundColor: palette.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
    ...shadows.xs,
  },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  personDivider: { borderBottomWidth: 1, borderBottomColor: palette.divider },
  personAvatar: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payerNote: { marginTop: -spacing.sm },

  notesWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: palette.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 64,
  },
  notesInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: fontFamily.medium,
    color: palette.textPrimary,
    padding: 0,
    textAlignVertical: 'top',
  },

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
