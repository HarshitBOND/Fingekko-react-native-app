import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { palette, spacing } from '@/constants/design';
import AppText from './AppText';
import Button from './Button';
import IconBadge from './IconBadge';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function EmptyState({ icon = 'Sparkles', title, subtitle, actionLabel, onAction, style }: EmptyStateProps) {
  return (
    <View style={[styles.wrap, style]}>
      <IconBadge name={icon} size={72} iconSize={34} background={palette.primaryLight} color={palette.primary} circle />
      <AppText variant="h2" align="center" style={styles.title}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="bodySm" color="textSecondary" align="center" style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="primary" size="md" fullWidth={false} onPress={onAction} style={styles.action}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  title: { marginTop: spacing.sm },
  subtitle: { maxWidth: 280 },
  action: { marginTop: spacing.md },
});
