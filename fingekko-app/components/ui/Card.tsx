import React from 'react';
import { GestureResponderEvent, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { palette, radius as R, shadows } from '@/constants/design';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import PressableScale from './PressableScale';
import { cn } from "@/lib/utils";

export type CardVariant =
  | 'elevated' // white surface + soft shadow (default)
  | 'flat' // white surface + hairline border, minimal shadow
  | 'tinted' // soft green tint
  | 'ghost' // transparent
  | 'dark' // deep green surface
  | 'tactile'
  | 'pressable';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: CardVariant;
  padding?: number;
  radius?: number;
  animateIn?: boolean;
  shadowHeight?: number;
}

const surfaceForVariant = (variant: CardVariant): ViewStyle => {
  switch (variant) {
    case 'flat':
      return { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, ...shadows.xs };
    case 'tinted':
      return { backgroundColor: palette.primaryLight };
    case 'ghost':
      return { backgroundColor: 'transparent' };
    case 'dark':
      return { backgroundColor: palette.primaryDeep, ...shadows.md };
    case 'elevated':
    case 'tactile':
    case 'pressable':
    default:
      return { backgroundColor: palette.card, ...shadows.md };
  }
};

export default function NativeCard({
  children,
  style,
  onPress,
  variant = 'elevated',
  padding = 20,
  radius = R.xl,
  animateIn = false,
}: CardProps) {
  const reducedMotion = useReducedMotion();
  const surface = surfaceForVariant(variant);
  const base: ViewStyle = { borderRadius: radius, padding, ...surface };
  const isPressable = variant === 'pressable' || !!onPress;

  if (isPressable) {
    return (
      <PressableScale onPress={onPress} style={[base, style]}>
        {children}
      </PressableScale>
    );
  }

  if (animateIn && !reducedMotion) {
    return (
      <Animated.View entering={FadeIn.duration(300)} style={[base, style]}>
        {children}
      </Animated.View>
    );
  }

  return <View style={[base, style]}>{children}</View>;
}

export const cardStyles = StyleSheet.create({});

// Web / Shadcn Card Component Exports
const WebCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className,
    )}
    {...props}
  />
))
WebCard.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className,
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { WebCard as Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
