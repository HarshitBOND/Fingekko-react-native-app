import { useAuth } from '@clerk/clerk-expo';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fontFamily, layout, palette, radius, shadows, spacing } from '@/constants/design';
import { apiRequest } from '@/utils/api';
import AppText from '../ui/AppText';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import LoadingScreen from '../ui/LoadingScreen';

// Mirrors the backend /api/friends shapes (see server/src/routes/friends.routes.ts).
type PickerUser = {
    id: string;
    clerkId: string;
    name: string;
    email: string;
};

type Friendship = {
    id: string;
    status: 'accepted' | 'pending' | 'declined';
    direction: 'accepted' | 'incoming' | 'outgoing';
    friend: PickerUser;
};

type FriendsResponse = {
    friends: Friendship[];
};

type SearchResult = {
    user: PickerUser;
    relationship: Friendship | null;
};

type AddMembersModalProps = {
    visible: boolean;
    onClose: () => void;
    /** clerkIds already in the group — they're hidden from the picker. */
    existingMemberIds: string[];
    /** Receives the selected users' clerkIds. Resolve true on success. */
    onAdd: (clerkIds: string[]) => Promise<boolean>;
};

/**
 * Member picker for an existing group: pick from your friends or search the
 * whole user base. The same interaction as AddNewGroup's picker, packaged so
 * the group detail screen can add people after creation.
 */
