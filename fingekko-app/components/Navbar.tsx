import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { router, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { apiRequest } from '../utils/api';
import AppText from './ui/AppText';
import Icon from './ui/Icon';
import UserAvatar from './ui/UserAvatar';
import { fontFamily, palette, radius, shadows } from '../constants/design';

export default function Navbar() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [badgeCount, setBadgeCount] = useState(0);
  const navigation = useNavigation();

  const fetchBadgeCount = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const response = await apiRequest<{ notifications: any[] }>({
        method: 'get',
        url: '/api/notifications',
        token,
      });

      const list = response?.notifications || [];
      const lastSeenStr = await AsyncStorage.getItem('last_seen_notifications_time');

      if (!lastSeenStr) {
        setBadgeCount(list.length);
      } else {
        const lastSeenTime = new Date(lastSeenStr).getTime();
        const unseenCount = list.filter((item: any) => {
          const itemTime = item.createdAt ? new Date(item.createdAt).getTime() : 0;
          return itemTime > lastSeenTime;
        }).length;
        setBadgeCount(unseenCount);
      }
    } catch (error) {
      console.warn('Failed to fetch badge count:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchBadgeCount();
      const unsubscribe = navigation.addListener('focus', () => {
        fetchBadgeCount();
      });
      const interval = setInterval(fetchBadgeCount, 10000);
      return () => {
        unsubscribe();
        clearInterval(interval);
      };
    }
  }, [user, navigation]);

  return (
    <View style={styles.header}>
      <View style={styles.logoWrap}>
        <Image source={require('../assets/images/mainlogoNobg.png')} style={styles.logoImage} />
      </View>

      <View style={styles.headerActions}>
        <Pressable style={styles.bellButton} onPress={() => router.push('/(tabs)/Notifications')} hitSlop={6}>
          <Icon name="Bell" size={20} color={palette.textPrimary} clickable={false} />
          {badgeCount > 0 && (
            <View style={styles.badge}>
              <AppText style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</AppText>
            </View>
          )}
        </Pressable>

        <UserAvatar size={42} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingBottom: 10,
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: palette.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: palette.card,
  },
  badgeText: {
    color: palette.white,
    fontSize: 9,
    fontFamily: fontFamily.bold,
  },
});
