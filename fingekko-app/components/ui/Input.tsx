import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  Text,
  TextInputProps,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import { Colors, FontSizes } from '@/constants/Colors';

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
  const focusAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(focusAnim, {
      toValue: isFocused ? 1 : 0,
      useNativeDriver: true,
      tension: 120,
      friction: 10,
    }).start();
  }, [isFocused]);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  // Shadow offsets and transformations
  const shadowTranslateY = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2], // moves up slightly when active
  });

  const shadowOpacity = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1], // shadow appears on focus
  });

  return (
    <View style={[styles.root, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.inputWrapper}>
        {/* Focus Shadow Layer */}
        <Animated.View
          style={[
            styles.focusShadow,
            {
              opacity: shadowOpacity,
            },
          ]}
        />

        {/* Input Container Layer */}
        <Animated.View
          style={[
            styles.inputContainer,
            {
              borderColor: isFocused ? '#000000' : '#CCCCCC',
              borderWidth: 2,
              transform: [{ translateY: shadowTranslateY }],
            },
          ]}
        >
          {icon && <View style={styles.leftIcon}>{icon}</View>}

          <TextInput
            style={[styles.textInput, inputStyle]}
            placeholderTextColor="#9ca3af"
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...props}
          />

          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </Animated.View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 6,
    alignSelf: 'stretch',
  },
  label: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  inputWrapper: {
    position: 'relative',
    height: 52,
  },
  focusShadow: {
    position: 'absolute',
    left: 3,
    right: -3,
    top: 3,
    bottom: -3,
    backgroundColor: '#000000',
    borderRadius: 16,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: '100%',
  },
  leftIcon: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIcon: {
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  errorText: {
    color: Colors.expense,
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
});
