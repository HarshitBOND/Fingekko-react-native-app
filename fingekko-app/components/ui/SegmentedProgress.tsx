import React, { useEffect } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients, motion, palette, radius } from '@/constants/design';

interface SegmentedProgressProps {
  /** 0..1 */
  progress: number;
  height?: number;
  color?: string;
  trackColor?: string;
  gradient?: readonly [string, string, ...string[]];
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

/** A smooth, rounded progress bar with an animated fill. */
export default function SegmentedProgress({
  progress,
  height = 10,
  color = palette.primary,
  trackColor = palette.track,
  gradient = gradients.brand,
  duration = motion.slow,
  style,
}: SegmentedProgressProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const w = useSharedValue(0);

  useEffect(() => {
    w.value = withTiming(clamped, { duration, easing: Easing.bezier(0.22, 1, 0.36, 1) });
  }, [clamped, duration]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));

  return (
    <View style={[styles.track, { height, backgroundColor: trackColor, borderRadius: height / 2 }, style]}>
      <Animated.View style={[styles.fill, { borderRadius: height / 2 }, fillStyle]}>
        {gradient ? (
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { borderRadius: height / 2 }]}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: color, borderRadius: height / 2 }]} />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden', borderRadius: radius.pill },
  fill: { height: '100%', overflow: 'hidden' },
});
