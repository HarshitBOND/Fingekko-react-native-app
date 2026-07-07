/**
 * Legacy color/scale export kept for backwards-compatibility with existing imports.
 * All values now derive from the calm-premium design system in `constants/design.ts`.
 */
import { palette, radius, shadows, spacing } from './design';

export const Colors = {
  // Brand
  primary: palette.primary, // FinGekko green
  primaryDark: palette.primaryDeep, // deep green accent
  primaryLight: palette.primaryLight, // soft green tint

  // Background colors
  background: palette.bg, // app background
  surface: palette.card, // cards, modals
  surfaceDark: palette.ink, // dark surface

  // Text colors
  textPrimary: palette.textPrimary,
  textSecondary: palette.textSecondary,
  textLight: palette.white, // text on dark backgrounds

  // Status colors
  income: palette.success,
  expense: palette.danger,
  savings: palette.info,

  // UI colors
  border: palette.border,
  shadow: palette.ink,
  tabBar: palette.card,
  tabBarActive: palette.primaryDeep,
  tabBarInactive: palette.textTertiary,
};

// Typography sizes
export const FontSizes = {
  xs: 11,
  sm: 13,
  md: 14,
  base: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 34,
  xxxxl: 44,
};

// Spacing system (multiples of 4) — re-exported from design tokens
export const Spacing = {
  xs: spacing.xs,
  sm: spacing.sm,
  md: spacing.md,
  base: spacing.base,
  lg: spacing.lg,
  xl: spacing.xl,
  xxl: spacing.xxl,
};

// Convenience re-exports so screens can pull everything from one place if desired.
export { palette, radius, shadows, spacing };
