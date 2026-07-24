import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { fontFamily, palette, radius as R } from '@/constants/design';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function Input({
  label,
  error,
  containerStyle,
  inputStyle,
  icon,
  rightIcon,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const focus = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  const setFocus = (v: boolean) => {
    // Reduce Motion: snap the focus border/glow instantly instead of easing.
    focus.value = withTiming(v ? 1 : 0, { duration: reducedMotion ? 0 : 180 });
    setIsFocused(v);
  };

  const animatedWrap = useAnimatedStyle(() => ({
    borderColor: error
      ? palette.danger
      : interpolateColor(focus.value, [0, 1], [palette.border, palette.primary]),
    shadowOpacity: focus.value * 0.18,
  }));

  return (
    <View style={[styles.root, containerStyle]}>
      {label ? <Text style={[styles.label, isFocused && styles.labelFocused]}>{label}</Text> : null}

      <Animated.View style={[styles.inputContainer, animatedWrap]}>
        {icon ? <View style={styles.leftIcon}>{icon}</View> : null}
        <TextInput
          style={[styles.textInput, inputStyle]}
          placeholderTextColor={palette.textTertiary}
          accessibilityLabel={props.accessibilityLabel || label}
          accessibilityHint={props.accessibilityHint}
          aria-invalid={!!error}
          onFocus={(e) => {
            setFocus(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {rightIcon ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
      </Animated.View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 8,
    alignSelf: 'stretch',
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    color: palette.textSecondary,
    marginLeft: 4,
  },
  labelFocused: {
    color: palette.primaryDeep,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.card,
    borderRadius: R.lg,
    borderWidth: 1.5,
    borderColor: palette.border,
    paddingHorizontal: 16,
    height: 56,
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    shadowOpacity: 0,
  },
  leftIcon: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIcon: {
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontFamily: fontFamily.medium,
    fontSize: 16,
    color: palette.textPrimary,
  },
  errorText: {
    color: palette.danger,
    fontFamily: fontFamily.medium,
    fontSize: 12,
    marginLeft: 4,
  },
});
