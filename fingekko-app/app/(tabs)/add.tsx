import { useAuth } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import type { Transaction } from '../../constants/types';
import type { ApiUser, ProfileResponse, TransactionsResponse } from '../../types';
import { summarizeByPayCycle } from '../../utils/pay-cycle';
import { currencySymbol, formatMoney } from '../../utils/currency';
import { formatCurrency } from '../../utils/helpers';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ConfirmDialog';
import Navbar from '../../components/Navbar';
import DateStrip from '../../components/streak/DateStrip';
import { addDays, dateWindow, toIso } from '../../components/streak/utils';
import AppText from '../../components/ui/AppText';
import CalendarPicker from '../../components/ui/CalendarPicker';
import Card from '../../components/ui/Card';
import Icon from '../../components/ui/Icon';
import PressableScale from '../../components/ui/PressableScale';
import ScreenContainer from '../../components/ui/ScreenContainer';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../constants/categories';
import { gradients, layout, numericFontFamily, palette, radius, shadows, spacing } from '../../constants/design';
import { emitAppEvent } from '../../lib/appEvents';
import { apiRequest } from '../../utils/api';
import { isAmountUnusual, typicalExpense } from '../../utils/amount-guard';

type XpAward = {
  xp: number;
  level: number;
  leveledUp: boolean;
  xpDelta: number;
};

type CreateTransactionResponse = {
  transaction: unknown;
  xpAward: XpAward | null;
};

const todayIso = () => toIso(new Date());

// Bounds for the date picker: log anything up to 5 years back, or a little ahead.
// Wide enough to back-fill or schedule, tight enough that the calendar can't
// yield an absurd year.
const DATE_MIN_ISO = toIso(addDays(new Date(), -365 * 5));
const DATE_MAX_ISO = toIso(addDays(new Date(), 365));

// "23 Jul 2026" from a YYYY-MM-DD string, parsed as a local date (no UTC shift).
function formatDateLabel(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!m) return value ?? '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return value ?? '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Soft, low-opacity wash of a category's own hue — for the resting icon bubble. */
const withAlpha = (hex: string, alpha: number) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const CATEGORY_COLUMNS = 3;

const firstParam = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

