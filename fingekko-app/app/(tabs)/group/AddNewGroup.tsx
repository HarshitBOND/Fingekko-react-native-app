import { useAuth, useUser } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import {
    Briefcase,
    Car,
    Check,
    ChevronLeft,
    Coins,
    Home,
    Menu,
    Plane,
    Plus,
    Search,
    Users,
    UserPlus,
    Utensils,
    X,
    Handshake
} from 'lucide-react-native';
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
import { Use } from 'react-native-svg';

// Same icon set used on YourGroups so a group created here renders consistently there.
const ICONS = {
    Plane,
    Home,
    Users,
    Car,
    Coins,
    Utensils,
    Briefcase,
};

const ICON_KEYS = Object.keys(ICONS) as (keyof typeof ICONS)[];

// ---- Types matching the backend exactly ----

type FriendOfMine = {
    id: string;
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
    const [selectedIcon, setSelectedIcon] = useState<keyof typeof ICONS>('Users');

    const [friends, setFriends] = useState<Friend[]>([]);
    const [friendsLoading, setFriendsLoading] = useState(false);

    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [pendingRequestsId, setPendingRequestsId] = useState<Friend[]>([]);

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

    function toggleGroupMember(userId: string) {
        setSelectedUsers((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId]
        );
    }

    async function handleSendFriendRequest(userId: string) {
        if (pendingRequestIds.includes(userId)) return;

        try {
            const token = await getToken();

            await fetch("/api/friends/request", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ userId }),
            });

            setPendingRequestIds((prev) => [...prev, userId]);
        } catch (err) {
            console.log("Friend request failed:", err);
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

    const sendFriendRequestAndAdd = async (result: SearchResult) => {
        const token = await getToken();
        if (!token) {
            console.error('No token available for API request.');
            return;
        }
        try {
            await apiRequest({
                method: 'post',
                url: '/api/friends/request',
                token,
                data: { email: result.user.email },
            });
            setPendingRequestIds((prev) => [...prev, result.user.id]);
            // Add them to the group immediately even though the friend request is only pending.
            setSelectedMembers((prev) =>
                prev.some((m) => m.id === result.user.id) ? prev : [...prev, result.user]
            );
        } catch (error) {
            console.error('Error sending friend request:', error);
        }
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
                    members: selectedMembers.map((m) => m.id),
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
                                <ChevronLeft size={20} color="#148a46" />
                            </Pressable>
                            <Text style={styles.brandTitle}>New Group</Text>
                        </View>
                        <Pressable style={styles.menuButton} onPress={() => router.replace('/(tabs)/YourGroups')}>
                            <Menu size={20} color="#1f2937" />
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
                            const Icon = ICONS[key];
                            const active = key === selectedIcon;
                            return (
                                <Pressable
                                    key={key}
                                    onPress={() => setSelectedIcon(key)}
                                    style={[styles.iconOption, active && styles.iconOptionActive]}
                                >
                                    <Icon size={20} color={active ? '#ffffff' : '#148a46'} />
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
                            <Plus size={18} color="#148a46" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.addMembersTitle}>Add Members</Text>
                            <Text style={styles.addMembersSubtitle}>Choose friends or search for others</Text>
                        </View>
                        <ChevronLeft size={18} color="#9ca3af" style={{ transform: [{ rotate: '180deg' }] }} />
                    </Pressable>

                    {selectedMembers.length > 0 && (
                        <View style={styles.chipsWrap}>
                            {selectedMembers.map((member) => (
                                <View key={member.id} style={styles.chip}>
                                    <Text style={styles.chipText} numberOfLines={1}>
                                        {member.name}
                                    </Text>
                                    <Pressable onPress={() => removeSelectedMember(member.id)}>
                                        <X size={13} color="#148a46" />
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
                            <ActivityIndicator color="#ffffff" />
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
                            <X size={20} color="#1f2937" />
                        </Pressable>
                    </View>

                    <View style={styles.searchBar}>
                        <Search size={16} color="#9ca3af" />
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

                                    <Text style={styles.emptyText}>You don't have any friends added yet.</Text>

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
                                                    {selected ? <Check size={14} color="#ffffff" /> : <UserPlus size={14} color="#148a46" />}
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
                                                    
                                                    onPress={() => handleSendFriendRequest(result.user.id)}
                                                    disabled={requested}
                                                >
                                                    {requested ? (
                                                        <Handshake size={18} color="#EAB308" />
                                                    ) : (
                                                        <Handshake size={18} color="#374151" />
                                                    )}

                                                </Pressable>
                                                <Pressable
                                                
                                                    onPress={() => toggleMember(result.user)}
                                                >
                                                    {added ? (
                                                        <Check size={18} color="#148a46" />
                                                    ) : (
                                                        <UserPlus size={18} color="#374151" />
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
        backgroundColor: '#f5f8f5',
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
        borderRadius: 18,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    brandTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
    },
    menuButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.85)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroCopy: {
        paddingHorizontal: 20,
        paddingTop: 24,
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
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 16,
        marginHorizontal: 16,
        borderWidth: 1,
        borderColor: '#e9f3ec',
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
        elevation: 3,
    },
    fieldLabel: {
        fontSize: 11,
        color: '#6b7280',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 8,
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        backgroundColor: '#fafbfa',
    },
    iconGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    iconOption: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#eaf6ee',
        borderWidth: 1,
        borderColor: '#d4edda',
    },
    iconOptionActive: {
        backgroundColor: '#148a46',
        borderColor: '#148a46',
    },
    membersHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    membersCount: {
        fontSize: 12,
        color: '#148a46',
        fontWeight: '700',
    },
    addMembersButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#e9f3ec',
        borderRadius: 14,
        padding: 12,
    },
    quickActionIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#eaf6ee',
        borderWidth: 1,
        borderColor: '#d4edda',
    },
    addMembersTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
    },
    addMembersSubtitle: {
        fontSize: 12,
        color: '#6b7280',
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
        backgroundColor: '#eaf6ee',
        borderWidth: 1,
        borderColor: '#d4edda',
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 10,
        maxWidth: 160,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#148a46',
        flexShrink: 1,
    },
    createButton: {
        backgroundColor: '#148a46',
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    createButtonDisabled: {
        backgroundColor: '#a7d7b9',
    },
    createButtonText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '800',
    },
    footerBanner: {
        marginHorizontal: 16,
        borderRadius: 20,
        overflow: 'hidden',
    },
    footerBannerBg: {
        minHeight: 130,
        justifyContent: 'flex-end',
    },
    footerBannerBgImage: {
        borderRadius: 20,
    },
    footerBannerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(240, 250, 242, 0.45)',
        borderRadius: 20,
    },
    footerBannerContent: {
        padding: 20,
        paddingBottom: 18,
    },
    footerBannerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#111827',
        letterSpacing: -0.3,
        lineHeight: 28,
    },

    // Modal styles
    modalPage: {
        flex: 1,
        backgroundColor: '#ffffff',
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
        fontWeight: '800',
        color: '#111827',
    },
    modalCloseButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: 20,
        marginTop: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#fafbfa',
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#111827',
    },
    sectionLabel: {
        fontSize: 11,
        color: '#6b7280',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginHorizontal: 20,
        marginTop: 8,
        marginBottom: 6,
    },
    emptyText: {
        fontSize: 30,
        color: '#494f5a',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 20,
        marginTop: 8,
        fontWeight: '600',
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
        borderRadius: 20,
        backgroundColor: '#eaf6ee',
        borderWidth: 1,
        borderColor: '#d4edda',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: 15,
        fontWeight: '800',
        color: '#148a46',
    },
    friendName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
    },
    friendUsername: {
        fontSize: 12,
        color: '#6b7280',
        marginTop: 1,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 7,
        borderWidth: 1.5,
        borderColor: '#d1d5db',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxActive: {
        backgroundColor: '#148a46',
        borderColor: '#148a46',
    },
    addPersonButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#148a46',
        borderRadius: 20,
        paddingVertical: 7,
        paddingHorizontal: 12,
    },
    addPersonButtonDisabled: {
        backgroundColor: '#eaf6ee',
        borderWidth: 1,
        borderColor: '#d4edda',
    },
    addPersonText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#ffffff',
    },
    addPersonTextDisabled: {
        color: '#148a46',
    },
    modalFooter: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f5f1',
    },
    doneButton: {
        backgroundColor: '#148a46',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    doneButtonText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '800',
    },
});