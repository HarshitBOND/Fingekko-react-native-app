import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { gradients, palette, radius, spacing } from '@/constants/design';
import { formatMoney } from '@/utils/currency';
import AnimatedNumber from '../ui/AnimatedNumber';
import AppText from '../ui/AppText';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import HeroCard from '../ui/HeroCard';
import Icon from '../ui/Icon';
import Input from '../ui/Input';
import ProgressRing from '../ui/ProgressRing';

type BalanceCardProps = {
  balanceAmount: number;
  monthlySpend: number;
  monthlyBudget: number;
  daysLeftInMonth: number;
  avgDailySpend: number;
  spendProgress: number;
  remainingProgress: number;
  hasIncomeSetup: boolean;
  /** The salary figure from setup — what the edit modal writes. */
  baseIncome: number;
  /** Income transactions logged this cycle, on top of `baseIncome`. */
  incomeThisMonth: number;
  /** Declared untracked cash counted toward the remaining balance (items 12/20). */
  cashInHand: number;
  /** Recurring bills not yet paid this month — reserved from what's free to spend (item 10). */
  unpaidEssentials?: number;
  payday: number | null;
  savingIncome: boolean;
  onSaveIncome: (monthlyIncome: number, payday: number) => Promise<boolean>;
};

// Sign-aware so debt reads as "−₹300" (proper minus, symbol before the digits)
// rather than "₹-300", in the user's profile currency (AUDIT item 17).
const inr = (n: number) => formatMoney(n);

