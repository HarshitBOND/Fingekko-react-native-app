import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { cva, type VariantProps } from "class-variance-authority";
import { fontFamily, palette, radius } from '@/constants/design';
import { cn } from "@/lib/utils";
import AppText from './AppText';

export type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface NativeBadgeProps {
  label: string;
  tone?: BadgeTone;
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

function NativeBadge({ label, tone = 'primary', solid = false, icon, size = 'md', style }: NativeBadgeProps) {
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

export default React.memo(NativeBadge);

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

// Shadcn Web Badge Component
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface WebBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function WebBadge({ className, variant, ...props }: WebBadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { WebBadge as Badge, badgeVariants }
