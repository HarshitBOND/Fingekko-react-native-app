import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { gradients, palette, radius, spacing } from '@/constants/design';
import AnimatedNumber from '../ui/AnimatedNumber';
import AppText from '../ui/AppText';
import Badge from '../ui/Badge';
import HeroCard from '../ui/HeroCard';
import Icon from '../ui/Icon';
import ProgressRing from '../ui/ProgressRing';

type BalanceCardProps = {
  balanceAmount: number;
  monthlySpend: number;
  monthlyBudget: number;
  daysLeftInMonth: number;
  avgDailySpend: number;
  spendProgress: number;
  remainingProgress: number;
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export default function BalanceCard({
  balanceAmount,
  monthlySpend,
  monthlyBudget,
  daysLeftInMonth,
  avgDailySpend,
  spendProgress,
}: BalanceCardProps) {
  const pct = Math.round(spendProgress * 100);
  const healthy = spendProgress < 0.75;
  const [hidden, setHidden] = useState(false);

  return (
    <HeroCard colors={gradients.hero} padding={22}>
      {/* header row */}
      <View style={styles.topRow}>
        <View style={styles.labelRow}>
          <AppText variant="label" color="onDarkMuted">
            Remaining Balance
          </AppText>
          <Pressable onPress={() => setHidden((current) => !current)} hitSlop={8}>
            <Icon name={hidden ? 'EyeOff' : 'Eye'} size={15} color={palette.textOnDarkMuted} />
          </Pressable>
        </View>
        <Badge label={healthy ? 'Healthy' : 'Watch'} tone={healthy ? 'success' : 'warning'} solid />
      </View>

      {hidden ? (
        <AppText variant="display" color="onDark" style={styles.balance}>
          ••••••
        </AppText>
      ) : (
        <AnimatedNumber
          value={balanceAmount}
          format={inr}
          variant="display"
          color="onDark"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          style={styles.balance}
        />
      )}

      {/* middle: spend vs budget + ring */}
      <View style={styles.midRow}>
        <View style={styles.spendCol}>
          <AppText variant="caption" color="onDarkMuted">
            This month&apos;s spend
          </AppText>
          <AppText variant="money" color="onDark" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {inr(monthlySpend)}
          </AppText>
          <AppText variant="caption" color="onDarkMuted">
            of {inr(monthlyBudget)} budget
          </AppText>
        </View>

        <ProgressRing
          progress={spendProgress}
          size={82}
          strokeWidth={9}
          gradient={['#EAF8E5', '#A7E58C']}
          trackColor="rgba(255,255,255,0.18)"
        >
          <AppText variant="title" color="onDark">
            {pct}%
          </AppText>
          <AppText variant="micro" color="onDarkMuted">
            used
          </AppText>
        </ProgressRing>
      </View>

      {/* bottom stat chips */}
      <View style={styles.chipRow}>
        <View style={styles.chip}>
          <View style={styles.chipIcon}>
            <Icon name="CalendarDays" size={16} color={palette.white} />
          </View>
          <View>
            <AppText variant="label" color="onDark">
              {daysLeftInMonth}
            </AppText>
            <AppText variant="micro" color="onDarkMuted">
              days left
            </AppText>
          </View>
        </View>
        <View style={styles.chipDivider} />
        <View style={styles.chip}>
          <View style={styles.chipIcon}>
            <Icon name="Wallet" size={16} color={palette.white} />
          </View>
          <View>
            <AppText variant="label" color="onDark" numberOfLines={1}>
              {inr(avgDailySpend)}
            </AppText>
            <AppText variant="micro" color="onDarkMuted">
              avg / day
            </AppText>
          </View>
        </View>
      </View>
    </HeroCard>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  balance: { marginTop: 6 },
  midRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spendCol: { flex: 1, gap: 3, paddingRight: spacing.base },
  chipRow: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  chip: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  chipIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipDivider: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.18)', marginHorizontal: spacing.md },
});
