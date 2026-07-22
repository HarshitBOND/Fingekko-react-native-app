import { useAuth, useUser } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../../utils/api';
import Icon from '../../components/ui/Icon';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import AppText from '../../components/ui/AppText';
import ConfirmDialog from '../../components/ConfirmDialog';
import ScreenContainer from '../../components/ui/ScreenContainer';
import Toast from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import { palette, spacing, radius, shadows, fontFamily, layout } from '../../constants/design';

type NotificationItem = {
  id: string;
  type: 'friend_request' | 'expense_split';
  title: string;
  subtitle: string;
  dateLabel: string;
  createdAt?: string;
  rawData: any;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const currentUserId = clerkUser?.id || '';

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [declineTarget, setDeclineTarget] = useState<{ id: string; name: string } | null>(null);
  const { toast, showToast, dismissToast } = useToast();

  const fetchAllNotifications = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      const response = await apiRequest<{ notifications: NotificationItem[] }>({
        method: 'get',
        url: '/api/notifications',
        token,
      });

      const list = response?.notifications || [];
      setNotifications(list);

      // Save current timestamp as last seen to clear home badge count
      await AsyncStorage.setItem('last_seen_notifications_time', new Date().toISOString());
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllNotifications();
  }, []);

  const handleAcceptFriend = async (requestId: string) => {
    setActionLoading(prev => ({ ...prev, [requestId]: true }));
    try {
      const token = await getToken();
      if (!token) return;

      await apiRequest({
        method: 'put',
        url: `/api/friends/${requestId}/accept`,
        token,
      });

      showToast({ title: 'Friend added! 🎉', message: 'You are now connected.', tone: 'success' });
      fetchAllNotifications();
    } catch (err: any) {
      showToast({ title: 'Could not accept', message: err.message || 'Please try again.', tone: 'error' });
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const handleDeclineFriend = async (requestId: string) => {
    setActionLoading(prev => ({ ...prev, [requestId]: true }));
    try {
      const token = await getToken();
      if (!token) return;

      await apiRequest({
        method: 'put',
        url: `/api/friends/${requestId}/decline`,
        token,
      });

      showToast({ title: 'Request declined', tone: 'info', duration: 2200 });
      fetchAllNotifications();
    } catch (err: any) {
      showToast({ title: 'Could not decline', message: err.message || 'Please try again.', tone: 'error' });
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const handleShowDeclineMenu = (requestId: string, senderName: string) => {
    setDeclineTarget({ id: requestId, name: senderName });
  };

  const groupNotifications = (list: NotificationItem[]) => {
    const groups: Record<string, NotificationItem[]> = {
      'Today': [],
      'Yesterday': [],
      'This Week': [],
      'Earlier': [],
    };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const oneWeekAgoStart = todayStart - 7 * 24 * 60 * 60 * 1000;

    list.forEach((item) => {
      const itemTime = item.createdAt ? new Date(item.createdAt).getTime() : new Date().getTime();
      if (itemTime >= todayStart) {
        groups['Today'].push(item);
      } else if (itemTime >= yesterdayStart) {
        groups['Yesterday'].push(item);
      } else if (itemTime >= oneWeekAgoStart) {
        groups['This Week'].push(item);
      } else {
        groups['Earlier'].push(item);
      }
    });

    return groups;
  };

  const groupedNotifications = groupNotifications(notifications);

  return (
    <>
    <Toast toast={toast} onDismiss={dismissToast} />
    <ConfirmDialog
      visible={!!declineTarget}
      title="Decline request"
      message={`Decline the friend request from ${declineTarget?.name || 'this person'}?`}
      confirmText="Decline"
      destructive
      onConfirm={() => {
        const id = declineTarget?.id;
        setDeclineTarget(null);
        if (id) handleDeclineFriend(id);
      }}
      onCancel={() => setDeclineTarget(null)}
    />
    <ScreenContainer
      header={
        <View style={styles.header}>
          <Pressable style={styles.headerButton} onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
            <Icon name="ChevronLeft" size={22} color={palette.textPrimary} />
          </Pressable>
          <AppText variant="title" color="textPrimary" weight="bold">
            Notifications
          </AppText>
          <Pressable style={styles.headerButton} onPress={fetchAllNotifications}>
            <Icon name="RefreshCw" size={18} color={palette.textPrimary} />
          </Pressable>
        </View>
      }
    >
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={palette.primaryDeep} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Icon name="BellOff" size={32} color={palette.textSecondary} />
          </View>
          <AppText variant="title" color="textPrimary" weight="bold">
            All caught up!
          </AppText>
          <AppText variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
            No new notifications or pending splits.
          </AppText>
        </View>
      ) : (
        Object.entries(groupedNotifications).map(([groupTitle, items]) => {
          if (items.length === 0) return null;
          return (
            <View key={groupTitle} style={styles.groupContainer}>
              <AppText variant="caption" color="textSecondary" weight="bold" style={styles.groupHeaderTitle}>
                {groupTitle}
              </AppText>
              <View style={styles.groupList}>
                {items.map((item) => {
                  const isFriendReq = item.type === 'friend_request';
                  
                  if (isFriendReq) {
                    return (
                      <Card key={item.id} variant="elevated" style={styles.notiCard} padding={14}>
                        <View style={styles.friendReqRow}>
                          <View style={[styles.iconWrap, { backgroundColor: palette.primaryLight }]}>
                            <Icon name="UserPlus" size={18} color={palette.primaryDeep} />
                          </View>
                          <View style={styles.friendReqBody}>
                            <AppText variant="bodySm" color="textPrimary" numberOfLines={2}>
                              <AppText variant="bodySm" color="textPrimary" weight="bold">
                                {item.rawData?.senderId?.name || item.rawData?.senderId?.email || 'Someone'}
                              </AppText>
                              {' sent you a friend request.'}
                            </AppText>
                          </View>
                          <View style={styles.friendReqActions}>
                            <Button
                              variant="primary"
                              size="sm"
                              style={styles.confirmBtn}
                              textStyle={styles.confirmBtnText}
                              onPress={() => handleAcceptFriend(item.id)}
                              disabled={actionLoading[item.id]}
                            >
                              {actionLoading[item.id] ? (
                                <ActivityIndicator size="small" color={palette.white} />
                              ) : (
                                'Confirm'
                              )}
                            </Button>
                            <Pressable
                              style={styles.threeDotBtn}
                              onPress={() =>
                                handleShowDeclineMenu(
                                  item.id,
                                  item.rawData?.senderId?.name || item.rawData?.senderId?.email || 'Someone'
                                )
                              }
                              hitSlop={10}
                            >
                              <Icon name="MoreVertical" size={18} color={palette.textSecondary} />
                            </Pressable>
                          </View>
                        </View>
                      </Card>
                    );
                  }
                  
                  return (
                    <Card key={item.id} variant="elevated" style={styles.notiCard} padding={14}>
                      <View style={styles.notiHeader}>
                        <View style={[styles.iconWrap, { backgroundColor: palette.warningLight }]}>
                          <Icon name="DollarSign" size={18} color={palette.warning} />
                        </View>
                        <View style={styles.notiBody}>
                          <AppText variant="bodySm" color="textPrimary" weight="bold">
                            {item.title}
                          </AppText>
                          <AppText variant="caption" color="textSecondary">
                            {item.subtitle}
                          </AppText>
                        </View>
                        <AppText variant="micro" color="textTertiary">
                          {item.dateLabel}
                        </AppText>
                      </View>

                      <View style={styles.actionRow}>
                        <Button
                          variant="secondary"
                          size="sm"
                          style={styles.actionBtn}
                          onPress={() => {
                            const groupId = item.rawData.groupId;
                            if (groupId) {
                              router.push({
                                pathname: '/(tabs)/group/[groupId]',
                                params: { groupId },
                              });
                            } else {
                              router.push('/(tabs)/NonGroupExpenses');
                            }
                          }}
                        >
                          View details
                        </Button>
                      </View>
                    </Card>
                  );
                })}
              </View>
            </View>
          );
        })
      )}
    </ScreenContainer>
    </>
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
  groupContainer: {
    marginBottom: spacing.base,
  },
  groupHeaderTitle: {
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupList: {
    gap: 8,
  },
  notiCard: {
    marginBottom: 2,
  },
  notiHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notiBody: {
    flex: 1,
    gap: 2,
  },
  friendReqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  friendReqBody: {
    flex: 1,
    paddingRight: 4,
  },
  friendReqActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confirmBtn: {
    width: 'auto',
    minWidth: 80,
    height: 34,
  },
  confirmBtnText: {
    fontSize: 12,
  },
  threeDotBtn: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    height: 36,
  },
  centerContainer: {
    paddingVertical: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.card,
    ...shadows.xs,
  },
});
