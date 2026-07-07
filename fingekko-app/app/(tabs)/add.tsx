import { useAuth } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Navbar from '../../components/Navbar';
import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import Icon from '../../components/ui/Icon';
import PressableScale from '../../components/ui/PressableScale';
import ScreenContainer from '../../components/ui/ScreenContainer';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../constants/categories';
import { fontFamily, gradients, layout, palette, radius, shadows, spacing } from '../../constants/design';
import { apiRequest } from '../../utils/api';

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

const todayIso = () => new Date().toISOString().split('T')[0];

export default function AddScreen() {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(todayIso());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

    try {
      setSaving(true);
      const token = await getToken();
      if (!token) {
        setError('Sign in again to save this transaction.');
        return;
      }

      const response = await apiRequest<CreateTransactionResponse>({
        method: 'post',
        url: '/api/transactions',
        token,
        data: {
          type,
          amount: amountValue,
          category,
          date: date.trim(),
        },
      });

      resetForm();

      const award = response?.xpAward;
      const xpLine = award
        ? award.leveledUp
          ? `+${award.xpDelta} XP — you reached Level ${award.level}! 🎉`
          : `+${award.xpDelta} XP earned ⚡ (${award.xp} total)`
        : 'Saved successfully.';

      Alert.alert(
        type === 'expense' ? 'Expense added!' : 'Income added!',
        `${xpLine}\nYour Home and Insights are updated.`,
        [
          { text: 'View Insights', onPress: () => router.push('/(tabs)/insights') },
          { text: 'Done', onPress: () => router.push('/(tabs)'), style: 'default' },
        ]
      );
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
          Add {type === 'expense' ? 'Expense' : 'Income'}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          Track it here — Home and Insights update instantly. ⚡
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
            ₹
          </AppText>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            style={styles.amountInput}
            placeholder="0"
            placeholderTextColor={palette.textTertiary}
            keyboardType="decimal-pad"
            maxLength={10}
          />
        </View>
      </Card>

      {/* Category chips */}
      <View style={{ gap: spacing.sm }}>
        <AppText variant="micro" color="textSecondary" style={styles.fieldLabel}>
          CATEGORY
        </AppText>
        <View style={styles.chipGrid}>
          {categories.map((item) => {
            const selected = category === item.label;
            return (
              <Pressable
                key={item.id}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setCategory(item.label)}
              >
                <AppText style={styles.chipEmoji}>{item.emoji}</AppText>
                <AppText
                  variant="caption"
                  weight="bold"
                  style={{ color: selected ? palette.primaryDeep : palette.textSecondary }}
                >
                  {item.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Date */}
      <View style={{ gap: spacing.sm }}>
        <AppText variant="micro" color="textSecondary" style={styles.fieldLabel}>
          DATE
        </AppText>
        <View style={styles.dateWrap}>
          <View style={styles.dateIconBubble}>
            <Icon name="Calendar" size={18} color={palette.primaryDeep} clickable={false} />
          </View>
          <TextInput
            value={date}
            onChangeText={setDate}
            style={styles.dateInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={palette.textTertiary}
          />
          <Pressable onPress={() => setDate(todayIso())} hitSlop={8}>
            <AppText variant="caption" color="primaryDeep" weight="bold">
              Today
            </AppText>
          </Pressable>
        </View>
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
              <Icon name="Plus" size={18} color={palette.white} clickable={false} />
              <AppText variant="bodySm" color="onDark" weight="bold">
                Save {type === 'expense' ? 'Expense' : 'Income'}
              </AppText>
            </>
          )}
        </View>
      </PressableScale>

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
    lineHeight: 40,
    fontFamily: fontFamily.extrabold,
    color: palette.textPrimary,
    paddingVertical: 0,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.xs,
  },
  chipSelected: {
    backgroundColor: palette.primaryLight,
    borderColor: palette.primary,
  },
  chipEmoji: {
    fontSize: 14,
  },
  dateWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 50,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    backgroundColor: palette.card,
    borderWidth: 1.5,
    borderColor: palette.border,
  },
  dateIconBubble: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateInput: {
    flex: 1,
    fontSize: 15,
    color: palette.textPrimary,
    paddingVertical: 0,
    fontFamily: fontFamily.semibold,
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
});
