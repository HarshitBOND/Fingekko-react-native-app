import { useAuth, useUser } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Icon from '../../../components/ui/Icon';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    ImageBackground,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '../../../utils/api';
import { useFocusEffect } from 'expo-router';
import { BackHandler } from 'react-native';
import { useCallback } from 'react';
import { palette, spacing, radius, shadows, fontFamily } from '../../../constants/design';

// Same icon set used on YourGroups so a group created here renders consistently there.
const ICON_KEYS = [
    'Plane',
    'Home',
    'Users',
    'Car',
    'Coins',
    'Utensils',
    'Briefcase',
] as const;

// ---- Types matching the backend exactly ----

type FriendOfMine = {
    id: string;
    clerkId: string ;
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

export default function AddNewGroup() {
    const router = useRouter();

    const { getToken } = useAuth();
    const { user } = useUser();

    const [groupName, setGroupName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState<string>('Users');

    const [friends, setFriends] = useState<Friend[]>([]);
    const [friendsLoading, setFriendsLoading] = useState(false);

    // Selected members are stored as plain user records (FriendOfMine), since that's
    // what the backend needs for group creation (actual user ids, not friendship ids).
    const [selectedMembers, setSelectedMembers] = useState<FriendOfMine[]>([]);

    const [membersModalVisible, setMembersModalVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [pendingRequestIds, setPendingRequestIds] = useState<string[]>([]);

    const [creating, setCreating] = useState(false);

    const resetGroupCreation = () => {
        setSelectedMembers([]);
        setGroupName('');
        setSelectedIcon('Users');
        setSearchQuery('');
        setSearchResults([]);
        setPendingRequestIds([]);
        setMembersModalVisible(false);
    };

    async function handleSendFriendRequest(result: SearchResult) {
        if (pendingRequestIds.includes(result.user.id)) return;

        try {
            const token = await getToken();
            if (!token) {
                console.error('No token available for API request.');
                return;
            }

            await apiRequest({
                method: 'post',
                url: '/api/friends/request',
                token,
                data: { email: result.user.email },
            });

            setPendingRequestIds((prev) => [...prev, result.user.id]);
        } catch (err) {
            console.error('Friend request failed:', err);
        }
    }

    // THE FIX: reset on focus AND on blur (cleanup). Resetting only on focus
    // leaves a tiny window where the old selectedMembers/groupName can still
    // render before the effect fires. Resetting on blur (when you leave the
    // screen) guarantees it's already clean before you ever come back to it.
    useFocusEffect(
        useCallback(() => {
            // reset state every time this screen becomes focused
            resetGroupCreation();

            // handle hardware back
            const onBackPress = () => {
                router.replace('/(tabs)/YourGroups');
                return true;
            };

            const subscription = BackHandler.addEventListener(
                'hardwareBackPress',
                onBackPress
            );

            // cleanup: also reset when this screen loses focus (navigating away)
            return () => {
                subscription.remove();
                resetGroupCreation();
            };
        }, [])
    );

    const fetchFriends = async () => {
        const token = await getToken();
        if (!token) {
            console.error('No token available for API request.');
            return;
        }
        setFriendsLoading(true);
        try {
            const response = await apiRequest<FriendsResponse>({
                method: 'get',
                url: '/api/friends',
                token,
            });
            setFriends(response.friends);
        } catch (error) {
            console.error('Error fetching friends:', error);
        } finally {
            setFriendsLoading(false);
        }
    };

    useEffect(() => {
        fetchFriends();
    }, []);

    // Debounced search across all users (not just friends) so people can be found and invited.
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
                const response = await apiRequest<SearchResult[]>({
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

    // `id` here is always the underlying user's id, never a friendship record id.
    const isSelected = (id: string) => selectedMembers.some((m) => m.id === id);

    const toggleMember = (member: FriendOfMine) => {
        setSelectedMembers((prev) =>
            prev.some((m) => m.id === member.id)
                ? prev.filter((m) => m.id !== member.id)
                : [...prev, member]
        );
    };

    const removeSelectedMember = (id: string) => {
        setSelectedMembers((prev) => prev.filter((m) => m.id !== id));
    };

    const combinedSearchList = useMemo(() => {
        // Hide search results that are already in the friends list to avoid duplicate rows.
        const friendIds = new Set(friends.map((f) => f.friend.id));
        return searchResults.filter((r) => !friendIds.has(r.user.id));
    }, [searchResults, friends]);

    const createGroup = async () => {
        if (!groupName.trim() || creating) return;
        const token = await getToken();
        if (!token) {
            console.error('No token available for API request.');
            return;
        }
        setCreating(true);
        try {
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
        } catch (error) {
            console.error('Error creating group:', error);
        } finally {
            setCreating(false);
        }
    };



    return (
        <SafeAreaView style={styles.page} edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
                <View style={styles.heroSection}>
                    <LinearGradient
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        colors={['rgba(20,138,70,0.18)', 'rgba(20,138,70,0.05)', 'transparent']}
                        locations={[0, 0.35, 1]}
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

                    <View style={styles.topBar}>
                        <View style={styles.brandRow}>
                            <Pressable style={styles.logoCircle} onPress={() => router.replace('/(tabs)/YourGroups')}>
                                <Icon name="ChevronLeft" size={20} color="#148a46" />
                            </Pressable>
                            <Text style={styles.brandTitle}>New Group</Text>
                        </View>
                        <Pressable style={styles.menuButton} onPress={() => router.replace('/(tabs)/YourGroups')}>
                            <Icon name="Menu" size={20} color="#1f2937" />
                        </Pressable>
                    </View>

                    <View style={styles.heroCopy}>
                        <Text style={styles.heroTitle}>Create a group</Text>
                        <Text style={styles.heroSubtitle}>Split expenses effortlessly.</Text>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.fieldLabel}>Group Name</Text>
                    <TextInput
                        placeholder="e.g. Goa Trip"
                        placeholderTextColor="#9ca3af"
                        value={groupName}
                        onChangeText={setGroupName}
                        style={styles.textInput}
                    />

                    <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Group Icon</Text>
                    <View style={styles.iconGrid}>
                        {ICON_KEYS.map((key) => {
                            const active = key === selectedIcon;
                            return (
                                <Pressable
                                    key={key}
                                    onPress={() => setSelectedIcon(key)}
                                    style={[styles.iconOption, active && styles.iconOptionActive]}
                                >
                                    <Icon name={key} size={20} color="#000000" />
                                </Pressable>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.card}>
                    <View style={styles.membersHeaderRow}>
                        <Text style={styles.fieldLabel}>Members</Text>
                        <Text style={styles.membersCount}>{selectedMembers.length} selected</Text>
                    </View>

                    <Pressable style={styles.addMembersButton} onPress={() => setMembersModalVisible(true)}>
                        <View style={styles.quickActionIconWrap}>
                            <Icon name="Plus" size={18} color="#000000" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.addMembersTitle}>Add Members</Text>
                            <Text style={styles.addMembersSubtitle}>Choose friends or search for others</Text>
                        </View>
                        <Icon name="ChevronRight" size={18} color="#000000" />
                    </Pressable>

                    {selectedMembers.length > 0 && (
                        <View style={styles.chipsWrap}>
                            {selectedMembers.map((member) => (
                                <View key={member.id} style={styles.chip}>
                                    <Text style={styles.chipText} numberOfLines={1}>
                                        {member.name}
                                    </Text>
                                    <Pressable onPress={() => removeSelectedMember(member.id)}>
                                        <Icon name="X" size={13} color="#000000" />
                                    </Pressable>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                <View style={{ paddingHorizontal: 16 }}>
                    <Pressable
                        style={[styles.createButton, !groupName.trim() && styles.createButtonDisabled]}
                        onPress={createGroup}
                        disabled={!groupName.trim() || creating}
                    >
                        {creating ? (
                            <ActivityIndicator color="#000000" />
                        ) : (
                            <Text style={styles.createButtonText}>Create Group</Text>
                        )}
                    </Pressable>
                </View>

                <View style={styles.footerBanner}>
                    <ImageBackground
                        source={require('../../../assets/images/bgadd.png')}
                        style={styles.footerBannerBg}
                        resizeMode="cover"
                        imageStyle={styles.footerBannerBgImage}
                    >
                        <View style={styles.footerBannerOverlay} />
                        <View style={styles.footerBannerContent}>
                            <Text style={styles.footerBannerTitle}>Stay organized.</Text>
                            <Text style={styles.footerBannerTitle}>Stay settled up.</Text>
                        </View>
                    </ImageBackground>
                </View>
            </ScrollView>

            <Modal
                visible={membersModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setMembersModalVisible(false)}
            >
                <SafeAreaView style={styles.modalPage} edges={['top', 'bottom']}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Add Members</Text>
                        <Pressable style={styles.modalCloseButton} onPress={() => setMembersModalVisible(false)}>
                            <Icon name="X" size={20} color="#1f2937" />
                        </Pressable>
                    </View>

                    <View style={styles.searchBar}>
                        <Icon name="Search" size={16} color="#9ca3af" />
                        <TextInput
                            placeholder="Search friends or find new people"
                            placeholderTextColor="#9ca3af"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            style={styles.searchInput}
                        />
                        {searchLoading && <ActivityIndicator size="small" color="#148a46" />}
                    </View>

                    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
                        {!searchQuery.trim() && (
                            <>
                                <Text style={styles.sectionLabel}>Your Friends</Text>
                                {friendsLoading ? (
                                    <ActivityIndicator style={{ marginTop: 20 }} color="#148a46" />
                                ) : friends.length === 0 ? (

                                    <Text style={styles.emptyText}>{"You don't have any friends added yet."}</Text>

                                ) : (
                                    friends.map((friend) => {
                                        const selected = isSelected(friend.friend.id);
                                        return (
                                            <Pressable
                                                key={friend.id}
                                                style={styles.friendRow}
                                                onPress={() => toggleMember(friend.friend)}
                                            >
                                                <View style={styles.avatarCircle}>
                                                    <Text style={styles.avatarInitial}>
                                                        {friend.friend.name.charAt(0).toUpperCase()}
                                                    </Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.friendName}>{friend.friend.name}</Text>
                                                    {friend.friend.email && (
                                                        <Text style={styles.friendUsername}>@{friend.friend.email}</Text>
                                                    )}
                                                </View>
                                                <View style={[styles.checkbox, selected && styles.checkboxActive]}>
                                                    {selected ? <Icon name="Check" size={14} color="#ffffff" /> : <Icon name="UserPlus" size={14} color="#148a46" />}
                                                </View>
                                            </Pressable>
                                        );
                                    })
                                )}
                            </>
                        )}

                        {searchQuery.trim() !== '' && (
                            <>
                                <Text style={styles.sectionLabel}>Results</Text>
                                {combinedSearchList.length === 0 && !searchLoading ? (
                                    <Text style={styles.emptyText}>No matching people found.</Text>
                                ) : (
                                    combinedSearchList.map((result) => {
                                        const requested =
                                            pendingRequestIds.includes(result.user.id) ||
                                            result.relationship?.status === 'pending';
                                        const added = isSelected(result.user.id);
                                        return (
                                            <View key={result.user.id} style={styles.friendRow}>
                                                <View style={styles.avatarCircle}>
                                                    <Text style={styles.avatarInitial}>
                                                        {result.user.name.charAt(0).toUpperCase()}
                                                    </Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.friendName}>{result.user.name}</Text>
                                                    {result.user.email && (
                                                        <Text style={styles.friendUsername}>@{result.user.email}</Text>
                                                    )}
                                                </View>
                                                <View style ={{ flexDirection: 'row', alignItems: 'center', gap: 20 , justifyContent: 'flex-end', marginRight: 10 }}>
                                                <Pressable
                                                    
                                                    onPress={() => handleSendFriendRequest(result)}
                                                    disabled={requested}
                                                >
                                                    {requested ? (
                                                        <Icon name="Handshake" size={18} color="#EAB308" />
                                                    ) : (
                                                        <Icon name="Handshake" size={18} color="#374151" />
                                                    )}

                                                </Pressable>
                                                <Pressable
                                                
                                                    onPress={() => toggleMember(result.user)}
                                                >
                                                    {added ? (
                                                        <Icon name="Check" size={18} color="#148a46" />
                                                    ) : (
                                                        <Icon name="UserPlus" size={18} color="#374151" />
                                                    )}

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
                        <Pressable style={styles.doneButton} onPress={() => setMembersModalVisible(false)}>
                            <Text style={styles.doneButtonText}>
                                Done {selectedMembers.length > 0 ? `(${selectedMembers.length})` : ''}
                            </Text>
                        </Pressable>
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: '#FFF8E7',
    },
    container: {
        paddingBottom: 40,
        gap: 16,
    },
    heroSection: {
        width: '100%',
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logoCircle: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#000000',
    },
    brandTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#000000',
    },
    menuButton: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#000000',
    },
    heroCopy: {
        paddingHorizontal: 20,
        paddingTop: 24,
        gap: 4,
    },
    heroTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#000000',
        letterSpacing: -0.8,
    },
    heroSubtitle: {
        fontSize: 13,
        color: '#000000',
        fontWeight: '600',
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 18,
        marginHorizontal: 16,
        borderWidth: 2,
        borderColor: '#000000',
        shadowColor: '#000000',
        shadowOffset: { width: 5, height: 5 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 3,
    },
    fieldLabel: {
        fontSize: 11,
        color: '#000000',
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 8,
    },
    textInput: {
        borderWidth: 2,
        borderColor: '#000000',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        fontWeight: '700',
        color: '#000000',
        backgroundColor: '#ffffff',
        shadowColor: '#000000',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    iconGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    iconWrap: {
        width: 46,
        height: 46,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 2,
        borderColor: '#000000',
    },
    iconWrapActive: {
        backgroundColor: '#C3FFD8',
    },
    quickActionIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#C3FFD8',
        borderWidth: 2,
        borderColor: '#000000',
    },
    iconOption: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        borderWidth: 2,
        borderColor: '#000000',
    },
    iconOptionActive: {
        backgroundColor: '#C3FFD8',
    },
    membersHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    membersCount: {
        fontSize: 12,
        color: '#000000',
        fontWeight: '800',
    },
    addMembersButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        borderRadius: radius.xl,
        padding: spacing.md,
        backgroundColor: palette.card,
        ...shadows.sm,
    },
    addMembersTitle: {
        fontSize: 14,
        fontFamily: fontFamily.bold,
        color: palette.textPrimary,
    },
    addMembersSubtitle: {
        fontSize: 12,
        color: palette.textSecondary,
        fontFamily: fontFamily.semibold,
        marginTop: 1,
    },
    chipsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 14,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: palette.primaryLight,
        borderRadius: radius.pill,
        paddingVertical: 6,
        paddingHorizontal: 12,
        maxWidth: 160,
    },
    chipText: {
        fontSize: 12,
        fontFamily: fontFamily.bold,
        color: palette.primaryDeep,
        flexShrink: 1,
    },
    createButton: {
        backgroundColor: palette.primary,
        borderRadius: radius.pill,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.primary,
    },
    createButtonDisabled: {
        backgroundColor: palette.border,
        opacity: 0.6,
    },
    createButtonText: {
        color: palette.white,
        fontSize: 15,
        fontFamily: fontFamily.bold,
    },
    footerBanner: {
        marginHorizontal: spacing.base,
        borderRadius: radius.xl,
        overflow: 'hidden',
        ...shadows.sm,
        elevation: 3,
    },
    footerBannerBg: {
        minHeight: 130,
        justifyContent: 'flex-end',
    },
    footerBannerBgImage: {
        borderRadius: radius.xl,
    },
    footerBannerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(102, 204, 68, 0.15)',
        borderRadius: radius.xl,
    },
    footerBannerContent: {
        padding: 20,
        paddingBottom: 18,
    },
    footerBannerTitle: {
        fontSize: 20,
        fontFamily: fontFamily.bold,
        color: palette.textPrimary,
        letterSpacing: -0.3,
        lineHeight: 28,
    },

    // Modal styles
    modalPage: {
        flex: 1,
        backgroundColor: palette.bg,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 8,
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: fontFamily.bold,
        color: palette.textPrimary,
    },
    modalCloseButton: {
        width: 32,
        height: 32,
        borderRadius: radius.pill,
        backgroundColor: palette.card,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.xs,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 20,
        marginTop: 8,
        marginBottom: 12,
        borderRadius: radius.md,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: palette.bg,
        borderWidth: 1,
        borderColor: palette.border,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: palette.textPrimary,
        fontFamily: fontFamily.semibold,
    },
    sectionLabel: {
        fontSize: 11,
        color: palette.textSecondary,
        fontFamily: fontFamily.bold,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginHorizontal: 20,
        marginTop: 8,
        marginBottom: 6,
    },
    emptyText: {
        fontSize: 18,
        color: palette.textSecondary,
        textAlign: 'center',
        marginHorizontal: 20,
        marginTop: 20,
        fontFamily: fontFamily.bold,
    },
    friendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    avatarCircle: {
        width: 40,
        height: 40,
        borderRadius: radius.pill,
        backgroundColor: palette.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: 15,
        fontFamily: fontFamily.bold,
        color: palette.primaryDeep,
    },
    friendName: {
        fontSize: 14,
        fontFamily: fontFamily.bold,
        color: palette.textPrimary,
    },
    friendUsername: {
        fontSize: 12,
        color: palette.textSecondary,
        fontFamily: fontFamily.semibold,
        marginTop: 1,
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
    checkboxActive: {
        backgroundColor: palette.success,
        borderColor: palette.success,
    },
    addPersonButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: palette.primaryLight,
        borderRadius: radius.pill,
        paddingVertical: 7,
        paddingHorizontal: 12,
    },
    addPersonButtonDisabled: {
        backgroundColor: palette.bg,
        opacity: 0.6,
    },
    addPersonText: {
        fontSize: 12,
        fontFamily: fontFamily.bold,
        color: palette.primaryDeep,
    },
    addPersonTextDisabled: {
        color: palette.textTertiary,
    },
    modalFooter: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 12,
        borderTopWidth: 1,
        borderTopColor: palette.divider,
    },
    doneButton: {
        backgroundColor: palette.primary,
        borderRadius: radius.pill,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.primary,
    },
    doneButtonText: {
        color: palette.white,
        fontSize: 15,
        fontFamily: fontFamily.bold,
    },
});