import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

/**
 * A one-shot ribbon burst for the celebration screens.
 *
 * The previous version looped forever, which made a screen you're meant to read
 * feel permanently busy — and every piece fell straight down at the same speed,
 * so it read as "dots" rather than paper. These are proper ribbons: long, thin,
 * curling as they fall, tumbling on two axes at different rates, and they land
 * and stop. The burst runs once and settles.
 */

const COLORS = ['#66CC44', '#7BD957', '#F5B84D', '#5B9BD5', '#EC4899', '#8B5CF6', '#3E6E42'];
const PIECE_COUNT = 26;

/** Deterministic-ish jitter so a piece keeps its character across re-renders. */
type Piece = {
  key: number;
  /** Horizontal start, as a fraction of the screen width. */
  startX: number;
  /** How far it drifts sideways over the fall, in px. */
  drift: number;
  /** Length of the ribbon; width is derived from it. */
  length: number;
  color: string;
  delay: number;
  duration: number;
  /** Full turns about the flat axis — the curl. */
  spin: number;
  /** Full turns about the depth axis — the tumble that flashes edge-on. */
  tumble: number;
  /** Where in the lower screen it comes to rest, as a fraction of height. */
  settleAt: number;
  /** A slight lean so ribbons don't all sit at the same angle. */
  lean: number;
};

function Ribbon({ piece, width, height, animate }: { piece: Piece; width: number; height: number; animate: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!animate) return;
    // Ease-out: quick off the top, slowing as it settles — paper losing energy,
    // not a ball dropping. Runs once; no withRepeat.
    progress.value = withDelay(
      piece.delay,
      withTiming(1, { duration: piece.duration, easing: Easing.out(Easing.cubic) }),
    );
  }, [animate, piece.delay, piece.duration, progress]);

  const style = useAnimatedStyle(() => {
    // Reduce Motion: show the settled state immediately, no travel.
    const p = animate ? progress.value : 1;
    const fallTo = height * piece.settleAt;

    return {
      transform: [
        { translateY: interpolate(p, [0, 1], [-piece.length - 20, fallTo]) },
        // Sideways sway: out and partway back, so the path is a curve.
        { translateX: interpolate(p, [0, 0.45, 1], [0, piece.drift, piece.drift * 0.65]) },
        { rotate: `${interpolate(p, [0, 1], [0, piece.spin * 360 + piece.lean])}deg` },
        // Squeezing the width mimics the ribbon turning edge-on as it tumbles.
        { scaleX: Math.cos(interpolate(p, [0, 1], [0, piece.tumble * Math.PI * 2])) },
      ],
      // Fades in fast, holds, then dies just before it would touch the button row.
      opacity: interpolate(p, [0, 0.06, 0.75, 1], [0, 1, 1, 0]),
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left: piece.startX * width,
          width: Math.max(3, piece.length * 0.22),
          height: piece.length,
          backgroundColor: piece.color,
        },
        style,
      ]}
    />
  );
}

export default function Confetti() {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: PIECE_COUNT }, (_, i) => ({
        key: i,
        // Spread across the width with jitter, so there are no bald patches.
        startX: (i + 0.5) / PIECE_COUNT + (Math.random() - 0.5) * 0.06,
        drift: (Math.random() - 0.5) * 130,
        length: 14 + Math.random() * 16,
        color: COLORS[i % COLORS.length],
        delay: Math.random() * 520,
        duration: 1700 + Math.random() * 1300,
        spin: 0.75 + Math.random() * 2,
        tumble: 1 + Math.random() * 2.5,
        settleAt: 0.62 + Math.random() * 0.3,
        lean: (Math.random() - 0.5) * 50,
      })),
    // Seeded once: positions are fractions of the screen, so a rotation
    // re-lays them out without needing new random values.
    [],
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((piece) => (
        <Ribbon key={piece.key} piece={piece} width={width} height={height} animate={!reducedMotion} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    top: 0,
    borderRadius: 2,
  },
});
