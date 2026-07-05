import type { FriendsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Icon from '../../../components/ui/Icon';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

// NOTE: swap this out for the real illustration when you have it.
// Suggested path: assets/wallet.png
const WALLET_ILLUSTRATION = require('../../../assets/images/bgadd.png');

const CATEGORIES = ['Food', 'Travel', 'Shopping', 'Bills', 'Entertainment', 'Other'];

// ---- shared "person" shape so friends & group members render the same way ----
type Person = {
  id: string;
  name: string;
  email: string;
};

// Shape expected from GET /api/groups/:groupId
// NOTE: today groupRoute.ts only returns `members: string[]` (raw ids).
// This type assumes the backend is extended to populate + serialize
// members as { id, name, email }[]. Until that ships, `name`/`email`
// will be missing and the UI falls back to showing the id.
type GroupDetailsResponse = {
  id: string;
  name: string;
  members: Partial<Person>[];
};

export default function AddNewExpense() {
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();
  const { groupId: groupIdParam } = useLocalSearchParams<{ groupId?: string | string[] }>();
  const groupId = Array.isArray(groupIdParam) ? groupIdParam[0] : groupIdParam;
  const isGroupMode = Boolean(groupId);

  // ---- form state (unchanged field names -> unchanged API payload) ----
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<string>('');

  // friends (used when NOT in group mode)
  const [friends, setFriends] = useState<FriendsResponse>({
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
  });
  const [loadingFriends, setLoadingFriends] = useState(false);

  // group (used when in group mode)
  const [group, setGroup] = useState<GroupDetailsResponse | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(false);

  // renamed from selectedFriendIds -> selectedUserIds (scales to both friends & group members)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [peoplePickerOpen, setPeoplePickerOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [selectedSplit, setSelectedSplit] = useState<'equal' | 'custom'>('equal');

  const [splitMethod, setSplitMethod]= useState<boolean>(false);

  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  // ---- load friends (only relevant outside group mode) ----
  useEffect(() => {
    if (isGroupMode) return;
    let active = true;

    const loadFriends = async () => {
      if (!isSignedIn) return;

      setLoadingFriends(true);

      try {
        const token = await getTokenRef.current();
        if (!token) return;

        const response = await apiRequest<FriendsResponse>('/api/friends', {}, token);

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
  }, [isSignedIn, isGroupMode]);

  // ---- load group + auto-select all members (only relevant in group mode) ----
  useEffect(() => {
    if (!isGroupMode || !groupId) return;
    let active = true;

    const loadGroup = async () => {
      if (!isSignedIn) return;

      setLoadingGroup(true);

      try {
        const token = await getTokenRef.current();
        if (!token) return;

        const response = await apiRequest<GroupDetailsResponse>(`/api/groups/${groupId}`, {}, token);

        if (active) {
          setGroup(response);
          // auto-select every group member by default
          setSelectedUserIds(
            response.members.map((m: any) =>
              typeof m === 'string' ? m : String(m.id)
            )
          );
        }
      } catch (fetchError) {
        if (active) {
          setError('Unable to load group members for splitting.');
        }
      } finally {
        if (active) {
          setLoadingGroup(false);
        }
      }
    };

    loadGroup();

    return () => {
      active = false;
    };
  }, [isSignedIn, isGroupMode, groupId]);

  // ---- unified people source ----
  const peopleList: Person[] = useMemo(() => {
    if (isGroupMode) {
      return (group?.members ?? []).map((m: any) => {
        if (typeof m === 'string') {
          return {
            id: m,
            name: m,
            email: '',
          };
        }

        return {
          id: String(m.id),
          name: m.name ?? String(m.id),
          email: m.email ?? '',
        };
      });
    }

    return friends.friends.map((f) => ({
      id: f.friend.id,
      name: f.friend.name,
      email: f.friend.email,
    }));
  }, [isGroupMode, group, friends.friends]);

  const loadingPeople = isGroupMode ? loadingGroup : loadingFriends;

  const selectedPeople = useMemo(
    () => peopleList.filter((p) => selectedUserIds.includes(p.id)),
    [peopleList, selectedUserIds]
  );

  const allSelected = peopleList.length > 0 && selectedUserIds.length === peopleList.length;

  const toggleUser = (userId: string) => {
    setSelectedUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  };

  const toggleSelectAll = () => {
    setSelectedUserIds(allSelected ? [] : peopleList.map((p) => p.id));
  };

  const peopleSummaryLabel = useMemo(() => {
    if (loadingPeople) return isGroupMode ? 'Loading group members...' : 'Loading friends...';
    if (selectedPeople.length === 0) {
      return isGroupMode ? 'Select group members' : 'Select friends to split with';
    }
    if (selectedPeople.length === 1) return selectedPeople[0].name;
    return `${selectedPeople[0].name} + ${selectedPeople.length - 1} more`;
  }, [selectedPeople, loadingPeople, isGroupMode]);

  const handleSave = async () => {
    setError('');

    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError('Enter a valid amount.');
      return;
    }

    if (selectedSplit === 'custom') {
      const sum = selectedUserIds.reduce((acc, id) => acc + Number(customShares[id] || 0), 0);
      if (Math.abs(sum - amountValue) > 0.01) {
        setError(`Custom split shares must sum up to the total amount (₹${amountValue}). Currently: ₹${sum.toFixed(2)}`);
        return;
      }
    }

    try {
      setSaving(true);
      const token = await getTokenRef.current();

      if (!token) {
        setError('Sign in again to save this expense.');
        return;
      }

      const finalParticipantIds = selectedSplit === 'custom'
        ? selectedUserIds.map((userId) => ({
            userId,
            amount: Number(customShares[userId] || 0),
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
          splitType: selectedSplit === 'custom' ? 'unequalPaidByYou' : 'equalPaidByYou',
          participantIds: finalParticipantIds,
          notes: notes.trim(),
          currency: 'INR',
          ...(isGroupMode ? { groupId } : {}),
          category: category || undefined,
        },
      });

      Alert.alert('Saved', 'Expense added successfully.');
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setCategory('');
      setCustomShares({});
      // group mode: reset back to "everyone selected"; friend mode: clear
      setSelectedUserIds(isGroupMode ? peopleList.map((p) => p.id) : []);
    } catch (saveError: any) {
      setError(saveError.message || 'Could not save expense.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={() => router.push(`/(tabs)/group/${groupId}`)}>
          <Icon name="ChevronLeft" size={20} color="#148a46" />
        </Pressable>
        <Text style={styles.headerTitle}>Add Expense</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <View style={styles.balanceCard}>
          <View style={styles.balanceIconWrap}>
            <Icon name="Wallet" size={22} color="#148a46" />
          </View>
          <View style={styles.balanceCopy}>
            <Text style={styles.balanceLabel}>Create</Text>
            <Text style={styles.balanceValue}>New Group Expense</Text>
          </View>
          <Image source={WALLET_ILLUSTRATION} style={styles.balanceImage} resizeMode="contain" />
        </View>

        {isGroupMode ? (
          <Text style={styles.groupHint}> {group?.name ?? 'Your Squad'}</Text>
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
          <Text style={styles.fieldLabel}>Split With</Text>
          <Pressable style={styles.inputWrap} onPress={() => setPeoplePickerOpen(true)}>
            <View style={styles.iconBubble}>
              <Icon name="Users" size={18} color="#148a46" />
            </View>
            <Text style={[styles.fieldInput, selectedPeople.length === 0 && styles.placeholderText]}>
              {peopleSummaryLabel}
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

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Split Method</Text>

          <View style={styles.splitContainer}>
            <Pressable
              style={[
                styles.splitButton,
                selectedSplit === 'equal' && styles.splitButtonActive,
              ]}
              onPress={() => setSelectedSplit('equal')}
            >
              <Text
                style={[
                  styles.splitButtonText,
                  selectedSplit === 'equal' && styles.splitButtonTextActive,
                ]}
              >
                Split Equally
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.splitButton,
                selectedSplit === 'custom' && styles.splitButtonActive,
              ]}
              onPress={() => setSplitMethod(true)}
            >
              <Text
                style={[
                  styles.splitButtonText,
                  selectedSplit === 'custom' && styles.splitButtonTextActive,
                ]}
              >
                Custom Split
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

      {/* People (friends OR group members) multi-select modal */}
      <Modal visible={peoplePickerOpen} animationType="slide" transparent onRequestClose={() => setPeoplePickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPeoplePickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />

            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>{isGroupMode ? 'Group Members' : 'Select Friends'}</Text>
              {peopleList.length > 0 ? (
                <Pressable onPress={toggleSelectAll}>
                  <Text style={styles.selectAllText}>{allSelected ? 'Deselect All' : 'Select All'}</Text>
                </Pressable>
              ) : null}
            </View>

            <ScrollView style={styles.modalList}>
              {loadingPeople ? (
                <ActivityIndicator color="#148a46" style={{ marginVertical: 20 }} />
              ) : peopleList.length === 0 ? (
                <View style={styles.emptyFriendsBox}>
                  <Icon name="Users" size={18} color="#148a46" />
                  <Text style={styles.helperText}>
                    {isGroupMode
                      ? 'No members found in this group.'
                      : 'Add friends first to split expenses with them.'}
                  </Text>
                </View>
              ) : (
                peopleList.map((person) => {
                  const selected = selectedUserIds.includes(person.id);

                  return (
                    <Pressable key={person.id} style={styles.friendRow} onPress={() => toggleUser(person.id)}>
                      <View style={styles.friendIdentity}>
                        <Text style={styles.friendName}>{person.name}</Text>
                        {person.email ? <Text style={styles.friendEmail}>{person.email}</Text> : null}
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

            <Pressable style={styles.modalDoneButton} onPress={() => setPeoplePickerOpen(false)}>
              <Text style={styles.modalDoneText}>Done ({selectedUserIds.length})</Text>
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

      {/* Custom Split Modal */}
      <Modal visible={splitMethod} animationType="slide" transparent onRequestClose={() => setSplitMethod(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSplitMethod(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Custom Split</Text>

            <ScrollView style={styles.modalList}>
              {selectedPeople.map((person) => {
                return (
                  <View key={person.id} style={styles.friendRow}>
                    <View style={styles.friendIdentity}>
                      <Text style={styles.friendName}>{person.name}</Text>
                      {person.email ? <Text style={styles.friendEmail}>{person.email}</Text> : null}
                    </View>
                    <TextInput
                      style={[styles.fieldInput, { width: 80, textAlign: 'right' }]}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      value={customShares[person.id] || ''}
                      onChangeText={(text) => {
                        setCustomShares((prev) => ({
                          ...prev,
                          [person.id]: text,
                        }));
                      }}
                    />
                  </View>
                );
              })}
            </ScrollView>

            <Pressable style={styles.modalDoneButton} onPress={() => setSplitMethod(false)}>
              <Text style={styles.modalDoneText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  splitContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
},

splitButton: {
  width: '48%',
  height: 52,
  borderRadius: 16,
  borderWidth: 2,
  borderColor: '#000000',
  backgroundColor: '#fff',
  alignItems: 'center',
  justifyContent: 'center',
  shadowColor: '#000000',
  shadowOffset: { width: 3, height: 3 },
  shadowOpacity: 1,
  shadowRadius: 0,
},

splitButtonActive: {
  backgroundColor: '#00FF66',
  borderColor: '#000000',
},

splitButtonText: {
  fontSize: 14,
  fontWeight: '800',
  color: '#000000',
},

splitButtonTextActive: {
  color: '#000000',
},
  page: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#eef6f0',
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  balanceIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  balanceCopy: {
    flex: 1,
    gap: 4,
  },
  balanceLabel: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '800',
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
  },
  balanceImage: {
    width: 64,
    height: 64,
  },
  groupHint: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f0f7f1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  prefix: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 0,
    fontWeight: '600',
  },
  placeholderText: {
    color: '#9ca3af',
  },
  textAreaWrap: {
    minHeight: 90,
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#eb5a4f',
    fontSize: 13,
    fontWeight: '800',
  },
  primaryButton: {
    marginTop: 8,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: '#00FF66',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
  },
  helperText: {
    flex: 1,
    fontSize: 13,
    color: '#64748b',
  },
  emptyFriendsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#f8fbf8',
    borderWidth: 2,
    borderColor: '#000000',
    marginVertical: 8,
  },
  friendRow: {
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  friendIdentity: {
    gap: 2,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  friendEmail: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '600',
  },
  categoryRow: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: '70%',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    marginBottom: 12,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#148a46',
  },
  modalList: {
    marginBottom: 8,
  },
  modalDoneButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: '#148a46',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  modalDoneText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});