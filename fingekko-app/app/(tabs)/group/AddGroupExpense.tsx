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

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');

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
        // Preselect everyone. A group expense with nobody ticked was the default
        // before, which made the backend reject the very first save attempt.
        setSelectedUserIds((response.members ?? []).map((m: any) => String(m.id)));
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

  const selectedPeople = useMemo(
    () => peopleList.filter((p) => selectedUserIds.includes(p.id)),
    [peopleList, selectedUserIds]
  );

  const allSelected = peopleList.length > 0 && selectedUserIds.length === peopleList.length;

  const toggleUser = (id: string) =>
    setSelectedUserIds((current) =>
      current.includes(id) ? current.filter((existing) => existing !== id) : [...current, id]
    );

  const toggleSelectAll = () =>
    setSelectedUserIds(allSelected ? [] : peopleList.map((p) => p.id));

  const amountValue = Number(amount) || 0;

  // Equal split preview — the backend splits across participants plus the payer,
  // so mirror that here rather than dividing by the selection alone.
  const equalHeadCount = useMemo(() => {
    const ids = new Set(selectedUserIds);
    if (userId) ids.add(userId);
    return ids.size;
  }, [selectedUserIds, userId]);

  const perHead = equalHeadCount > 0 ? amountValue / equalHeadCount : 0;

  const customTotal = useMemo(
    () =>
      selectedPeople.reduce((sum, p) => sum + (Number(customShares[p.id]) || 0), 0),
    [selectedPeople, customShares]
  );
  const customRemainder = amountValue - customTotal;

  const splitEvenlyIntoCustom = () => {
    if (selectedPeople.length === 0 || amountValue <= 0) return;
    const each = amountValue / selectedPeople.length;
    const next: Record<string, string> = {};
    selectedPeople.forEach((p) => {
      next[p.id] = each.toFixed(2);
    });
    setCustomShares(next);
  };

  const handleSave = async () => {
    setError('');

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError('Enter an amount greater than 0.');
      return;
    }
    // Previously missing here, so blank-titled expenses could be saved.
    if (!description.trim()) {
      setError('Add a short description so everyone knows what this was.');
      return;
    }
    if (selectedUserIds.length === 0) {
      setError('Pick at least one person to split this with.');
      return;
    }
    if (splitMode === 'custom' && Math.abs(customRemainder) > 0.01) {
      setError(
        customRemainder > 0
          ? `${inr(customRemainder)} still unassigned — shares must add up to ${inr(amountValue)}.`
          : `Shares exceed the total by ${inr(Math.abs(customRemainder))}.`
      );
      return;
    }

    try {
      setSaving(true);
      const token = await getTokenRef.current();
      if (!token) {
        setError('Sign in again to save this expense.');
        return;
      }

      // Custom mode sends only the people actually selected — it used to send
      // every group member, including unticked ones with a zero share.
      const participantIds =
        splitMode === 'custom'
          ? selectedPeople.map((p) => ({
              userId: p.id,
              amount: Number(customShares[p.id]) || 0,
            }))
          : selectedUserIds;

      await apiRequest({
        method: 'post',
        url: '/api/expenses',
        token,
        data: {
          description: description.trim(),
          amount: amountValue,
          expenseDate: date,
          splitType: splitMode === 'custom' ? 'unequalPaidByYou' : 'equalPaidByYou',
          participantIds,
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

          {/* Category + date, both reachable — the category sheet used to exist
              with no way to open it. */}
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

          {/* Split mode */}
          <View style={styles.segmented}>
            {(['equal', 'custom'] as const).map((mode) => {
              const active = splitMode === mode;
              return (
                <Pressable
                  key={mode}
                  style={[styles.segment, active && styles.segmentActive]}
                  onPress={() => {
                    setSplitMode(mode);
                    if (mode === 'custom' && Object.keys(customShares).length === 0) {
                      splitEvenlyIntoCustom();
                    }
                  }}
                >
                  <AppText
                    variant="label"
                    style={{ color: active ? palette.primaryDeep : palette.textTertiary }}
                  >
                    {mode === 'equal' ? 'Split equally' : 'Custom amounts'}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {/* Participants */}
          <View style={styles.sectionHeader}>
            <AppText variant="label">
              {isGroupMode ? 'Group members' : 'Split with'} ({selectedUserIds.length})
            </AppText>
            {peopleList.length > 0 && (
              <Pressable onPress={toggleSelectAll} hitSlop={6}>
                <AppText variant="caption" color="primaryDeep">
                  {allSelected ? 'Clear all' : 'Select all'}
                </AppText>
              </Pressable>
            )}
          </View>

          {splitMode === 'equal' && amountValue > 0 && selectedUserIds.length > 0 && (
            <AppText variant="caption" color="textSecondary" style={styles.splitHint}>
              {inr(perHead)} each, across {equalHeadCount} {equalHeadCount === 1 ? 'person' : 'people'} (including you)
            </AppText>
          )}

          {splitMode === 'custom' && (
            <View style={styles.remainderRow}>
              <AppText variant="caption" color="textSecondary">
                {Math.abs(customRemainder) < 0.01
                  ? 'Shares add up — good to go'
                  : customRemainder > 0
                    ? `${inr(customRemainder)} left to assign`
                    : `${inr(Math.abs(customRemainder))} over the total`}
              </AppText>
              <Pressable onPress={splitEvenlyIntoCustom} hitSlop={6}>
                <AppText variant="caption" color="primaryDeep">
                  Split evenly
                </AppText>
              </Pressable>
            </View>
          )}

          <View style={styles.peopleCard}>
            {peopleList.length === 0 ? (
              <AppText variant="bodySm" color="textSecondary" align="center" style={{ padding: spacing.lg }}>
                {isGroupMode
                  ? 'No members found in this group.'
                  : 'Add friends first to split expenses with them.'}
              </AppText>
            ) : (
              peopleList.map((person, index) => {
                const selected = selectedUserIds.includes(person.id);
                const isYou = person.id === userId;
                return (
                  <View
                    key={person.id}
                    style={[styles.personRow, index !== peopleList.length - 1 && styles.personDivider]}
                  >
                    <Pressable style={styles.personMain} onPress={() => toggleUser(person.id)}>
                      <View style={[styles.personAvatar, selected && styles.personAvatarActive]}>
                        <AppText variant="caption" style={{ color: selected ? palette.white : palette.primaryDeep }}>
                          {getInitials(person.name)}
                        </AppText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppText variant="label" numberOfLines={1}>
                          {isYou ? 'You' : person.name}
                        </AppText>
                        {!!person.email && (
                          <AppText variant="micro" color="textTertiary" numberOfLines={1}>
                            {person.email}
                          </AppText>
                        )}
                      </View>
                    </Pressable>

                    {splitMode === 'custom' && selected ? (
                      <TextInput
                        value={customShares[person.id] ?? ''}
                        onChangeText={(text) =>
                          setCustomShares((prev) => ({ ...prev, [person.id]: text }))
                        }
                        placeholder="0"
                        placeholderTextColor={palette.textTertiary}
                        keyboardType="decimal-pad"
                        style={styles.shareInput}
                      />
                    ) : (
                      <Pressable onPress={() => toggleUser(person.id)} hitSlop={6}>
                        <View style={[styles.checkbox, selected && styles.checkboxActive]}>
                          {selected && <Icon name="Check" size={13} color={palette.white} clickable={false} />}
                        </View>
                      </Pressable>
                    )}
                  </View>
                );
              })
            )}
          </View>

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

  segmented: {
    flexDirection: 'row',
    backgroundColor: palette.card,
    borderRadius: radius.pill,
    padding: 4,
    ...shadows.xs,
  },
  segment: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.pill },
  segmentActive: { backgroundColor: palette.primaryLight },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  splitHint: { marginTop: -spacing.sm },
  remainderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -spacing.sm,
  },

  peopleCard: {
    backgroundColor: palette.card,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.base,
    ...shadows.xs,
  },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  personDivider: { borderBottomWidth: 1, borderBottomColor: palette.divider },
  personMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  personAvatar: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personAvatarActive: { backgroundColor: palette.primary },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  shareInput: {
    width: 84,
    textAlign: 'right',
    fontSize: 15,
    fontFamily: fontFamily.bold,
    color: palette.textPrimary,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },

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
