import { useUser, useAuth } from '@clerk/clerk-expo';
import Icon from './ui/Icon';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import { apiRequest } from '../utils/api';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';

export default function Navbar() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [badgeCount, setBadgeCount] = useState(0);

  const fetchBadgeCount = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      // 1. Fetch friend requests
      const friendsRes = await apiRequest<any>('/api/friends', {}, token);
      const incomingRequestsCount = friendsRes?.incomingRequests?.length || 0;

      // 2. Fetch expenses
      const expensesRes = await apiRequest<any>('/api/expenses', {}, token);
      const expensesList = expensesRes?.expenses || [];
      const currentUserId = user?.id || '';

      let expenseNotificationCount = 0;
      expensesList.forEach((exp: any) => {
        const creator = exp.createdBy;
        const creatorId = creator?.id || creator?.toString() || '';
        
        if (creatorId !== currentUserId) {
          const userParticipant = exp.participants?.find(
            (p: any) => (p.userId?.id || p.userId?.toString()) === currentUserId
          );
          if (userParticipant && !userParticipant.settled) {
            expenseNotificationCount++;
          }
        }
      });

      setBadgeCount(incomingRequestsCount + expenseNotificationCount);
    } catch (error) {
      console.warn('Failed to fetch badge count:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchBadgeCount();
      // Poll every 10 seconds for real-time notification badge updates
      const interval = setInterval(fetchBadgeCount, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const initials = (() => {
    if (!user) {
      return 'FG';
    }

    const first = user.firstName?.trim() || '';
    const last = user.lastName?.trim() || '';
    const fallback = user.username?.trim() || user.fullName?.trim() || '';
    const source = first || fallback;
    const initialA = source ? source.charAt(0).toUpperCase() : 'F';
    const initialB = last ? last.charAt(0).toUpperCase() : 'G';

    return `${initialA}${initialB}`;
  })();

  return (
    <View style={styles.header}>

      <View style={styles.headerSide}>
        <Icon name="TextAlignStart" size={24} color="#374151" />
      </View>

      <View style={styles.logoWrap}>
        <View style={styles.logoBadge}>
          <Image
            source={require('../assets/images/navgekko.png')}
            style={styles.logoImage}
          />
        </View>
      </View>

      <View style={styles.headerActions}>
        <Pressable
          style={styles.bellPressable}
          onPress={() => router.push('/(tabs)/Notifications')}
        >
          <Icon name="Bell" size={22} color="#374151" clickable={true} />
          {badgeCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeCount}</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 10,
  },

  headerSide: {
    width: 40,
    alignItems: 'flex-start',
  },

  logoWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
  },

  logoBadge: {
    width:102,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  logoImage: {
    width: 102,
    height: 72,
    resizeMode: 'contain',
  },

  logoText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  headerActions: {
    width: 96,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#eef2f3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    fontWeight: '700',
    color: '#4b5563',
  },
  bellPressable: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
});