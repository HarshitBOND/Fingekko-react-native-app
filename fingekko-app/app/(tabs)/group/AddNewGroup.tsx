import { useAuth } from '@clerk/clerk-expo';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    BackHandler,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../../../components/ui/AppText';
import Button from '../../../components/ui/Button';
import Card from '../../../components/ui/Card';
import Icon from '../../../components/ui/Icon';
import IconPickerModal from '../../../components/ui/IconPickerModal';
import Input from '../../../components/ui/Input';
import LoadingScreen from '../../../components/ui/LoadingScreen';
import ScreenContainer from '../../../components/ui/ScreenContainer';
import { fontFamily, layout, palette, radius, shadows, spacing } from '../../../constants/design';
import { apiRequest } from '../../../utils/api';

// Quick picks for the most common group types; the "more" tile opens the full
// searchable icon picker (same one the expense composer uses), so a group can
// carry any icon, not just these seven.
const QUICK_ICON_KEYS = ['Plane', 'Home', 'Users', 'Car', 'Coins', 'Utensils', 'Briefcase'];

// ---- Types matching the backend exactly ----

type FriendOfMine = {
    id: string;
    clerkId: string;
    name: string;
    email: string;
    avatarKey: string;
};

type Friend = {
    id: string; // friendship record id (NOT the other user's id)
    status: 'accepted' | 'pending' | 'declined';
    direction: 'accepted' | 'incoming' | 'outgoing';
    friend: FriendOfMine;
};

type FriendsResponse = {
    friends: Friend[];
    incomingRequests: Friend[];
    outgoingRequests: Friend[];
};

type SearchResult = {
    user: FriendOfMine;
    relationship: Friend | null;
};

const EMPTY_FRIENDS: Friend[] = [];
const EMPTY_RESULTS: SearchResult[] = [];

