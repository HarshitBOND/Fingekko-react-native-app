import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AppText from '@/components/ui/AppText';
import Button from '@/components/ui/Button';
import HeroCard from '@/components/ui/HeroCard';
import Icon from '@/components/ui/Icon';
import LoadingScreen from '@/components/ui/LoadingScreen';
import ProgressBar from '@/components/ProgressBar';
import ScreenContainer from '@/components/ui/ScreenContainer';
import PersonalityCard from '@/components/index/PlannerCard';
import { PERSONALITIES } from '@/constants/personality';
import { gradients, layout, palette, radius, shadows, spacing } from '@/constants/design';
import { formatCurrencyCopy } from '@/utils/currency';
import { usePersonality } from '@/hooks/usePersonality';
import { GATES } from '@/utils/personality/engine';

/**
 * "Your Personality" — the money-personality read, classified from real
 * behaviour by the personality engine rather than hardcoded.
 *
 * Three states: still gathering data (with a progress meter and a clear ask),
 * or a classified type with the evidence that produced it.
 */

function Header() {
  return (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerBtn} accessibilityLabel="Go back">
        <Icon name="ChevronLeft" size={22} color={palette.textPrimary} clickable={false} />
      </Pressable>
      <AppText variant="title" weight="bold">
        Your Personality
      </AppText>
      <View style={{ width: 40 }} />
    </View>
  );
}

/** Shown until the engine has enough history to say anything honest. */
function GatheringState({
  reason,
  progress,
  daysTracked,
  transactionsLogged,
}: {
  reason: 'not_enough_time' | 'not_enough_transactions';
  progress: number;
  daysTracked: number;
  transactionsLogged: number;
}) {
  const needsTime = reason === 'not_enough_time';
  const current = needsTime ? daysTracked : transactionsLogged;
  const target = needsTime ? GATES.minDays : GATES.minTransactions;

  return (
    <ScreenContainer contentStyle={{ gap: spacing.lg }} header={<Header />}>
      <Animated.View entering={FadeInDown.duration(400)}>
        <HeroCard colors={gradients.hero} padding={22}>
          <View style={styles.gatherIcon}>
            <Icon name="Sparkles" size={26} color={palette.white} clickable={false} />
          </View>
          <AppText variant="h2" color="onDark" style={{ marginTop: spacing.md }}>
            Still reading you
          </AppText>
          <AppText variant="caption" color="onDarkMuted" style={{ marginTop: spacing.xs, lineHeight: 19 }}>
            {needsTime
              ? "We need about a week of history before a pattern means anything. Guessing early would just be flattery."
              : "A few more entries and the picture sharpens. Right now there isn't enough to tell a habit from a coincidence."}
          </AppText>

          <View style={styles.gatherProgress}>
            <ProgressBar
              progress={progress}
              height={8}
              radius={radius.pill}
              trackColor="rgba(255,255,255,0.22)"
              colors={['#EAF8E5', '#A7E58C']}
            />
            <AppText variant="micro" numeric color="onDarkMuted" style={{ marginTop: spacing.sm }}>
              {current} of {target} {needsTime ? 'days' : 'entries'}
            </AppText>
          </View>
        </HeroCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(90)} style={styles.card}>
        <AppText variant="label" color="textSecondary">
          What we look at
        </AppText>
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          {[
            { icon: 'Zap', label: 'How often you spend, and how big each one is' },
            { icon: 'Flame', label: 'Whether your days are steady or spiky' },
            { icon: 'Users', label: 'How much of it involves other people' },
            { icon: 'Target', label: 'Whether your goals actually move' },
          ].map((row) => (
            <View key={row.label} style={styles.traitRow}>
              <View style={styles.traitIcon}>
                <Icon name={row.icon} size={16} color={palette.primaryDeep} clickable={false} />
              </View>
              <AppText variant="caption" color="textSecondary" style={{ flex: 1 }}>
                {row.label}
              </AppText>
            </View>
          ))}
        </View>
      </Animated.View>

      <Button variant="primary" size="md" onPress={() => router.push('/(tabs)/add')}>
        Add an expense
      </Button>
    </ScreenContainer>
  );
}

export default function PersonalityScreen() {
  const { result, loading } = usePersonality();

  if (loading || !result) return <LoadingScreen label="Reading your money habits..." />;

  if (result.status === 'insufficient_data') {
    return (
      <GatheringState
        reason={result.reason}
        progress={result.progress}
        daysTracked={result.daysTracked}
        transactionsLogged={result.transactionsLogged}
      />
    );
  }

  const meta = PERSONALITIES[result.type];

  return (
    <ScreenContainer contentStyle={{ gap: spacing.lg }} header={<Header />}>
      {/* The verdict — character art, type, and the evidence behind it */}
      <Animated.View entering={FadeInDown.duration(400)}>
        <PersonalityCard
          type={result.type}
          secondaryType={result.secondaryType}
          confidence={result.confidence}
          drivers={result.drivers}
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(80)} style={styles.card}>
        <AppText variant="micro" color="textTertiary">
          Based on {result.params.totalTransactions} entries across {result.params.totalDays} days.
        </AppText>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(140)} style={styles.card}>
        <AppText variant="bodySm" color="textSecondary" style={{ lineHeight: 21 }}>
          {formatCurrencyCopy(meta.description)}
        </AppText>
      </Animated.View>

      {/* Strengths — every type gets real ones, including Ostrich */}
      <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.card}>
        <AppText variant="label" color="textSecondary">
          You&apos;re good at
        </AppText>
        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          {meta.strengths.map((item) => (
            <View key={item} style={styles.traitRow}>
              <View style={styles.traitIcon}>
                <Icon name="Check" size={15} color={palette.primaryDeep} clickable={false} />
              </View>
              <AppText variant="caption" color="textSecondary" style={{ flex: 1 }}>
                {formatCurrencyCopy(item)}
              </AppText>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(260)} style={styles.card}>
        <AppText variant="label" color="textSecondary">
          Keep an eye on
        </AppText>
        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          {meta.watchOuts.map((item) => (
            <View key={item} style={styles.watchRow}>
              <Icon name="CircleAlert" size={15} color={palette.warning} clickable={false} />
              <AppText variant="caption" color="textSecondary" style={{ flex: 1 }}>
                {formatCurrencyCopy(item)}
              </AppText>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* One concrete thing to do next */}
      <Animated.View entering={FadeInDown.duration(400).delay(320)} style={[styles.card, styles.nudgeCard]}>
        <View style={styles.nudgeHead}>
          <Icon name="Sparkles" size={16} color={palette.primaryDeep} clickable={false} />
          <AppText variant="label" color="primaryDeep">
            Try this
          </AppText>
        </View>
        <AppText variant="bodySm" style={{ marginTop: spacing.sm, lineHeight: 21 }}>
          {formatCurrencyCopy(meta.nudge)}
        </AppText>
      </Animated.View>

      <Button variant="primary" size="md" onPress={() => router.push('/(tabs)/insights')}>
        View Full Insights
      </Button>

      <AppText variant="micro" color="textTertiary" align="center" style={{ marginBottom: spacing.sm }}>
        Your type updates as your habits change.
      </AppText>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingVertical: spacing.sm,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: { letterSpacing: 1, marginTop: spacing.lg },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroBadge: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  hybridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.sm,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  confChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryLight,
  },
  driverRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  driverDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: palette.primary,
    marginTop: 8,
  },
  traitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  traitIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.warningLight,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  nudgeCard: { backgroundColor: palette.primaryLight },
  nudgeHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  gatherIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gatherProgress: { marginTop: spacing.xl },
});
