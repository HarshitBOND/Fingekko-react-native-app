import React, { useEffect } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { motion, palette } from '@/constants/design';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

let gradientCounter = 0;

interface ProgressRingProps {
  /** 0..1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  /** two-stop gradient for the progress arc (overrides color) */
  gradient?: readonly [string, string];
  duration?: number;
  rounded?: boolean;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function ProgressRing({
  progress,
  size = 76,
  strokeWidth = 8,
  color = palette.primary,
  trackColor = palette.track,
  gradient,
  duration = motion.slower,
  rounded = true,
  children,
  style,
}: ProgressRingProps) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  const anim = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const gradientId = React.useMemo(() => `pr-grad-${gradientCounter++}`, []);

  useEffect(() => {
    // Reduce Motion: jump the arc to its final value with no sweep.
    anim.value = reducedMotion
      ? clamped
      : withTiming(clamped, { duration, easing: Easing.bezier(0.22, 1, 0.36, 1) });
  }, [clamped, duration, reducedMotion]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - anim.value),
  }));

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {gradient ? (
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={gradient[0]} />
              <Stop offset="1" stopColor={gradient[1]} />
            </LinearGradient>
          </Defs>
        ) : null}
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={gradient ? `url(#${gradientId})` : color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap={rounded ? 'round' : 'butt'}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children ? <View style={styles.center}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
