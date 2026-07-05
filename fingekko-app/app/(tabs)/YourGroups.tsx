import { useAuth, useUser, } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '../../utils/api';
import { showConfirm } from '@/utils/showConfirm';
import ConfirmDialog from "../../components/ConfirmDialog";
import Icon from '../../components/ui/Icon';

const ICONS = {
    Plane: 'Plane',
    Home: 'Home',
    Users: 'Users',
    Car: 'Car',
    Coins: 'Coins',
    Utensils: 'Utensils',
    Briefcase: 'Briefcase',
};

type GroupItem = {
    id: string;
    name: string;
    members: string[];
    icon: string;
    createdBy: string;
    amountLabel: string;
    amount: string;
    amountColor: string;
};

type QuickAction = {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    href: '/(tabs)/Friends' | '/(tabs)/group/AddNewGroup' | '/(tabs)/YourGroups' | '/(tabs)/NonGroupExpenses';
};

const GROUPS: GroupItem[] = [
    {
        id: 'g1',
        name: 'Office Team Lunch',
        members: ['u1', 'u2', 'u3'],
        icon: '🍱',
        createdBy: 'John Doe',
        amountLabel: 'You are owed',
        amount: '₹1,240',
        amountColor: '#148a46',
    },
    {
        id: 'g2',
        name: 'Goa Trip',
        members: ['u1', 'u2', 'u3', 'u4', 'u5'],
        icon: '🏝️',
        createdBy: 'Jane Smith',
        amountLabel: 'You owe',
        amount: '₹860',
        amountColor: '#eb5a4f',
    },
    {
        id: 'g3',
        name: 'Flatmates',
        members: ['u1', 'u2', 'u3', 'u4'],
        icon: '🏠',
        createdBy: 'Alice Johnson',
        amountLabel: 'You are settled up',
        amount: '₹0',
        amountColor: '#6b7280',
    },
];

const QUICK_ACTIONS: QuickAction[] = [
    {
        id: 'add-expense',
        title: 'Create New Group',
        subtitle: 'Create a new group',
        icon: 'Plus',
        href: '/(tabs)/group/AddNewGroup',
    },
    {
        id: 'your-groups',
        title: 'Your Groups',
        subtitle: 'Open the groups screen',
        icon: 'Users',
        href: '/(tabs)/YourGroups',
    },
];


