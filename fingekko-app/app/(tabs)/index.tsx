import { LinearGradient } from 'expo-linear-gradient';
import { CalendarDays, ChevronRight, CircleAlert } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View ,Image} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Navbar from '../../components/Navbar';

export default function TabIndex() {
  const levelProgress = 650 / 1000;
  const savingProgress = 220 / 500;
  const savingRingSize = 86;
  const savingRingStroke = 8;
  const savingRingRadius = (savingRingSize - savingRingStroke) / 2;
  const savingRingCircumference = 2 * Math.PI * savingRingRadius;
  const savingRingOffset = savingRingCircumference * (1 - savingProgress);
  const goalProgress = 0.35;

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
          colors={['#0b5f4b', '#05313a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gekkoCard}
        >
          <View style={styles.gekkoCardInner}>
            <View style={styles.gekkoLeft}>
                <View style={styles.gekkoImageWrap}>
                    <Image
                    source={require('../../assets/images/cardImage.png')}
                        style={styles.gekkoImage}
                    />
                </View>
              <View style={styles.gekkoHeader}>
                <Text style={styles.gekkoTitle}>Planner Gekko</Text>
                <CircleAlert size={16} color="rgba(255,255,255,0.85)" />
              </View>
              <View style={styles.gekkoLevelRow}>
                <Text style={styles.gekkoLevel}>Level 7</Text>
                <Text style={styles.gekkoXpText}>650 / 1000 XP</Text>
              </View>
              <View style={styles.xpTrack}>
                <View style={[styles.xpFill, { width: `${levelProgress * 100}%` }]} />
              </View>
              <Text style={styles.gekkoHint}>
                Earn XP by saving, completing tasks and building smart habits!
              </Text>
            </View>

            <View style={styles.gekkoRight}>
              <View style={styles.pointsPill}>
                <View style={styles.pointsIcon}>
                  {/* Image: Gekko coin icon goes here */}
                </View>
                <View>
                  <Text style={styles.pointsValue}>1,240</Text>
                  <Text style={styles.pointsLabel}>Gekko Points</Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.infoRow}>
          <View style={styles.personalityCard}>
            <Text style={styles.cardHeaderText}>YOU ARE GOOD AT</Text>
            <View style={styles.personalityContent}>
              <View style={styles.personalityLeft}>
                <View style={styles.personalityIconWrap}>
                  {/* Image: Saving badge icon goes here */}
                </View>
                <View style={styles.personalityText}>
                  <Text style={styles.personalityTitle}>Saving</Text>
                  <Text style={styles.personalityLevel}>Level 2</Text>
                  <Text style={styles.personalityHint}>
                    Keep it up! You're building a strong financial future.
                  </Text>
                </View>
              </View>
              <View style={styles.ringWrap}>
                <Svg
                  width={savingRingSize}
                  height={savingRingSize}
                  viewBox={`0 0 ${savingRingSize} ${savingRingSize}`}
                >
                  <Circle
                    cx={savingRingSize / 2}
                    cy={savingRingSize / 2}
                    r={savingRingRadius}
                    stroke="#e5e7eb"
                    strokeWidth={savingRingStroke}
                    fill="none"
                  />
                  <Circle
                    cx={savingRingSize / 2}
                    cy={savingRingSize / 2}
                    r={savingRingRadius}
                    stroke="#20b46a"
                    strokeWidth={savingRingStroke}
                    fill="none"
                    strokeDasharray={[savingRingCircumference]}
                    strokeDashoffset={savingRingOffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${savingRingSize / 2} ${savingRingSize / 2})`}
                  />
                </Svg>
                <View style={styles.ringCenter}>
                  <Text style={styles.ringValue}>220 / 500 XP</Text>
                  <Text style={styles.ringLabel}>Next Level</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.badgesCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardHeaderText}>BADGES</Text>
              <View style={styles.viewAllRow}>
                <Text style={styles.viewAllText}>View all</Text>
                <ChevronRight size={14} color="#6b7280" />
              </View>
            </View>
            <View style={styles.badgesGrid}>
              <View style={styles.badgeItem}>
                <View style={styles.badgeIcon}>
                  {/* Image: Smart Saver badge goes here */}
                </View>
                <View style={styles.badgeText}>
                  <Text style={styles.badgeTitle}>Smart Saver</Text>
                  <Text style={styles.badgeSubtitle}>Level 1</Text>
                </View>
              </View>
              <View style={styles.badgeItem}>
                <View style={styles.badgeIcon}>
                  {/* Image: Goal Getter badge goes here */}
                </View>
                <View style={styles.badgeText}>
                  <Text style={styles.badgeTitle}>Goal Getter</Text>
                  <Text style={styles.badgeSubtitle}>Level 1</Text>
                </View>
              </View>
              <View style={styles.badgeItem}>
                <View style={styles.badgeIcon}>
                  {/* Image: Consistent badge goes here */}
                </View>
                <View style={styles.badgeText}>
                  <Text style={styles.badgeTitle}>Consistent</Text>
                  <Text style={styles.badgeSubtitle}>Level 1</Text>
                </View>
              </View>
              <View style={styles.badgeItem}>
                <View style={styles.badgeIcon}>
                  {/* Image: Discipline Pro badge goes here */}
                </View>
                <View style={styles.badgeText}>
                  <Text style={styles.badgeTitle}>Discipline Pro</Text>
                  <Text style={styles.badgeSubtitle}>Complete 5 more tasks to unlock</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.questsHeader}>
          <View>
            <Text style={styles.sectionTitle}>TODAY'S QUESTS</Text>
            <Text style={styles.sectionSubtitle}>1 / 3 completed</Text>
          </View>
          <View style={styles.viewAllRow}>
            <Text style={styles.viewAllText}>View all</Text>
            <ChevronRight size={14} color="#6b7280" />
          </View>
        </View>

        <View style={styles.questsRow}>
          <View style={styles.questsList}>
            <View style={styles.questItem}>
              <View style={[styles.questIcon, styles.questIconGreen]}>
                {/* Image: Quest icon for Save ₹500 today goes here */}
              </View>
              <View style={styles.questText}>
                <Text style={styles.questTitle}>Save ₹500 today</Text>
                <Text style={styles.questMeta}>3 / 6 days</Text>
              </View>
              <View style={styles.questReward}>
                <Text style={styles.questRewardText}>+30 XP</Text>
              </View>
            </View>

            <View style={styles.questItem}>
              <View style={[styles.questIcon, styles.questIconOrange]}>
                {/* Image: Quest icon for Avoid food delivery goes here */}
              </View>
              <View style={styles.questText}>
                <Text style={styles.questTitle}>Avoid food delivery</Text>
                <Text style={styles.questMeta}>1 / 1 completed</Text>
              </View>
              <View style={styles.questReward}>
                <Text style={styles.questRewardText}>+20 XP</Text>
              </View>
            </View>

            <View style={styles.questItem}>
              <View style={[styles.questIcon, styles.questIconBlue]}>
                {/* Image: Quest icon for Track all expenses goes here */}
              </View>
              <View style={styles.questText}>
                <Text style={styles.questTitle}>Track all expenses</Text>
                <Text style={styles.questMeta}>2 / 5 days</Text>
              </View>
              <View style={styles.questReward}>
                <Text style={styles.questRewardText}>+15 XP</Text>
              </View>
            </View>
          </View>

          <View style={styles.questRewardCard}>
            <View style={styles.questRewardImage}>
              {/* Image: Complete all quests illustration goes here */}
            </View>
            <Text style={styles.questRewardTitle}>Complete all quests</Text>
            <Text style={styles.questRewardSubtitle}>to earn</Text>
            <View style={styles.questRewardBadge}>
              <Text style={styles.questRewardBadgeText}>+75 XP</Text>
            </View>
          </View>
        </View>

        <View style={styles.journeyCard}>
          <View style={styles.journeyText}>
            <Text style={styles.sectionTitle}>YOUR DREAM JOURNEY</Text>
            <Text style={styles.journeyTitle}>Goa Trip ✈</Text>
            <View style={styles.journeyAmountRow}>
              <Text style={styles.journeyAmount}>₹1,24,450</Text>
              <Text style={styles.journeyTotal}> / ₹3,50,000</Text>
            </View>
            <View style={styles.journeyProgressRow}>
              <View style={styles.journeyTrack}>
                <View style={[styles.journeyFill, { width: `${goalProgress * 100}%` }]} />
              </View>
              <Text style={styles.journeyPercent}>35%</Text>
            </View>
            <View style={styles.journeyHintRow}>
              <View style={styles.hintDot} />
              <Text style={styles.journeyHint}>
                Save ₹1,200 more this month to stay on track!
              </Text>
            </View>
          </View>
          <View style={styles.journeyImage}>
            {/* Image: Goa trip cover image goes here */}
          </View>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.motivationCard}>
            <View style={styles.motivationIcon}>
              {/* Image: Mini Gekko avatar goes here */}
            </View>
            <Text style={styles.motivationText}>
              Every small step you take today gets you closer to your big moment!
            </Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                {/* Image: Day streak icon goes here */}
              </View>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                {/* Image: XP icon goes here */}
              </View>
              <Text style={styles.statValue}>320</Text>
              <Text style={styles.statLabel}>Total XP</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                {/* Image: Trophy icon goes here */}
              </View>
              <Text style={styles.statValue}>Top 12%</Text>
              <Text style={styles.statLabel}>Among Gekkos</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    gekkoImage: {
        width: 110,
        height: 96,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
  },
  page: {
    flex: 1,
    backgroundColor: '#f4f6f5',
  },
  container: {
    paddingHorizontal: 12,
    paddingBottom: 32,
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
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 6,
  },
  greetingTitle: {
    fontSize: 20,
    color: '#111827',
    fontWeight: '800',
  },
  greetingSubtitle: {
    fontSize: 16,
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
    fontSize: 11,
    color: '#4b5563',
    fontWeight: '600',
  },
  gekkoCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  gekkoCardInner: {
    flexDirection: 'row',
    gap: 12,
  },
  gekkoLeft: {
    flex: 1.3,
  },
  gekkoRight: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  gekkoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  gekkoTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  gekkoLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gekkoLevel: {
    color: '#d1fae5',
    fontWeight: '700',
    fontSize: 13,
  },
  gekkoXpText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '600',
  },
  xpTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#9ad84d',
  },
  gekkoHint: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    lineHeight: 16,
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 12,
  },
  pointsIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  pointsValue: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  pointsLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: '600',
  },
  gekkoImageWrap: {
    width: 96,
    height: 110,
    borderRadius: 16,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor:'transparent',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  personalityCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  badgesCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardHeaderText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6b7280',
    letterSpacing: 0.6,
  },
  viewAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
  },
  personalityContent: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 10,
  },
  personalityLeft: {
    flexDirection: 'row',
    gap: 10,
  },
  personalityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#d1fae5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  personalityText: {
    flex: 1,
  },
  personalityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  personalityLevel: {
    fontSize: 11,
    color: '#22a05f',
    fontWeight: '700',
    marginTop: 2,
  },
  personalityHint: {
    fontSize: 11,
    color: '#6b7280',
    lineHeight: 16,
    marginTop: 6,
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
  },
  ringValue: {
    fontSize: 10,
    fontWeight: '700',
    color: '#111827',
  },
  ringLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
  badgesGrid: {
    flex: 1,
    gap: 10,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badgeIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  badgeText: {
    flex: 1,
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  badgeSubtitle: {
    fontSize: 10,
    color: '#6b7280',
  },
  questsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6b7280',
    letterSpacing: 0.6,
  },
  sectionSubtitle: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 4,
    fontWeight: '600',
  },
  questsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  questsList: {
    flex: 1.4,
    gap: 10,
  },
  questItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 10,
  },
  questIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questIconGreen: {
    backgroundColor: '#dcfce7',
  },
  questIconOrange: {
    backgroundColor: '#ffedd5',
  },
  questIconBlue: {
    backgroundColor: '#dbeafe',
  },
  questText: {
    flex: 1,
  },
  questTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  questMeta: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  questReward: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  questRewardText: {
    fontSize: 11,
    color: '#16a34a',
    fontWeight: '700',
  },
  questRewardCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  questRewardImage: {
    width: '100%',
    height: 90,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    marginBottom: 10,
  },

  questRewardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  questRewardSubtitle: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  questRewardBadge: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#fde68a',
  },
  questRewardBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#b45309',
  },
  journeyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
    marginBottom: 14,
  },
  journeyText: {
    flex: 1.2,
  },
  journeyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginTop: 4,
  },
  journeyAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  journeyAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  journeyTotal: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },
  journeyProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  journeyTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  journeyFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#22a05f',
  },
  journeyPercent: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
  },
  journeyHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  hintDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fbbf24',
  },
  journeyHint: {
    flex: 1,
    fontSize: 10,
    color: '#6b7280',
    lineHeight: 14,
  },
  journeyImage: {
    flex: 1,
    height: 110,
    borderRadius: 16,
    backgroundColor: '#fde68a',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },

  motivationCard: {
    flex: 1.2,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  motivationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#d1fae5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  motivationText: {
    flex: 1,
    fontSize: 11,
    color: '#374151',
    lineHeight: 16,
    fontWeight: '600',
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  statIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  statLabel: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
});
