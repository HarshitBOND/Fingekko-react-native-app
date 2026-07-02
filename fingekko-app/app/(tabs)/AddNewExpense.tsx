import type { FriendsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Calendar, CheckCircle2, CheckSquare2, Circle, Plus, Users } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddNewExpense() {
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();
  const { groupId } = useLocalSearchParams<{ groupId?: string | string[] }>();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [friends, setFriends] = useState<FriendsResponse>({ friends: [], incomingRequests: [], outgoingRequests: [] });
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
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
  }, [isSignedIn]);

  const acceptedFriends = useMemo(() => friends.friends, [friends.friends]);

  const toggleFriend = (friendId: string) => {
    setSelectedFriendIds((current) =>
      current.includes(friendId) ? current.filter((id) => id !== friendId) : [...current, friendId]
    );
  };

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
        },
      });

      Alert.alert('Saved', 'Expense added successfully.');
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setSelectedFriendIds([]);
    } catch (saveError: any) {
      setError(saveError.message || 'Could not save expense.');
    } finally {
      setSaving(false);
    }
  };

  const participantCount = selectedFriendIds.length + 1;
  const perPerson = useMemo(() => {
    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0 || participantCount <= 0) {
      return 'Select friends to preview the split.';
    }

    return `Each person pays ${(amountValue / participantCount).toFixed(2)} when split among ${participantCount} people.`;
  }, [amount, participantCount]);

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <View style={styles.heroSection}>
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            colors={['rgba(20,138,70,0.22)', 'rgba(20,138,70,0.05)', 'transparent']}
            locations={[0, 0.4, 1]}
            style={[
              StyleSheet.absoluteFill,
              {
                width: 240,
                height: 240,
                top: -70,
                left: -70,
                borderRadius: 200,
              },
            ]}
          />

          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#1f2937" />
          </Pressable>

          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Add New Expense</Text>
            <Text style={styles.heroSubtitle}>Pick friends first, then split the cost in one tap.</Text>
            {groupId ? (
              <Text style={styles.groupHint}>
                Group: {Array.isArray(groupId) ? groupId[0] : groupId}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Amount</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.prefix}>₹</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                style={styles.fieldInput}
                placeholder="0"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={styles.fieldInput}
              placeholder="Dinner, cab, groceries"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Date</Text>
            <View style={styles.inputWrap}>
              <Calendar size={18} color="#9ca3af" />
              <TextInput
                value={date}
                onChangeText={setDate}
                style={styles.fieldInput}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              style={[styles.fieldInput, styles.textArea]}
              placeholder="Optional note"
              multiline
            />
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.rowHeader}>
              <Text style={styles.fieldLabel}>Select friends</Text>
              <Text style={styles.friendCount}>{selectedFriendIds.length} selected</Text>
            </View>

            {loadingFriends ? (
              <ActivityIndicator color="#148a46" />
            ) : acceptedFriends.length === 0 ? (
              <View style={styles.emptyFriendsBox}>
                <Users size={18} color="#148a46" />
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
                      <CheckSquare2 size={22} color="#148a46" />
                    ) : (
                      <Circle size={22} color="#94a3b8" />
                    )}
                  </Pressable>
                );
              })
            )}
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>Split preview</Text>
            <Text style={styles.previewText}>{perPerson}</Text>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable style={styles.primaryButton} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#ffffff" /> : <Plus size={18} color="#ffffff" />}
            <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save Expense'}</Text>
          </Pressable>

          <View style={styles.tipCard}>
            <CheckCircle2 size={18} color="#148a46" />
            <Text style={styles.tipText}>The selected friends will be stored in the expense split for later settlement.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f5f8f5',
  },
  container: {
    paddingBottom: 32,
    gap: 16,
  },
  heroSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  heroCopy: {
    gap: 4,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.8,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  groupHint: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: '#148a46',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginHorizontal: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: '#e9f3ec',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#f8fbf8',
    borderWidth: 1,
    borderColor: '#e4efe7',
  },
  prefix: {
    fontSize: 18,
    fontWeight: '700',
    color: '#148a46',
  },
  fieldInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 0,
  },
  textArea: {
    minHeight: 84,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  friendCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#148a46',
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
    borderWidth: 1,
    borderColor: '#e4efe7',
  },
  friendRow: {
    minHeight: 54,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#f8fbf8',
    borderWidth: 1,
    borderColor: '#e4efe7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  friendIdentity: {
    gap: 2,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  friendEmail: {
    fontSize: 12,
    color: '#6b7280',
  },
  previewCard: {
    gap: 4,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#edf9f1',
    borderWidth: 1,
    borderColor: '#d4edda',
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  previewText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  errorText: {
    color: '#eb5a4f',
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButton: {
    marginTop: 4,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: '#148a46',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#edf9f1',
    borderWidth: 1,
    borderColor: '#d4edda',
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#374151',
  },
});