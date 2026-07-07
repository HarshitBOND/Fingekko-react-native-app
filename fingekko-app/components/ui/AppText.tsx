import React from 'react';
import { StyleSheet, Text, TextProps, TextStyle } from 'react-native';
import { fontFamily, FontWeightName, palette, typography, TypographyVariant } from '@/constants/design';

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
  children?: React.ReactNode;
}

function AppText({
  variant = 'body',
  color,
  weight,
  align,
  muted,
  style,
  children,
  ...rest
}: AppTextProps) {
  const base = typography[variant];
  const resolvedColor =
    (color && (COLOR_MAP as Record<string, string>)[color]) ||
    (typeof color === 'string' ? color : undefined) ||
    (muted ? palette.textSecondary : palette.textPrimary);

  const weightStyle: TextStyle | undefined = weight ? { fontFamily: fontFamily[weight] } : undefined;

  return (
    <Text
      style={[base, { color: resolvedColor }, align ? { textAlign: align } : null, weightStyle, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export default React.memo(AppText);

export const appTextStyles = StyleSheet.create({});