function ordinal(day: number) {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

export default function BalanceCard({
  balanceAmount,
  monthlySpend,
  monthlyBudget,
  daysLeftInMonth,
  avgDailySpend,
  spendProgress,
  hasIncomeSetup,
  baseIncome,
  incomeThisMonth,
  cashInHand,
  unpaidEssentials = 0,
  payday,
  savingIncome,
  onSaveIncome,
}: BalanceCardProps) {
  const pct = Math.round(spendProgress * 100);
  // Debt is the loudest state: the cycle is over budget and the balance is
  // negative. It overrides the calmer Healthy/Watch badge and repaints the card
  // red so overspend can never hide behind "₹0 left, 100% used".
  const inDebt = balanceAmount < 0;
  // Edge (AUDIT item 22): the user has logged income this cycle but never set a
  // salary, so `hasIncomeSetup` is true purely on logged income. The budget math
  // still works (monthlyBudget = logged income), but calling that a "budget" and
  // hiding the salary setup would mislead — so we label it honestly as logged
  // income and keep the "add your salary" action in reach.
  const salarySet = baseIncome > 0;
  const loggedIncomeOnly = !salarySet && incomeThisMonth > 0;
  const healthy = spendProgress < 0.75;
  const badgeLabel = inDebt ? 'Over budget' : healthy ? 'Healthy' : 'Watch';
  const badgeTone = inDebt ? 'danger' : healthy ? 'success' : 'warning';
  const [hidden, setHidden] = useState(false);
  const [setupVisible, setSetupVisible] = useState(false);
  // The modal edits the *salary* figure only — logged income transactions are
  // added on top of it and must never be written back as the salary.
  const [incomeInput, setIncomeInput] = useState(baseIncome > 0 ? String(Math.round(baseIncome)) : '');
  const [paydayInput, setPaydayInput] = useState(payday ? String(payday) : '');
  const [formError, setFormError] = useState('');

  const openSetup = () => {
    setIncomeInput(baseIncome > 0 ? String(Math.round(baseIncome)) : '');
    setPaydayInput(payday ? String(payday) : '');
    setFormError('');
    setSetupVisible(true);
  };

  const handleSave = async () => {
    const amount = Number(incomeInput);
    const day = Number(paydayInput);

    if (!amount || Number.isNaN(amount) || amount <= 0) {
      setFormError('Enter a monthly income greater than 0.');
      return;
    }
    if (!day || Number.isNaN(day) || day < 1 || day > 31) {
      setFormError('Enter a payday between 1 and 31.');
      return;
    }

    const ok = await onSaveIncome(Math.round(amount), Math.round(day));
    if (ok) {
      setSetupVisible(false);
    } else {
      setFormError('Something went wrong saving this — please try again.');
    }
  };

  return (
    <HeroCard colors={inDebt ? gradients.danger : gradients.hero} padding={22}>
      {!hasIncomeSetup ? (
        <View style={styles.setupPrompt}>
          <View style={styles.setupIconWrap}>
            <Icon name="Wallet" size={22} color={palette.white} />
          </View>
          <AppText variant="title" color="onDark" weight="bold" style={{ marginTop: spacing.sm }}>
            Set up your income
          </AppText>
          <AppText variant="caption" color="onDarkMuted" align="center" style={styles.setupSubtitle}>
            We don&apos;t have access to your bank account, so we rely on you — tell us your monthly
            income and payday and we&apos;ll work out your remaining balance accurately, even if it
            lands mid-month.
          </AppText>
          <Button variant="secondary" size="md" fullWidth={false} onPress={openSetup} style={{ marginTop: spacing.md }}>
            Set up income
          </Button>
        </View>
      ) : (
        <>
          {/* header row */}
          <View style={styles.topRow}>
            <View style={styles.labelRow}>
              <AppText variant="label" color="onDarkMuted">
                Remaining Balance
              </AppText>
              <Pressable
                onPress={() => setHidden((current) => !current)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={hidden ? 'Show balance' : 'Hide balance'}
              >
                <Icon name={hidden ? 'EyeOff' : 'Eye'} size={15} color={palette.textOnDarkMuted} />
              </Pressable>
            </View>
            <Badge label={badgeLabel} tone={badgeTone} solid />
          </View>

          {hidden ? (
            <AppText variant="display" numeric color="onDark" style={styles.balance}>
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
              <Pressable
                onPress={openSetup}
                hitSlop={8}
                style={styles.budgetRow}
                accessibilityRole="button"
                accessibilityLabel="Edit income and budget"
              >
                <AppText variant="caption" color="onDarkMuted">
                  {loggedIncomeOnly
                    ? `of ${inr(monthlyBudget)} logged • add your salary`
                    : `of ${inr(monthlyBudget)} budget${payday ? ` • paid on the ${ordinal(payday)}` : ''}`}
                </AppText>
                <Icon name="Settings" size={11} color={palette.textOnDarkMuted} />
              </Pressable>
              {incomeThisMonth > 0 && (
                <View style={styles.incomePill}>
                  <Icon name="ArrowDownLeft" size={11} color={palette.white} clickable={false} />
                  <AppText variant="micro" color="onDark">
                    +{inr(incomeThisMonth)} income logged
                  </AppText>
                </View>
              )}
              {cashInHand > 0 && (
                <View style={styles.incomePill}>
                  <Icon name="Wallet" size={11} color={palette.white} clickable={false} />
                  <AppText variant="micro" color="onDark">
                    incl. {inr(cashInHand)} cash on hand
                  </AppText>
                </View>
              )}
              {unpaidEssentials > 0 && (
                <Pressable
                  onPress={() => router.push('/(tabs)/essentials')}
                  hitSlop={6}
                  style={styles.incomePill}
                  accessibilityRole="button"
                  accessibilityLabel="View your bills"
                >
                  <Icon name="ReceiptText" size={11} color={palette.white} clickable={false} />
                  <AppText variant="micro" color="onDark">
                    {inr(unpaidEssentials)} bills to pay
                  </AppText>
                </Pressable>
              )}
            </View>

            <ProgressRing
              progress={spendProgress}
              size={82}
              strokeWidth={9}
              gradient={['#EAF8E5', '#A7E58C']}
              trackColor="rgba(255,255,255,0.18)"
            >
              <AppText variant="title" numeric color="onDark">
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
                <AppText variant="label" numeric color="onDark">
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
                <AppText variant="label" numeric color="onDark" numberOfLines={1}>
                  {inr(avgDailySpend)}
                </AppText>
                <AppText variant="micro" color="onDarkMuted">
                  avg / day
                </AppText>
              </View>
            </View>
          </View>
        </>
      )}

      <Modal visible={setupVisible} animationType="fade" transparent onRequestClose={() => setSetupVisible(false)}>
        <View style={styles.modalOverlay} accessibilityViewIsModal={true}>
          <View style={styles.modalCard}>
            <AppText variant="title" color="textPrimary" weight="bold">
              Your income
            </AppText>
            <AppText variant="caption" color="textSecondary" style={{ marginTop: 4, marginBottom: spacing.md }}>
              This app doesn&apos;t connect to your bank — enter this manually and update it anytime your
              income changes.
            </AppText>

            <Input
              label="Monthly income"
              placeholder="e.g. 45000"
              keyboardType="numeric"
              value={incomeInput}
              onChangeText={setIncomeInput}
            />
            <Input
              label="Payday (day of month)"
              placeholder="e.g. 1, 15, 28"
              keyboardType="numeric"
              value={paydayInput}
              onChangeText={setPaydayInput}
              containerStyle={{ marginTop: spacing.md }}
            />
            <AppText variant="micro" color="textSecondary" style={{ marginTop: 6 }}>
              We use this to work out your spending cycle — so if you&apos;re paid on the 25th, your
              &quot;month&quot; runs the 25th to the 24th, not the 1st to the end of the calendar month.
            </AppText>

            {!!formError && (
              <AppText variant="caption" color="danger" style={{ marginTop: spacing.sm }}>
                {formError}
              </AppText>
            )}

            <View style={styles.modalActions}>
              <Button variant="outline" size="md" onPress={() => setSetupVisible(false)} style={{ flex: 1 }}>
                Cancel
              </Button>
              <Button variant="primary" size="md" onPress={handleSave} disabled={savingIncome} style={{ flex: 1 }}>
                {savingIncome ? <ActivityIndicator color="#fff" /> : 'Save'}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
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
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  incomePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    marginTop: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
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
  setupPrompt: { alignItems: 'center', paddingVertical: spacing.sm },
  setupIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setupSubtitle: { marginTop: spacing.xs, maxWidth: 280 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: palette.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
});