export default function YourGroups() {
    const router = useRouter();
    const [groups, setGroups] = useState<GroupItem[]>([]);

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

    const { user } = useUser();
    const { getToken } = useAuth();

    const fetchGroups = async () => {

        const token = await getToken();
        if (!token) {
            console.error('No token available for API request.');
            return;
        }
        try {
            const response = await apiRequest<GroupItem[]>({
                method: 'get',
                url: '/api/groups',
                token,
            });
            setGroups(response);
        } catch (error) {
            console.error('Error fetching groups:', error);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    const leaveGroup = async (groupId: string) => {
        const token = await getToken();
        if (!token) {
            console.error('No token available for API request.');
            return;
        }
        try {
            await apiRequest({
                method: 'post',
                url: `/api/groups/${groupId}/leave`,
                token,
            });
            // Refresh the groups list after leaving a group
            fetchGroups();
        } catch (error) {
            console.error('Error leaving group:', error);
        }
    };

    const deleteGroup = async (groupId: string) => {
        const token = await getToken();
        if (!token) {
            console.error('No token available for API request.');
            return;
        }
        try {
            await apiRequest({
                method: 'delete',
                url: `/api/groups/${groupId}`,
                token,
            });
            // Refresh the groups list after deleting a group
            fetchGroups();
        } catch (error) {
            console.error('Error deleting group:', error);
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
                            <View style={styles.logoCircle}>
                                <Icon name="Users" size={18} color="#148a46" />
                            </View>
                            <Text style={styles.brandTitle}>Your Groups</Text>
                        </View>
                        <Pressable style={styles.menuButton} onPress={() => router.back()}>
                            <Icon name="Menu" size={20} color="#1f2937" />
                        </Pressable>
                    </View>

                    <View style={styles.heroCopy}>
                        <Text style={styles.heroTitle}>All your groups</Text>
                        <Text style={styles.heroSubtitle}>Keep every split in one place.</Text>
                    </View>
                </View>

                <View style={styles.card}>
                    {groups.length === 0 ? (
                        <View style={{ padding: 18 , justifyContent: 'center', alignItems: 'center'}}>
                            <Text style={{ fontSize: 26, color: '#6b7280' }}>You are not part of any groups yet  . . . . .</Text>
                            
                        </View>
                    ) : (
                        groups.map((item, index) => (
                            <Pressable
                                key={item.id}
                                style={[styles.groupRow, index !== groups.length - 1 && styles.divider]}
                                onPress={() =>
                                    router.push({
                                        pathname: "/(tabs)/group/[groupId]",
                                        params: {
                                            groupId: item.id,
                                        },
                                    })
                                }
                            >
                                <View style={styles.groupIconWrap}>
                                    {(() => {
                                        const iconName = ICONS[item.icon as keyof typeof ICONS] ?? 'Users';
                                        return <Icon name={iconName} size={24} color="#148a46" />;
                                    })()}
                                </View>
                                <View style={styles.groupTextWrap}>
                                    <Text style={styles.groupName}>{item.name}</Text>
                                    <Text style={styles.groupMembers}>
                                        {item.members.length} {item.members.length === 1 ? 'member' : 'members'}
                                    </Text>
                                </View>
                                <View style={styles.groupRight}>
                                    <Text style={styles.groupStatusLabel}>{item.amountLabel}</Text>
                                    <Text style={[styles.groupAmount, { color: item.amountColor }]}>{item.amount}</Text>
                                </View>
                                {item.createdBy === user?.id && (
                                    <Pressable onPress={() => {
                                        setSelectedGroupId(item.id);
                                        setShowDeleteDialog(true);
                                    }
                                    } style={{ marginRight: 8 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 4, backgroundColor: 'rgba(235,90,79,0.05)' }}>
                                            <Icon name="Trash" size={16} color="#eb5a4f" />
                                        </View>
                                    </Pressable>
                                )}
                                <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 4, backgroundColor: 'rgba(20,138,70,0.05)' }}>
                                    <Icon name="ChevronRight" size={16} color="#071407" style={styles.groupChevron} />
                                </View>
                            </Pressable>
                        ))
                    )}
                </View>

                <View style={styles.quickActionsGrid}>
                    {QUICK_ACTIONS.map((action) => {
                        return (
                            <Pressable
                                key={action.id}
                                style={styles.quickActionCard}
                                onPress={() => router.push(action.href)}
                            >
                                <View style={styles.quickActionIconWrap}>
                                    <Icon name={action.icon} size={22} color="#148a46" />
                                </View>
                                <Text style={styles.quickActionTitle}>{action.title}</Text>
                                <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
                            </Pressable>
                        );
                    })}
                </View>

                <View style={styles.footerBanner}>
                    <ImageBackground
                        source={require('../../assets/images/bgadd.png')}
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
            <ConfirmDialog
                visible={showDeleteDialog}
                title="Delete Group"
                message="Are you sure you want to permanently delete this group? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                destructive
                onCancel={() => {
                    setShowDeleteDialog(false);
                    setSelectedGroupId(null);
                }}
                onConfirm={async () => {
                    if (!selectedGroupId) return;

                    await deleteGroup(selectedGroupId);

                    setShowDeleteDialog(false);
                    setSelectedGroupId(null);
                }}
            />
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: '#FFF8E7',
    },
    container: {
        paddingHorizontal: 16,
        paddingBottom: 40,
        gap: 16,
    },
    quickActionSubtitle: {
        fontSize: 12,
        color: '#333333',
        fontWeight: '600',
        lineHeight: 16,
    },
    quickActionCard: {
        width: '48%',
        minHeight: 118,
        borderRadius: 8,
        backgroundColor: '#ffffff',
        borderWidth: 3,
        borderColor: '#000000',
        padding: 16,
        gap: 10,
        shadowColor: '#000000',
        shadowOffset: { width: 5, height: 5 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 3,
    },
    quickActionIconWrap: {
        width: 46,
        height: 46,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#C3FFD8',
        borderWidth: 2,
        borderColor: '#000000',
    },
    heroSection: {
        width: '100%',
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 16,
        paddingBottom: 8,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 12,
    },
    quickActionTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: '#000000',
        lineHeight: 18,
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
        borderRadius: 8,
        paddingHorizontal: 16,
        borderWidth: 3,
        borderColor: '#000000',
        shadowColor: '#000000',
        shadowOffset: { width: 5, height: 5 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 3,
    },
    divider: {
        borderBottomWidth: 2,
        borderBottomColor: '#000000',
    },
    groupRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        gap: 12,
    },
    groupIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 8,
        backgroundColor: '#C3FFD8',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#000000',
    },
    groupIconEmoji: {
        fontSize: 18,
    },
    groupTextWrap: {
        flex: 1,
        gap: 2,
    },
    groupName: {
        fontSize: 14,
        fontWeight: '800',
        color: '#000000',
    },
    groupMembers: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333333',
    },
    groupRight: {
        alignItems: 'flex-end',
        gap: 2,
    },
    groupStatusLabel: {
        fontSize: 11,
        color: '#333333',
        fontWeight: '700',
    },
    groupAmount: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    groupChevron: {
        marginLeft: 4,
    },
    footerBanner: {
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
    footerBannerBg: {
        minHeight: 130,
        justifyContent: 'flex-end',
    },
    footerBannerBgImage: {
        borderRadius: 5,
    },
    footerBannerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 222, 67, 0.45)',
        borderRadius: 5,
    },
    footerBannerContent: {
        padding: 20,
        paddingBottom: 18,
    },
    footerBannerTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#000000',
        letterSpacing: -0.3,
        lineHeight: 28,
    },
});