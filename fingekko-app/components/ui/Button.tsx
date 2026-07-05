import React, { useRef } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Colors } from '@/constants/Colors';

interface ButtonProps {
  onPress?: (event: GestureResponderEvent) => void;
  children: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
}

// Utility to separate layout styles (for the outer container) from inner styling (for the button face)
const extractContainerStyles = (style: ViewStyle | undefined) => {
  if (!style) return { containerStyles: {}, topLayerStyles: {} };
  
  const containerKeys = [
    'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical',
    'flex', 'flexGrow', 'flexShrink', 'flexBasis',
    'alignSelf',
    'position', 'top', 'bottom', 'left', 'right',
    'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
    'aspectRatio',
    'zIndex',
  ];
  
  const containerStyles: any = {};
  const topLayerStyles: any = {};
  
  Object.keys(style).forEach((key) => {
    if (containerKeys.includes(key)) {
      containerStyles[key] = (style as any)[key];
    } else {
      topLayerStyles[key] = (style as any)[key];
    }
  });
  
  return { containerStyles, topLayerStyles };
};

export default function Button({
  onPress,
  children,
  style,
  textStyle,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
}: ButtonProps) {
  const pressAnim = useRef(new Animated.Value(0)).current;

  const shadowHeight = size === 'sm' ? 3 : size === 'lg' ? 6 : 4;
  const borderRadius = size === 'sm' ? 12 : size === 'lg' ? 20 : 16;

  const handlePressIn = () => {
    if (disabled || loading) return;
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    Animated.spring(pressAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const translateY = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, shadowHeight - 0.5],
  });

  const scale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.985],
  });

  // Get background & shadow colors based on variant
  const getColors = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: Colors.primary,
          shadow: Colors.primaryDark,
          border: '#000000',
          text: Colors.textPrimary,
        };
      case 'secondary':
        return {
          bg: Colors.primaryLight,
          shadow: Colors.primaryDark,
          border: '#000000',
          text: Colors.textPrimary,
        };
      case 'danger':
        return {
          bg: Colors.expense,
          shadow: Colors.primaryDark,
          border: '#000000',
          text: Colors.textLight,
        };
      case 'success':
        return {
          bg: Colors.income,
          shadow: Colors.primaryDark,
          border: '#000000',
          text: Colors.textPrimary,
        };
      case 'outline':
        return {
          bg: '#FFFFFF',
          shadow: Colors.primaryDark,
          border: '#000000',
          text: Colors.textPrimary,
        };
      case 'ghost':
        return {
          bg: 'transparent',
          shadow: 'transparent',
          border: 'transparent',
          text: Colors.textSecondary,
        };
      default:
        return {
          bg: Colors.primary,
          shadow: Colors.primaryDark,
          border: '#000000',
          text: Colors.textPrimary,
        };
    }
  };

  const themeColors = getColors();

  // Spacing & dimensions based on size
  const getPadding = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: 8, paddingHorizontal: 16, fontSize: 13 };
      case 'lg':
        return { paddingVertical: 16, paddingHorizontal: 28, fontSize: 16 };
      case 'md':
      default:
        return { paddingVertical: 12, paddingHorizontal: 20, fontSize: 15 };
    }
  };

  const paddingStyle = getPadding();
  const { containerStyles, topLayerStyles } = extractContainerStyles(style);

  if (variant === 'ghost') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={[
          styles.ghostButton,
          { paddingVertical: paddingStyle.paddingVertical, paddingHorizontal: paddingStyle.paddingHorizontal },
          containerStyles,
          topLayerStyles,
        ]}
      >
        {typeof children === 'string' ? (
          <Text style={[styles.text, { color: themeColors.text, fontSize: paddingStyle.fontSize }, textStyle]}>
            {children}
          </Text>
        ) : (
          children
        )}
      </Pressable>
    );
  }

  const customBorderRadius = topLayerStyles.borderRadius ?? borderRadius;

  return (
    <View style={[styles.container, { paddingBottom: shadowHeight }, containerStyles]}>
      {/* Shadow Layer */}
      <View
        style={[
          styles.shadow,
          {
            backgroundColor: themeColors.shadow,
            borderRadius: customBorderRadius,
            top: shadowHeight,
          },
        ]}
      />

      {/* Interactive/Top Layer */}
      <Animated.View
        style={[
          styles.topLayer,
          {
            backgroundColor: themeColors.bg,
            borderColor: themeColors.border,
            borderWidth: 2,
            borderRadius: customBorderRadius,
          },
          topLayerStyles,
          {
            transform: [{ translateY }, { scale }],
          },
        ]}
      >
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onPress}
          disabled={disabled || loading}
          style={({ pressed }) => [
            styles.pressableArea,
            { paddingVertical: paddingStyle.paddingVertical, paddingHorizontal: paddingStyle.paddingHorizontal },
            topLayerStyles.padding && { padding: topLayerStyles.padding },
            topLayerStyles.paddingVertical && { paddingVertical: topLayerStyles.paddingVertical },
            topLayerStyles.paddingHorizontal && { paddingHorizontal: topLayerStyles.paddingHorizontal },
            (disabled || loading) && styles.disabled,
          ]}
        >
          {typeof children === 'string' ? (
            <Text style={[styles.text, { color: themeColors.text, fontSize: paddingStyle.fontSize }, textStyle]}>
              {loading ? 'Please wait...' : children}
            </Text>
          ) : (
            children
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'stretch',
  },
  shadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  topLayer: {
    width: '100%',
  },
  pressableArea: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  ghostButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
});
