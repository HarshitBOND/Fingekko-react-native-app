import { palette } from '@/constants/design';

/**
 * Home-screen theme, repointed to the calm-premium design tokens.
 * Kept as a named map so existing style references keep working while the
 * home components migrate to the new language.
 */
export const Theme = {
  primary: palette.primary,
  primaryHover: palette.primaryBright,
  primaryDark: palette.textPrimary,
  primaryDeep: palette.primaryDeep,
  primaryLight: palette.primaryLight,
  mistBlue: '#A8DADC',
  mountainTeal: palette.info,
  sunlight: palette.warning,
  background: palette.bg,
  background2: palette.cardMuted,
  darkSection: palette.primaryDeep,
  cardBg: palette.card,
  cardBorder: palette.border,
  cardBorderSoft: palette.border,
  glassBorder: palette.border,
  textMain: palette.textPrimary,
  textMuted: palette.textSecondary,
  textFaint: palette.textTertiary,
  white: palette.white,
  whiteSoft: palette.textOnDarkMuted,
  greenBadge: palette.primaryLight,
  greenBadgeText: palette.primaryDeep,
  forestDeep: palette.primaryDark,
  forestSoft: palette.textSecondary,
  mintSurface: palette.primaryLight,
  shadow: palette.ink,
} as const;

export const WEEK_DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;
