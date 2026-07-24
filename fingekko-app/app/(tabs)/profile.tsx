import type { ApiUser, ProfileResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { formatMoney } from '@/utils/currency';
import { getLevelProgress } from '@/utils/gamification';
import { useAuth, useUser } from '@clerk/clerk-expo';
import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, View } from 'react-native';
import Navbar from '../../components/Navbar';
import ScreenContainer from '../../components/ui/ScreenContainer';
import Card from '../../components/ui/Card';
import AppText from '../../components/ui/AppText';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import Toast from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import { palette, spacing, layout, radius, shadows } from '../../constants/design';

const extra = Constants.expoConfig?.extra ?? {};
const WEBSITE_URL = String(extra.websiteUrl ?? 'https://www.fingekko.com');
const PRIVACY_URL = String(extra.privacyPolicyUrl ?? `${WEBSITE_URL}/privacy`);
const APP_VARIANT = String(extra.appVariant ?? 'production');
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

const LEGAL_LINKS = [
  { label: 'Privacy Policy', url: PRIVACY_URL, icon: 'Shield' },
  { label: 'About FinGekko', url: WEBSITE_URL, icon: 'CircleAlert' },
] as const;

/**
 * Opens in an in-app browser so the user keeps their session and can swipe
 * back, falling back to the system browser if that isn't available.
 */
const openLink = async (url: string) => {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    Linking.openURL(url).catch(() => {});
  }
};

