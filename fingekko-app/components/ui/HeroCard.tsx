import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { gradients, radius as R, shadows } from '@/constants/design';

interface HeroCardProps {
  children: React.ReactNode;
  colors?: readonly [string, string, ...string[]];
  padding?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  /** subtle decorative circles in the corners */
  decorate?: boolean;
}

/** A gradient "hero" surface — the signature premium container used for balance / feature cards. */
export default function HeroCard({
  children,
  colors = gradients.hero,
  padding = 22,
  radius = R.xxl,
  style,
  decorate = true,
}: HeroCardProps) {
  return (
    <View style={[styles.shell, { borderRadius: radius }, shadows.lg, style]}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {decorate ? (
        <>
          <View style={[styles.blob, styles.blobTop]} />
          <View style={[styles.blob, styles.blobBottom]} />
        </>
      ) : null}
      <View style={{ padding }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { overflow: 'hidden' },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  blobTop: { width: 180, height: 180, top: -80, right: -50 },
  blobBottom: { width: 140, height: 140, bottom: -70, left: -40, backgroundColor: 'rgba(255,255,255,0.05)' },
});
