import { useAuth, useUser } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ImageBackground, Pressable, StyleSheet, View } from 'react-native';
import { apiRequest } from '../../utils/api';
import { showConfirm } from '@/utils/showConfirm';
import ConfirmDialog from "../../components/ConfirmDialog";
import Icon from '../../components/ui/Icon';
import ScreenContainer from '../../components/ui/ScreenContainer';
import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import { palette, spacing, radius, shadows, fontFamily, layout } from '../../constants/design';

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
    href: '/(tabs)/Friends' | '/(tabs)/group/AddNewGroup' | '/(tabs)/YourGroups' | '/(tabs)/NonGroupExpenses' | '/(tabs)/insights';
};

const QUICK_ACTIONS: QuickAction[] = [
    {
        id: 'add-expense',
        title: 'Create New Group',
        subtitle: 'Create a new group',
        icon: 'Plus',
        href: '/(tabs)/group/AddNewGroup',
    },
    {
        id: 'view-insights',
        title: 'View Full Insights',
        subtitle: 'Check spending patterns',
        icon: 'TrendingUp',
        href: '/(tabs)/insights',
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
        <ScreenContainer
            contentStyle={{ gap: spacing.lg }}
            header={
                <View style={styles.header}>
                    <Pressable style={styles.headerButton} onPress={() => router.back()}>
                        <Icon name="ChevronLeft" size={22} color={palette.textPrimary} />
                    </Pressable>
                    <AppText variant="title" color="textPrimary" weight="bold">
                        Your Groups
                    </AppText>
                    <View style={{ width: 40 }} />
                </View>
            }
        >
            <View style={styles.heroSection}>
                <LinearGradient
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    colors={['rgba(102, 204, 68, 0.16)', 'rgba(102, 204, 68, 0.04)', 'transparent']}
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

                <View style={styles.heroCopy}>
                    <AppText variant="display" color="textPrimary" weight="bold">
                        All your groups
                    </AppText>
                    <AppText variant="caption" color="textSecondary">
                        Keep every split in one place.
                    </AppText>
                </View>
            </View>

            <Card variant="elevated" padding={0} style={styles.groupsCard}>
                {groups.length === 0 ? (
                    <View style={{ padding: 24, justifyContent: 'center', alignItems: 'center' }}>
                        <AppText variant="caption" color="textTertiary">
                            You are not part of any groups yet.
                        </AppText>
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
                                    return <Icon name={iconName} size={20} color={palette.primaryDeep} />;
                                })()}
                            </View>
                            <View style={styles.groupTextWrap}>
                                <AppText variant="bodySm" color="textPrimary" weight="bold">
                                    {item.name}
                                </AppText>
                                <AppText variant="micro" color="textSecondary">
                                    {item.members.length} {item.members.length === 1 ? 'member' : 'members'}
                                </AppText>
                            </View>
                            <View style={styles.groupRight}>
                                <AppText variant="micro" color="textSecondary" weight="bold">
                                    {item.amountLabel}
                                </AppText>
                                <AppText
                                    variant="bodySm"
                                    weight="bold"
                                    style={{
                                        color: item.amountColor === '#eb5a4f' ? palette.danger : (item.amountColor === '#148a46' ? palette.success : palette.textPrimary)
                                    }}
                                >
                                    {item.amount}
                                </AppText>
                            </View>
                            {item.createdBy === user?.id && (
                                <Pressable
                                    onPress={() => {
                                        setSelectedGroupId(item.id);
                                        setShowDeleteDialog(true);
                                    }}
                                    style={{ marginLeft: 8 }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 8, padding: 6, backgroundColor: 'rgba(235,90,79,0.08)' }}>
                                        <Icon name="Trash" size={14} color={palette.danger} />
                                    </View>
                                </Pressable>
                            )}
                            <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 8, padding: 6, backgroundColor: palette.primaryLight, marginLeft: 8 }}>
                                <Icon name="ChevronRight" size={14} color={palette.primaryDeep} />
                            </View>
                        </Pressable>
                    ))
                )}
            </Card>

            <Pressable
                style={styles.insightsButton}
                onPress={() => router.push('/(tabs)/insights')}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Icon name="TrendingUp" size={20} color={palette.primaryDeep} />
                    <AppText variant="bodySm" color="primaryDeep" weight="bold">
                        View Full Insights
                    </AppText>
                </View>
                <Icon name="ChevronRight" size={18} color={palette.primaryDeep} />
            </Pressable>

            <View style={styles.quickActionsGrid}>
                {QUICK_ACTIONS.map((action) => {
                    return (
                        <Card
                            key={action.id}
                            variant="elevated"
                            padding={16}
                            style={styles.quickActionCard}
                            onPress={() => router.push(action.href)}
                        >
                            <View style={styles.quickActionIconWrap}>
                                <Icon name={action.icon} size={22} color={palette.primaryDeep} />
                            </View>
                            <AppText variant="bodySm" color="textPrimary" weight="bold" style={styles.quickActionTitle}>
                                {action.title}
                              </AppText>
                            <AppText variant="micro" color="textSecondary" style={styles.quickActionSubtitle}>
                                {action.subtitle}
                            </AppText>
                        </Card>
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
                        <AppText variant="title" color="textPrimary" weight="bold">
                            Stay organized.
                        </AppText>
                        <AppText variant="title" color="textPrimary" weight="bold">
                            Stay settled up.
                        </AppText>
                    </View>
                </ImageBackground>
            </View>

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
    heroSection: {
        width: '100%',
    },
    heroCopy: {
        paddingTop: spacing.sm,
        gap: 2,
    },
    groupsCard: {
        paddingHorizontal: spacing.base,
    },
    divider: {
        borderBottomWidth: 1,
        borderBottomColor: palette.divider,
    },
    groupRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        gap: spacing.sm,
    },
    groupIconWrap: {
        width: 40,
        height: 40,
        borderRadius: radius.pill,
        backgroundColor: palette.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    groupTextWrap: {
        flex: 1,
        gap: 2,
    },
    groupRight: {
        alignItems: 'flex-end',
        gap: 2,
    },
    quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: spacing.sm,
    },
    quickActionCard: {
        width: '48%',
        minHeight: 110,
        gap: spacing.xs,
    },
    quickActionIconWrap: {
        width: 40,
        height: 40,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: palette.primaryLight,
    },
    quickActionTitle: {
        lineHeight: 18,
        marginTop: 2,
    },
    quickActionSubtitle: {
        lineHeight: 14,
    },
    footerBanner: {
        borderRadius: radius.xl,
        overflow: 'hidden',
        ...shadows.sm,
        marginBottom: spacing.xxl,
    },
    footerBannerBg: {
        minHeight: 120,
        justifyContent: 'flex-end',
    },
    footerBannerBgImage: {
        borderRadius: radius.xl,
    },
    footerBannerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(102, 204, 68, 0.12)',
        borderRadius: radius.xl,
    },
    footerBannerContent: {
        padding: spacing.lg,
    },
    insightsButton: {
        backgroundColor: palette.primaryLight,
        borderRadius: radius.pill,
        paddingVertical: 14,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...shadows.xs,
        marginTop: 8,
    },
});