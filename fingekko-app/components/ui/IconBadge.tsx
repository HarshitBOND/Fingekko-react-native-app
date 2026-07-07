import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { palette, radius as R } from '@/constants/design';
import Icon from './Icon';

interface IconBadgeProps {
  name: string;
  /** container size */
  size?: number;
  iconSize?: number;
  /** background fill (defaults to a soft green tint) */
  background?: string;
  /** icon color (defaults to deep green) */
  color?: string;
  circle?: boolean;
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Rounded, tinted container holding an icon — the standard way to present an icon in the UI. */
export default function IconBadge({
  name,
  size = 44,
  iconSize,
  background = palette.primaryLight,
  color = palette.primaryDeep,
  circle = false,
  animated = false,
  style,
}: IconBadgeProps) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: circle ? size / 2 : R.md,
          backgroundColor: background,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Icon name={name} size={iconSize ?? Math.round(size * 0.5)} color={color} clickable={animated} autoplay={animated} />
    </View>
  );
}