export default function ProfileScreen() {
  const { getToken, isSignedIn, signOut } = useAuth();
  const { user: clerkUser } = useUser();
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  // Reload on every focus so XP/level earned elsewhere in the app shows up here.
  useFocusEffect(
    useCallback(() => {
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
    }, [isSignedIn])
  );

  const levelProgress = useMemo(() => getLevelProgress(profile?.xp ?? 0), [profile?.xp]);

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

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const { toast, showToast, dismissToast } = useToast();
  const hasPhoto = Boolean(clerkUser?.hasImage && clerkUser?.imageUrl);

  const handlePickPhoto = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast({
        title: 'Permission needed',
        message: 'Allow photo access to set a profile picture.',
        tone: 'info',
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    const asset = result.assets?.[0];
    if (result.canceled || !asset?.base64 || !clerkUser) return;

    setUploadingPhoto(true);
    try {
      // Clerk on React Native reliably accepts a base64 data URI string;
      // a Blob from fetch() is flaky on Android/Hermes.
      const mime = asset.mimeType ?? 'image/jpeg';
      await clerkUser.setProfileImage({ file: `data:${mime};base64,${asset.base64}` });
      await clerkUser.reload();
      showToast({ title: 'Profile photo updated! 🎉', tone: 'success', duration: 2000 });
    } catch (uploadError) {
      showToast({
        title: 'Upload failed',
        message: 'Could not update your photo. Please try again.',
        tone: 'error',
      });
    } finally {
      setUploadingPhoto(false);
    }
  }, [clerkUser, showToast]);

  return (
    <>
      <Toast toast={toast} onDismiss={dismissToast} />
    <ScreenContainer
      contentStyle={{ gap: spacing.lg }}
      header={
        <View style={{ paddingHorizontal: layout.gutter }}>
          <Navbar />
        </View>
      }
    >
      <Card variant="elevated" padding={20}>
        <View style={styles.avatarRow}>
          <Pressable onPress={handlePickPhoto} disabled={uploadingPhoto} style={styles.avatarWrap}>
            {hasPhoto ? (
              <Image source={{ uri: clerkUser!.imageUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Icon name="User" size={32} color={palette.primary} clickable={false} />
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color={palette.white} />
              ) : (
                <Icon name="Camera" size={13} color={palette.white} clickable={false} />
              )}
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <AppText variant="h1" color="textPrimary">
              Profile
            </AppText>
            <AppText variant="caption" color="textSecondary" style={styles.subtitle}>
              Tap your photo to update it from your gallery.
            </AppText>
          </View>
        </View>
      </Card>

      <Card variant="elevated" padding={20} style={styles.levelCard}>
        <View style={styles.levelHeaderRow}>
          <View>
            <AppText variant="micro" color="textSecondary" style={styles.fieldLabel}>
              Your journey
            </AppText>
            <AppText variant="h2" color="textPrimary">
              Level {profile?.level ?? levelProgress.level}
            </AppText>
          </View>
          <View style={styles.xpPill}>
            <AppText variant="caption" color="primaryDeep" weight="bold">
              ⚡ {profile?.xp ?? 0} XP
            </AppText>
          </View>
        </View>
        <View style={styles.levelBarBg}>
          <View style={[styles.levelBarFill, { width: `${Math.round(levelProgress.progress * 100)}%` }]} />
        </View>
        <AppText variant="micro" color="textSecondary">
          {levelProgress.xpIntoLevel} / {levelProgress.xpForNextLevel} XP to the next level
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
            {formatMoney(profile?.monthlyIncome ?? 0)}
          </AppText>
        </View>
      </Card>

      {/* Manage — quick access to the recurring-bills list (AUDIT item 10). */}
      <Card variant="elevated" padding={0} style={styles.legalCard}>
        <Pressable
          onPress={() => router.push('/(tabs)/essentials')}
          style={({ pressed }) => [styles.legalRow, pressed && styles.legalRowPressed]}
          accessibilityRole="button"
          accessibilityLabel="Manage bills and essentials"
        >
          <Icon name="ReceiptText" size={18} color={palette.textSecondary} clickable={false} />
          <AppText variant="bodySm" style={{ flex: 1 }}>
            Bills &amp; essentials
          </AppText>
          <Icon name="ChevronRight" size={16} color={palette.textTertiary} clickable={false} />
        </Pressable>
      </Card>

      {/* Legal — Play requires a reachable privacy policy, and users should not
          have to leave the app to find it. */}
      <Card variant="elevated" padding={0} style={styles.legalCard}>
        {LEGAL_LINKS.map((link, index) => (
          <Pressable
            key={link.label}
            onPress={() => openLink(link.url)}
            style={({ pressed }) => [
              styles.legalRow,
              index > 0 && styles.legalRowDivided,
              pressed && styles.legalRowPressed,
            ]}
            accessibilityRole="link"
            accessibilityLabel={link.label}
          >
            <Icon name={link.icon} size={18} color={palette.textSecondary} clickable={false} />
            <AppText variant="bodySm" style={{ flex: 1 }}>
              {link.label}
            </AppText>
            <Icon name="ChevronRight" size={16} color={palette.textTertiary} clickable={false} />
          </Pressable>
        ))}
      </Card>

      <AppText variant="micro" color="textTertiary" align="center">
        FinGekko v{APP_VERSION}
        {APP_VARIANT !== 'production' ? ` · ${APP_VARIANT}` : ''}
      </AppText>

      {error ? (
        <AppText variant="bodySm" color="danger" weight="bold" style={styles.errorText}>
          {error}
        </AppText>
      ) : null}

      <Button variant="danger" onPress={() => signOut()} style={styles.signOutButton}>
        Sign out
      </Button>
    </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginTop: 4,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
  },
  avatarWrap: {
    width: 72,
    height: 72,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: palette.card,
    ...shadows.sm,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: palette.border,
    ...shadows.sm,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: palette.card,
  },
  profileCard: {
    gap: spacing.base,
  },
  levelCard: {
    gap: spacing.sm,
  },
  levelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  xpPill: {
    backgroundColor: palette.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  levelBarBg: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: palette.track,
    overflow: 'hidden',
  },
  levelBarFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: palette.primary,
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
  legalCard: {
    overflow: 'hidden',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    minHeight: 52,
  },
  legalRowDivided: {
    borderTopWidth: 1,
    borderTopColor: palette.divider,
  },
  legalRowPressed: {
    backgroundColor: palette.cardMuted,
  },
  signOutButton: {
    marginTop: spacing.sm,
  },
});
