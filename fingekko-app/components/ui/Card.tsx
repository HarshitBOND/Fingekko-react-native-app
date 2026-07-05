import React, { useRef } from 'react';
import {
  Animated,
  GestureResponderEvent,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Colors } from '@/constants/Colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: 'flat' | 'tactile' | 'pressable';
  shadowHeight?: number;
}

// Utility to separate layout styles (for the outer container) from inner styling (for the card face)
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

export default function Card({
  children,
  style,
  onPress,
  variant = 'tactile',
  shadowHeight = 6,
}: CardProps) {
  const pressAnim = useRef(new Animated.Value(0)).current;

  const isPressable = variant === 'pressable' || !!onPress;
  const borderRadius = 18;
  const customBorderRadius = style?.borderRadius ?? borderRadius;

  const handlePressIn = () => {
    if (!isPressable) return;
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    if (!isPressable) return;
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
    outputRange: [1, 0.99],
  });

  const { containerStyles, topLayerStyles } = extractContainerStyles(style);

  // Separate inner padding to apply it inside the card body rather than the outer view
  const cardPadding = {
    padding: topLayerStyles.padding ?? 16,
    paddingTop: topLayerStyles.paddingTop,
    paddingBottom: topLayerStyles.paddingBottom,
    paddingLeft: topLayerStyles.paddingLeft,
    paddingRight: topLayerStyles.paddingRight,
    paddingHorizontal: topLayerStyles.paddingHorizontal,
    paddingVertical: topLayerStyles.paddingVertical,
  };

  // Strip padding styles from topLayerStyles to avoid duplicate padding
  const cleanTopLayerStyles = { ...topLayerStyles };
  delete cleanTopLayerStyles.padding;
  delete cleanTopLayerStyles.paddingTop;
  delete cleanTopLayerStyles.paddingBottom;
  delete cleanTopLayerStyles.paddingLeft;
  delete cleanTopLayerStyles.paddingRight;
  delete cleanTopLayerStyles.paddingHorizontal;
  delete cleanTopLayerStyles.paddingVertical;

  if (isPressable) {
    return (
      <View style={[styles.container, { paddingBottom: shadowHeight }, containerStyles]}>
        {/* Shadow Layer */}
        <View
          style={[
            styles.shadow,
            {
              backgroundColor: '#000000',
              borderRadius: customBorderRadius,
              top: shadowHeight,
            },
          ]}
        />

        {/* Top interactive Card Layer */}
        <Animated.View
          style={[
            styles.cardTop,
            {
              backgroundColor: '#FFFFFF',
              borderColor: '#000000',
              borderWidth: 2,
              borderRadius: customBorderRadius,
            },
            cleanTopLayerStyles,
            {
              transform: [{ translateY }, { scale }],
            },
          ]}
        >
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={onPress}
            style={[styles.content, cardPadding]}
          >
            {children}
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  if (variant === 'tactile') {
    return (
      <View style={[styles.container, { paddingBottom: shadowHeight }, containerStyles]}>
        {/* Shadow Layer */}
        <View
          style={[
            styles.shadow,
            {
              backgroundColor: '#000000',
              borderRadius: customBorderRadius,
              top: shadowHeight,
            },
          ]}
        />

        {/* Card Body */}
        <View
          style={[
            styles.cardTop,
            {
              backgroundColor: '#FFFFFF',
              borderColor: '#000000',
              borderWidth: 2,
              borderRadius: customBorderRadius,
            },
            cleanTopLayerStyles,
          ]}
        >
          <View style={[styles.content, cardPadding]}>{children}</View>
        </View>
      </View>
    );
  }

  // Flat card
  return (
    <View
      style={[
        styles.cardTop,
        {
          backgroundColor: '#FFFFFF',
          borderColor: '#000000',
          borderWidth: 2,
          borderRadius: customBorderRadius,
        },
        containerStyles,
        cleanTopLayerStyles,
      ]}
    >
      <View style={[styles.content, cardPadding]}>{children}</View>
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
  cardTop: {
    width: '100%',
  },
  content: {
    padding: 16,
    width: '100%',
  },
});
