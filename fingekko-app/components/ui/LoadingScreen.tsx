import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { fontFamily, palette, spacing } from '@/constants/design';
import AppText from './AppText';

type LoadingScreenProps = {
  label?: string;
  /** Render inline (transparent bg) instead of a full opaque screen. */
  inline?: boolean;
};

export default function LoadingScreen({ label = 'Loading…', inline = false }: LoadingScreenProps) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rotate = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    rotate.start();
    breathe.start();
    return () => {
      rotate.stop();
      breathe.stop();
    };
  }, [spin, pulse]);

  const rotateDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] });

  return (
    <View style={[styles.wrap, inline ? styles.inline : styles.fill]}>
      <Animated.Image
        source={require('@/assets/images/mainlogoNobg.png')}
        style={[styles.logo, { transform: [{ rotate: rotateDeg }, { scale }] }]}
        resizeMode="contain"
      />
      {!!label && (
        <AppText variant="caption" color="textSecondary" style={styles.label}>
          {label}
        </AppText>
      )}
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
  logo: {
    width: 76,
    height: 76,
  },
  label: {
    fontFamily: fontFamily.semibold,
  },
});
