import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { fontFamily, palette, radius } from '@/constants/design';
import AppText from './AppText';

export type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  /** filled = solid color bg with light text; otherwise soft tint bg with colored text */
  solid?: boolean;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

const TONES: Record<BadgeTone, { fg: string; bg: string; solidBg: string }> = {
  primary: { fg: palette.primaryDeep, bg: palette.primaryLight, solidBg: palette.primary },
  success: { fg: '#3B8C3B', bg: palette.successLight, solidBg: palette.success },
  warning: { fg: '#B5791F', bg: palette.warningLight, solidBg: palette.warning },
  danger: { fg: '#C4494A', bg: palette.dangerLight, solidBg: palette.danger },
  info: { fg: '#3B77B0', bg: palette.infoLight, solidBg: palette.info },
  neutral: { fg: palette.textSecondary, bg: '#F0F1EF', solidBg: palette.textSecondary },
};

export default function Badge({ label, tone = 'primary', solid = false, icon, size = 'md', style }: BadgeProps) {
  const t = TONES[tone];
  const pv = size === 'sm' ? 3 : 5;
  const ph = size === 'sm' ? 8 : 11;
  const fontSize = size === 'sm' ? 11 : 12;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: solid ? t.solidBg : t.bg, paddingVertical: pv, paddingHorizontal: ph },
        style,
      ]}
    >
      {icon}
      <AppText style={[styles.text, { color: solid ? palette.white : t.fg, fontSize }]}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: fontFamily.bold,
    letterSpacing: 0.1,
  },
});
