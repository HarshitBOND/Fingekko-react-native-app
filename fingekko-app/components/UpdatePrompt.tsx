import React, { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { palette, spacing, radius, shadows, fontFamily } from '@/constants/design';
import Card from './ui/Card';
import Button from './ui/Button';
import AppText from './ui/AppText';
import Icon from './ui/Icon';

const GITHUB_OWNER = 'HarshitBOND';
const GITHUB_REPO = 'Fingekko-react-native-app';
const STORAGE_KEY_LAST_CHECK = '@fingekko_last_update_check';
const STORAGE_KEY_SKIPPED_VERSION = '@fingekko_skipped_version';
const CHECK_INTERVAL = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

interface GithubRelease {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
  }>;
}

function parseSemver(version: string): number[] {
  return version.replace(/^v/, '').split('.').map(val => parseInt(val, 10) || 0);
}

function isNewerVersion(current: string, latest: string): boolean {
  const currentParts = parseSemver(current);
  const latestParts = parseSemver(latest);
  
  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const cur = currentParts[i] || 0;
    const lat = latestParts[i] || 0;
    if (lat > cur) return true;
    if (cur > lat) return false;
  }
  return false;
}

export default function UpdatePrompt() {
  const [visible, setVisible] = useState(false);
  const [latestRelease, setLatestRelease] = useState<GithubRelease | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const current = Constants.expoConfig?.version || '1.0.0';
    setCurrentVersion(current);
    checkForUpdates(current);
  }, []);

  const checkForUpdates = async (currVer: string) => {
    try {
      setChecking(true);
      
      // 1. Check if we checked recently to avoid API limits
      const lastCheck = await AsyncStorage.getItem(STORAGE_KEY_LAST_CHECK);
      const skippedVersion = await AsyncStorage.getItem(STORAGE_KEY_SKIPPED_VERSION);
      const now = Date.now();
      
      if (lastCheck) {
        const lastCheckTime = parseInt(lastCheck, 10);
        // If checked less than 12 hours ago, skip
        if (now - lastCheckTime < CHECK_INTERVAL && !__DEV__) {
          setChecking(false);
          return;
        }
      }

      // 2. Fetch latest release from GitHub
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Fingekko-App-Update-Checker',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API returned status ${response.status}`);
      }

      const release: GithubRelease = await response.json();
      
      // Save last check timestamp
      await AsyncStorage.setItem(STORAGE_KEY_LAST_CHECK, now.toString());

      // 3. Compare versions
      const latestVer = release.tag_name;
      
      if (isNewerVersion(currVer, latestVer)) {
        // If this version was previously skipped, don't show the modal again
        if (skippedVersion === latestVer && !__DEV__) {
          setChecking(false);
          return;
        }

        setLatestRelease(release);
        setVisible(true);
      }
    } catch (error) {
      console.log('[UpdatePrompt] Error checking updates:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleUpdate = () => {
    if (!latestRelease) return;

    // Find APK asset if available
    const apkAsset = latestRelease.assets.find(asset => asset.name.endsWith('.apk'));
    const downloadUrl = apkAsset ? apkAsset.browser_download_url : latestRelease.html_url;

    Linking.openURL(downloadUrl).catch(err => {
      console.error('Failed to open download link:', err);
    });

    setVisible(false);
  };

  const handleLater = async () => {
    if (latestRelease) {
      // Remember that the user skipped this version
      await AsyncStorage.setItem(STORAGE_KEY_SKIPPED_VERSION, latestRelease.tag_name);
    }
    setVisible(false);
  };

  if (!visible || !latestRelease) {
    return null;
  }

  // Parse release notes into paragraphs/bullets
  const releaseNotes = latestRelease.body || 'No release notes provided.';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Card variant="elevated" style={styles.containerCard} padding={24}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Icon name="arrow-up-circle" size={32} color={palette.primaryDeep} />
            </View>
            <AppText variant="h2" style={styles.title}>
              Update Available!
            </AppText>
            <AppText variant="caption" color="textSecondary" style={styles.subtitle}>
              FinGekko {latestRelease.tag_name} is now available. You have {currentVersion}.
            </AppText>
          </View>

          <View style={styles.bodyContainer}>
            <AppText variant="label" color="textPrimary" style={styles.bodyTitle}>
              What's New:
            </AppText>
            <ScrollView style={styles.notesScroll} contentContainerStyle={styles.notesContent}>
              <AppText variant="bodySm" color="textSecondary" style={styles.notesText}>
                {releaseNotes}
              </AppText>
            </ScrollView>
          </View>

          <View style={styles.buttons}>
            <Button
              variant="outline"
              size="md"
              onPress={handleLater}
              style={styles.dialogButton}
            >
              Later
            </Button>

            <Button
              variant="primary"
              size="md"
              onPress={handleUpdate}
              style={styles.dialogButton}
              icon={<Icon name="download" size={18} color={palette.white} />}
            >
              Update Now
            </Button>
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: palette.scrim,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  containerCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: palette.card,
    borderRadius: radius.xxl,
    ...shadows.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  bodyContainer: {
    backgroundColor: palette.bg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    maxHeight: 180,
  },
  bodyTitle: {
    marginBottom: spacing.xs,
    fontFamily: fontFamily.semibold,
  },
  notesScroll: {
    flexGrow: 0,
  },
  notesContent: {
    paddingVertical: spacing.xs,
  },
  notesText: {
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  dialogButton: {
    flex: 1,
  },
});
