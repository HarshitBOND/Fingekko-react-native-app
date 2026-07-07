import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { palette, spacing } from '@/constants/design';
import AppText from './AppText';
import Icon from './Icon';
import PressableScale from './PressableScale';

interface ListRowProps {
  left?: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Generic pressable row: leading node, title/subtitle, trailing content or chevron. */
export default function ListRow({ left, title, subtitle, right, showChevron, onPress, style }: ListRowProps) {
  const body = (
    <>
      {left}
      <View style={styles.textWrap}>
        <AppText variant="label" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      {showChevron ? <Icon name="ChevronRight" size={18} color={palette.textTertiary} /> : null}
    </>
  );

  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={[styles.row, style]}>
        {body}
      </PressableScale>
    );
  }
  return <View style={[styles.row, style]}>{body}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  textWrap: { flex: 1, gap: 2 },
});
