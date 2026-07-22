import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { palette, spacing } from '@/constants/design';
import AppText from './AppText';
import Icon from './Icon';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

function SectionHeader({ title, subtitle, actionLabel, onAction, style }: SectionHeaderProps) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.textWrap}>
        <AppText variant="h2">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" color="textSecondary" style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8} style={styles.action}>
          <AppText variant="label" color="primaryDeep">
            {actionLabel}
          </AppText>
          <Icon name="ChevronRight" size={16} color={palette.primaryDeep} />
        </Pressable>
      ) : null}
    </View>
  );
}

export default React.memo(SectionHeader);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.base,
  },
  textWrap: { flex: 1, gap: 2 },
  subtitle: { marginTop: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: spacing.md },
});
