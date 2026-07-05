import type { FriendRelationship, FriendSearchResponse, FriendsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@clerk/clerk-expo';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import Icon from '../../components/ui/Icon';
import { Colors } from '../../constants/Colors';

// ─── UTILITIES & HELPERS ──────────────────────────────────────────

const getInitials = (name: string): string => {
  if (!name) return 'F';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'F';
};

// ─── CUSTOM HOOKS ────────────────────────────────────────────────

function useFriends() {
  const { getToken, isSignedIn } = useAuth();
  const [friends, setFriends] = useState<FriendsResponse>({
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
  });
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const loadFriends = useCallback(async () => {
    if (!isSignedIn) return;
    setLoading(true);
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      const response = await apiRequest<FriendsResponse>('/api/friends', {}, token);
      setFriends(response);
    } catch (error) {
      console.error('Error loading friends:', error);
      setMessage('Unable to load friends right now.');
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    let active = true;
    if (active) {
      loadFriends();
    }
    return () => {
      active = false;
    };
  }, [loadFriends]);

  const acceptRequest = useCallback(async (friendshipId: string) => {
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      await apiRequest({
        method: 'put',
        url: `/api/friends/${friendshipId}/accept`,
        token,
      });
      setMessage('Friend request accepted.');
      await loadFriends();
    } catch (error) {
      console.error('Error accepting request:', error);
      setMessage('Error accepting request.');
    }
  }, [loadFriends]);

  const declineRequest = useCallback(async (friendshipId: string) => {
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      await apiRequest({
        method: 'put',
        url: `/api/friends/${friendshipId}/decline`,
        token,
      });
      setMessage('Friend request declined.');
      await loadFriends();
    } catch (error) {
      console.error('Error declining request:', error);
      setMessage('Error declining request.');
    }
  }, [loadFriends]);

  const removeFriend = useCallback(async (friendshipId: string) => {
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      await apiRequest({
        method: 'delete',
        url: `/api/friends/${friendshipId}`,
        token,
      });
      setMessage('Friend removed.');
      await loadFriends();
    } catch (error) {
      console.error('Error removing friend:', error);
      setMessage('Error removing friend.');
    }
  }, [loadFriends]);

  return {
    friends,
    loading,
    message,
    setMessage,
    loadFriends,
    acceptRequest,
    declineRequest,
    removeFriend,
  };
}

