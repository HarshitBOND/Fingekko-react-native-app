import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { palette, spacing } from '@/constants/design';
import AppText from './AppText';
import IconBadge from './IconBadge';
import PressableScale from './PressableScale';

interface TransactionItemProps {
  icon?: string;
  /** emoji alternative to an icon */
  emoji?: string;
  title: string;
  subtitle?: string;
  amount: number;
  type?: 'income' | 'expense';
  currency?: string;
  tint?: string;
  iconColor?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const formatMoney = (n: number, currency: string) =>
  `${currency}${Math.abs(Math.round(n)).toLocaleString('en-IN')}`;

function TransactionItem({
  icon = 'Wallet',
  emoji,
  title,
  subtitle,
  amount,
  type = 'expense',
  currency = '₹',
  tint,
  iconColor,
  onPress,
  style,
}: TransactionItemProps) {
  const isIncome = type === 'income';
  const amountColor = isIncome ? palette.success : palette.textPrimary;

  const leading = emoji ? (
    <View style={styles.emojiWrap}>
      <AppText style={styles.emoji}>{emoji}</AppText>
    </View>
  ) : (
    <IconBadge
      name={icon}
      size={44}
      background={tint ?? (isIncome ? palette.successLight : palette.primaryLight)}
      color={iconColor ?? (isIncome ? palette.success : palette.primaryDeep)}
    />
  );

  const body = (
    <>
      {leading}
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
      <AppText variant="label" style={{ color: amountColor }}>
        {isIncome ? '+' : '-'}
        {formatMoney(amount, currency)}
      </AppText>
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

export default React.memo(TransactionItem);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  textWrap: { flex: 1, gap: 2 },
  emojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
});
