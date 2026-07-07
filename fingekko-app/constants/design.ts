/**
 * FinGekko Design System — single source of truth.
 *
 * A calm, premium fintech language (Acorns / Emma / Monarch / Copilot inspired):
 * soft rounded surfaces, subtle layered elevation, generous spacing, money-first
 * typography, and the FinGekko green brand. Light mode only for now, but the token
 * shape leaves room for a dark theme drop-in later.
 *
 * Everything visual in the app should trace back to these tokens.
 */

import { Platform, TextStyle, ViewStyle } from 'react-native';

/* ────────────────────────────────────────────────────────────────────────────
 * Palette
 * ──────────────────────────────────────────────────────────────────────────── */
export const palette = {
  // Brand green
  primary: '#66CC44',
  primaryDeep: '#3E6E42',
  primaryDark: '#2C5230',
  primaryBright: '#7BD957',
  primaryLight: '#EAF8E5',
  primaryTint: 'rgba(102, 204, 68, 0.10)', // ~primary08
  primaryTintStrong: 'rgba(102, 204, 68, 0.16)', // ~primary14

  // Surfaces
  bg: '#F7F8F6',
  bgElevated: '#FFFFFF',
  card: '#FFFFFF',
  cardMuted: '#FBFCFB',

  // Text
  textPrimary: '#1E1E1E',
  textSecondary: '#6E6E73',
  textTertiary: '#9A9AA0',
  textOnDark: '#FFFFFF',
  textOnDarkMuted: 'rgba(255,255,255,0.72)',

  // Status
  success: '#5CB85C',
  successLight: '#E7F6E7',
  warning: '#F5B84D',
  warningLight: '#FDF3E1',
  danger: '#E85D5D',
  dangerLight: '#FBE9E9',
  info: '#5B9BD5',
  infoLight: '#E9F1FB',

  // Lines & fills
  border: '#ECECEC',
  borderStrong: '#E0E0E0',
  divider: '#F0F0EF',
  track: '#EDEFEC',
  scrim: 'rgba(20, 24, 20, 0.45)',

  // Neutrals for tints
  ink: '#1E1E1E',
  white: '#FFFFFF',
} as const;

/* Brand gradients (arrays for expo-linear-gradient `colors`) */
export const gradients = {
  brand: ['#7BD957', '#66CC44'] as const,
  brandDeep: ['#66CC44', '#3E6E42'] as const,
  hero: ['#4E8C4A', '#3E6E42', '#2C5230'] as const,
  heroDark: ['#3E6E42', '#25462A'] as const,
  mist: ['#F3F8F1', '#EAF8E5'] as const,
  warning: ['#F7C86A', '#F5B84D'] as const,
  danger: ['#F08A8A', '#E85D5D'] as const,
  info: ['#7FB4E4', '#5B9BD5'] as const,
} as const;

/* ────────────────────────────────────────────────────────────────────────────
 * Spacing (4pt scale)
 * ──────────────────────────────────────────────────────────────────────────── */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
} as const;

export const layout = {
  gutter: 20, // screen horizontal padding
  cardPadding: 20, // default card inner padding
  sectionGap: 24, // vertical gap between sections
  navBarHeight: 64, // floating tab bar body height
  navBarBottomInset: 12, // gap between bar and screen bottom
} as const;

/* ────────────────────────────────────────────────────────────────────────────
 * Radius
 * ──────────────────────────────────────────────────────────────────────────── */
export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  pill: 999,
} as const;

/* ────────────────────────────────────────────────────────────────────────────
 * Shadows — soft, layered elevation (no hard offsets)
 * ──────────────────────────────────────────────────────────────────────────── */
type Shadow = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

const makeShadow = (opacity: number, radiusPx: number, y: number, elevation: number): Shadow => ({
  shadowColor: '#1B2A1B',
  shadowOffset: { width: 0, height: y },
  shadowOpacity: opacity,
  shadowRadius: radiusPx,
  elevation,
});

export const shadows = {
  none: { shadowColor: 'transparent', shadowOpacity: 0, elevation: 0 } as Shadow,
  xs: makeShadow(0.04, 8, 2, 1),
  sm: makeShadow(0.05, 12, 4, 2),
  md: makeShadow(0.07, 20, 8, 4),
  lg: makeShadow(0.1, 28, 12, 8),
  xl: makeShadow(0.14, 36, 18, 12),
  // Green-tinted glow for primary CTAs
  primary: {
    shadowColor: '#3E6E42',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  } as Shadow,
} as const;

/* ────────────────────────────────────────────────────────────────────────────
 * Motion
 * ──────────────────────────────────────────────────────────────────────────── */
export const motion = {
  fast: 160,
  base: 240,
  slow: 400,
  slower: 700,
  // cubic-bezier control points (ease-out-ish) for reanimated Easing.bezier(...)
  easing: [0.22, 1, 0.36, 1] as [number, number, number, number],
} as const;

/* ────────────────────────────────────────────────────────────────────────────
 * Typography — Plus Jakarta Sans (loaded in app/_layout.tsx)
 * ──────────────────────────────────────────────────────────────────────────── */
export const fontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export type FontWeightName = keyof typeof fontFamily;

/** Map a semantic weight to the correct Plus Jakarta face (weight is encoded in the family). */
export const font = (weight: FontWeightName = 'regular'): TextStyle => ({
  fontFamily: fontFamily[weight],
});

export type TypographyVariant =
  | 'display'
  | 'hero'
  | 'h1'
  | 'h2'
  | 'title'
  | 'body'
  | 'bodySm'
  | 'label'
  | 'caption'
  | 'micro'
  | 'money'
  | 'moneyLg';

export const typography: Record<TypographyVariant, TextStyle> = {
  display: { fontFamily: fontFamily.extrabold, fontSize: 40, lineHeight: 46, letterSpacing: -0.5 },
  hero: { fontFamily: fontFamily.extrabold, fontSize: 34, lineHeight: 40, letterSpacing: -0.4 },
  h1: { fontFamily: fontFamily.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.3 },
  h2: { fontFamily: fontFamily.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  title: { fontFamily: fontFamily.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.1 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  bodySm: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fontFamily.semibold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fontFamily.medium, fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: fontFamily.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.3 },
  money: { fontFamily: fontFamily.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
  moneyLg: { fontFamily: fontFamily.extrabold, fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
};

/* Whether the custom font actually loaded (set from _layout after useFonts). Kept
 * simple so components can stay presentational. */
export const FONT_LOADED = { current: false };

export default {
  palette,
  gradients,
  spacing,
  layout,
  radius,
  shadows,
  motion,
  fontFamily,
  font,
  typography,
};

/* Platform note: system fallback face if custom font fails to load. */
export const systemFallbackFont = Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' });
