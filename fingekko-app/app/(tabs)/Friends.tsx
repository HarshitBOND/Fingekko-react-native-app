import type { FriendRelationship, FriendSearchResponse, FriendsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@clerk/clerk-expo';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Icon from '../../components/ui/Icon';
import ScreenContainer from '../../components/ui/ScreenContainer';
import Card from '../../components/ui/Card';
import AppText from '../../components/ui/AppText';
import Navbar from '../../components/Navbar';
import PressableScale from '../../components/ui/PressableScale';
import { palette, spacing, layout, radius, shadows, fontFamily } from '../../constants/design';

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

  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      if (searchResults.length > 0) {
        setSearchResults([]);
      }
      return;
    }

    const handle = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const token = await getTokenRef.current();
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
  }, [searchQuery]);

  const sendRequest = useCallback(async (targetEmail: string) => {
    setRequestLoading(prev => ({ ...prev, [targetEmail]: true }));
    try {
      const token = await getTokenRef.current();
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
  }, [onSuccess]);

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
      <AppText variant="label" color="primaryDeep" weight="extrabold">{initials}</AppText>
    </View>
  );
});
Avatar.displayName = 'Avatar';

const EmptyState = React.memo(({ text }: { text: string }) => (
  <AppText variant="bodySm" color="textSecondary" align="center" style={styles.emptyText}>{text}</AppText>
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
    <Card variant="flat" padding={14} style={styles.cardRow}>
      <Avatar name={item.friend.name} />

      <View style={styles.cardBody}>
        <AppText variant="bodySm" color="textPrimary" weight="bold">{item.friend.name}</AppText>
        <AppText variant="caption" color="textSecondary">{item.friend.email}</AppText>
        <AppText variant="micro" color="primaryDeep" weight="semibold" style={styles.meta}>{statusLabel}</AppText>
      </View>

      <View style={styles.cardActions}>
        {item.status === 'pending' && item.direction === 'incoming' ? (
          <View style={styles.actionRow}>
            <PressableScale 
              style={[styles.acceptButton, disabled && styles.buttonDisabled]} 
              onPress={() => onAccept?.(item.id)}
              disabled={disabled}
              accessibilityLabel="Accept friend request"
            >
              <Icon name="Check" size={14} color={palette.success} />
            </PressableScale>
            <PressableScale 
              style={[styles.rejectButton, disabled && styles.buttonDisabled]} 
              onPress={() => onDecline?.(item.id)}
              disabled={disabled}
              accessibilityLabel="Decline friend request"
            >
              <Icon name="X" size={14} color={palette.danger} />
            </PressableScale>
          </View>
        ) : (
          <PressableScale 
            style={[styles.secondaryButton, disabled && styles.buttonDisabled]} 
            onPress={() => onRemove?.(item.id)}
            disabled={disabled}
            accessibilityLabel="Remove friend"
          >
            <AppText variant="micro" color="danger" weight="bold">Remove</AppText>
          </PressableScale>
        )}
      </View>
    </Card>
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
    <Card variant="flat" padding={12} style={styles.searchResultRow}>
      <Avatar name={result.user.name} />

      <View style={styles.cardBody}>
        <AppText variant="bodySm" color="textPrimary" weight="bold">{result.user.name}</AppText>
        <AppText variant="caption" color="textSecondary">{result.user.email}</AppText>
      </View>

      {isAccepted ? (
        <View style={styles.acceptedPill}>
          <Icon name="Check" size={12} color={palette.success} />
          <AppText variant="micro" color="success" weight="bold">Friends</AppText>
        </View>
      ) : (
        <PressableScale
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
            <Icon name="Handshake" size={14} color={palette.textSecondary} />
          ) : (
            <Icon name="UserPlus" size={14} color={palette.primaryDeep} />
          )}

          <AppText variant="micro" color={isPendingOutgoing ? "textSecondary" : "primaryDeep"} weight="bold">
            {isPendingOutgoing ? 'Request sent' : 'Add Friend'}
          </AppText>
        </PressableScale>
      )}
    </Card>
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
    <Icon name="Search" size={18} color={palette.textSecondary} />
    <TextInput
      value={value}
      onChangeText={onChange}
      autoCapitalize="none"
      placeholder="Search people..."
      style={styles.searchInput}
      placeholderTextColor={palette.textTertiary}
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
    <AppText variant="title" color="textPrimary" weight="bold" style={styles.sectionTitle}>
      {title}
    </AppText>
    {data.length === 0 ? (
      <EmptyState text={emptyText} />
    ) : (
      <View style={styles.sectionList}>
        {data.map(renderItem)}
      </View>
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
    <ScreenContainer
      contentStyle={{ gap: spacing.lg }}
      header={
        <View style={{ paddingHorizontal: layout.gutter }}>
          <Navbar />
        </View>
      }
    >
      <Card variant="elevated" padding={20}>
        <View style={styles.badge}>
          <Icon name="Users" size={14} color={palette.primaryDeep} />
          <AppText variant="micro" color="primaryDeep" weight="bold">Community</AppText>
        </View>
        <AppText variant="h1" color="textPrimary" style={styles.title}>
          Friends
        </AppText>
        <AppText variant="caption" color="textSecondary" style={styles.subtitle}>
          Connect with friends, manage shared expenses, and settle up with ease.
        </AppText>
      </Card>

      <Card variant="elevated" padding={20} style={styles.searchCard}>
        <AppText variant="title" color="textPrimary" weight="bold">
          Search Friends
        </AppText>
        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        {searchLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={palette.primaryDeep} />
          </View>
        )}

        {!searchLoading && searchQuery.trim() !== '' && searchResults.length === 0 && (
          <EmptyState text="No results found." />
        )}

        {searchResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <View style={styles.resultsList}>
              {searchResults.map((result) => (
                <SearchResultCard
                  key={result.user.id}
                  result={result}
                  onAdd={sendRequest}
                  disabled={requestLoading[result.user.email]}
                />
              ))}
            </View>
          </View>
        )}

        {message ? (
          <AppText variant="caption" color="primaryDeep" weight="semibold" style={styles.message}>
            {message}
          </AppText>
        ) : null}
      </Card>

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
    </ScreenContainer>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  resultsContainer: {
    backgroundColor: palette.bg,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  resultsList: {
    gap: spacing.xs,
    padding: spacing.xs,
  },
  loadingContainer: {
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchCard: {
    gap: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  title: {
    marginTop: spacing.sm,
  },
  subtitle: {
    marginTop: 4,
  },
  sectionBlock: {
    gap: spacing.sm,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
  },
  sectionList: {
    gap: spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 48,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.bg,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: palette.textPrimary,
    fontFamily: fontFamily.semibold,
  },
  resultCard: {
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: palette.bgElevated,
    borderWidth: 1,
    borderColor: palette.border,
    gap: spacing.sm,
  },
  acceptedPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: palette.primaryLight,
  },
  primaryButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...shadows.xs,
  },
  pendingOutgoingButton: {
    backgroundColor: palette.bg,
    shadowOpacity: 0,
    elevation: 0,
  },
  message: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  emptyText: {
    paddingVertical: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.card,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primaryLight,
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  meta: {
    marginTop: 2,
  },
  cardActions: {
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.successLight,
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.dangerLight,
  },
  secondaryButton: {
    borderRadius: radius.pill,
    backgroundColor: palette.dangerLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});