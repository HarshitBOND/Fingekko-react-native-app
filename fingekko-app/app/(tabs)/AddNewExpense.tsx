import type { FriendsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Icon from '../../components/ui/Icon';
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
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [friendPickerOpen, setFriendPickerOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);

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

    try {
      setSaving(true);
      const token = await getTokenRef.current();

      if (!token) {
        setError('Sign in again to save this expense.');
        return;
      }

      await apiRequest({
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
          // NOTE: `category` is not part of the original payload shape.
          // Keep it only if your backend Expense schema accepts it,
          // otherwise strip this line before shipping.
          category: category || undefined,
        },
      });

      Alert.alert('Saved', 'Expense added successfully.');
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setCategory('');
      setSelectedFriendIds([]);
    } catch (saveError: any) {
      setError(saveError.message || 'Could not save expense.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
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
            <Icon name="Wallet" size={22} color="#148a46" />
          </View>
          <View style={styles.balanceCopy}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceValue}>₹ 12,450.00</Text>
          </View>
          <Image source={WALLET_ILLUSTRATION} style={styles.balanceImage} resizeMode="contain" />
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
    fontSize: 12,
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
    fontWeight: '800',
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
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderColor: '#000000',
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 12,
  },
  modalList: {
    marginBottom: 8,
  },
  modalDoneButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#00FF66',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  modalDoneText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
  },
});