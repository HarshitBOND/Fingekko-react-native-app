import Navbar from '@/components/Navbar';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarDays, CircleAlert } from 'lucide-react-native';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Divider from '../../components/Divider';
import ProgressBar from '../../components/ProgressBar';
import TodaysProgress from '../../components/TodaysProgress';
import TodaysQuest from '../../components/TodaysQuest';
import { Colors, FontSizes } from '../../constants/Colors';
import YourDreamJourney from '@/components/yourDreamJourney';

const levelData = {
  title: 'Planner Gekko',
  level: 7,
  xp: 650,
  xpMax: 1000,
  points: '1,240',
  helperLineOne: "You're doing great!",
  helperLineTwo: 'Keep going and level up. 💚',
};

export default function TabIndex() {
  const levelProgress = levelData.xp / levelData.xpMax;

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView contentContainerStyle={styles.container}>
        <Navbar />
        <View style={styles.greetingRow}>
          <View style={styles.greetingText}>
            <Text style={styles.greetingEyebrow}>Good morning, Arjun! 👋</Text>
            <Text style={styles.greetingTitle}>Small saves, big adventures.</Text>
            <Text style={styles.greetingSubtitle}>You've got this!</Text>
          </View>
          <View style={styles.datePill}>
            <CalendarDays size={12} strokeWidth={1.5} color="#4b5563" />
            <Text style={styles.dateText}>19 May, 2024</Text>
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
              <Image
                source={require('../../assets/images/cardImage.png')}
                style={styles.avatarImage}
              />
            </View>

            <View style={styles.cardCenter}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle}>{levelData.title}</Text>
                <CircleAlert size={16} strokeWidth={1.5} color="#bcd9df" />
              </View>

              <View style={styles.levelRow}>
                <Text style={styles.levelLabel}>
                  Level <Text style={styles.levelValue}>{levelData.level}</Text>
                </Text>
                <Text style={styles.levelMeta}>
                  {levelData.xp} / {levelData.xpMax} XP
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
                <Text style={styles.helperLine}>{levelData.helperLineOne}</Text>
                <Text style={styles.helperLine}>{levelData.helperLineTwo}</Text>
              </View>
            </View>

            <Divider
              orientation="vertical"
              thickness={1}
              color="rgba(255, 255, 255, 0.18)"
              inset={10}
              length="100%"
              style={styles.pointsDivider}
            />

            <View style={styles.pointsColumn}>
              <View style={styles.pointsRow}>
                <View style={styles.pointsBadge}>
                  <Text style={styles.pointsBadgeText}>G</Text>
                </View>
                <Text style={styles.pointsValue}>{levelData.points}</Text>
              </View>
              <Text style={styles.pointsLabel}>Gekko Points</Text>
            </View>
          </View>
        </LinearGradient>
        <TodaysProgress />
        <TodaysQuest />
        <YourDreamJourney />
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
