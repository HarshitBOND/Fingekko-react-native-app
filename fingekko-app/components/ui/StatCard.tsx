import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { palette, radius as R, shadows, spacing } from '@/constants/design';
import AppText from './AppText';
import IconBadge from './IconBadge';
import PressableScale from './PressableScale';

interface StatCardProps {
  icon: string;
  value: string;
  label: string;
  /** icon badge background + color tone */
  tint?: string;
  iconColor?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

function StatCard({
  icon,
  value,
  label,
  tint = palette.primaryLight,
  iconColor = palette.primaryDeep,
  onPress,
  style,
}: StatCardProps) {
  const body = (
    <>
      <IconBadge name={icon} size={40} background={tint} color={iconColor} />
      <View style={styles.textWrap}>
        <AppText variant="title" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {value}
        </AppText>
        <AppText variant="caption" color="textSecondary" numberOfLines={2}>
          {label}
        </AppText>
      </View>
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

export default React.memo(StatCard);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: palette.card,
    borderRadius: R.lg,
    padding: spacing.base,
    gap: spacing.sm,
    ...shadows.sm,
  },
  textWrap: { gap: 2 },
});
