import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { fontFamily, gradients, palette, radius as R, shadows } from '@/constants/design';
import PressableScale from './PressableScale';

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  onPress?: (event: GestureResponderEvent) => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const SIZES: Record<Size, { height: number; paddingHorizontal: number; fontSize: number; gap: number }> = {
  sm: { height: 44, paddingHorizontal: 18, fontSize: 14, gap: 6 },
  md: { height: 52, paddingHorizontal: 22, fontSize: 15, gap: 8 },
  lg: { height: 56, paddingHorizontal: 26, fontSize: 16, gap: 10 },
};

const GRADIENT_VARIANTS: Partial<Record<Variant, readonly [string, string, ...string[]]>> = {
  primary: gradients.brand,
  success: [palette.success, '#4CA64C'],
  danger: gradients.danger,
};

function faceColors(variant: Variant): { bg?: string; border?: string; text: string } {
  switch (variant) {
    case 'secondary':
      return { bg: palette.primaryLight, text: palette.primaryDeep };
    case 'outline':
      return { bg: palette.card, border: palette.borderStrong, text: palette.textPrimary };
    case 'ghost':
      return { bg: 'transparent', text: palette.primaryDeep };
    default:
      return { text: palette.white };
  }
}

export default function Button({
  onPress,
  children,
  style,
  textStyle,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  fullWidth = true,
}: ButtonProps) {
  const dims = SIZES[size];
  const gradient = GRADIENT_VARIANTS[variant];
  const colors = faceColors(variant);
  const isDisabled = disabled || loading;

  const content = (
    // `pointerEvents="none"` keeps the press on the Pressable itself; the
    // z-index is what guarantees the label paints *over* the absolutely-filled
    // gradient. Without it, Android's elevation (shadows.primary) reorders the
    // shell's children and the gradient can cover the text — a button that
    // looks empty.
    <View style={[styles.content, { gap: dims.gap }]} pointerEvents="none">
      {loading ? (
        <ActivityIndicator color={colors.text} size="small" />
      ) : (
        <>
          {icon}
          {typeof children === 'string' ? (
            <Text style={[styles.text, { color: colors.text, fontSize: dims.fontSize }, textStyle]} numberOfLines={1}>
              {children}
            </Text>
          ) : (
            children
          )}
        </>
      )}
    </View>
  );

  const shell: ViewStyle = {
    height: dims.height,
    paddingHorizontal: dims.paddingHorizontal,
    borderRadius: R.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
    opacity: isDisabled ? 0.55 : 1,
  };

  if (gradient) {
    return (
      <PressableScale onPress={onPress} disabled={isDisabled} style={[shell, shadows.primary, style]}>
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {content}
      </PressableScale>
    );
  }

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      style={[
        shell,
        { backgroundColor: colors.bg },
        colors.border ? { borderWidth: 1.5, borderColor: colors.border } : null,
        variant === 'secondary' ? shadows.xs : null,
        style,
      ]}
    >
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  text: {
    fontFamily: fontFamily.bold,
    letterSpacing: 0.2,
  },
});