export default function AddScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { getToken, isSignedIn } = useAuth();
  const { width } = useWindowDimensions();

  // Match ScreenContainer: gutter each side, content capped at 640 on tablets.
  const contentWidth = Math.min(width, 640) - layout.gutter * 2;
  const tileWidth = Math.floor(
    (contentWidth - spacing.sm * (CATEGORY_COLUMNS - 1)) / CATEGORY_COLUMNS,
  );

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(todayIso());
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Held while the user confirms an unusually large amount (the "extra zeros" trap).
  const [pendingConfirm, setPendingConfirm] = useState(false);
  // Over-budget prompt (item 4): shown when an expense pushes the cycle negative,
  // so the user can declare untracked cash on hand instead of silently going red.
  const [overspendVisible, setOverspendVisible] = useState(false);
  const [overspendShortfall, setOverspendShortfall] = useState(0);
  const [extraCash, setExtraCash] = useState('');
  // Set when we arrived from the transactions list to edit an existing row.
  const [editingId, setEditingId] = useState<string | null>(null);

  // Prefill from the transactions list when editing; clear back to a blank form
  // when the screen is opened fresh (the Add tab passes no edit params).
  const editIdParam = firstParam(params.editId);
  useEffect(() => {
    if (editIdParam) {
      setEditingId(editIdParam);
      const t = firstParam(params.editType);
      if (t === 'income' || t === 'expense') setType(t);
      setAmount(firstParam(params.editAmount) ?? '');
      setCategory(firstParam(params.editCategory) ?? '');
      setDate(firstParam(params.editDate) ?? todayIso());
      setError('');
    } else {
      setEditingId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editIdParam]);

  // The user's own history + profile: history drives the "typical spend" typo
  // guard, and both together drive the over-budget prompt (AUDIT item 4).
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!isSignedIn) return;
      try {
        const token = await getTokenRef.current();
        if (!token) return;
        const [txRes, profileRes] = await Promise.all([
          apiRequest<TransactionsResponse>('/api/transactions', {}, token),
          apiRequest<ProfileResponse>('/api/profile', {}, token),
        ]);
        if (!active) return;
        setAllTransactions((txRes?.transactions ?? []) as Transaction[]);
        setProfile(profileRes?.user ?? null);
      } catch {
        // Non-fatal: without history/profile we fall back to the absolute ceiling
        // and skip the over-budget prompt.
      }
    })();
    return () => {
      active = false;
    };
  }, [isSignedIn]);

  const typicalSpend = useMemo(
    () => typicalExpense(allTransactions.filter((t) => t.type === 'expense').map((t) => t.amount)),
    [allTransactions],
  );

  // Real remaining balance this pay cycle (income + declared cash − expenses),
  // from the same shared computation Home uses, so the over-budget prompt agrees
  // with the Home card (AUDIT items 4/19). Skipped when income isn't set up.
  const spending = useMemo(
    () => summarizeByPayCycle(allTransactions, profile, new Date()),
    [allTransactions, profile],
  );
  const hasIncomeSetup = (profile?.monthlyIncome ?? 0) > 0 || spending.incomeThisMonth > 0;
  const remaining = spending.remainingBalance;

  // Recent-days rail for picking the transaction date — the quick path. The
  // calendar (item 16) covers everything outside this 14-day window.
  const dateOptions = useMemo(() => dateWindow(14, new Date()), []);
  const dateInWindow = dateOptions.includes(date);

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const switchType = (next: 'expense' | 'income') => {
    setType(next);
    setCategory('');
    setError('');
  };

  const resetForm = () => {
    setAmount('');
    setCategory('');
    setDate(todayIso());
  };

  const handleSave = async () => {
    setError('');

    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (!category) {
      setError('Pick a category.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim()) || Number.isNaN(new Date(date.trim()).getTime())) {
      setError('Enter the date as YYYY-MM-DD.');
      return;
    }
    if (!isSignedIn) {
      setError('Sign in to add transactions.');
      return;
    }

    // Only guard expenses — a large income (bonus, salary) is expected, not a typo.
    if (type === 'expense' && isAmountUnusual(amountValue, { typical: typicalSpend })) {
      setPendingConfirm(true);
      return;
    }

    await proceedAfterGuards(amountValue);
  };

  // Runs after the "extra zeros" guard has cleared. Catches an expense that pushes
  // the pay cycle negative and offers to capture untracked cash (items 4/12).
  const proceedAfterGuards = async (amountValue: number) => {
    if (type === 'expense' && !editingId && hasIncomeSetup) {
      const shortfall = amountValue - remaining;
      if (shortfall > 0) {
        setOverspendShortfall(shortfall);
        setOverspendVisible(true);
        return;
      }
    }
    await submitTransaction(amountValue);
  };

  const confirmOverspend = async () => {
    const cash = Number(extraCash);
    setOverspendVisible(false);
    if (Number.isFinite(cash) && cash > 0) {
      try {
        const token = await getToken();
        if (token) {
          await apiRequest({ method: 'put', url: '/api/profile', token, data: { addCashInHand: cash } });
          // Home / Safe-to-Spend / Goals re-read the budget with the new cash.
          emitAppEvent('profile:changed');
        }
      } catch {
        // Non-fatal: still log the expense — the balance just won't include the cash.
      }
    }
    setExtraCash('');
    await submitTransaction(Number(amount));
  };

  const cancelOverspend = () => {
    setOverspendVisible(false);
    setExtraCash('');
  };

  const submitTransaction = async (amountValue: number) => {
    try {
      setSaving(true);
      const token = await getToken();
      if (!token) {
        setError('Sign in again to save this transaction.');
        return;
      }

      const savedDate = date.trim();

      // Editing an existing row: PUT it, notify the money screens, and return to
      // the list. No XP / streak celebration — that only fires on a brand-new log.
      if (editingId) {
        await apiRequest({
          method: 'put',
          url: `/api/transactions/${editingId}`,
          token,
          data: { type, amount: amountValue, category, date: savedDate },
        });
        emitAppEvent('transaction:changed', { type, date: savedDate, amount: amountValue });
        setEditingId(null);
        resetForm();
        router.back();
        return;
      }

      await apiRequest<CreateTransactionResponse>({
        method: 'post',
        url: '/api/transactions',
        token,
        data: {
          type,
          amount: amountValue,
          category,
          date: savedDate,
        },
      });

      // Every screen showing money re-reads now, not on its next focus.
      emitAppEvent('transaction:changed', { type, date: savedDate, amount: amountValue });

      // Logging today keeps the streak alive — the celebration host picks this
      // up and pops the streak screen once per day, wherever the user is.
      const celebrate = savedDate === todayIso();
      if (celebrate) emitAppEvent('streak:advanced', { date: savedDate });

      resetForm();

      router.push({
        pathname: '/(tabs)/entry-added',
        params: {
          type,
          amount: String(amountValue),
          category,
          celebrate: celebrate ? '1' : '0',
        },
      });
    } catch (saveError: any) {
      setError(saveError.message || 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
      <ScreenContainer
        contentStyle={{ gap: spacing.lg }}
        header={
          <View style={{ paddingHorizontal: layout.gutter }}>
            <Navbar />
          </View>
        }
      >
      <View style={styles.headerBlock}>
        <AppText variant="h1" color="textPrimary">
          {editingId ? 'Edit' : 'Add'} {type === 'expense' ? 'Expense' : 'Income'}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {editingId
            ? 'Fix a wrong amount, category, or date — everything updates instantly. ⚡'
            : 'Track it here — Home and Insights update instantly. ⚡'}
        </AppText>
      </View>

      {/* Expense / Income toggle */}
      <View style={styles.segmentWrap}>
        {(['expense', 'income'] as const).map((option) => {
          const active = type === option;
          return (
            <Pressable
              key={option}
              style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              onPress={() => switchType(option)}
            >
              <Icon
                name={option === 'expense' ? 'ArrowUpRight' : 'ArrowDownLeft'}
                size={16}
                color={active ? palette.primaryDeep : palette.textTertiary}
                clickable={false}
              />
              <AppText
                variant="bodySm"
                weight="bold"
                style={{ color: active ? palette.primaryDeep : palette.textSecondary }}
              >
                {option === 'expense' ? 'Expense' : 'Income'}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {/* Amount */}
      <Card variant="elevated" padding={20} style={styles.amountCard}>
        <AppText variant="micro" color="textSecondary" style={styles.fieldLabel}>
          AMOUNT
        </AppText>
        <View style={styles.amountRow}>
          <AppText variant="moneyLg" color="textPrimary">
            {currencySymbol()}
          </AppText>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            style={styles.amountInput}
            placeholder="0"
            placeholderTextColor={palette.textTertiary}
            keyboardType="decimal-pad"
            maxLength={10}
            accessibilityLabel="Transaction amount"
            accessibilityHint="Enter the expense or income amount"
          />
        </View>
      </Card>

      {/* Category grid */}
      <View style={{ gap: spacing.sm }}>
        <AppText variant="micro" color="textSecondary" style={styles.fieldLabel}>
          CATEGORY
        </AppText>
        <View style={styles.categoryGrid}>
          {categories.map((item) => {
            const selected = category === item.label;
            return (
              <PressableScale
                key={item.id}
                style={[styles.catTile, { width: tileWidth }, selected && styles.catTileSelected]}
                onPress={() => setCategory(item.label)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={item.label}
              >
                <View
                  style={[
                    styles.catIconBubble,
                    { backgroundColor: selected ? item.color : withAlpha(item.color, 0.14) },
                  ]}
                >
                  <Icon
                    name={item.lucide}
                    size={22}
                    color={selected ? palette.white : item.color}
                    clickable={false}
                  />
                </View>
                <AppText
                  variant="caption"
                  weight={selected ? 'bold' : 'semibold'}
                  numberOfLines={1}
                  style={{ color: selected ? palette.primaryDeep : palette.textSecondary }}
                >
                  {item.label}
                </AppText>
                {selected ? (
                  <View style={styles.catCheck}>
                    <Icon name="Check" size={11} color={palette.white} clickable={false} />
                  </View>
                ) : null}
              </PressableScale>
            );
          })}
        </View>
      </View>

      {/* Date */}
      <View style={{ gap: spacing.sm }}>
        <View style={styles.dateLabelRow}>
          <AppText variant="micro" color="textSecondary" style={styles.fieldLabel}>
            DATE
          </AppText>
          <Pressable onPress={() => setDate(todayIso())} hitSlop={8}>
            <AppText variant="caption" color="primaryDeep" weight="bold">
              Today
            </AppText>
          </Pressable>
        </View>
        <Card variant="elevated" padding={12}>
          <DateStrip dates={dateOptions} value={date} onSelect={setDate} />
        </Card>
        {/* Anything older or further ahead than the 14-day rail — a real calendar. */}
        <Pressable style={styles.pickDateBtn} onPress={() => setDatePickerVisible(true)}>
          <Icon name="CalendarDays" size={16} color={palette.textSecondary} clickable={false} />
          <AppText
            variant="caption"
            color={dateInWindow ? 'textSecondary' : 'textPrimary'}
            weight={dateInWindow ? undefined : 'bold'}
            style={{ flex: 1 }}
          >
            {dateInWindow ? 'Pick another date' : formatDateLabel(date)}
          </AppText>
          <Icon name="ChevronRight" size={16} color={palette.textTertiary} clickable={false} />
        </Pressable>
      </View>

      {error ? (
        <AppText variant="caption" weight="bold" style={{ color: palette.danger }}>
          {error}
        </AppText>
      ) : null}

      {/* Save */}
      <PressableScale style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        <LinearGradient
          colors={gradients.brand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.saveBtnContent}>
          {saving ? (
            <ActivityIndicator color={palette.white} />
          ) : (
            <>
              <Icon name={editingId ? 'Check' : 'Plus'} size={18} color={palette.white} clickable={false} />
              <AppText variant="bodySm" color="onDark" weight="bold">
                {editingId ? 'Save changes' : `Save ${type === 'expense' ? 'Expense' : 'Income'}`}
              </AppText>
            </>
          )}
        </View>
      </PressableScale>

      {/* Manage what's already logged — fix a wrong amount or delete a mistake. */}
      <Card
        variant="elevated"
        padding={16}
        style={styles.splitCard}
        onPress={() => router.push('/(tabs)/transactions')}
      >
        <View style={styles.splitIconWrap}>
          <Icon name="ReceiptText" size={20} color={palette.primaryDeep} clickable={false} />
        </View>
        <View style={styles.splitTextWrap}>
          <AppText variant="bodySm" color="textPrimary" weight="bold">
            View transactions
          </AppText>
          <AppText variant="micro" color="textSecondary">
            Edit or delete anything you&apos;ve logged
          </AppText>
        </View>
        <Icon name="ChevronRight" size={16} color={palette.textSecondary} clickable={false} />
      </Card>

      {!editingId && (
      <>
      {/* Bulk import — paste a whole day instead of logging one at a time (item 14). */}
      <Card
        variant="elevated"
        padding={16}
        style={styles.splitCard}
        onPress={() => router.push('/(tabs)/import')}
      >
        <View style={styles.splitIconWrap}>
          <Icon name="ClipboardList" size={20} color={palette.primaryDeep} clickable={false} />
        </View>
        <View style={styles.splitTextWrap}>
          <AppText variant="bodySm" color="textPrimary" weight="bold">
            Import a day
          </AppText>
          <AppText variant="micro" color="textSecondary">
            Paste a whole day&apos;s transactions at once
          </AppText>
        </View>
        <Icon name="ChevronRight" size={16} color={palette.textSecondary} clickable={false} />
      </Card>

      {/* Split flows */}
      <View style={styles.orDividerRow}>
        <View style={styles.orDividerLine} />
        <AppText variant="micro" color="textTertiary">
          SHARING WITH OTHERS?
        </AppText>
        <View style={styles.orDividerLine} />
      </View>

      <Card
        variant="elevated"
        padding={16}
        style={styles.splitCard}
        onPress={() => router.push('/(tabs)/AddNewExpense')}
      >
        <View style={styles.splitIconWrap}>
          <Icon name="Handshake" size={20} color={palette.primaryDeep} clickable={false} />
        </View>
        <View style={styles.splitTextWrap}>
          <AppText variant="bodySm" color="textPrimary" weight="bold">
            Split with friends
          </AppText>
          <AppText variant="micro" color="textSecondary">
            Add a shared expense and split it fairly
          </AppText>
        </View>
        <Icon name="ChevronRight" size={16} color={palette.textSecondary} clickable={false} />
      </Card>

      <Card
        variant="elevated"
        padding={16}
        style={styles.splitCard}
        onPress={() => router.push('/(tabs)/YourGroups')}
      >
        <View style={styles.splitIconWrap}>
          <Icon name="Users" size={20} color={palette.primaryDeep} clickable={false} />
        </View>
        <View style={styles.splitTextWrap}>
          <AppText variant="bodySm" color="textPrimary" weight="bold">
            Group expense
          </AppText>
          <AppText variant="micro" color="textSecondary">
            Add spending to one of your groups
          </AppText>
        </View>
        <Icon name="ChevronRight" size={16} color={palette.textSecondary} clickable={false} />
      </Card>
      </>
      )}

      <ConfirmDialog
        visible={pendingConfirm}
        title="That's a large amount"
        message={`You're about to log ${formatMoney(Number(amount) || 0, { signDisplay: 'none' })} as an expense${
          typicalSpend > 0 ? `, well above your usual spend of about ${formatMoney(typicalSpend, { signDisplay: 'none' })}` : ''
        }. Double-check you didn't add an extra zero.`}
        confirmText="Yes, it's correct"
        cancelText="Let me fix it"
        loading={saving}
        onCancel={() => setPendingConfirm(false)}
        onConfirm={() => {
          setPendingConfirm(false);
          proceedAfterGuards(Number(amount));
        }}
      />

      {/* Over-budget prompt — capture untracked cash on hand (AUDIT items 4/12). */}
      <Modal visible={overspendVisible} transparent animationType="fade" onRequestClose={cancelOverspend}>
        <View style={styles.overspendOverlay} accessibilityViewIsModal={true}>
          <View style={styles.overspendCard}>
            <View style={styles.overspendIcon}>
              <Icon name="CircleAlert" size={22} color={palette.warning} clickable={false} />
            </View>
            <AppText variant="title" weight="bold" color="textPrimary" style={{ textAlign: 'center' }}>
              This goes over your budget
            </AppText>
            <AppText variant="caption" color="textSecondary" style={{ textAlign: 'center' }}>
              You&apos;ve got {formatCurrency(Math.max(0, Math.round(remaining)))} left this cycle, so this puts you about{' '}
              {formatCurrency(Math.round(overspendShortfall))} over. Got extra cash on hand that isn&apos;t tracked here?
              Add it so your balance stays honest.
            </AppText>
            <View style={styles.overspendInputRow}>
              <AppText variant="moneyLg" color="textPrimary">
                {currencySymbol()}
              </AppText>
              <TextInput
                value={extraCash}
                onChangeText={setExtraCash}
                style={styles.overspendInput}
                placeholder="0"
                placeholderTextColor={palette.textTertiary}
                keyboardType="decimal-pad"
                maxLength={10}
                autoFocus
                accessibilityLabel="Extra cash on hand amount"
                accessibilityHint="Enter cash on hand to offset overspend"
              />
            </View>
            <AppText variant="micro" color="textTertiary" style={{ textAlign: 'center' }}>
              Leave it blank if you don&apos;t — the expense still saves and your balance will show you&apos;re over.
            </AppText>
            <View style={styles.overspendActions}>
              <Button variant="outline" size="md" onPress={cancelOverspend} style={{ flex: 1 }}>
                Cancel
              </Button>
              <Button variant="primary" size="md" onPress={confirmOverspend} disabled={saving} style={{ flex: 1 }}>
                {Number(extraCash) > 0 ? 'Add cash & save' : 'Save anyway'}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Calendar date picker — proper past/future selection + real validation (item 16). */}
      <Modal visible={datePickerVisible} transparent animationType="fade" onRequestClose={() => setDatePickerVisible(false)}>
        <Pressable style={styles.datePickerOverlay} onPress={() => setDatePickerVisible(false)}>
          <Pressable style={styles.datePickerCard} onPress={() => {}}>
            <AppText variant="title" color="textPrimary" weight="bold" style={{ marginBottom: spacing.md }}>
              Pick a date
            </AppText>
            <CalendarPicker
              value={date}
              minIso={DATE_MIN_ISO}
              maxIso={DATE_MAX_ISO}
              onSelect={(iso) => {
                setDate(iso);
                setDatePickerVisible(false);
              }}
            />
            <Button variant="outline" size="md" onPress={() => setDatePickerVisible(false)} style={{ marginTop: spacing.md }}>
              Cancel
            </Button>
          </Pressable>
        </Pressable>
      </Modal>
      </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    gap: 2,
  },
  segmentWrap: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segmentBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    ...shadows.xs,
  },
  segmentBtnActive: {
    backgroundColor: palette.primaryLight,
    borderColor: palette.primary,
  },
  amountCard: {
    gap: spacing.xs,
  },
  fieldLabel: {
    letterSpacing: 0.6,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  amountInput: {
    flex: 1,
    fontSize: 34,
    lineHeight: 44,
    // The figure the user is typing is a numeral — same serif as every other
    // amount in the app, so what they enter matches what they'll see back.
    fontFamily: numericFontFamily.extrabold,
    color: palette.textPrimary,
    paddingVertical: 0,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  catTile: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: palette.card,
    borderWidth: 1.5,
    borderColor: palette.border,
    ...shadows.xs,
  },
  catTileSelected: {
    backgroundColor: palette.primaryLight,
    borderColor: palette.primary,
  },
  catIconBubble: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: palette.border,
    backgroundColor: palette.card,
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  datePickerCard: {
    backgroundColor: palette.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  saveBtn: {
    minHeight: 52,
    borderRadius: radius.pill,
    overflow: 'hidden',
    ...shadows.primary,
  },
  saveBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 52,
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  orDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: palette.borderStrong,
  },
  splitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  splitIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitTextWrap: {
    flex: 1,
    gap: 1,
  },
  overspendOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  overspendCard: {
    backgroundColor: palette.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  overspendIcon: {
    alignSelf: 'center',
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: palette.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overspendInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  overspendInput: {
    flex: 1,
    fontSize: 28,
    fontFamily: numericFontFamily.extrabold,
    color: palette.textPrimary,
    paddingVertical: 0,
  },
  overspendActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
});
