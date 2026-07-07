import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { palette, radius as R, shadows, spacing } from '@/constants/design';
import AppText from './AppText';
import Icon from './Icon';
import IconBadge from './IconBadge';
import PressableScale from './PressableScale';

interface InsightCardProps {
  icon: string;
  title: string;
  description: string;
  tint?: string;
  iconColor?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function InsightCard({
  icon,
  title,
  description,
  tint = palette.primaryLight,
  iconColor = palette.primaryDeep,
  onPress,
  style,
}: InsightCardProps) {
  const body = (
    <>
      <IconBadge name={icon} size={44} background={tint} color={iconColor} />
      <View style={styles.textWrap}>
        <AppText variant="title">{title}</AppText>
        <AppText variant="bodySm" color="textSecondary" style={styles.desc}>
          {description}
        </AppText>
      </View>
      {onPress ? <Icon name="ChevronRight" size={18} color={palette.textTertiary} /> : null}
    </>
  );

  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={[styles.card, style]}>
        {body}
      </PressableScale>
    );
  }
  return <View style={[styles.card, style]}>{body}</View>;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.card,
    borderRadius: R.lg,
    padding: spacing.base,
    ...shadows.sm,
  },
  textWrap: { flex: 1, gap: 3 },
  desc: { lineHeight: 20 },
});
