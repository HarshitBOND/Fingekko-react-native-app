import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { fontFamily, palette, radius, spacing } from '@/constants/design';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import AppText from './AppText';

type LoadingScreenProps = {
  label?: string;
  /** Render inline (transparent bg) instead of a full opaque screen. */
  inline?: boolean;
};

/**
 * The cast that cycles while we wait. Starts with the journalling gecko, then
 * the personality characters — the same faces the user meets elsewhere, so a
 * wait doubles as an introduction rather than dead time.
 */
const CAST = [
  require('@/assets/images/calendarAvatar.webp'),
  require('@/assets/images/personality-strategist.webp'),
  require('@/assets/images/personality-comfort-spender.webp'),
  require('@/assets/images/personality-social-butterfly.webp'),
  require('@/assets/images/personality-impulse-comet.webp'),
  require('@/assets/images/personality-binge-beast.webp'),
  require('@/assets/images/personality-ostrich.webp'),
];

/**
 * Rotating copy. Each line says something *true* about how the app works, so a
 * wait teaches instead of stalling — and because the text keeps changing, the
 * screen never reads as frozen.
 */
const TIPS = [
  'Logging one expense a day is the whole habit.',
  'Your streak survives a late entry — but not a missed day.',
  'Small, frequent spends add up faster than they feel like they do.',
  'Splits you never settle quietly become gifts.',
  'Setting your payday makes “money left” actually mean something.',
  'Your money personality updates as your habits change.',
  'Every quest cleared today makes tomorrow’s board a little harder.',
  'The category you stop noticing is usually the expensive one.',
];

/**
 * The character is the whole point of this screen, so it gets real size — at
 * ~96px the art read as a smudge and the wait just looked broken. Capped
 * against the viewport so it still fits inline on a short screen.
 */
const AVATAR = Math.min(200, Math.round(Dimensions.get('window').width * 0.52));
/** Long enough to read a line, short enough to feel alive. */
const STEP_MS = 2200;

export default function LoadingScreen({ label, inline = false }: LoadingScreenProps) {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  // Start on a random tip so a second load doesn't replay the same line.
  const tipOffset = useMemo(() => Math.floor(Math.random() * TIPS.length), []);

  const fade = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  // Advance the cast + tip together. Reduce Motion still rotates them — it just
  // drops the cross-fade below — so the screen keeps teaching and never looks
  // frozen on a single face. A slightly slower step gives more time to read.
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => i + 1), reducedMotion ? STEP_MS + 800 : STEP_MS);
    return () => clearInterval(id);
  }, [reducedMotion]);

  // Cross-fade and a small rise on each change — native-driven, so it keeps
  // animating smoothly even while JS is busy doing the work we're waiting for.
  // Under Reduce Motion we snap straight to the resting frame: the character
  // and tip still swap, just without the movement.
  useEffect(() => {
    if (reducedMotion) {
      fade.setValue(1);
      drift.setValue(1);
      return;
    }
    fade.setValue(0);
    drift.setValue(0);
    const anim = Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(drift, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [index, fade, drift, reducedMotion]);

  const avatar = CAST[index % CAST.length];
  const tip = TIPS[(index + tipOffset) % TIPS.length];

  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  const scale = fade.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });

  return (
    <View style={[styles.wrap, inline ? styles.inline : styles.fill]}>
      <View style={styles.stage}>
        <Animated.View style={{ opacity: fade, transform: [{ translateY }, { scale }] }}>
          <Image
            source={avatar}
            style={styles.avatar}
            contentFit="contain"
            // Bundled assets — nothing to fetch, so no cross-fade from a
            // placeholder; the wrapper handles the transition.
            transition={0}
          />
        </Animated.View>
      </View>

      {/* Progress dots double as a "this is still moving" signal. */}
      <View style={styles.dots}>
        {CAST.map((_, i) => (
          <View key={i} style={[styles.dot, i === index % CAST.length && styles.dotActive]} />
        ))}
      </View>

      {!!label && (
        <AppText variant="caption" color="textSecondary" style={styles.label}>
          {label}
        </AppText>
      )}

      <Animated.View style={[styles.tipWrap, { opacity: fade }]}>
        <AppText variant="caption" color="textTertiary" align="center" style={styles.tip}>
          {tip}
        </AppText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  fill: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  inline: {
    paddingVertical: spacing.xl,
    backgroundColor: 'transparent',
  },
  // Fixed box, so swapping characters of different aspect ratios doesn't make
  // the copy below jump around.
  stage: {
    width: AVATAR,
    height: AVATAR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: {
    width: 5,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: palette.border,
  },
  dotActive: {
    backgroundColor: palette.primary,
    width: 16,
  },
  label: {
    fontFamily: fontFamily.semibold,
  },
  tipWrap: {
    maxWidth: 280,
    minHeight: 36,
    justifyContent: 'center',
  },
  tip: { lineHeight: 18 },
});
