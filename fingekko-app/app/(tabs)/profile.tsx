import type { ApiUser, ProfileResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Navbar from '../../components/Navbar';
import ScreenContainer from '../../components/ui/ScreenContainer';
import Card from '../../components/ui/Card';
import AppText from '../../components/ui/AppText';
import Button from '../../components/ui/Button';
import { palette, spacing, layout, radius, shadows } from '../../constants/design';

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
    <ScreenContainer
      contentStyle={{ gap: spacing.lg }}
      header={
        <View style={{ paddingHorizontal: layout.gutter }}>
          <Navbar />
        </View>
      }
    >
      <Card variant="elevated" padding={20}>
        <AppText variant="h1" color="textPrimary">
          Profile
        </AppText>
        <AppText variant="caption" color="textSecondary" style={styles.subtitle}>
          Manage your account and session.
        </AppText>
      </Card>

      <Card variant="elevated" padding={20} style={styles.profileCard}>
        <View style={styles.fieldRow}>
          <AppText variant="micro" color="textSecondary" style={styles.fieldLabel}>
            Name
          </AppText>
          <AppText variant="body" color="textPrimary" weight="bold">
            {displayName}
          </AppText>
        </View>
        <View style={styles.fieldRow}>
          <AppText variant="micro" color="textSecondary" style={styles.fieldLabel}>
            Email
          </AppText>
          <AppText variant="body" color="textPrimary" weight="bold">
            {emailAddress}
          </AppText>
        </View>
        <View style={styles.fieldRow}>
          <AppText variant="micro" color="textSecondary" style={styles.fieldLabel}>
            Monthly income
          </AppText>
          <AppText variant="body" color="textPrimary" weight="bold">
            {profile?.currency ?? 'Rs. '}{profile?.monthlyIncome ?? 0}
          </AppText>
        </View>
      </Card>

      {error ? (
        <AppText variant="bodySm" color="danger" weight="bold" style={styles.errorText}>
          {error}
        </AppText>
      ) : null}

      <Button variant="danger" onPress={() => signOut()} style={styles.signOutButton}>
        Sign out
      </Button>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginTop: 4,
  },
  profileCard: {
    gap: spacing.base,
  },
  fieldRow: {
    gap: 4,
  },
  fieldLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  errorText: {
    textAlign: 'center',
  },
  signOutButton: {
    marginTop: spacing.sm,
  },
});
