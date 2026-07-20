import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { layout, palette, radius, spacing } from '@/constants/design';
import AppText from '../ui/AppText';
import Icon from '../ui/Icon';
import { PayerConfig, Person } from './splitModel';

type Props = {
  visible: boolean;
  totalAmount: number;
  people: Person[];
  currentUserId: string;
  value: PayerConfig;
  onClose: () => void;
  onDone: (config: PayerConfig) => void;
};

const inr = (n: number) => `₹${(Number.isFinite(n) ? n : 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const getInitials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

export default function WhoPaidModal({ visible, totalAmount, people, currentUserId, value, onClose, onDone }: Props) {
  // 'list' is the single-payer picker; 'amounts' is the multi-payer entry sheet.
  const [view, setView] = useState<'list' | 'amounts'>('list');
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setError('');
    setView(value.mode === 'multiple' ? 'amounts' : 'list');
    const next: Record<string, string> = {};
    people.forEach((p) => {
      next[p.id] = value.mode === 'multiple' && value.amounts[p.id] ? String(value.amounts[p.id]) : '';
    });
    setAmounts(next);
  }, [visible, value, people]);

  const singleId = value.mode === 'single' ? value.id || currentUserId : '';

  const enteredTotal = useMemo(
    () => Object.values(amounts).reduce((s, v) => s + (Number(v) || 0), 0),
    [amounts]
  );

  const pickSingle = (id: string) => onDone({ mode: 'single', id });

  const confirmMultiple = () => {
    setError('');
    if (Math.abs(enteredTotal - totalAmount) > 0.01) {
      return setError(`Paid amounts must add up to ${inr(totalAmount)}.`);
    }
    const parsed: Record<string, number> = {};
    Object.entries(amounts).forEach(([id, v]) => {
      if (Number(v) > 0) parsed[id] = Number(v);
    });
    if (Object.keys(parsed).length < 2) {
      return setError('Enter amounts for at least two people, or pick a single payer.');
    }
    onDone({ mode: 'multiple', amounts: parsed });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            style={styles.headerBtn}
            onPress={() => (view === 'amounts' ? setView('list') : onClose())}
            hitSlop={6}
          >
            <Icon name="ArrowLeft" size={22} color={palette.textPrimary} clickable={false} />
          </Pressable>
          <AppText variant="title" weight="bold">
            {view === 'amounts' ? 'Enter paid amounts' : 'Who paid?'}
          </AppText>
          {view === 'amounts' ? (
            <Pressable style={styles.headerBtn} onPress={confirmMultiple} hitSlop={6}>
              <Icon name="Check" size={22} color={palette.primaryDeep} clickable={false} />
            </Pressable>
          ) : (
            <View style={styles.headerBtn} />
          )}
        </View>

        {view === 'list' ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xl }}>
            {people.map((person, i) => {
              const selected = person.id === singleId;
              return (
                <Pressable
                  key={person.id}
                  style={[styles.row, i !== people.length - 1 && styles.rowDivider]}
                  onPress={() => pickSingle(person.id)}
                >
                  <View style={styles.avatar}>
                    <AppText variant="caption" color="primaryDeep" weight="bold">{getInitials(person.name)}</AppText>
                  </View>
                  <AppText variant="label" style={{ flex: 1 }} numberOfLines={1}>
                    {person.isYou ? 'You' : person.name}
                  </AppText>
                  {selected && <Icon name="Check" size={20} color={palette.primaryDeep} clickable={false} />}
                </Pressable>
              );
            })}

            <Pressable style={styles.multiRow} onPress={() => setView('amounts')}>
              <AppText variant="label" color="primaryDeep">Multiple people</AppText>
              <Icon name="ChevronRight" size={18} color={palette.primaryDeep} clickable={false} />
            </Pressable>
          </ScrollView>
        ) : (
          <>
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
            >
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: spacing.xl }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
              >
                {people.map((person, i) => (
                  <View key={person.id} style={[styles.row, i !== people.length - 1 && styles.rowDivider]}>
                    <View style={styles.avatar}>
                      <AppText variant="caption" color="primaryDeep" weight="bold">{getInitials(person.name)}</AppText>
                    </View>
                    <AppText variant="label" style={{ flex: 1 }} numberOfLines={1}>
                      {person.isYou ? 'You' : person.name}
                    </AppText>
                    <View style={styles.amountBox}>
                      <AppText variant="bodySm" color="textTertiary">₹</AppText>
                      <TextInput
                        value={amounts[person.id] ?? ''}
                        onChangeText={(t) => setAmounts((p) => ({ ...p, [person.id]: t }))}
                        placeholder="0.00"
                        placeholderTextColor={palette.textTertiary}
                        keyboardType="decimal-pad"
                        style={styles.amountInput}
                      />
                    </View>
                  </View>
                ))}
              </ScrollView>

              {!!error && (
                <AppText variant="caption" color="danger" align="center" style={{ marginBottom: spacing.sm }}>
                  {error}
                </AppText>
              )}

              <View style={styles.footer}>
                <AppText variant="title" weight="bold">{inr(enteredTotal)} of {inr(totalAmount)}</AppText>
                <AppText variant="caption" color={Math.abs(totalAmount - enteredTotal) < 0.01 ? 'success' : 'danger'}>
                  {inr(Math.max(0, totalAmount - enteredTotal))} left
                </AppText>
              </View>
            </KeyboardAvoidingView>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingVertical: spacing.md,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.gutter,
    paddingVertical: spacing.md,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: palette.divider },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingVertical: spacing.lg,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: palette.divider,
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderBottomWidth: 1.5,
    borderBottomColor: palette.border,
    minWidth: 92,
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  amountInput: { minWidth: 64, textAlign: 'right', fontSize: 16, color: palette.textPrimary, padding: 0 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: palette.divider,
  },
});
