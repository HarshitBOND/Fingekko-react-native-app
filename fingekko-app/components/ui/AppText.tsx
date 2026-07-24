import React from 'react';
import { StyleSheet, Text, TextProps, TextStyle } from 'react-native';
import {
  calendarNumericFontFamily,
  fontFamily,
  FontWeightName,
  numericFontFamily,
  palette,
  serifNumericVariantOverrides,
  typography,
  TypographyVariant,
} from '@/constants/design';

type ColorToken =
  | 'primary'
  | 'primaryDeep'
  | 'textPrimary'
  | 'textSecondary'
  | 'textTertiary'
  | 'onDark'
  | 'onDarkMuted'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

const COLOR_MAP: Record<ColorToken, string> = {
  primary: palette.primary,
  primaryDeep: palette.primaryDeep,
  textPrimary: palette.textPrimary,
  textSecondary: palette.textSecondary,
  textTertiary: palette.textTertiary,
  onDark: palette.textOnDark,
  onDarkMuted: palette.textOnDarkMuted,
  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
  info: palette.info,
};

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  /** Semantic color token, or any raw color string. */
  color?: ColorToken | (string & {});
  /** Override the weight face of the chosen variant. */
  weight?: FontWeightName;
  align?: 'left' | 'center' | 'right' | 'auto';
  muted?: boolean;
  /**
   * Render as a numeral — tabular figures, so text that *is* a number (amounts,
   * counts, percentages, day cells) lines up in columns and doesn't shuffle as
   * it changes. The `money` / `moneyLg` variants are already numeric.
   *
   * `"serif"` swaps in Noto Serif Display. That's the streak calendar's look and
   * nowhere else's — everything else keeps the prose face.
   */
  numeric?: boolean | 'serif';
  children?: React.ReactNode;
}

/** Variants that are numerals by definition and need no `numeric` prop. */
const ALWAYS_NUMERIC: ReadonlySet<TypographyVariant> = new Set(['money', 'moneyLg']);

function AppText({
  variant = 'body',
  color,
  weight,
  align,
  muted,
  numeric,
  style,
  children,
  ...rest
}: AppTextProps) {
  const base = typography[variant];
  const isSerif = numeric === 'serif';
  const resolvedColor =
    (color && (COLOR_MAP as Record<string, string>)[color]) ||
    (typeof color === 'string' ? color : undefined) ||
    (muted ? palette.textSecondary : palette.textPrimary);

  // Numerals keep the variant's weight and only add tabular figures; the serif
  // opt-in also swaps the family and its metrics. An explicit `weight` still
  // wins over both.
  const family = isSerif ? calendarNumericFontFamily : numericFontFamily;
  const numericStyle: TextStyle | undefined =
    numeric && !ALWAYS_NUMERIC.has(variant)
      ? {
          fontFamily: family[weight ?? weightOfVariant(variant)],
          fontVariant: ['tabular-nums'],
          ...(isSerif ? serifNumericVariantOverrides[variant] : null),
        }
      : undefined;

  const weightStyle: TextStyle | undefined = weight ? { fontFamily: family[weight] } : undefined;

  return (
    <Text
      style={[
        base,
        { color: resolvedColor },
        align ? { textAlign: align } : null,
        numericStyle,
        weightStyle,
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

/** Recover the weight baked into a variant, so `numeric` keeps its visual heft. */
function weightOfVariant(variant: TypographyVariant): FontWeightName {
  const declared = typography[variant].fontFamily;
  const match = (Object.keys(fontFamily) as FontWeightName[]).find(
    (name) => fontFamily[name] === declared,
  );
  return match ?? 'regular';
}

export default React.memo(AppText);

export const appTextStyles = StyleSheet.create({});
