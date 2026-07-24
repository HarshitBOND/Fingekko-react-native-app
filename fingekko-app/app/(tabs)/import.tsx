import { useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Navbar from '../../components/Navbar';
import DateStrip from '../../components/streak/DateStrip';
import { dateWindow, toIso } from '../../components/streak/utils';
import AppText from '../../components/ui/AppText';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Icon from '../../components/ui/Icon';
import PressableScale from '../../components/ui/PressableScale';
import ScreenContainer from '../../components/ui/ScreenContainer';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../constants/categories';
import { layout, numericFontFamily, palette, radius, shadows, spacing } from '../../constants/design';
import type {
  ApiTransaction,
  ImportCommitResponse,
  ImportPreviewResponse,
  ParsedImportRow,
} from '../../types';
import { emitAppEvent } from '../../lib/appEvents';
import { apiRequest } from '../../utils/api';
import { currencySymbol, formatMoney } from '../../utils/currency';

// Icon + colour for a category label, matching the transactions list.
const CATEGORY_META = new Map(
  [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => [c.label, { lucide: c.lucide, color: c.color }]),
);

const inr = (n: number) => formatMoney(n, { signDisplay: 'none' });
const todayIso = () => toIso(new Date());

function formatDateLabel(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  if (Number.isNaN(d.getTime())) return value ?? '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// A parsed row plus the local edit state (include toggle + amount as text).
type EditableRow = Omit<ParsedImportRow, 'amount'> & { include: boolean; amountText: string };

const PLACEHOLDER = `Paste one transaction per line, e.g.
250 lunch swiggy
1200 groceries
Rs. 499 netflix
Salary 20000`;

export default function ImportScreen() {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [step, setStep] = useState<'input' | 'review'>('input');
  const [date, setDate] = useState(todayIso());
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState('');

  const [rows, setRows] = useState<EditableRow[]>([]);
  const [detectedBalance, setDetectedBalance] = useState<number | null>(null);
  const [existing, setExisting] = useState<ApiTransaction[]>([]);
  const [removeIds, setRemoveIds] = useState<Set<string>>(new Set());
  const [pickerRow, setPickerRow] = useState<number | null>(null);

  const dateOptions = useMemo(() => dateWindow(14, new Date()), []);

  const updateRow = (index: number, patch: Partial<EditableRow>) => {
    setRows((cur) => cur.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const toggleRemove = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setRemoveIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const removeAll = existing.length > 0 && existing.every((t) => removeIds.has(t.id));
  const toggleRemoveAll = () => {
    Haptics.selectionAsync().catch(() => {});
    setRemoveIds(removeAll ? new Set() : new Set(existing.map((t) => t.id)));
  };

  const handlePreview = async () => {
    setError('');
    if (!text.trim()) {
      setError('Paste some transactions first.');
      return;
    }
    if (!isSignedIn) {
      setError('Sign in to import transactions.');
      return;
    }
    setLoading(true);
    try {
      const token = await getTokenRef.current();
      if (!token) throw new Error('Not signed in');
      const res = await apiRequest<ImportPreviewResponse>({
        method: 'post',
        url: '/api/transactions/import/preview',
        token,
        data: { text, date },
      });
      const parsed = res?.rows ?? [];
      if (parsed.length === 0) {
        setError("Couldn't find any transactions in that text. Try one per line.");
        return;
      }
      setRows(
        parsed.map((r) => ({
          raw: r.raw,
          type: r.type,
          category: r.category,
          ok: r.ok,
          note: r.note,
          include: r.ok, // rows we couldn't read default to off — the user opts them in.
          amountText: r.ok ? String(r.amount) : '',
        })),
      );
      setDetectedBalance(res?.detectedBalance ?? null);
      setExisting(res?.existingForDate ?? []);
      setRemoveIds(new Set());
      setStep('review');
    } catch (e: any) {
      setError(e?.message || 'Could not read that. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const includedRows = rows.filter((r) => r.include && Number(r.amountText) > 0);
  const addCount = includedRows.length;
  const removeCount = removeIds.size;

  const handleCommit = async () => {
    setError('');
    if (addCount === 0 && removeCount === 0) {
      setError('Nothing to import — include at least one row, or choose entries to replace.');
      return;
    }
    // Every included row needs a valid amount; catch a row toggled on but cleared.
    if (rows.some((r) => r.include && !(Number(r.amountText) > 0))) {
      setError('Every included row needs an amount greater than 0.');
      return;
    }
    setCommitting(true);
    try {
      const token = await getTokenRef.current();
      if (!token) throw new Error('Not signed in');
      const res = await apiRequest<ImportCommitResponse>({
        method: 'post',
        url: '/api/transactions/import/commit',
        token,
        data: {
          date,
          rejectTransactionIds: [...removeIds],
          rows: includedRows.map((r) => ({ type: r.type, amount: Number(r.amountText), category: r.category })),
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // Every money surface re-reads now. The payload is only a staleness signal
      // for a batch, so a representative row (the first one) stands in for it.
      const first = includedRows[0];
      emitAppEvent('transaction:changed', {
        type: first?.type ?? 'expense',
        date,
        amount: first ? Number(first.amountText) : 0,
      });
      if (date === todayIso() && (res?.created ?? 0) > 0) {
        emitAppEvent('streak:advanced', { date });
      }
      router.replace('/(tabs)/transactions');
    } catch (e: any) {
      setError(e?.message || 'Could not import. Try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setCommitting(false);
    }
  };

  const pickerCategories = pickerRow !== null && rows[pickerRow]?.type === 'income'
    ? INCOME_CATEGORIES
    : EXPENSE_CATEGORIES;

  return (
    <ScreenContainer
      contentStyle={{ gap: spacing.md }}
      header={<View style={{ paddingHorizontal: layout.gutter }}><Navbar /></View>}
    >
      <View style={styles.topBar}>
        <PressableScale
          style={styles.iconButton}
          onPress={() => (step === 'review' ? setStep('input') : router.back())}
          accessibilityLabel="Go back"
        >
          <Icon name="ChevronLeft" size={20} color={palette.textPrimary} />
        </PressableScale>
        <AppText variant="title" color="textPrimary" weight="bold">
          {step === 'input' ? 'Import a day' : 'Review & confirm'}
        </AppText>
        <View style={styles.iconPlaceholder} />
      </View>

      {error ? (
        <AppText variant="caption" weight="bold" style={{ color: palette.danger }}>{error}</AppText>
      ) : null}

      {step === 'input' ? (
        <>
          <AppText variant="caption" color="textSecondary">
            Logging a whole day one by one is tedious. Paste the day&apos;s transactions below —
            one per line — and we&apos;ll turn each into an entry you can check before saving.
          </AppText>

          <View style={{ gap: spacing.sm }}>
            <AppText variant="micro" color="textSecondary" style={styles.fieldLabel}>WHICH DAY</AppText>
            <Card variant="elevated" padding={12}>
              <DateStrip dates={dateOptions} value={date} onSelect={setDate} />
            </Card>
          </View>

          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="micro" color="textSecondary" style={styles.fieldLabel}>TRANSACTIONS</AppText>
              <Pressable
                onPress={() => {
                  try {
                    if (typeof document !== 'undefined') {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.csv,.txt,.tsv';
                      input.onchange = async (e: any) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const content = await file.text();
                          setText(content);
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                        }
                      };
                      input.click();
                    }
                  } catch (err) {
                    console.error('File import error:', err);
                  }
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Upload CSV or TXT file"
              >
                <AppText variant="micro" color="primaryDeep" weight="bold">
                  📁 Upload CSV / file
                </AppText>
              </Pressable>
            </View>
            <TextInput
              value={text}
              onChangeText={setText}
              style={styles.pasteBox}
              placeholder={PLACEHOLDER}
              placeholderTextColor={palette.textTertiary}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Transactions paste area"
              accessibilityHint="Paste lines or upload a CSV file"
            />
          </View>

          <Button variant="primary" size="md" onPress={handlePreview} loading={loading}>
            Preview
          </Button>
        </>
      ) : (
        <>
          <AppText variant="caption" color="textSecondary">
            Importing to <AppText variant="caption" color="textPrimary" weight="bold">{formatDateLabel(date)}</AppText>.
            Check each row, fix anything, and toggle off what you don&apos;t want.
          </AppText>

          {/* Collision flow: same-day manual entries the user may want to replace. */}
          {existing.length > 0 && (
            <Card variant="flat" padding={14} style={{ gap: spacing.sm, backgroundColor: palette.warningLight }}>
              <View style={styles.collisionHead}>
                <AppText variant="bodySm" color="textPrimary" weight="bold">
                  You already logged {existing.length} entr{existing.length === 1 ? 'y' : 'ies'} on this day
                </AppText>
                <Pressable onPress={toggleRemoveAll} hitSlop={6}>
                  <AppText variant="micro" color="primaryDeep" weight="bold">
                    {removeAll ? 'Keep all' : 'Replace all'}
                  </AppText>
                </Pressable>
              </View>
              <AppText variant="micro" color="textSecondary">
                Tick the ones this import replaces. Leave cash payments the statement doesn&apos;t
                know about unticked so they&apos;re kept.
              </AppText>
              {existing.map((t) => {
                const meta = CATEGORY_META.get(t.category);
                const marked = removeIds.has(t.id);
                return (
                  <Pressable key={t.id} onPress={() => toggleRemove(t.id)} style={styles.existingRow}>
                    <View style={[styles.checkbox, marked && styles.checkboxOn]}>
                      {marked && <Icon name="Check" size={12} color={palette.white} clickable={false} />}
                    </View>
                    <Icon
                      name={meta?.lucide ?? 'ReceiptText'}
                      size={16}
                      color={meta?.color ?? palette.textSecondary}
                      clickable={false}
                    />
                    <AppText
                      variant="micro"
                      color="textPrimary"
                      numberOfLines={1}
                      style={[{ flex: 1 }, marked && styles.strike]}
                    >
                      {t.category} · {t.type === 'income' ? '+' : ''}{inr(t.amount)}
                    </AppText>
                  </Pressable>
                );
              })}
            </Card>
          )}

          {/* Detected balance — shown for reference only (AUDIT item 38, decision:
              display the mismatch, never auto-adjust). The app tracks a pay-cycle
              budget, not a bank-account balance, so there's no like-for-like figure
              to force-equal — we deliberately don't try. */}
          {detectedBalance !== null && (
            <Card variant="flat" padding={12} style={{ backgroundColor: palette.infoLight, gap: 2 }}>
              <AppText variant="micro" color="textPrimary" weight="bold">
                Statement balance: {inr(detectedBalance)}
              </AppText>
              <AppText variant="micro" color="textSecondary">
                Shown for your reference. FinGekko tracks your spending budget, not a bank
                balance, so it won&apos;t change this on its own.
              </AppText>
            </Card>
          )}

          {/* Parsed rows */}
          <View style={{ gap: spacing.sm }}>
            {rows.map((r, index) => {
              const meta = CATEGORY_META.get(r.category);
              return (
                <Card
                  key={index}
                  variant="elevated"
                  padding={12}
                  style={[styles.row, !r.include && styles.rowOff]}
                >
                  <Pressable
                    onPress={() => updateRow(index, { include: !r.include })}
                    hitSlop={6}
                    style={[styles.checkbox, r.include && styles.checkboxOn]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: r.include }}
                    accessibilityLabel={`Include ${r.raw}`}
                  >
                    {r.include && <Icon name="Check" size={12} color={palette.white} clickable={false} />}
                  </Pressable>

                  <View style={styles.rowBody}>
                    <View style={styles.rowControls}>
                      {/* Type toggle */}
                      <Pressable
                        onPress={() => updateRow(index, { type: r.type === 'expense' ? 'income' : 'expense' })}
                        style={[styles.typePill, r.type === 'income' ? styles.typeIncome : styles.typeExpense]}
                        accessibilityLabel={`Type: ${r.type}, tap to switch`}
                      >
                        <Icon
                          name={r.type === 'income' ? 'ArrowDownLeft' : 'ArrowUpRight'}
                          size={12}
                          color={r.type === 'income' ? palette.success : palette.textSecondary}
                          clickable={false}
                        />
                        <AppText variant="micro" weight="bold" style={{ color: r.type === 'income' ? palette.success : palette.textSecondary }}>
                          {r.type === 'income' ? 'In' : 'Out'}
                        </AppText>
                      </Pressable>

                      {/* Category chip → picker */}
                      <Pressable
                        onPress={() => setPickerRow(index)}
                        style={styles.catChip}
                        accessibilityLabel={`Category: ${r.category}, tap to change`}
                      >
                        <Icon name={meta?.lucide ?? 'ReceiptText'} size={13} color={meta?.color ?? palette.textSecondary} clickable={false} />
                        <AppText variant="micro" color="textPrimary" numberOfLines={1}>{r.category}</AppText>
                        <Icon name="ChevronDown" size={12} color={palette.textTertiary} clickable={false} />
                      </Pressable>

                      {/* Amount */}
                      <View style={styles.amountWrap}>
                        <AppText variant="micro" color="textSecondary">{currencySymbol()}</AppText>
                        <TextInput
                          value={r.amountText}
                          onChangeText={(v) => updateRow(index, { amountText: v.replace(/[^0-9.]/g, '') })}
                          style={styles.amountInput}
                          placeholder="0"
                          placeholderTextColor={palette.textTertiary}
                          keyboardType="decimal-pad"
                          maxLength={10}
                        />
                      </View>
                    </View>

                    <AppText variant="micro" color={r.ok ? 'textTertiary' : 'danger'} numberOfLines={1}>
                      {r.ok ? r.raw : `${r.note ?? 'Check this'} — ${r.raw}`}
                    </AppText>
                  </View>
                </Card>
              );
            })}
          </View>

          <View style={styles.summaryRow}>
            <AppText variant="caption" color="textSecondary">
              {addCount} to add{removeCount > 0 ? ` · ${removeCount} to remove` : ''}
            </AppText>
          </View>

          <Button variant="primary" size="md" onPress={handleCommit} loading={committing}>
            {removeCount > 0 ? `Import ${addCount} & replace ${removeCount}` : `Import ${addCount}`}
          </Button>
          <Button variant="outline" size="md" onPress={() => setStep('input')}>
            Back to editing
          </Button>
        </>
      )}

      {/* Per-row category picker */}
      <Modal visible={pickerRow !== null} transparent animationType="fade" onRequestClose={() => setPickerRow(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setPickerRow(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <AppText variant="title" color="textPrimary" weight="bold" style={{ marginBottom: spacing.md }}>
              Pick a category
            </AppText>
            <View style={styles.catGrid}>
              {pickerCategories.map((c) => {
                const active = pickerRow !== null && rows[pickerRow]?.category === c.label;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      if (pickerRow !== null) updateRow(pickerRow, { category: c.label });
                      setPickerRow(null);
                    }}
                    style={[styles.catOption, active && { backgroundColor: c.color + '22', borderColor: c.color }]}
                  >
                    <Icon name={c.lucide} size={16} color={c.color} clickable={false} />
                    <AppText variant="caption" color="textPrimary">{c.label}</AppText>
                  </Pressable>
                );
              })}
            </View>
            <Button variant="outline" size="md" onPress={() => setPickerRow(null)} style={{ marginTop: spacing.md }}>
              Cancel
            </Button>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: {
    width: 38, height: 38, borderRadius: radius.pill, backgroundColor: palette.card,
    alignItems: 'center', justifyContent: 'center', ...shadows.sm,
  },
  iconPlaceholder: { width: 38, height: 38 },
  fieldLabel: { letterSpacing: 0.6 },
  pasteBox: {
    minHeight: 150,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: palette.border,
    backgroundColor: palette.card,
    padding: 14,
    fontSize: 15,
    color: palette.textPrimary,
    lineHeight: 22,
  },
  collisionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  existingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  strike: { textDecorationLine: 'line-through', color: palette.textTertiary },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  rowOff: { opacity: 0.5 },
  rowBody: { flex: 1, gap: 6 },
  rowControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: palette.border,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  checkboxOn: { backgroundColor: palette.primary, borderColor: palette.primary },
  typePill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1,
  },
  typeExpense: { borderColor: palette.border, backgroundColor: palette.bg },
  typeIncome: { borderColor: palette.success + '55', backgroundColor: palette.successLight },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: radius.pill,
    borderWidth: 1, borderColor: palette.border, backgroundColor: palette.bg, maxWidth: 150,
  },
  amountWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 'auto',
    borderWidth: 1, borderColor: palette.border, borderRadius: radius.md,
    paddingHorizontal: 8, minWidth: 78,
  },
  amountInput: {
    flex: 1, fontFamily: numericFontFamily.bold, fontSize: 15,
    color: palette.textPrimary, paddingVertical: 6,
  },
  summaryRow: { alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.lg },
  modalCard: { backgroundColor: palette.card, borderRadius: radius.xl, padding: spacing.lg },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  catOption: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.pill,
    borderWidth: 1, borderColor: palette.border, backgroundColor: palette.bg,
  },
});
