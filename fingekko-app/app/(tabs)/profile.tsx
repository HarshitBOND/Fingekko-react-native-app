import type { ApiUser, ProfileResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Navbar from '../../components/Navbar';
import { Colors, FontSizes, Spacing } from '../../constants/Colors';

export default function ProfileScreen() {
  const { getToken, isSignedIn, signOut } = useAuth();
  const { user: clerkUser } = useUser();
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    let isActive = true;

    const loadProfile = async () => {
      if (!isSignedIn) {
        setProfile(null);
        return;
      }

      try {
        const token = await getTokenRef.current();
        if (!token) {
          return;
        }
        const response = await apiRequest<ProfileResponse>('/api/profile', {}, token);
        if (isActive) {
          setProfile(response.user);
          setError(null);
        }
      } catch (fetchError) {
        if (isActive) {
          setError('Unable to load profile.');
        }
      }
    };

    loadProfile();

    return () => {
      isActive = false;
    };
  }, [isSignedIn]);

  const displayName = useMemo(() => {
    return (
      clerkUser?.fullName ||
      profile?.name ||
      clerkUser?.firstName ||
      clerkUser?.username ||
      'FinGekko User'
    );
  }, [clerkUser?.firstName, clerkUser?.fullName, clerkUser?.username, profile?.name]);

  const emailAddress =
    clerkUser?.primaryEmailAddress?.emailAddress || profile?.email || 'Email unavailable';

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Navbar />

        <View style={styles.headerCard}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Manage your account and session.</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Name</Text>
            <Text style={styles.fieldValue}>{displayName}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Email</Text>
            <Text style={styles.fieldValue}>{emailAddress}</Text>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Monthly income</Text>
            <Text style={styles.fieldValue}>
              {profile?.currency ?? 'Rs. '}{profile?.monthlyIncome ?? 0}
            </Text>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable style={styles.signOutButton} onPress={() => signOut()}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f4f6f5',
  },
  container: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
    gap: Spacing.base,
  },
  headerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  subtitle: {
    marginTop: 4,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    gap: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fieldRow: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  fieldValue: {
    fontSize: FontSizes.md,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  errorText: {
    color: Colors.expense,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: {
    color: Colors.textLight,
    fontSize: FontSizes.base,
    fontWeight: '700',
  },
});
