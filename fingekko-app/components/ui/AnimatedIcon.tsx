import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface AnimatedIconProps {
  name: IoniconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
  mode?: 'bounce' | 'pulse' | 'wiggle';
}

export default function AnimatedIcon({
  name,
  size = 24,
  color = '#4F46E5',
  style,
  mode = 'bounce',
}: AnimatedIconProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: mode === 'wiggle' ? 220 : 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: mode === 'wiggle' ? 220 : 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [progress, mode]);

  const transform =
    mode === 'pulse'
      ? [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }]
      : mode === 'wiggle'
      ? [{ rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '8deg'] }) }]
      : [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
          { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
        ];

  return (
    <Animated.View style={[{ transform }, style]}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
}
