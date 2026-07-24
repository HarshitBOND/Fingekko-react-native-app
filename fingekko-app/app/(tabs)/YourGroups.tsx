import { useAuth, useUser } from '@clerk/clerk-expo';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ConfirmDialog from '../../components/ConfirmDialog';
import Navbar from '../../components/Navbar';
import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Icon from '../../components/ui/Icon';
import LoadingScreen from '../../components/ui/LoadingScreen';
import PressableScale from '../../components/ui/PressableScale';
import ScreenContainer from '../../components/ui/ScreenContainer';
import Toast from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import { layout, palette, radius, shadows, spacing } from '../../constants/design';
import { apiRequest } from '../../utils/api';
import { pairwiseBalance, roundMoney } from '../../utils/splitMath';

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

// Shapes served by /api/expenses (see server serializeExpense).
type ExpenseUser = { id: string; name: string; email: string } | null;
type ExpenseItem = {
    id: string;
    groupId: string | null;
    groupName: string | null;
    description: string;
    amount: number;
    expenseDate: string;
    createdAt: string;
    createdBy: ExpenseUser;
    paidBy: { userId: ExpenseUser; amount: number }[];
    participants: { userId: ExpenseUser; amount: number; settled: boolean }[];
    netBalance: number;
};

type FriendRow = {
    id: string; // db user id — what FriendSplits expects as friendId
    name: string;
    email: string;
    friendshipId: string;
};

type FriendsApiResponse = {
    friends: { id: string; friend: { id: string; name: string; email: string } }[];
};

type SplitTab = 'groups' | 'friends' | 'activity';

const EMPTY_GROUPS: GroupItem[] = [];
const EMPTY_EXPENSES: ExpenseItem[] = [];
const EMPTY_FRIENDS: FriendRow[] = [];

const inr = (n: number) =>
    `₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function amountColorFor(raw: string) {
    if (raw === '#eb5a4f') return palette.danger;
    if (raw === '#148a46') return palette.success;
    return palette.textSecondary;
}

const getInitials = (name: string): string =>
    name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || '?';

function timeAgo(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const days = Math.floor((Date.now() - then) / 86400000);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? '' : 's'} ago`;
}

