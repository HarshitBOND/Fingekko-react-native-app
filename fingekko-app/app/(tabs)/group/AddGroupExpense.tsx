import type { FriendsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Icon from '../../../components/ui/Icon';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from '../../../components/ui/Toast';
import { useToast } from '../../../hooks/useToast';
import { palette, spacing, radius, shadows, fontFamily, layout } from '../../../constants/design';

const WALLET_ILLUSTRATION = require('../../../assets/images/bgadd.png');

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

export default function AddNewExpense() {
  const { userId, getToken, isSignedIn } = useAuth();
  const router = useRouter();
  const { groupId: groupIdParam } = useLocalSearchParams<{ groupId?: string | string[] }>();
  const groupId = Array.isArray(groupIdParam) ? groupIdParam[0] : groupIdParam;
  const isGroupMode = Boolean(groupId);

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
  const [loadingFriends, setLoadingFriends] = useState(false);

  const [group, setGroup] = useState<GroupDetailsResponse | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(false);

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [customOwesMe, setCustomOwesMe] = useState<Record<string, string>>({});
  const [customIOwe, setCustomIOwe] = useState<Record<string, string>>({});
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { toast, showToast, dismissToast } = useToast();

  const [peoplePickerOpen, setPeoplePickerOpen] = useState(false);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [selectedSplit, setSelectedSplit] = useState<'equal' | 'custom'>('equal');

  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const slideAnim = useRef(new Animated.Value(0)).current;

  const handleSplitMethodChange = (method: 'equal' | 'custom') => {
    setSelectedSplit(method);
    Animated.timing(slideAnim, {
      toValue: method === 'custom' ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

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
          setSelectedUserIds([]);
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
          dbId: m.dbId,
        };
      });
    }

    return friends.friends.map((f) => ({
      id: f.friend.id,
      name: f.friend.name,
      email: f.friend.email,
    }));
  }, [isGroupMode, group, friends.friends]);

  const filteredPeopleList = useMemo(() => {
    return peopleList
      .filter(p => p.id !== userId)
      .filter(p => p.name.toLowerCase().includes(memberSearchQuery.toLowerCase()));
  }, [peopleList, memberSearchQuery, userId]);

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
      const sum = peopleList.reduce((acc, p) => acc + (Number(customOwesMe[p.id] || 0) - Number(customIOwe[p.id] || 0)), 0);
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
        ? peopleList.map((p) => ({
            userId: p.id,
            amount: Number(customOwesMe[p.id] || 0) - Number(customIOwe[p.id] || 0),
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

      showToast({ title: 'Expense added! 🎉', message: 'The split has been shared.', tone: 'success', duration: 1600 });
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setCategory('');
      setCustomOwesMe({});
      setCustomIOwe({});
      setSelectedUserIds(isGroupMode ? peopleList.map((p) => p.id) : []);
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
        <Pressable style={styles.headerButton} onPress={() => (router.canGoBack() ? router.back() : router.replace(`/(tabs)/group/${groupId}`))}>
          <Icon name="ChevronLeft" size={20} color="#148a46" />
        </Pressable>
        <Text style={styles.headerTitle}>Add Expense</Text>
        <View style={styles.headerButton} />
      </View>

      {/* Top Wallet Card & Switcher */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 12 }}>
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

        {isGroupMode && (
          <Text style={styles.groupHint}> {group?.name ?? 'Your Squad'}</Text>
        )}

        {/* Split Method Switcher on Top */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Split Method</Text>
          <View style={styles.splitContainer}>
            <Pressable
              style={[
                styles.splitButton,
                selectedSplit === 'equal' && styles.splitButtonActive,
              ]}
              onPress={() => handleSplitMethodChange('equal')}
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
              onPress={() => handleSplitMethodChange('custom')}
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
      </View>

      {/* Animated Sliding Container */}
      <Animated.View
        style={{
          flex: 1,
          flexDirection: 'row',
          width: SCREEN_WIDTH * 2,
          transform: [
            {
              translateX: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -SCREEN_WIDTH],
              }),
            },
          ],
        }}
      >
        {/* Screen 1: Equal Split Fields */}
        <View style={{ width: SCREEN_WIDTH }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.container, { paddingTop: 12 }]}
          >
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

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable style={styles.primaryButton} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Add Expense</Text>
                  <Icon name="ChevronRight" size={18} color="#000000" />
                </>
              )}
            </Pressable>
          </ScrollView>
        </View>

        {/* Screen 2: Custom Split Fields */}
        <View style={{ width: SCREEN_WIDTH }}>
          <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12 }}>
            {/* Search Input */}
            <View style={[styles.inputWrap, { marginBottom: 12 }]}>
              <Icon name="Search" size={18} color="#000000" />
              <TextInput
                value={memberSearchQuery}
                onChangeText={setMemberSearchQuery}
                style={styles.fieldInput}
                placeholder="Search group members..."
                placeholderTextColor="#9ca3af"
              />
            </View>

            {/* List of members with green/red inputs */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {filteredPeopleList.length === 0 ? (
                <View style={styles.emptyFriendsBox}>
                  <Text style={styles.helperText}>No members match your search.</Text>
                </View>
              ) : (
                filteredPeopleList.map((person) => {
                  return (
                    <View key={person.id} style={styles.customSplitRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.friendName}>{person.name}</Text>
                        <Text style={styles.friendEmail}>{person.email || 'Group member'}</Text>
                      </View>
                      
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {/* They Owe Me Input (Green text) */}
                        <View style={{ width: 85 }}>
                          <Text style={{ fontSize: 9, fontWeight: '900', color: '#1FA855', marginBottom: 2 }}>They Owe Me</Text>
                          <TextInput
                            style={styles.customSplitInputGreen}
                            placeholder="₹0"
                            placeholderTextColor="#a7f3d0"
                            keyboardType="decimal-pad"
                            value={customOwesMe[person.id] || ''}
                            onChangeText={(text) => {
                              setCustomOwesMe((prev) => ({
                                ...prev,
                                [person.id]: text,
                              }));
                            }}
                          />
                        </View>

                        {/* I Owe Them Input (Red text) */}
                        <View style={{ width: 85 }}>
                          <Text style={{ fontSize: 9, fontWeight: '900', color: '#FF3366', marginBottom: 2 }}>I Owe Them</Text>
                          <TextInput
                            style={styles.customSplitInputRed}
                            placeholder="₹0"
                            placeholderTextColor="#fecdd3"
                            keyboardType="decimal-pad"
                            value={customIOwe[person.id] || ''}
                            onChangeText={(text) => {
                              setCustomIOwe((prev) => ({
                                ...prev,
                                [person.id]: text,
                              }));
                            }}
                          />
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable style={[styles.primaryButton, { marginBottom: layout.navBarHeight + layout.navBarBottomInset + 16 }]} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Add Custom Split</Text>
                  <Icon name="ChevronRight" size={18} color="#000000" />
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Animated.View>

      {/* People Picker Modal */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  splitContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  splitButton: {
    width: '48%',
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.xs,
  },
  splitButtonActive: {
    backgroundColor: palette.primaryLight,
    borderColor: palette.primary,
  },
  splitButtonText: {
    fontSize: 14,
    fontFamily: fontFamily.bold,
    color: palette.textSecondary,
  },
  splitButtonTextActive: {
    color: palette.primaryDeep,
  },
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
    backgroundColor: palette.card,
    ...shadows.sm,
  },
  balanceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryLight,
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
    fontSize: 16,
    fontFamily: fontFamily.bold,
    color: palette.textPrimary,
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
  customSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
  },
  customSplitInputGreen: {
    borderWidth: 1,
    borderColor: palette.success,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
    fontFamily: fontFamily.bold,
    color: palette.success,
    backgroundColor: palette.successLight,
    textAlign: 'right',
  },
  customSplitInputRed: {
    borderWidth: 1,
    borderColor: palette.danger,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
    fontFamily: fontFamily.bold,
    color: palette.danger,
    backgroundColor: palette.dangerLight,
    textAlign: 'right',
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
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: fontFamily.bold,
    color: palette.textPrimary,
  },
  selectAllText: {
    fontSize: 13,
    fontFamily: fontFamily.bold,
    color: palette.primaryDeep,
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
});