export default function AddMembersModal({ visible, onClose, existingMemberIds, onAdd }: AddMembersModalProps) {
    const { getToken } = useAuth();

    const [friends, setFriends] = useState<Friendship[]>([]);
    const [friendsLoading, setFriendsLoading] = useState(true);
    const [selected, setSelected] = useState<PickerUser[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState('');

    const getTokenRef = useRef(getToken);
    useEffect(() => {
        getTokenRef.current = getToken;
    }, [getToken]);

    const existingSet = useMemo(() => new Set(existingMemberIds), [existingMemberIds]);

    // Reset per open so a previous session's picks never leak into this one.
    useEffect(() => {
        if (!visible) return;
        setSelected([]);
        setSearchQuery('');
        setSearchResults([]);
        setError('');
        setFriendsLoading(true);

        let active = true;
        (async () => {
            try {
                const token = await getTokenRef.current();
                if (!token) return;
                const response = await apiRequest<FriendsResponse>({ method: 'get', url: '/api/friends', token });
                if (active) setFriends(response?.friends ?? []);
            } catch (err) {
                console.warn('Error fetching friends:', err);
            } finally {
                if (active) setFriendsLoading(false);
            }
        })();
        return () => {
            active = false;
        };
    }, [visible]);

    // Debounced people search, same cadence as the AddNewGroup picker.
    useEffect(() => {
        if (!visible) return;
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        const handle = setTimeout(async () => {
            const token = await getTokenRef.current();
            if (!token) return;
            setSearchLoading(true);
            try {
                const response = await apiRequest<SearchResult[]>({
                    method: 'get',
                    url: `/api/friends/search?q=${encodeURIComponent(searchQuery.trim())}`,
                    token,
                });
                setSearchResults(response ?? []);
            } catch (err) {
                console.warn('Error searching users:', err);
            } finally {
                setSearchLoading(false);
            }
        }, 350);
        return () => clearTimeout(handle);
    }, [searchQuery, visible]);

    // Selection is keyed on the database id, which every picker row is
    // guaranteed to have. clerkId is only read at submit time, so a user the
    // API returns without one can never merge into another row's identity.
    const isSelected = (id: string) => selected.some((m) => m.id === id);

    const toggle = (user: PickerUser) => {
        if (!user.id) return;
        if (existingSet.has(user.clerkId)) return;
        setSelected((prev) =>
            prev.some((m) => m.id === user.id)
                ? prev.filter((m) => m.id !== user.id)
                : [...prev, user]
        );
    };

    const availableFriends = useMemo(
        () => friends.filter((f) => !existingSet.has(f.friend.clerkId)),
        [friends, existingSet]
    );

    const availableResults = useMemo(() => {
        const friendIds = new Set(friends.map((f) => f.friend.id));
        return searchResults.filter((r) => !friendIds.has(r.user.id) && !existingSet.has(r.user.clerkId));
    }, [searchResults, friends, existingSet]);

    const handleAdd = async () => {
        if (selected.length === 0 || adding) return;
        setAdding(true);
        setError('');
        const clerkIds = selected.map((m) => m.clerkId).filter(Boolean);
        if (clerkIds.length !== selected.length) {
            setAdding(false);
            setError('Some of those accounts are missing an id and cannot be added yet.');
            return;
        }

        const ok = await onAdd(clerkIds);
        setAdding(false);
        if (ok) {
            onClose();
        } else {
            setError('Could not add members. Please try again.');
        }
    };

    const renderRow = (user: PickerUser, key: string) => {
        const picked = isSelected(user.id);
        return (
            <Pressable
                key={key}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                onPress={() => toggle(user)}
            >
                <View style={styles.avatar}>
                    <AppText variant="label" color="primaryDeep">
                        {user.name.charAt(0).toUpperCase()}
                    </AppText>
                </View>
                <View style={{ flex: 1 }}>
                    <AppText variant="label" numberOfLines={1}>
                        {user.name}
                    </AppText>
                    {!!user.email && (
                        <AppText variant="micro" color="textTertiary" numberOfLines={1}>
                            {user.email}
                        </AppText>
                    )}
                </View>
                <View style={[styles.checkbox, picked && styles.checkboxActive]}>
                    {picked && <Icon name="Check" size={13} color={palette.white} clickable={false} />}
                </View>
            </Pressable>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
                <View style={styles.header}>
                    <AppText variant="title" weight="bold">
                        Add members
                    </AppText>
                    <Pressable style={styles.closeButton} onPress={onClose} hitSlop={6}>
                        <Icon name="X" size={18} color={palette.textPrimary} clickable={false} />
                    </Pressable>
                </View>

                <View style={styles.searchBar}>
                    <Icon name="Search" size={16} color={palette.textTertiary} clickable={false} />
                    <TextInput
                        placeholder="Search friends or find new people"
                        placeholderTextColor={palette.textTertiary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={styles.searchInput}
                    />
                    {searchLoading && <ActivityIndicator size="small" color={palette.primaryDeep} />}
                </View>

                {selected.length > 0 && (
                    <View style={styles.chipsWrap}>
                        {selected.map((member) => (
                            <View key={member.id} style={styles.chip}>
                                <AppText variant="micro" color="primaryDeep" numberOfLines={1} style={{ flexShrink: 1 }}>
                                    {member.name}
                                </AppText>
                                <Pressable onPress={() => toggle(member)} hitSlop={6}>
                                    <Icon name="X" size={12} color={palette.primaryDeep} clickable={false} />
                                </Pressable>
                            </View>
                        ))}
                    </View>
                )}

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xl }}>
                    {!searchQuery.trim() ? (
                        <>
                            <AppText variant="micro" color="textTertiary" style={styles.sectionLabel}>
                                YOUR FRIENDS
                            </AppText>
                            {friendsLoading ? (
                                <LoadingScreen inline label="Loading friends..." />
                            ) : availableFriends.length === 0 ? (
                                <AppText variant="bodySm" color="textSecondary" align="center" style={styles.emptyText}>
                                    {friends.length === 0
                                        ? "You don't have any friends added yet — search above to find people."
                                        : 'All your friends are already in this group.'}
                                </AppText>
                            ) : (
                                availableFriends.map((f) => renderRow(f.friend, f.id))
                            )}
                        </>
                    ) : (
                        <>
                            <AppText variant="micro" color="textTertiary" style={styles.sectionLabel}>
                                RESULTS
                            </AppText>
                            {availableResults.length === 0 && !searchLoading ? (
                                <AppText variant="bodySm" color="textSecondary" align="center" style={styles.emptyText}>
                                    No matching people found.
                                </AppText>
                            ) : (
                                availableResults.map((r) => renderRow(r.user, r.user.id))
                            )}
                        </>
                    )}
                </ScrollView>

                {!!error && (
                    <AppText variant="caption" color="danger" align="center" style={{ marginBottom: spacing.sm }}>
                        {error}
                    </AppText>
                )}

                <View style={styles.footer}>
                    <Button variant="primary" size="md" onPress={handleAdd} disabled={selected.length === 0} loading={adding}>
                        {selected.length > 0 ? `Add ${selected.length} to group` : 'Select people to add'}
                    </Button>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    page: { flex: 1, backgroundColor: palette.bg },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: layout.gutter,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
    },
    closeButton: {
        width: 34,
        height: 34,
        borderRadius: radius.pill,
        backgroundColor: palette.card,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.xs,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginHorizontal: layout.gutter,
        marginTop: spacing.sm,
        marginBottom: spacing.md,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        backgroundColor: palette.card,
        borderWidth: 1,
        borderColor: palette.border,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: palette.textPrimary,
        fontFamily: fontFamily.medium,
        padding: 0,
    },
    chipsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        paddingHorizontal: layout.gutter,
        marginBottom: spacing.sm,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: palette.primaryLight,
        borderRadius: radius.pill,
        paddingVertical: 6,
        paddingHorizontal: 12,
        maxWidth: 170,
    },
    sectionLabel: {
        letterSpacing: 1,
        marginHorizontal: layout.gutter,
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
    },
    emptyText: { marginHorizontal: layout.gutter, marginTop: spacing.lg },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: layout.gutter,
        paddingVertical: spacing.md,
    },
    pressed: { opacity: 0.6 },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: radius.pill,
        backgroundColor: palette.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
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
    footer: {
        paddingHorizontal: layout.gutter,
        paddingTop: spacing.md,
        paddingBottom: spacing.md,
        borderTopWidth: 1,
        borderTopColor: palette.divider,
    },
});