export default function YourGroups() {
    const router = useRouter();
    const { user } = useUser();
    const { getToken } = useAuth();
    const insets = useSafeAreaInsets();
    const { toast, showToast, dismissToast } = useToast();

    // Sit clear of the floating tab bar: same inset math the bar itself uses
    // in (tabs)/_layout, plus a gap — a fixed constant sinks under the bar on
    // devices with tall system navigation.
    const fabBottom =
        (insets.bottom > 0 ? insets.bottom : layout.navBarBottomInset) +
        layout.navBarHeight +
        spacing.base;

    const [tab, setTab] = useState<SplitTab>('friends');
    const [groups, setGroups] = useState<GroupItem[]>(EMPTY_GROUPS);
    const [expenses, setExpenses] = useState<ExpenseItem[]>(EMPTY_EXPENSES);
    const [friendRows, setFriendRows] = useState<FriendRow[]>(EMPTY_FRIENDS);
    const [myDbId, setMyDbId] = useState('');
    const [initialLoading, setInitialLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showSettled, setShowSettled] = useState(false);

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showLeaveDialog, setShowLeaveDialog] = useState(false);
    const [leavingGroup, setLeavingGroup] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [deletingGroup, setDeletingGroup] = useState(false);

    const getTokenRef = useRef(getToken);
    useEffect(() => {
        getTokenRef.current = getToken;
    }, [getToken]);

    const fetchAll = useCallback(async () => {
        try {
            const token = await getTokenRef.current();
            if (!token) return;
            const [groupsRes, expensesRes, friendsRes, meRes] = await Promise.all([
                apiRequest<GroupItem[]>({ method: 'get', url: '/api/groups', token }),
                apiRequest<{ expenses: ExpenseItem[] }>({ method: 'get', url: '/api/expenses', token }),
                apiRequest<FriendsApiResponse>({ method: 'get', url: '/api/friends', token }),
                apiRequest<any>('/api/me', {}, token),
            ]);
            setGroups(groupsRes ?? EMPTY_GROUPS);
            setExpenses(expensesRes?.expenses ?? EMPTY_EXPENSES);
            setFriendRows(
                (friendsRes?.friends ?? []).map((f) => ({
                    id: f.friend.id,
                    name: f.friend.name,
                    email: f.friend.email,
                    friendshipId: f.id,
                }))
            );
            const me = meRes?.user ?? meRes;
            setMyDbId(me?._id?.toString?.() ?? me?.id ?? '');
        } catch (error) {
            console.warn('Error fetching split data:', error);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            let active = true;
            fetchAll().finally(() => {
                if (active) setInitialLoading(false);
            });
            return () => {
                active = false;
            };
        }, [fetchAll])
    );

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchAll();
        setRefreshing(false);
    };

    const deleteGroup = async (groupId: string) => {
        try {
            const token = await getTokenRef.current();
            if (!token) return false;
            await apiRequest({ method: 'delete', url: `/api/groups/${groupId}`, token });
            await fetchAll();
            return true;
        } catch (error) {
            console.warn('Error deleting group:', error);
            return false;
        }
    };

    const leaveGroup = async (groupId: string) => {
        try {
            const token = await getTokenRef.current();
            if (!token) return false;
            await apiRequest({ method: 'post', url: `/api/groups/${groupId}/leave`, token });
            await fetchAll();
            return true;
        } catch (error) {
            console.warn('Error leaving group:', error);
            return false;
        }
    };

    // Overall position across every expense — the server has already computed
    // each expense's net for the current user, so this is just a sum.
    const overall = useMemo(
        () => expenses.reduce((sum, exp) => sum + (exp.netBalance ?? 0), 0),
        [expenses]
    );

    // Pairwise balances via the same shared math as the friend detail page
    // (utils/splitMath), restricted to personal (non-group) splits — the same
    // set that page lists and settles. Counting group expenses here left
    // "ghost" balances behind after settling up with a friend.
    const friendBalances = useMemo(() => {
        const map = new Map<string, number>();
        if (!myDbId) return map;

        expenses.forEach((exp) => {
            if (exp.groupId) return; // group debts are settled inside the group
            friendRows.forEach((f) => {
                const amount = pairwiseBalance(exp, myDbId, f.id);
                if (amount !== 0) map.set(f.id, (map.get(f.id) ?? 0) + amount);
            });
        });
        map.forEach((value, key) => map.set(key, roundMoney(value)));
        return map;
    }, [expenses, friendRows, myDbId]);

    const { activeFriends, settledFriends } = useMemo(() => {
        const active: (FriendRow & { balance: number })[] = [];
        const settled: (FriendRow & { balance: number })[] = [];
        friendRows.forEach((f) => {
            const balance = friendBalances.get(f.id) ?? 0;
            if (Math.abs(balance) > 0.009) active.push({ ...f, balance });
            else settled.push({ ...f, balance: 0 });
        });
        // Biggest debts first — the row you most need to act on is on top.
        active.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
        return { activeFriends: active, settledFriends: settled };
    }, [friendRows, friendBalances]);

    const recentActivity = useMemo(
        () =>
            [...expenses].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            ),
        [expenses]
    );

    if (initialLoading) {
        return <LoadingScreen label="Loading your splits..." />;
    }

    const overallLabel =
        overall > 0.009 ? 'you are owed' : overall < -0.009 ? 'you owe' : "you're all settled up";
    const overallColor =
        overall > 0.009 ? palette.success : overall < -0.009 ? palette.danger : palette.textSecondary;

    const goToFriend = (friend: FriendRow) =>
        router.push({
            pathname: '/(tabs)/FriendSplits',
            params: { friendId: friend.id, friendName: friend.name },
        });

    const renderBalanceCell = (balance: number) => {
        if (Math.abs(balance) < 0.01) {
            return (
                <AppText variant="micro" color="textTertiary">
                    settled up
                </AppText>
            );
        }
        const owed = balance > 0;
        return (
            <View style={{ alignItems: 'flex-end' }}>
                <AppText variant="micro" style={{ color: owed ? palette.success : palette.danger }}>
                    {owed ? 'owes you' : 'you owe'}
                </AppText>
                <AppText numeric variant="label" style={{ color: owed ? palette.success : palette.danger }}>
                    {inr(balance)}
                </AppText>
            </View>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            <ScreenContainer
                contentStyle={{ gap: spacing.base }}
                header={
                    <View style={{ paddingHorizontal: layout.gutter }}>
                        <Navbar />
                    </View>
                }
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.primaryDeep} />
                }
            >
                {/* Title + quick reach into Friends management */}
                <View style={styles.titleRow}>
                    <AppText variant="h1">Split</AppText>
                    <Pressable
                        style={styles.headerIconBtn}
                        onPress={() => router.push('/(tabs)/Friends')}
                        hitSlop={6}
                        accessibilityLabel="Manage friends"
                    >
                        <Icon name="UserPlus" size={18} color={palette.textPrimary} clickable={false} />
                    </Pressable>
                </View>

                {/* Overall banner — the Splitwise anchor line */}
                <View style={styles.overallRow}>
                    <AppText variant="body" color="textSecondary">
                        Overall,{' '}
                        <AppText variant="body" weight="bold" style={{ color: overallColor }}>
                            {overallLabel}
                            {Math.abs(overall) > 0.009 ? ` ${inr(overall)}` : ''}
                        </AppText>
                    </AppText>
                </View>

                {/* Segmented tabs */}
                <View style={styles.segmented}>
                    {(
                        [
                            { key: 'groups', label: 'Groups' },
                            { key: 'friends', label: 'Friends' },
                            { key: 'activity', label: 'Activity' },
                        ] as { key: SplitTab; label: string }[]
                    ).map((option) => {
                        const active = tab === option.key;
                        return (
                            <Pressable
                                key={option.key}
                                style={[styles.segment, active && styles.segmentActive]}
                                onPress={() => setTab(option.key)}
                            >
                                <AppText
                                    variant="label"
                                    style={{ color: active ? palette.primaryDeep : palette.textTertiary }}
                                >
                                    {option.label}
                                </AppText>
                            </Pressable>
                        );
                    })}
                </View>

                {/* ─── Groups ─── */}
                {tab === 'groups' &&
                    (groups.length === 0 ? (
                        <EmptyState
                            icon="Users"
                            title="No groups yet"
                            subtitle="Create a group to split expenses with flatmates, trips or teams."
                            actionLabel="Create a group"
                            onAction={() => router.push('/(tabs)/group/AddNewGroup')}
                        />
                    ) : (
                        <Card variant="elevated" padding={0} style={styles.listCard}>
                            {groups.map((item, index) => (
                                <Pressable
                                    key={item.id}
                                    style={({ pressed }) => [
                                        styles.row,
                                        index !== groups.length - 1 && styles.rowDivider,
                                        pressed && styles.rowPressed,
                                    ]}
                                    onPress={() =>
                                        router.push({ pathname: '/(tabs)/group/[groupId]', params: { groupId: item.id } })
                                    }
                                >
                                    <View style={styles.groupIcon}>
                                        <Icon
                                            name={item.icon?.trim() || 'Users'}
                                            size={20}
                                            color={palette.primaryDeep}
                                            clickable={false}
                                        />
                                    </View>
                                    <View style={{ flex: 1, gap: 2 }}>
                                        <AppText variant="label" numberOfLines={1}>
                                            {item.name}
                                        </AppText>
                                        <AppText variant="micro" color="textTertiary">
                                            {item.members.length} {item.members.length === 1 ? 'member' : 'members'}
                                        </AppText>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <AppText variant="micro" style={{ color: amountColorFor(item.amountColor) }}>
                                            {item.amountLabel.toLowerCase()}
                                        </AppText>
                                        {item.amountLabel !== 'You are settled up' && (
                                            <AppText variant="label" style={{ color: amountColorFor(item.amountColor) }}>
                                                {item.amount}
                                            </AppText>
                                        )}
                                    </View>
                                    {item.createdBy === user?.id ? (
                                        <Pressable
                                            onPress={() => {
                                                setSelectedGroupId(item.id);
                                                setShowDeleteDialog(true);
                                            }}
                                            hitSlop={6}
                                            style={styles.deleteBtn}
                                            accessibilityLabel={`Delete ${item.name}`}
                                        >
                                            <Icon name="Trash" size={13} color={palette.danger} clickable={false} />
                                        </Pressable>
                                    ) : (
                                        // The creator can't leave their own group (server rejects it),
                                        // so this is the exit for everyone else.
                                        <Pressable
                                            onPress={() => {
                                                setSelectedGroupId(item.id);
                                                setShowLeaveDialog(true);
                                            }}
                                            hitSlop={6}
                                            style={styles.leaveBtn}
                                            accessibilityLabel={`Leave ${item.name}`}
                                        >
                                            <Icon name="LogOut" size={13} color={palette.textSecondary} clickable={false} />
                                        </Pressable>
                                    )}
                                </Pressable>
                            ))}
                            <Pressable
                                style={({ pressed }) => [styles.row, styles.newGroupRow, pressed && styles.rowPressed]}
                                onPress={() => router.push('/(tabs)/group/AddNewGroup')}
                            >
                                <View style={[styles.groupIcon, styles.newGroupIcon]}>
                                    <Icon name="Plus" size={18} color={palette.primaryDeep} clickable={false} />
                                </View>
                                <AppText variant="label" color="primaryDeep">
                                    Start a new group
                                </AppText>
                            </Pressable>
                        </Card>
                    ))}

                {/* ─── Friends ─── */}
                {tab === 'friends' && (
                    <>
                        {friendRows.length === 0 ? (
                            <EmptyState
                                icon="UserPlus"
                                title="No friends yet"
                                subtitle="Add friends to split expenses one-on-one, outside of groups."
                                actionLabel="Find friends"
                                onAction={() => router.push('/(tabs)/Friends')}
                            />
                        ) : (
                            <>
                                <Card variant="elevated" padding={0} style={styles.listCard}>
                                    {activeFriends.map(
                                        (friend, index) => (
                                            <Pressable
                                                key={friend.id}
                                                style={({ pressed }) => [
                                                    styles.row,
                                                    index !== activeFriends.length - 1 && styles.rowDivider,
                                                    pressed && styles.rowPressed,
                                                ]}
                                                onPress={() => goToFriend(friend)}
                                            >
                                                <View style={styles.avatar}>
                                                    <AppText variant="label" color="primaryDeep">
                                                        {getInitials(friend.name)}
                                                    </AppText>
                                                </View>
                                                <AppText variant="label" numberOfLines={1} style={{ flex: 1 }}>
                                                    {friend.name}
                                                </AppText>
                                                {renderBalanceCell(friend.balance)}
                                            </Pressable>
                                        )
                                    )}
                                    {activeFriends.length === 0 && (
                                        <View style={styles.allSettled}>
                                            <Icon name="Check" size={18} color={palette.success} clickable={false} />
                                            <AppText variant="caption" color="textSecondary">
                                                You&apos;re settled up with all your friends.
                                            </AppText>
                                        </View>
                                    )}
                                </Card>

                                {settledFriends.length > 0 && (
                                    <>
                                        {!showSettled ? (
                                            <PressableScale style={styles.settledToggle} onPress={() => setShowSettled(true)}>
                                                <AppText variant="caption" color="primaryDeep">
                                                    Show {settledFriends.length} settled-up friend
                                                    {settledFriends.length === 1 ? '' : 's'}
                                                </AppText>
                                            </PressableScale>
                                        ) : (
                                            <>
                                                <Card variant="flat" padding={0} style={styles.listCard}>
                                                    {settledFriends.map((friend, index) => (
                                                        <Pressable
                                                            key={friend.id}
                                                            style={({ pressed }) => [
                                                                styles.row,
                                                                index !== settledFriends.length - 1 && styles.rowDivider,
                                                                pressed && styles.rowPressed,
                                                            ]}
                                                            onPress={() => goToFriend(friend)}
                                                        >
                                                            <View style={styles.avatar}>
                                                                <AppText variant="label" color="primaryDeep">
                                                                    {getInitials(friend.name)}
                                                                </AppText>
                                                            </View>
                                                            <AppText variant="label" numberOfLines={1} style={{ flex: 1 }}>
                                                                {friend.name}
                                                            </AppText>
                                                            <AppText variant="micro" color="textTertiary">
                                                                settled up
                                                            </AppText>
                                                        </Pressable>
                                                    ))}
                                                </Card>
                                                <PressableScale style={styles.settledToggle} onPress={() => setShowSettled(false)}>
                                                    <AppText variant="caption" color="textSecondary">
                                                        Hide settled-up friends
                                                    </AppText>
                                                </PressableScale>
                                            </>
                                        )}
                                    </>
                                )}
                            </>
                        )}
                    </>
                )}

                {/* ─── Activity ─── */}
                {tab === 'activity' &&
                    (recentActivity.length === 0 ? (
                        <EmptyState
                            icon="StickyNote"
                            title="No activity yet"
                            subtitle="Split expenses will show up here as they happen."
                        />
                    ) : (
                        <Card variant="elevated" padding={0} style={styles.listCard}>
                            {recentActivity.slice(0, 25).map((exp, index) => {
                                const isMine = exp.createdBy?.id === myDbId;
                                const actor = isMine ? 'You' : exp.createdBy?.name?.split(' ')[0] ?? 'Someone';
                                const net = exp.netBalance ?? 0;
                                return (
                                    <Pressable
                                        key={exp.id}
                                        style={({ pressed }) => [
                                            styles.activityRow,
                                            index !== Math.min(recentActivity.length, 25) - 1 && styles.rowDivider,
                                            pressed && styles.rowPressed,
                                        ]}
                                        onPress={() =>
                                            router.push({ pathname: '/(tabs)/ExpenseDetail', params: { expenseId: exp.id } })
                                        }
                                    >
                                        <View style={styles.activityIcon}>
                                            <Icon name="StickyNote" size={16} color={palette.primaryDeep} clickable={false} />
                                        </View>
                                        <View style={{ flex: 1, gap: 2 }}>
                                            <AppText variant="caption" color="textPrimary">
                                                <AppText variant="caption" weight="bold">
                                                    {actor}
                                                </AppText>{' '}
                                                added &quot;{exp.description}&quot;
                                                {exp.groupName ? ` in ${exp.groupName}` : ''}
                                            </AppText>
                                            {Math.abs(net) > 0.009 ? (
                                                <AppText
                                                    variant="micro"
                                                    style={{ color: net > 0 ? palette.success : palette.danger }}
                                                >
                                                    {net > 0 ? 'You get back' : 'You owe'} {inr(net)}
                                                </AppText>
                                            ) : (
                                                <AppText variant="micro" color="textTertiary">
                                                    Not involving you
                                                </AppText>
                                            )}
                                            <AppText variant="micro" color="textTertiary">
                                                {timeAgo(exp.createdAt)}
                                            </AppText>
                                        </View>
                                        <AppText numeric variant="label" color="textSecondary">
                                            {inr(exp.amount)}
                                        </AppText>
                                    </Pressable>
                                );
                            })}
                        </Card>
                    ))}

                <ConfirmDialog
                    visible={showDeleteDialog}
                    title="Delete group"
                    message="Are you sure you want to permanently delete this group? This action cannot be undone."
                    confirmText="Delete"
                    cancelText="Cancel"
                    destructive
                    loading={deletingGroup}
                    onCancel={() => {
                        setShowDeleteDialog(false);
                        setSelectedGroupId(null);
                    }}
                    onConfirm={async () => {
                        if (!selectedGroupId) return;
                        setDeletingGroup(true);
                        const ok = await deleteGroup(selectedGroupId);
                        setDeletingGroup(false);
                        setShowDeleteDialog(false);
                        setSelectedGroupId(null);
                        showToast(
                            ok
                                ? { title: 'Group deleted', tone: 'info', duration: 2200 }
                                : { title: 'Could not delete group', message: 'Please try again.', tone: 'error' }
                        );
                    }}
                />

                <ConfirmDialog
                    visible={showLeaveDialog}
                    title="Leave group"
                    message="You'll stop seeing this group and its expenses. Any balances you have will still need settling."
                    confirmText="Leave"
                    cancelText="Cancel"
                    destructive
                    loading={leavingGroup}
                    onCancel={() => {
                        setShowLeaveDialog(false);
                        setSelectedGroupId(null);
                    }}
                    onConfirm={async () => {
                        if (!selectedGroupId) return;
                        setLeavingGroup(true);
                        const ok = await leaveGroup(selectedGroupId);
                        setLeavingGroup(false);
                        setShowLeaveDialog(false);
                        setSelectedGroupId(null);
                        showToast(
                            ok
                                ? { title: 'You left the group', tone: 'info', duration: 2200 }
                                : { title: 'Could not leave group', message: 'Please try again.', tone: 'error' }
                        );
                    }}
                />

                <Toast toast={toast} onDismiss={dismissToast} />
            </ScreenContainer>

            {/* Floating add-expense pill, Splitwise-style, floating above the nav bar */}
            <PressableScale style={[styles.fab, { bottom: fabBottom }]} onPress={() => router.push('/(tabs)/AddNewExpense')}>
                <Icon name="StickyNote" size={18} color={palette.white} clickable={false} />
                <AppText variant="label" style={{ color: palette.white }}>
                    Add expense
                </AppText>
            </PressableScale>
        </View>
    );
}

