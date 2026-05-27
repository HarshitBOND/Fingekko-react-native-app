import BageSection from '@/components/BageSection';
import Navbar from '@/components/Navbar';
import YourDreamJourney from '@/components/yourDreamJourney';
import type { HomeResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart3, CalendarDays, CircleAlert, Flame, Target, Zap } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProgressBar from '../../components/ProgressBar';
import TodaysQuest from '../../components/TodaysQuest';
import { Colors, FontSizes } from '../../constants/Colors';

const getXpforLevel = (level: number) => {
  const rawXp = 1000 * Math.pow(1.2, level - 1);
  if (rawXp < 10000) {
    return Math.round(rawXp / 100) * 100;
  }

  return Math.round(rawXp / 1000) * 1000;
};

const avatarSources = {
  planner: require('../../assets/images/cardImagePlannergekko.png'),
  monk: require('../../assets/images/cardImageMonkgekko.png'),
  warrior: require('../../assets/images/cardImageWarriorgekko.png'),
} as const;

export default function TabIndex() {
  const { getToken, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const [homeData, setHomeData] = useState<HomeResponse | null>(null);
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    let isActive = true;

    const loadHome = async () => {
      if (!isSignedIn) {
        setHomeData(null);
        return;
      }

      try {
        const token = await getTokenRef.current();
        if (!token) {
          return;
        }
        const response = await apiRequest<HomeResponse>('/api/home', {}, token);
        if (isActive) {
          setHomeData(response);
        }
      } catch (error) {
        console.warn('Failed to load home data:', error);
      }
    };

    loadHome();

    return () => {
      isActive = false;
    };
  }, [isSignedIn]);

  const user = homeData?.user ?? null;
  const displayName =
    user?.name || clerkUser?.firstName || clerkUser?.username || 'FinGekko User';
  const stats = homeData?.stats ?? null;
  const resolvedAvatarKey = user?.avatarKey;
  const avatarKey = resolvedAvatarKey && resolvedAvatarKey in avatarSources ? resolvedAvatarKey : 'planner';
  const avatarSource = avatarSources[avatarKey as keyof typeof avatarSources];
  const level = user?.level ?? 1;
  const xp = user?.xp ?? 0;
  const points = user?.points ?? 0;
  const levelProgress = xp / getXpforLevel(level);
  const currentDate = new Date();
  const formattedDate = currentDate
    .toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    .replace(' ', ' ')
    .replace(/ (\d{4})$/, ', $1');

  const progressItems = useMemo(() => {
    if (!stats) {
      return undefined;
    }

    return [
      {
        icon: Flame,
        value: String(stats.dayStreak),
        label: 'Day Streak',
        color: '#16a34a',
      },
      {
        icon: Zap,
        value: String(stats.totalXp),
        label: 'Total XP',
        color: '#f59e0b',
      },
      {
        icon: Target,
        value: `${stats.questsDone} / ${stats.questsTarget}`,
        label: 'Quests Done',
        color: '#10b981',
      },
      {
        icon: BarChart3,
        value: `${stats.betterThanYesterday}%`,
        label: 'Better than\nyesterday',
        color: '#8b5cf6',
      },
    ];
  }, [stats]);

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.container}>
        <Navbar />
        <View style={styles.greetingRow}>
          <View style={styles.greetingText}>
            <Text style={styles.greetingEyebrow}>Good morning, {displayName}! 👋</Text>
            <Text style={styles.greetingTitle}>Small saves, big adventures.</Text>
            <Text style={styles.greetingSubtitle}>You've got this!</Text>
          </View>
          <View style={styles.datePill}>
            <CalendarDays size={12} strokeWidth={1.5} color="#4b5563" />
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
        </View>
        <LinearGradient
          colors={['#0b5f4b', '#073943']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gekkoCard}
        >
          <View style={styles.cardContent}>
            <View style={styles.avatarWrap}>
              <Image source={avatarSource} style={styles.avatarImage} />
            </View>

            <View style={styles.cardCenter}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle}>{user?.userGekko ?? 'Planner Gekko'}</Text>
                <CircleAlert size={16} strokeWidth={1.5} color="#bcd9df" />
              </View>

              <View style={styles.levelRow}>
                <Text style={styles.levelLabel}>
                  Level <Text style={styles.levelValue}>{level}</Text>
                </Text>
                <Text style={styles.levelMeta}>
                  {xp} / {getXpforLevel(level)} XP
                </Text>
              </View>

              <View style={styles.progressWrap}>
                <ProgressBar
                  progress={levelProgress}
                  height={6}
                  radius={999}
                  trackColor="rgba(255, 255, 255, 0.18)"
                />
              </View>

              <View style={styles.helperText}>
                <Text style={styles.helperLine}>"You're doing great!"</Text>
                <Text style={styles.helperLine}>"Keep going and level up. 💚"</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
        <TodaysQuest />
        <YourDreamJourney />
        <BageSection />
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  greetingText: {
    flex: 1,
    paddingRight: 12,
  },
  greetingEyebrow: {
    fontSize: FontSizes.sm,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 6,
  },
  greetingTitle: {
    fontSize: FontSizes.lg,
    color: '#111827',
    fontWeight: '800',
  },
  greetingSubtitle: {
    fontSize: FontSizes.md,
    color: '#22a05f',
    fontWeight: '700',
    marginTop: 2,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#ffffff',
  },
  dateText: {
    fontSize: FontSizes.xs,
    color: '#4b5563',
    fontWeight: '600',
  },
  gekkoCard: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#0a2a2f',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 64,
    height: 96,
  },
  cardCenter: {
    flex: 1,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    color: Colors.textLight,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelLabel: {
    color: Colors.textLight,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  levelValue: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
  },
  levelMeta: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  progressWrap: {
    marginTop: 4,
  },
  helperText: {
    marginTop: 4,
  },
  helperLine: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSizes.xs,
    fontWeight: '500',
  },
  pointsDivider: {
    alignSelf: 'stretch',
  },
  pointsColumn: {
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pointsBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4c85a',
    borderWidth: 1,
    borderColor: '#f0b842',
  },
  pointsBadgeText: {
    color: '#6b3d00',
    fontSize: 12,
    fontWeight: '800',
  },
  pointsValue: {
    color: Colors.textLight,
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  pointsLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
});
