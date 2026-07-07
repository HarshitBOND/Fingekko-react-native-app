import React from 'react';
import { GestureResponderEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { palette, radius as R, shadows } from '@/constants/design';
import PressableScale from './PressableScale';

export type CardVariant =
  | 'elevated' // white surface + soft shadow (default)
  | 'flat' // white surface + hairline border, minimal shadow
  | 'tinted' // soft green tint
  | 'ghost' // transparent
  | 'dark' // deep green surface
  // legacy aliases kept for drop-in compatibility
  | 'tactile'
  | 'pressable';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: CardVariant;
  padding?: number;
  radius?: number;
  /** entrance fade — set false to disable */
  animateIn?: boolean;
  /** legacy prop, ignored (kept so old call-sites don't break) */
  shadowHeight?: number;
}

const surfaceForVariant = (variant: CardVariant): ViewStyle => {
  switch (variant) {
    case 'flat':
      return { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, ...shadows.xs };
    case 'tinted':
      return { backgroundColor: palette.primaryLight };
    case 'ghost':
      return { backgroundColor: 'transparent' };
    case 'dark':
      return { backgroundColor: palette.primaryDeep, ...shadows.md };
    case 'elevated':
    case 'tactile':
    case 'pressable':
    default:
      return { backgroundColor: palette.card, ...shadows.md };
  }
};

export default function Card({
  children,
  style,
  onPress,
  variant = 'elevated',
  padding = 20,
  radius = R.xl,
  animateIn = false,
}: CardProps) {
  const surface = surfaceForVariant(variant);
  const base: ViewStyle = { borderRadius: radius, padding, ...surface };
  const isPressable = variant === 'pressable' || !!onPress;

  if (isPressable) {
    return (
      <PressableScale onPress={onPress} style={[base, style]}>
        {children}
      </PressableScale>
    );
  }

  if (animateIn) {
    return (
      <Animated.View entering={FadeIn.duration(300)} style={[base, style]}>
        {children}
      </Animated.View>
    );
  }

  return <View style={[base, style]}>{children}</View>;
}

export const cardStyles = StyleSheet.create({});