const styles = StyleSheet.create({
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerIconBtn: {
        width: 40,
        height: 40,
        borderRadius: radius.pill,
        backgroundColor: palette.card,
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.sm,
    },
    overallRow: { marginTop: -spacing.sm },
    segmented: {
        flexDirection: 'row',
        backgroundColor: palette.card,
        borderRadius: radius.pill,
        padding: 4,
        ...shadows.xs,
    },
    segment: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
    },
    segmentActive: { backgroundColor: palette.primaryLight },
    listCard: { paddingHorizontal: spacing.base },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
    },
    rowDivider: { borderBottomWidth: 1, borderBottomColor: palette.divider },
    rowPressed: { opacity: 0.6 },
    groupIcon: {
        width: 42,
        height: 42,
        borderRadius: radius.md,
        backgroundColor: palette.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    newGroupRow: { paddingVertical: spacing.md },
    newGroupIcon: {
        backgroundColor: palette.bg,
        borderWidth: 1.5,
        borderColor: palette.border,
        borderStyle: 'dashed',
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: radius.pill,
        backgroundColor: palette.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteBtn: {
        width: 28,
        height: 28,
        borderRadius: radius.pill,
        backgroundColor: palette.dangerLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    leaveBtn: {
        width: 28,
        height: 28,
        borderRadius: radius.pill,
        backgroundColor: palette.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    allSettled: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.lg,
    },
    settledToggle: {
        alignSelf: 'center',
        borderWidth: 1.5,
        borderColor: palette.primary,
        borderRadius: radius.pill,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        marginTop: spacing.xs,
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.md,
        paddingVertical: spacing.md,
    },
    activityIcon: {
        width: 36,
        height: 36,
        borderRadius: radius.md,
        backgroundColor: palette.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fab: {
        position: 'absolute',
        right: layout.gutter,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: palette.primary,
        borderRadius: radius.pill,
        paddingVertical: 14,
        paddingHorizontal: 20,
        ...shadows.primary,
    },
});