export default function AddNewGroup() {
    const router = useRouter();
    const { getToken } = useAuth();

    const [groupName, setGroupName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState<string>('Users');
    const [iconPickerOpen, setIconPickerOpen] = useState(false);

    const [friends, setFriends] = useState<Friend[]>(EMPTY_FRIENDS);
    const [friendsLoading, setFriendsLoading] = useState(true);

    // Selected members are stored as plain user records (FriendOfMine), since that's
    // what the backend needs for group creation (actual user ids, not friendship ids).
    const [selectedMembers, setSelectedMembers] = useState<FriendOfMine[]>([]);

    const [membersModalVisible, setMembersModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>(EMPTY_RESULTS);
    const [searchLoading, setSearchLoading] = useState(false);
    const [pendingRequestIds, setPendingRequestIds] = useState<string[]>([]);

    const [creating, setCreating] = useState(false);
    const [formError, setFormError] = useState('');

    const getTokenRef = useRef(getToken);
    useEffect(() => {
        getTokenRef.current = getToken;
    }, [getToken]);

    const resetGroupCreation = () => {
        setSelectedMembers([]);
        setGroupName('');
        setSelectedIcon('Users');
        setIconPickerOpen(false);
        setSearchQuery('');
        setSearchResults(EMPTY_RESULTS);
        setPendingRequestIds([]);
        setMembersModalVisible(false);
        setFormError('');
    };

    async function handleSendFriendRequest(result: SearchResult) {
        if (pendingRequestIds.includes(result.user.id)) return;

        try {
            const token = await getTokenRef.current();
            if (!token) return;
            await apiRequest({
                method: 'post',
                url: '/api/friends/request',
                token,
                data: { email: result.user.email },
            });
            setPendingRequestIds((prev) => [...prev, result.user.id]);
        } catch (err) {
            console.warn('Friend request failed:', err);
        }
    }

    // Reset on focus AND on blur (cleanup). Resetting only on focus leaves a tiny
    // window where the old selectedMembers/groupName can still render before the
    // effect fires. Resetting on blur guarantees it's clean before you return.
    useFocusEffect(
        useCallback(() => {
            resetGroupCreation();

            const onBackPress = () => {
                router.replace('/(tabs)/YourGroups');
                return true;
            };
            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

            return () => {
                subscription.remove();
                resetGroupCreation();
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [])
    );

    const fetchFriends = useCallback(async () => {
        try {
            const token = await getTokenRef.current();
            if (!token) return;
            const response = await apiRequest<FriendsResponse>({
                method: 'get',
                url: '/api/friends',
                token,
            });
            setFriends(response?.friends ?? EMPTY_FRIENDS);
        } catch (error) {
            console.warn('Error fetching friends:', error);
        } finally {
            setFriendsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);

    // Debounced search across all users (not just friends) so people can be found and invited.
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults(EMPTY_RESULTS);
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
                setSearchResults(response ?? EMPTY_RESULTS);
            } catch (error) {
                console.warn('Error searching users:', error);
            } finally {
                setSearchLoading(false);
            }
        }, 350);

        return () => clearTimeout(handle);
    }, [searchQuery]);

    // `id` here is always the underlying user's id, never a friendship record id.
    const isSelected = (id: string) => selectedMembers.some((m) => m.id === id);

    const toggleMember = (member: FriendOfMine) => {
        setSelectedMembers((prev) =>
            prev.some((m) => m.id === member.id) ? prev.filter((m) => m.id !== member.id) : [...prev, member]
        );
    };

    const removeSelectedMember = (id: string) => {
        setSelectedMembers((prev) => prev.filter((m) => m.id !== id));
    };

    const combinedSearchList = useMemo(() => {
        // Hide search results already in the friends list to avoid duplicate rows.
        const friendIds = new Set(friends.map((f) => f.friend.id));
        return searchResults.filter((r) => !friendIds.has(r.user.id));
    }, [searchResults, friends]);

    const createGroup = async () => {
        if (!groupName.trim() || creating) return;
        setCreating(true);
        setFormError('');
        try {
            const token = await getTokenRef.current();
            if (!token) return;
            await apiRequest({
                method: 'post',
                url: '/api/groups',
                token,
                data: {
                    name: groupName.trim(),
                    icon: selectedIcon,
                    members: selectedMembers.map((m) => m.clerkId),
                },
            });
            resetGroupCreation();
            router.replace('/(tabs)/YourGroups');
        } catch (error: any) {
            setFormError(error?.message || 'Could not create the group. Please try again.');
        } finally {
            setCreating(false);
        }
    };

    return (
        <ScreenContainer
            contentStyle={{ gap: spacing.lg }}
            header={
                <View style={styles.header}>
                    <Pressable
                        style={styles.headerButton}
                        hitSlop={8}
                        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/YourGroups'))}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                    >
                        <Icon name="ChevronLeft" size={22} color={palette.textPrimary} clickable={false} />
                    </Pressable>
                    <AppText variant="title" weight="bold">
                        New group
                    </AppText>
                    <View style={{ width: 40 }} />
                </View>
            }
        >
            <View style={styles.intro}>
                <AppText variant="h1">Create a group</AppText>
                <AppText variant="caption" color="textSecondary">
                    Split expenses effortlessly with the people you share costs with.
                </AppText>
            </View>

            <Card variant="elevated">
                <Input label="Group name" placeholder="e.g. Goa Trip" value={groupName} onChangeText={setGroupName} />

                <AppText variant="caption" color="textSecondary" style={styles.fieldLabel}>
                    Group icon
                </AppText>
                <View style={styles.iconGrid}>
                    {QUICK_ICON_KEYS.map((key) => {
                        const active = key === selectedIcon;
                        return (
                            <Pressable
                                key={key}
                                onPress={() => setSelectedIcon(key)}
                                style={[styles.iconOption, active && styles.iconOptionActive]}
                            >
                                <Icon
                                    name={key}
                                    size={20}
                                    color={active ? palette.primaryDeep : palette.textSecondary}
                                    clickable={false}
                                />
                            </Pressable>
                        );
                    })}
                    {/* Custom icon slot: shows the picked icon when it's not a
                        quick pick, and always opens the full searchable picker. */}
                    {(() => {
                        const customActive = !QUICK_ICON_KEYS.includes(selectedIcon);
                        return (
                            <Pressable
                                onPress={() => setIconPickerOpen(true)}
                                style={[styles.iconOption, customActive && styles.iconOptionActive]}
                                accessibilityLabel="Browse all icons"
                            >
                                <Icon
                                    name={customActive ? selectedIcon : 'Ellipsis'}
                                    size={20}
                                    color={customActive ? palette.primaryDeep : palette.textSecondary}
                                    clickable={false}
                                />
                            </Pressable>
                        );
                    })()}
                </View>
                <AppText variant="micro" color="textTertiary" style={{ marginTop: spacing.sm }}>
                    Tap ··· to browse and search all icons.
                </AppText>
            </Card>

            <Card variant="elevated">
                <View style={styles.membersHeaderRow}>
                    <AppText variant="label">Members</AppText>
                    <AppText variant="micro" color="textTertiary">
                        {selectedMembers.length} selected
                    </AppText>
                </View>

                <Pressable
                    style={({ pressed }) => [styles.addMembersButton, pressed && styles.pressed]}
                    onPress={() => setMembersModalVisible(true)}
                >
                    <View style={styles.addMembersIcon}>
                        <Icon name="Plus" size={18} color={palette.primaryDeep} clickable={false} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <AppText variant="label">Add members</AppText>
                        <AppText variant="micro" color="textTertiary">
                            Choose friends or search for others
                        </AppText>
                    </View>
                    <Icon name="ChevronRight" size={16} color={palette.textTertiary} clickable={false} />
                </Pressable>

                {selectedMembers.length > 0 && (
                    <View style={styles.chipsWrap}>
                        {selectedMembers.map((member) => (
                            <View key={member.id} style={styles.chip}>
                                <AppText variant="micro" color="primaryDeep" numberOfLines={1} style={{ flexShrink: 1 }}>
                                    {member.name}
                                </AppText>
                                <Pressable onPress={() => removeSelectedMember(member.id)} hitSlop={6}>
                                    <Icon name="X" size={12} color={palette.primaryDeep} clickable={false} />
                                </Pressable>
                            </View>
                        ))}
                    </View>
                )}
            </Card>

            {!!formError && (
                <AppText variant="caption" color="danger">
                    {formError}
                </AppText>
            )}

            <Button variant="primary" size="lg" onPress={createGroup} disabled={!groupName.trim()} loading={creating}>
                Create group
            </Button>

            {/* Full searchable icon picker — same component the expense composer uses */}
            <IconPickerModal
                visible={iconPickerOpen}
                value={selectedIcon}
                onClose={() => setIconPickerOpen(false)}
                onSelect={(name) => {
                    setSelectedIcon(name);
                    setIconPickerOpen(false);
                }}
            />

            {/* ─── Member picker ─── */}
            <Modal
                visible={membersModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setMembersModalVisible(false)}
            >
                <SafeAreaView style={styles.modalPage} edges={['top', 'bottom']}>
                    <View style={styles.modalHeader}>
                        <AppText variant="title" weight="bold">
                            Add members
                        </AppText>
                        <Pressable style={styles.modalCloseButton} onPress={() => setMembersModalVisible(false)} hitSlop={6}>
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

                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xl }}>
                        {!searchQuery.trim() && (
                            <>
                                <AppText variant="micro" color="textTertiary" style={styles.sectionLabel}>
                                    YOUR FRIENDS
                                </AppText>
                                {friendsLoading ? (
                                    <LoadingScreen inline label="Loading friends..." />
                                ) : friends.length === 0 ? (
                                    <AppText variant="bodySm" color="textSecondary" align="center" style={styles.emptyText}>
                                        You don&apos;t have any friends added yet.
                                    </AppText>
                                ) : (
                                    friends.map((friend) => {
                                        const selected = isSelected(friend.friend.id);
                                        return (
                                            <Pressable
                                                key={friend.id}
                                                style={({ pressed }) => [styles.friendRow, pressed && styles.pressed]}
                                                onPress={() => toggleMember(friend.friend)}
                                            >
                                                <View style={styles.avatarCircle}>
                                                    <AppText variant="label" color="primaryDeep">
                                                        {friend.friend.name.charAt(0).toUpperCase()}
                                                    </AppText>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <AppText variant="label" numberOfLines={1}>
                                                        {friend.friend.name}
                                                    </AppText>
                                                    {!!friend.friend.email && (
                                                        <AppText variant="micro" color="textTertiary" numberOfLines={1}>
                                                            {friend.friend.email}
                                                        </AppText>
                                                    )}
                                                </View>
                                                <View style={[styles.checkbox, selected && styles.checkboxActive]}>
                                                    {selected && <Icon name="Check" size={13} color={palette.white} clickable={false} />}
                                                </View>
                                            </Pressable>
                                        );
                                    })
                                )}
                            </>
                        )}

                        {searchQuery.trim() !== '' && (
                            <>
                                <AppText variant="micro" color="textTertiary" style={styles.sectionLabel}>
                                    RESULTS
                                </AppText>
                                {combinedSearchList.length === 0 && !searchLoading ? (
                                    <AppText variant="bodySm" color="textSecondary" align="center" style={styles.emptyText}>
                                        No matching people found.
                                    </AppText>
                                ) : (
                                    combinedSearchList.map((result) => {
                                        const requested =
                                            pendingRequestIds.includes(result.user.id) ||
                                            result.relationship?.status === 'pending';
                                        const added = isSelected(result.user.id);
                                        return (
                                            <View key={result.user.id} style={styles.friendRow}>
                                                <View style={styles.avatarCircle}>
                                                    <AppText variant="label" color="primaryDeep">
                                                        {result.user.name.charAt(0).toUpperCase()}
                                                    </AppText>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <AppText variant="label" numberOfLines={1}>
                                                        {result.user.name}
                                                    </AppText>
                                                    {!!result.user.email && (
                                                        <AppText variant="micro" color="textTertiary" numberOfLines={1}>
                                                            {result.user.email}
                                                        </AppText>
                                                    )}
                                                </View>

                                                <View style={styles.resultActions}>
                                                    <Pressable
                                                        onPress={() => handleSendFriendRequest(result)}
                                                        disabled={requested}
                                                        hitSlop={6}
                                                        style={[styles.resultAction, requested && styles.resultActionDone]}
                                                    >
                                                        <Icon
                                                            name="Handshake"
                                                            size={16}
                                                            color={requested ? palette.warning : palette.textSecondary}
                                                            clickable={false}
                                                        />
                                                    </Pressable>
                                                    <Pressable
                                                        onPress={() => toggleMember(result.user)}
                                                        hitSlop={6}
                                                        style={[styles.resultAction, added && styles.resultActionActive]}
                                                    >
                                                        <Icon
                                                            name={added ? 'Check' : 'UserPlus'}
                                                            size={16}
                                                            color={added ? palette.white : palette.textSecondary}
                                                            clickable={false}
                                                        />
                                                    </Pressable>
                                                </View>
                                            </View>
                                        );
                                    })
                                )}
                            </>
                        )}
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <Button variant="primary" size="md" onPress={() => setMembersModalVisible(false)}>
                            {`Done${selectedMembers.length > 0 ? ` (${selectedMembers.length})` : ''}`}
                        </Button>
                    </View>
                </SafeAreaView>
            </Modal>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: layout.gutter,
        paddingVertical: spacing.md,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: radius.pill,
        backgroundColor: palette.card,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.sm,
    },
    intro: { gap: 2 },
    pressed: { opacity: 0.6 },
    fieldLabel: { marginTop: spacing.base, marginBottom: spacing.sm },
    iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    iconOption: {
        width: 46,
        height: 46,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: palette.bg,
        borderWidth: 1.5,
        borderColor: palette.border,
    },
    iconOptionActive: {
        backgroundColor: palette.primaryLight,
        borderColor: palette.primary,
    },
    membersHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    addMembersButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        borderRadius: radius.lg,
        padding: spacing.md,
        backgroundColor: palette.bg,
        borderWidth: 1,
        borderColor: palette.border,
    },
    addMembersIcon: {
        width: 40,
        height: 40,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: palette.primaryLight,
    },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
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

    // Modal
    modalPage: { flex: 1, backgroundColor: palette.bg },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: layout.gutter,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
    },
    modalCloseButton: {
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
    sectionLabel: {
        letterSpacing: 1,
        marginHorizontal: layout.gutter,
        marginTop: spacing.sm,
        marginBottom: spacing.sm,
    },
    emptyText: { marginHorizontal: layout.gutter, marginTop: spacing.lg },
    friendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: layout.gutter,
        paddingVertical: spacing.md,
    },
    avatarCircle: {
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
    resultActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    resultAction: {
        width: 34,
        height: 34,
        borderRadius: radius.pill,
        backgroundColor: palette.bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: palette.border,
    },
    resultActionDone: { backgroundColor: palette.warningLight, borderColor: palette.warningLight },
    resultActionActive: { backgroundColor: palette.primary, borderColor: palette.primary },
    modalFooter: {
        paddingHorizontal: layout.gutter,
        paddingTop: spacing.md,
        paddingBottom: spacing.md,
        borderTopWidth: 1,
        borderTopColor: palette.divider,
    },
});
