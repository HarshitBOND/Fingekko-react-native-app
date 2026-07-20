import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { layout, palette, radius, spacing } from '@/constants/design';
import AppText from '../ui/AppText';
import Icon from '../ui/Icon';
import {
  Person,
  resolveSplit,
  SplitConfig,
  SplitMode,
  splitEvenly,
} from './splitModel';

type Props = {
  visible: boolean;
  totalAmount: number;
  people: Person[];
  value: SplitConfig;
  onClose: () => void;
  onDone: (config: SplitConfig) => void;
};

const inr = (n: number) => `₹${(Number.isFinite(n) ? n : 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const getInitials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';

const TABS: { mode: SplitMode; label: string }[] = [
  { mode: 'equally', label: 'Equally' },
  { mode: 'unequally', label: 'Unequally' },
  { mode: 'percentages', label: 'By percentages' },
];

const MODE_COPY: Record<SplitMode, { title: string; subtitle: string }> = {
  equally: { title: 'Split equally', subtitle: 'Select which people owe an equal share.' },
  unequally: { title: 'Split by exact amounts', subtitle: 'Specify exactly how much each person owes.' },
  percentages: { title: 'Split by percentages', subtitle: 'Enter what share of the bill each person covers.' },
};

export default function AdjustSplitModal({ visible, totalAmount, people, value, onClose, onDone }: Props) {
  const [mode, setMode] = useState<SplitMode>('equally');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [percents, setPercents] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  // Seed each tab's working state from the incoming config every time we open,
  // so re-opening reflects what was last confirmed rather than stale edits.
  useEffect(() => {
    if (!visible) return;
    setError('');
    const allIds = people.map((p) => p.id);

    setMode(value.mode);
    setSelectedIds(value.mode === 'equally' ? value.selectedIds : allIds);

    const amt: Record<string, string> = {};
    const pct: Record<string, string> = {};
    people.forEach((p) => {
      amt[p.id] = value.mode === 'unequally' && value.amounts[p.id] ? String(value.amounts[p.id]) : '';
      pct[p.id] = value.mode === 'percentages' && value.percents[p.id] ? String(value.percents[p.id]) : '';
    });
    setAmounts(amt);
    setPercents(pct);
  }, [visible, value, people]);

  const allSelected = people.length > 0 && selectedIds.length === people.length;

  const perPerson = selectedIds.length > 0 ? totalAmount / selectedIds.length : 0;
  const equalPreview = useMemo(() => splitEvenly(totalAmount, selectedIds), [totalAmount, selectedIds]);

  const amountTotal = useMemo(
    () => Object.values(amounts).reduce((s, v) => s + (Number(v) || 0), 0),
    [amounts]
  );
  const percentTotal = useMemo(
    () => Object.values(percents).reduce((s, v) => s + (Number(v) || 0), 0),
    [percents]
  );

  const togglePerson = (id: string) =>
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const toggleAll = () => setSelectedIds(allSelected ? [] : people.map((p) => p.id));

  const confirm = () => {
    setError('');
    if (mode === 'equally') {
      if (selectedIds.length === 0) return setError('Select at least one person.');
      return onDone({ mode: 'equally', selectedIds });
    }
    if (mode === 'unequally') {
      if (Math.abs(amountTotal - totalAmount) > 0.01) {
        return setError(`Amounts must add up to ${inr(totalAmount)}.`);
      }
      const parsed: Record<string, number> = {};
      Object.entries(amounts).forEach(([id, v]) => {
        if (Number(v) > 0) parsed[id] = Number(v);
      });
      return onDone({ mode: 'unequally', amounts: parsed });
    }
    // percentages
    if (Math.abs(percentTotal - 100) > 0.01) {
      return setError(`Percentages must add up to 100% (currently ${percentTotal.toFixed(1)}%).`);
    }
    const parsed: Record<string, number> = {};
    Object.entries(percents).forEach(([id, v]) => {
      if (Number(v) > 0) parsed[id] = Number(v);
    });
    onDone({ mode: 'percentages', percents: parsed });
  };

  const previewOwed = mode === 'percentages'
    ? resolveSplit(
        { mode: 'percentages', percents: Object.fromEntries(Object.entries(percents).map(([k, v]) => [k, Number(v) || 0])) },
        totalAmount
      )
    : {};

  const renderRight = (person: Person) => {
    if (mode === 'equally') {
      const on = selectedIds.includes(person.id);
      return (
        <Pressable onPress={() => togglePerson(person.id)} hitSlop={8}>
          <View style={[styles.checkbox, on && styles.checkboxOn]}>
            {on && <Icon name="Check" size={14} color={palette.white} clickable={false} />}
          </View>
        </Pressable>
      );
    }
    if (mode === 'unequally') {
      return (
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
      );
    }
    return (
      <View style={styles.pctRow}>
        {!!previewOwed[person.id] && (
          <AppText variant="micro" color="textTertiary">{inr(previewOwed[person.id])}</AppText>
        )}
        <View style={styles.amountBox}>
          <TextInput
            value={percents[person.id] ?? ''}
            onChangeText={(t) => setPercents((p) => ({ ...p, [person.id]: t }))}
            placeholder="0"
            placeholderTextColor={palette.textTertiary}
            keyboardType="decimal-pad"
            style={styles.pctInput}
          />
          <AppText variant="bodySm" color="textTertiary">%</AppText>
        </View>
      </View>
    );
  };

  const copy = MODE_COPY[mode];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable style={styles.headerBtn} onPress={onClose} hitSlop={6}>
            <Icon name="ArrowLeft" size={22} color={palette.textPrimary} clickable={false} />
          </Pressable>
          <AppText variant="title" weight="bold">Adjust split</AppText>
          <Pressable style={styles.headerBtn} onPress={confirm} hitSlop={6}>
            <Icon name="Check" size={22} color={palette.primaryDeep} clickable={false} />
          </Pressable>
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {TABS.map((t) => {
            const active = mode === t.mode;
            return (
              <Pressable key={t.mode} style={styles.tab} onPress={() => { setMode(t.mode); setError(''); }}>
                <AppText variant="label" style={{ color: active ? palette.textPrimary : palette.textTertiary }}>
                  {t.label}
                </AppText>
                <View style={[styles.tabUnderline, active && styles.tabUnderlineActive]} />
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.copyBlock}>
          <AppText variant="title" weight="bold" align="center">{copy.title}</AppText>
          <AppText variant="bodySm" color="textSecondary" align="center" style={{ marginTop: 2 }}>
            {copy.subtitle}
          </AppText>
        </View>

        {/* Keyboard-avoiding so typing amounts/percentages never hides the
            names; the list scrolls independently for large member counts. */}
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
          showsVerticalScrollIndicator
        >
          {people.map((person, i) => (
            <View key={person.id} style={[styles.row, i !== people.length - 1 && styles.rowDivider]}>
              <View style={styles.avatar}>
                <AppText variant="caption" color="primaryDeep" weight="bold">{getInitials(person.name)}</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="label" numberOfLines={1}>{person.isYou ? 'You' : person.name}</AppText>
                {mode === 'equally' && selectedIds.includes(person.id) && (
                  <AppText variant="micro" color="textTertiary">{inr(equalPreview[person.id] ?? perPerson)}</AppText>
                )}
              </View>
              {renderRight(person)}
            </View>
          ))}
        </ScrollView>

        {!!error && (
          <AppText variant="caption" color="danger" align="center" style={{ marginBottom: spacing.sm }}>
            {error}
          </AppText>
        )}

        {/* Footer summary — mirrors Splitwise's running totals */}
        <View style={styles.footer}>
          {mode === 'equally' && (
            <>
              <View>
                <AppText variant="title" weight="bold">{inr(perPerson)}/person</AppText>
                <AppText variant="caption" color="textSecondary">({selectedIds.length} {selectedIds.length === 1 ? 'person' : 'people'})</AppText>
              </View>
              <Pressable style={styles.allToggle} onPress={toggleAll} hitSlop={6}>
                <AppText variant="label" color="textSecondary">All</AppText>
                <View style={[styles.checkbox, allSelected && styles.checkboxOn]}>
                  {allSelected && <Icon name="Check" size={14} color={palette.white} clickable={false} />}
                </View>
              </Pressable>
            </>
          )}
          {mode === 'unequally' && (
            <View style={{ alignItems: 'center', flex: 1 }}>
              <AppText variant="title" weight="bold">{inr(amountTotal)} of {inr(totalAmount)}</AppText>
              <AppText variant="caption" color={Math.abs(totalAmount - amountTotal) < 0.01 ? 'success' : 'danger'}>
                {inr(Math.max(0, totalAmount - amountTotal))} left
              </AppText>
            </View>
          )}
          {mode === 'percentages' && (
            <View style={{ alignItems: 'center', flex: 1 }}>
              <AppText variant="title" weight="bold">{percentTotal.toFixed(1)}% of 100%</AppText>
              <AppText variant="caption" color={Math.abs(100 - percentTotal) < 0.01 ? 'success' : 'danger'}>
                {Math.max(0, 100 - percentTotal).toFixed(1)}% left
              </AppText>
            </View>
          )}
        </View>
        </KeyboardAvoidingView>
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

  tabs: { paddingHorizontal: layout.gutter, gap: spacing.lg },
  tab: { paddingTop: spacing.xs, alignItems: 'center' },
  tabUnderline: { height: 3, borderRadius: 2, backgroundColor: 'transparent', marginTop: spacing.sm, alignSelf: 'stretch', width: '100%' },
  tabUnderlineActive: { backgroundColor: palette.primaryDeep },

  copyBlock: { paddingHorizontal: layout.gutter, paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: palette.divider },

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
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: palette.primary, borderColor: palette.primary },
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
  amountInput: {
    minWidth: 64,
    textAlign: 'right',
    fontSize: 16,
    color: palette.textPrimary,
    padding: 0,
  },
  pctRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pctInput: { minWidth: 40, textAlign: 'right', fontSize: 16, color: palette.textPrimary, padding: 0 },

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
  allToggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
