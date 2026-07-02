import type { FriendRelationship, FriendSearchResponse, FriendsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@clerk/clerk-expo';
import { Check, Handshake, Mail, Search, UserPlus, Users, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function FriendCard({
  item,
  onAccept,
  onDecline,
  onRemove,
}: {
  item: FriendRelationship;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  onRemove?: (id: string) => void;
}) {
  const initials = item.friend.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <View style={styles.cardRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials || 'F'}</Text>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.name}>{item.friend.name}</Text>
        <Text style={styles.email}>{item.friend.email}</Text>
        <Text style={styles.meta}>
          {item.status === 'accepted'
            ? 'Connected'
            : item.direction === 'incoming'
              ? 'Incoming request'
              : 'Outgoing request'}
        </Text>
      </View>

      <View style={styles.cardActions}>
        {item.status === 'pending' && item.direction === 'incoming' ? (
          <>
            <Pressable style={styles.acceptButton} onPress={() => onAccept?.(item.id)}>
              <Check size={16} color="#ffffff" />
            </Pressable>
            <Pressable style={styles.rejectButton} onPress={() => onDecline?.(item.id)}>
              <X size={16} color="#991b1b" />
            </Pressable>
          </>
        ) : (
          <Pressable style={styles.secondaryButton} onPress={() => onRemove?.(item.id)}>
            <Text style={styles.secondaryButtonText}>Remove</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function FriendsScreen() {
  const { getToken, isSignedIn } = useAuth();
  const [friends, setFriends] = useState<FriendsResponse>({
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
  });
  const [searchLoading, setSearchLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const getTokenRef = useRef(getToken);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendSearchResponse[]>([]);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const loadFriends = async () => {
    if (!isSignedIn) {
      return;
    }

    const token = await getTokenRef.current();
    if (!token) {
      return;
    }

    const response = await apiRequest<FriendsResponse>('/api/friends', {}, token);
    setFriends(response);
  };

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        await loadFriends();
      } catch (error) {
        if (active) {
          setMessage('Unable to load friends right now.');
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [isSignedIn]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const handle = setTimeout(async () => {
      const token = await getToken();
      if (!token) return;
      setSearchLoading(true);
      try {
        const response = await apiRequest<FriendSearchResponse[]>({
          method: 'get',
          url: `/api/friends/search?q=${encodeURIComponent(searchQuery.trim())}`,
          token,
        });
        setSearchResults(response);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setSearchLoading(false);
      }
    }, 350);

    return () => clearTimeout(handle);
  }, [searchQuery]);

  const sendRequest = async (targetEmail: string) => {
    const token = await getTokenRef.current();
    if (!token) {
      return;
    }

    await apiRequest({
      method: 'post',
      url: '/api/friends/request',
      token,
      data: { email: targetEmail },
    });

    setMessage('Friend request sent.');
    await loadFriends();
  };

  const acceptRequest = async (friendshipId: string) => {
    const token = await getTokenRef.current();
    if (!token) {
      return;
    }

    await apiRequest({
      method: 'put',
      url: `/api/friends/${friendshipId}/accept`,
      token,
    });

    setMessage('Friend request accepted.');
    await loadFriends();
  };

  const declineRequest = async (friendshipId: string) => {
    const token = await getTokenRef.current();
    if (!token) {
      return;
    }

    await apiRequest({
      method: 'put',
      url: `/api/friends/${friendshipId}/decline`,
      token,
    });

    setMessage('Friend request declined.');
    await loadFriends();
  };

  const removeFriend = async (friendshipId: string) => {
    const token = await getTokenRef.current();
    if (!token) {
      return;
    }

    await apiRequest({
      method: 'delete',
      url: `/api/friends/${friendshipId}`,
      token,
    });

    setMessage('Friend removed.');
    await loadFriends();
  };

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.badge}>
            <Users size={14} color="#166534" />
            <Text style={styles.badgeText}>Community</Text>
          </View>
          <Text style={styles.title}>Friends</Text>
          <Text style={styles.subtitle}>
            Connect with friends, manage shared expenses, and settle up with ease.
          </Text>
        </View>

        <View style={styles.searchCard}>
          <Text style={styles.sectionTitle}>Search Friends</Text>
          <View style={styles.searchRow}>
            <Handshake size={18} color="#64748b" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              placeholder='Search people...'
              style={styles.searchInput}
            />
          </View>


          {searchLoading && (
            <View style={{ marginTop: 10 }}>
              <ActivityIndicator size="small" color="#166534" />
            </View>
          )}

          {!searchLoading &&
            searchQuery.trim() !== "" &&
            searchResults.length === 0 && (
              <Text style={styles.emptyText}>No results found.</Text>
            )}

          {searchResults.length > 0 && (
            <View style={styles.resultsContainer}>
              <ScrollView
                style={{ maxHeight: 300 }}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {searchResults.map((result) => {
                  const relationship = result.relationship;
                  const isAccepted = relationship?.status === "accepted";
                  const isPendingOutgoing =
                    relationship?.status === "pending" &&
                    relationship.direction === "outgoing";

                  return (
                    <View key={result.user.id} style={styles.cardRow}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {result.user.name
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part) => part[0]?.toUpperCase())
                            .join("") || "F"}
                        </Text>
                      </View>

                      <View style={styles.cardBody}>
                        <Text style={styles.name}>{result.user.name}</Text>
                        <Text style={styles.email}>{result.user.email}</Text>
                      </View>

                      {isAccepted ? (
                        <View style={styles.acceptedPill}>
                          <Check size={14} color="#14532d" />
                          <Text style={styles.acceptedPillText}>Friends</Text>
                        </View>
                      ) : (
                        <Pressable
                          style={[
                            styles.primaryButton,
                            isPendingOutgoing && {
                              backgroundColor: "#dcfce7",
                            },
                          ]}
                          onPress={() => sendRequest(result.user.email)}
                          disabled={isPendingOutgoing}
                        >
                          {isPendingOutgoing ? (
                            <Handshake size={16} color="#166534" />
                          ) : (
                            <UserPlus size={16} color="#ffffff" />
                          )}

                          <Text
                            style={[
                              styles.primaryButtonText,
                              isPendingOutgoing && {
                                color: "#166534",
                              },
                            ]}
                          >
                            {isPendingOutgoing ? "Request sent" : "Add Friend"}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Incoming requests</Text>
          {friends.incomingRequests.length === 0 ? (
            <Text style={styles.emptyText}>No pending requests.</Text>
          ) : (
            friends.incomingRequests.map((item) => (
              <FriendCard key={item.id} item={item} onAccept={acceptRequest} onDecline={declineRequest} />
            ))
          )}
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Outgoing requests</Text>
          {friends.outgoingRequests.length === 0 ? (
            <Text style={styles.emptyText}>No requests sent yet.</Text>
          ) : (
            friends.outgoingRequests.map((item) => <FriendCard key={item.id} item={item} onRemove={removeFriend} />)
          )}
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Your friends</Text>
          {friends.friends.length === 0 ? (
            <Text style={styles.emptyText}>No friends yet. Search by email to add people.</Text>
          ) : (
            friends.friends.map((item) => <FriendCard key={item.id} item={item} onRemove={removeFriend} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  resultsContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  page: {
    flex: 1,
    backgroundColor: '#f4f7f2',
  },
  container: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  badge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dcfce7',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    marginTop: 12,
    fontSize: 48,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
  },
  searchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe4ee',
    backgroundColor: '#f8fafc',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
  },
  searchButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#148a46',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  resultCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#edf9f1',
    borderWidth: 1,
    borderColor: '#d4edda',
    gap: 10,
  },
  acceptedPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#dcfce7',
  },
  acceptedPillText: {
    color: '#14532d',
    fontSize: 12,
    fontWeight: '700',
  },
  primaryButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  message: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 17,
    color: '#b7bfce',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    fontWeight: '600',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
  },
  avatarText: {
    color: '#0f172a',
    fontWeight: '800',
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  email: {
    fontSize: 12,
    color: '#475569',
  },
  meta: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardActions: {
    gap: 8,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
  },
  rejectButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
  },
  secondaryButton: {
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
  },
});