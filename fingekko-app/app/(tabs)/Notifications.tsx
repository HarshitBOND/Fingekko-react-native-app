import { useAuth, useUser } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../../utils/api';
import Icon from '../../components/ui/Icon';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

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

      Alert.alert('Success', 'Friend request accepted.');
      fetchAllNotifications();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not accept friend request.');
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

      Alert.alert('Declined', 'Friend request declined.');
      fetchAllNotifications();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not decline friend request.');
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const handleShowDeclineMenu = (requestId: string, senderName: string) => {
    Alert.alert(
      'Friend Request Options',
      `Manage friend request from ${senderName}`,
      [
        {
          text: 'Decline Request',
          style: 'destructive',
          onPress: () => handleDeclineFriend(requestId),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
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
    <SafeAreaView style={styles.page} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={() => router.back()}>
          <Icon name="ChevronLeft" size={20} color="#000000" />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Pressable style={styles.headerButton} onPress={fetchAllNotifications}>
          <Icon name="RefreshCw" size={18} color="#000000" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#148a46" />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Icon name="BellOff" size={32} color="#000000" />
            </View>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptyText}>No new notifications or pending splits.</Text>
          </View>
        ) : (
          Object.entries(groupedNotifications).map(([groupTitle, items]) => {
            if (items.length === 0) return null;
            return (
              <View key={groupTitle} style={styles.groupContainer}>
                <Text style={styles.groupHeaderTitle}>{groupTitle}</Text>
                <View style={styles.groupList}>
                  {items.map((item) => {
                    const isFriendReq = item.type === 'friend_request';
                    
                    if (isFriendReq) {
                      return (
                        <Card key={item.id} variant="tactile" style={styles.notiCard}>
                          <View style={styles.friendReqRow}>
                            <View style={[styles.iconWrap, { backgroundColor: '#C3FFD8' }]}>
                              <Icon name="UserPlus" size={18} color="#000000" />
                            </View>
                            <View style={styles.friendReqBody}>
                              <Text style={styles.friendReqText} numberOfLines={2}>
                                <Text style={styles.boldText}>
                                  {item.rawData?.senderId?.name || item.rawData?.senderId?.email || 'Someone'}
                                </Text>
                                {' sent you a friend request.'}
                              </Text>
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
                                  <ActivityIndicator size="small" color="#000000" />
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
                                <Icon name="MoreVertical" size={18} color="#000000" />
                              </Pressable>
                            </View>
                          </View>
                        </Card>
                      );
                    }
                    
                    return (
                      <Card key={item.id} variant="tactile" style={styles.notiCard}>
                        <View style={styles.notiHeader}>
                          <View style={[styles.iconWrap, { backgroundColor: '#FFF2C2' }]}>
                            <Icon name="DollarSign" size={18} color="#000000" />
                          </View>
                          <View style={styles.notiBody}>
                            <Text style={styles.notiTitle}>{item.title}</Text>
                            <Text style={styles.notiSubtitle}>{item.subtitle}</Text>
                          </View>
                          <Text style={styles.notiDate}>{item.dateLabel}</Text>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  groupContainer: {
    marginBottom: 20,
  },
  groupHeaderTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  groupList: {
    gap: 12,
  },
  notiCard: {
    marginBottom: 4,
  },
  notiHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notiBody: {
    flex: 1,
    gap: 2,
  },
  notiTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
  },
  notiSubtitle: {
    fontSize: 12,
    color: '#333333',
    fontWeight: '600',
  },
  notiDate: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '800',
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
  friendReqText: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '600',
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '900',
  },
  friendReqActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confirmBtn: {
    width: 'auto',
    minWidth: 80,
  },
  confirmBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  threeDotBtn: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    height: 38,
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
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
    textAlign: 'center',
  },
});