function useFriendSearch(onSuccess: () => Promise<void>) {
  const { getToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendSearchResponse[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [requestLoading, setRequestLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const handle = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const token = await getToken();
        if (!token) return;
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
  }, [searchQuery, getToken]);

  const sendRequest = useCallback(async (targetEmail: string) => {
    setRequestLoading(prev => ({ ...prev, [targetEmail]: true }));
    try {
      const token = await getToken();
      if (!token) return;
      await apiRequest({
        method: 'post',
        url: '/api/friends/request',
        token,
        data: { email: targetEmail },
      });
      await onSuccess();
    } catch (error) {
      console.error('Error sending request:', error);
    } finally {
      setRequestLoading(prev => ({ ...prev, [targetEmail]: false }));
    }
  }, [getToken, onSuccess]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    searchLoading,
    requestLoading,
    sendRequest,
  };
}

// ─── REUSABLE SUB-COMPONENTS ─────────────────────────────────────

const Avatar = React.memo(({ name }: { name: string }) => {
  const initials = useMemo(() => getInitials(name), [name]);
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
});
Avatar.displayName = 'Avatar';

const EmptyState = React.memo(({ text }: { text: string }) => (
  <Text style={styles.emptyText}>{text}</Text>
));
EmptyState.displayName = 'EmptyState';

const FriendCard = React.memo(({
  item,
  onAccept,
  onDecline,
  onRemove,
  disabled = false,
}: {
  item: FriendRelationship;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  onRemove?: (id: string) => void;
  disabled?: boolean;
}) => {
  const statusLabel = useMemo(() => {
    if (item.status === 'accepted') return 'Connected';
    return item.direction === 'incoming' ? 'Incoming request' : 'Outgoing request';
  }, [item.status, item.direction]);

  return (
    <View style={styles.cardRow}>
      <Avatar name={item.friend.name} />

      <View style={styles.cardBody}>
        <Text style={styles.name}>{item.friend.name}</Text>
        <Text style={styles.email}>{item.friend.email}</Text>
        <Text style={styles.meta}>{statusLabel}</Text>
      </View>

      <View style={styles.cardActions}>
        {item.status === 'pending' && item.direction === 'incoming' ? (
          <View style={styles.actionRow}>
            <Pressable 
              style={[styles.acceptButton, disabled && styles.buttonDisabled]} 
              onPress={() => onAccept?.(item.id)}
              disabled={disabled}
              accessibilityLabel="Accept friend request"
            >
              <Icon name="Check" size={16} color="#000000" />
            </Pressable>
            <Pressable 
              style={[styles.rejectButton, disabled && styles.buttonDisabled]} 
              onPress={() => onDecline?.(item.id)}
              disabled={disabled}
              accessibilityLabel="Decline friend request"
            >
              <Icon name="X" size={16} color="#000000" />
            </Pressable>
          </View>
        ) : (
          <Pressable 
            style={[styles.secondaryButton, disabled && styles.buttonDisabled]} 
            onPress={() => onRemove?.(item.id)}
            disabled={disabled}
            accessibilityLabel="Remove friend"
          >
            <Text style={styles.secondaryButtonText}>Remove</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
});
FriendCard.displayName = 'FriendCard';

const SearchResultCard = React.memo(({
  result,
  onAdd,
  disabled = false,
}: {
  result: FriendSearchResponse;
  onAdd: (email: string) => void;
  disabled?: boolean;
}) => {
  const relationship = result.relationship;
  const isAccepted = relationship?.status === 'accepted';
  const isPendingOutgoing = relationship?.status === 'pending' && relationship.direction === 'outgoing';

  return (
    <View style={styles.cardRow}>
      <Avatar name={result.user.name} />

      <View style={styles.cardBody}>
        <Text style={styles.name}>{result.user.name}</Text>
        <Text style={styles.email}>{result.user.email}</Text>
      </View>

      {isAccepted ? (
        <View style={styles.acceptedPill}>
          <Icon name="Check" size={14} color="#000000" />
          <Text style={styles.acceptedPillText}>Friends</Text>
        </View>
      ) : (
        <Pressable
          style={[
            styles.primaryButton,
            isPendingOutgoing && styles.pendingOutgoingButton,
            disabled && styles.buttonDisabled,
          ]}
          onPress={() => onAdd(result.user.email)}
          disabled={isPendingOutgoing || disabled}
          accessibilityLabel={isPendingOutgoing ? "Request already sent" : "Add Friend"}
        >
          {isPendingOutgoing ? (
            <Icon name="Handshake" size={16} color="#000000" />
          ) : (
            <Icon name="UserPlus" size={16} color="#000000" />
          )}

          <Text style={styles.primaryButtonText}>
            {isPendingOutgoing ? 'Request sent' : 'Add Friend'}
          </Text>
        </Pressable>
      )}
    </View>
  );
});
SearchResultCard.displayName = 'SearchResultCard';

const SearchBar = React.memo(({
  value,
  onChange,
}: {
  value: string;
  onChange: (text: string) => void;
}) => (
  <View style={styles.searchRow}>
    <Icon name="Search" size={18} color="#000000" />
    <TextInput
      value={value}
      onChangeText={onChange}
      autoCapitalize="none"
      placeholder="Search people..."
      style={styles.searchInput}
      placeholderTextColor="#555555"
      accessibilityLabel="Search people input"
    />
  </View>
));
SearchBar.displayName = 'SearchBar';

const FriendSection = React.memo(({
  title,
  data,
  emptyText,
  renderItem,
}: {
  title: string;
  data: any[];
  emptyText: string;
  renderItem: (item: any) => React.ReactNode;
}) => (
  <View style={styles.sectionBlock}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {data.length === 0 ? (
      <EmptyState text={emptyText} />
    ) : (
      data.map(renderItem)
    )}
  </View>
));
FriendSection.displayName = 'FriendSection';

// ─── MAIN SCREEN ─────────────────────────────────────────────────

export default function FriendsScreen() {
  const {
    friends,
    loading,
    message,
    acceptRequest,
    declineRequest,
    removeFriend,
    loadFriends,
  } = useFriends();

  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    searchLoading,
    requestLoading,
    sendRequest,
  } = useFriendSearch(loadFriends);

  const renderFriendItem = useCallback((item: FriendRelationship) => (
    <FriendCard
      key={item.id}
      item={item}
      onAccept={acceptRequest}
      onDecline={declineRequest}
      onRemove={removeFriend}
      disabled={loading}
    />
  ), [acceptRequest, declineRequest, removeFriend, loading]);

  const renderOutgoingItem = useCallback((item: FriendRelationship) => (
    <FriendCard
      key={item.id}
      item={item}
      onRemove={removeFriend}
      disabled={loading}
    />
  ), [removeFriend, loading]);

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.badge}>
            <Icon name="Users" size={14} color="#000000" />
            <Text style={styles.badgeText}>Community</Text>
          </View>
          <Text style={styles.title}>Friends</Text>
          <Text style={styles.subtitle}>
            Connect with friends, manage shared expenses, and settle up with ease.
          </Text>
        </View>

        <View style={styles.searchCard}>
          <Text style={styles.sectionTitle}>Search Friends</Text>
          <SearchBar value={searchQuery} onChange={setSearchQuery} />

          {searchLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#000000" />
            </View>
          )}

          {!searchLoading && searchQuery.trim() !== '' && searchResults.length === 0 && (
            <EmptyState text="No results found." />
          )}

          {searchResults.length > 0 && (
            <View style={styles.resultsContainer}>
              <ScrollView
                style={styles.resultsScrollView}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {searchResults.map((result) => (
                  <SearchResultCard
                    key={result.user.id}
                    result={result}
                    onAdd={sendRequest}
                    disabled={requestLoading[result.user.email]}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>

        <FriendSection
          title="Incoming requests"
          data={friends.incomingRequests}
          emptyText="No pending requests."
          renderItem={renderFriendItem}
        />

        <FriendSection
          title="Outgoing requests"
          data={friends.outgoingRequests}
          emptyText="No requests sent yet."
          renderItem={renderOutgoingItem}
        />

        <FriendSection
          title="Your friends"
          data={friends.friends}
          emptyText="No friends yet. Search by email to add people."
          renderItem={renderOutgoingItem}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  resultsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#000000',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  resultsScrollView: {
    maxHeight: 300,
  },
  loadingContainer: {
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 18,
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  badge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFE600',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000000',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    marginTop: 12,
    fontSize: 48,
    fontWeight: '900',
    color: '#000000',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#000000',
    fontWeight: '600',
  },
  searchCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 3,
    borderColor: '#000000',
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#000000',
    backgroundColor: '#ffffff',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#000000',
    fontWeight: '700',
  },
  searchButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#00FF66',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  searchButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
  },
  resultCard: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#FFF3D4',
    borderWidth: 3,
    borderColor: '#000000',
    gap: 10,
  },
  acceptedPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#C3FFD8',
    borderWidth: 2,
    borderColor: '#000000',
  },
  acceptedPillText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  primaryButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#00FF66',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  pendingOutgoingButton: {
    backgroundColor: '#C3FFD8',
  },
  message: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 17,
    color: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    fontWeight: '700',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#000000',
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C3FFD8',
    borderWidth: 2,
    borderColor: '#000000',
  },
  avatarText: {
    color: '#000000',
    fontWeight: '800',
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
  },
  email: {
    fontSize: 12,
    color: '#333333',
    fontWeight: '600',
  },
  meta: {
    fontSize: 11,
    color: '#333333',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardActions: {
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00FF66',
    borderWidth: 2,
    borderColor: '#000000',
  },
  rejectButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3366',
    borderWidth: 2,
    borderColor: '#000000',
  },
  secondaryButton: {
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  secondaryButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});