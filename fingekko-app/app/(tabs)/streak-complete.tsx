import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import Confetti from '@/components/streak/Confetti';
import { useStreakData } from '@/components/streak/useStreakData';
import { longDateLabel } from '@/components/streak/utils';
import AppText from '@/components/ui/AppText';
import Icon from '@/components/ui/Icon';
import PressableScale from '@/components/ui/PressableScale';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { layout, palette, radius, shadows, spacing } from '@/constants/design';

const YAY = require('@/assets/images/yay.webp');

/** yay.svg's intrinsic size — used to cover the screen without distorting it. */
const YAY_RATIO = 720 / 1459;

export default function StreakCompleteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string }>();
  const { streak, best, weekDots, firstName } = useStreakData();
  const { width, height } = useWindowDimensions();

  const name = params.name || firstName;
  const count = Math.max(streak, 1);

  // Cover, not contain: scale to whichever axis needs the most, so the
  // illustration always bleeds off-screen instead of leaving bands.
  const bgWidth = Math.max(width, height * YAY_RATIO);
  const bgHeight = bgWidth / YAY_RATIO;

  return (
    <ScreenContainer
      scroll={false}
      padForNav={false}
      contentStyle={styles.content}
      backgroundColor={YAY_BG}
    >
      {/* yay.svg fills the screen; a soft wash over it keeps the copy legible. */}
      <View pointerEvents="none" style={styles.bg}>
        <Image source={YAY} style={{ width: bgWidth, height: bgHeight }} contentFit="cover" />
        <View style={styles.bgScrim} />
      </View>

      <Confetti />

      <View style={styles.center}>
        <Animated.View entering={FadeInDown.duration(400)}>
          <AppText variant="caption" color="textSecondary" align="center">
            {longDateLabel(new Date())}
          </AppText>
          <AppText variant="h1" align="center" style={styles.headline}>
            {name ? `Well done, ${name}!` : 'Well done!'}
          </AppText>
          <AppText variant="body" color="textSecondary" align="center">
            You&apos;ve kept today&apos;s streak alive. 🔥
          </AppText>
        </Animated.View>

        <Animated.View entering={ZoomIn.duration(460).delay(120)} style={styles.ring}>
          <AppText variant="display" numeric color="primaryDeep" style={styles.ringNumber}>
            {count}
          </AppText>
          <AppText variant="title" color="textSecondary">
            day streak
          </AppText>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(220)} style={styles.weekRow}>
          {weekDots.map((dot, i) => (
            <View key={i} style={styles.weekCol}>
              <View
                style={[
                  styles.weekDot,
                  dot.checked && styles.weekDotDone,
                  dot.isToday && styles.weekDotToday,
                ]}
              >
                {dot.checked ? <Icon name="Check" size={14} color={palette.white} clickable={false} /> : null}
              </View>
              <AppText
                variant="micro"
                style={{ color: dot.isToday ? palette.primaryDeep : palette.textTertiary }}
              >
                {dot.label}
              </AppText>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.bestChip}>
          <Icon name="Flame" size={14} color={palette.warning} clickable={false} />
          <AppText variant="caption" color="textSecondary">
            Best streak:{' '}
            <AppText variant="caption" numeric weight="bold" color="textPrimary">
              {Math.max(best, count)}
            </AppText>{' '}
            days
          </AppText>
        </Animated.View>
      </View>

      <PressableScale style={styles.doneBtn} onPress={() => router.replace('/(tabs)')}>
        <AppText variant="bodySm" weight="bold" color="onDark">
          Done
        </AppText>
        <Icon name="Check" size={18} color={palette.white} clickable={false} />
      </PressableScale>
    </ScreenContainer>
  );
}

/** The illustration's own paper colour — the screen behind it matches so the
 *  bleed is invisible on any aspect ratio. */
const YAY_BG = '#F4F0E9';

const styles = StyleSheet.create({
  bg: {
    // Yoga positions absolute children against the *padding* edge, so the
    // container's own gutter is cancelled out here to get a true full bleed.
    position: 'absolute',
    top: 0,
    left: -layout.gutter,
    right: -layout.gutter,
    bottom: -spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bgScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(244, 240, 233, 0.62)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: spacing.xl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  headline: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  ring: {
    width: 200,
    height: 200,
    borderRadius: radius.pill,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: palette.primaryLight,
    ...shadows.lg,
  },
  ringNumber: {
    fontSize: 72,
    lineHeight: 78,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  weekCol: {
    alignItems: 'center',
    gap: 6,
  },
  weekDot: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.card,
    borderWidth: 1.5,
    borderColor: palette.border,
  },
  weekDotDone: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  weekDotToday: {
    borderColor: palette.primaryDeep,
    borderWidth: 2,
  },
  bestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.card,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.xs,
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 54,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryDeep,
    ...shadows.primary,
  },
});
