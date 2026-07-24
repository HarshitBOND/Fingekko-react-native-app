import { useAuth } from '@clerk/clerk-expo';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Navbar from '../../components/Navbar';
import ConfirmDialog from '../../components/ConfirmDialog';
import AppText from '../../components/ui/AppText';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import Icon from '../../components/ui/Icon';
import Input from '../../components/ui/Input';
import PressableScale from '../../components/ui/PressableScale';
import ScreenContainer from '../../components/ui/ScreenContainer';
import { ESSENTIAL_CATEGORIES, essentialCategoryMeta } from '../../constants/essentials';
import { layout, palette, radius, shadows, spacing } from '../../constants/design';
import type { ApiEssential, EssentialsResponse } from '../../types';
import { emitAppEvent } from '../../lib/appEvents';
import { apiRequest } from '../../utils/api';
import { formatMoney } from '../../utils/currency';

// Bill amounts are always positive — format in the profile currency (item 17).
const inr = (n: number) => formatMoney(n, { signDisplay: 'none' });

function ordinal(day: number) {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1: return `${day}st`;
    case 2: return `${day}nd`;
    case 3: return `${day}rd`;
    default: return `${day}th`;
  }
}

export default function EssentialsScreen() {
  const router = useRouter();
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const isOnboarding = onboarding === '1';
  const { getToken, isSignedIn } = useAuth();
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const [essentials, setEssentials] = useState<ApiEssential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add / edit form
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [dueDayInput, setDueDayInput] = useState('');
  const [categoryKey, setCategoryKey] = useState(ESSENTIAL_CATEGORIES[0].key);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<ApiEssential | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const load = useCallback(async () => {
    if (!isSignedIn) {
      setEssentials([]);
      setLoading(false);
      return;
    }
    try {
      const token = await getTokenRef.current();
      if (!token) return;
      const res = await apiRequest<EssentialsResponse>('/api/essentials', {}, token);
      setEssentials(res?.essentials ?? []);
      setError('');
    } catch {
      setError('Could not load your bills. Pull to retry.');
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAdd = () => {
    setEditingId(null);
    setNameInput('');
    setAmountInput('');
    setDueDayInput('');
    setCategoryKey(ESSENTIAL_CATEGORIES[0].key);
    setFormError('');
    setFormVisible(true);
  };

  const openEdit = (e: ApiEssential) => {
    Haptics.selectionAsync().catch(() => {});
    setEditingId(e.id);
    setNameInput(e.name);
    setAmountInput(String(Math.round(e.amount)));
    setDueDayInput(String(e.dueDay));
    setCategoryKey(e.category);
    setFormError('');
    setFormVisible(true);
  };

  const handleSaveForm = async () => {
    const name = nameInput.trim();
    const amount = Number(amountInput);
    const dueDay = Number(dueDayInput);

    if (!name) { setFormError('Give this bill a name.'); return; }
    if (!amount || Number.isNaN(amount) || amount <= 0) { setFormError('Enter an amount greater than 0.'); return; }
    if (!dueDay || Number.isNaN(dueDay) || dueDay < 1 || dueDay > 31) { setFormError('Enter a due day between 1 and 31.'); return; }

    setSaving(true);
    setFormError('');
    try {
      const token = await getTokenRef.current();
      if (!token) throw new Error('Not signed in');
      const payload = { name, amount: Math.round(amount), dueDay: Math.round(dueDay), category: categoryKey };
      if (editingId) {
        await apiRequest({ method: 'put', url: `/api/essentials/${editingId}`, token, data: payload });
      } else {
        await apiRequest({ method: 'post', url: '/api/essentials', token, data: payload });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setFormVisible(false);
      await load();
      // Every budget surface reserves against essentials — nudge them to re-read.
      emitAppEvent('profile:changed');
    } catch (e: any) {
      setFormError(e?.message || 'Could not save this bill. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const togglePaid = async (e: ApiEssential) => {
    Haptics.selectionAsync().catch(() => {});
    const next = !e.paidThisMonth;
    // Optimistic flip.
    setEssentials((cur) => cur.map((x) => (x.id === e.id ? { ...x, paidThisMonth: next } : x)));
    try {
      const token = await getTokenRef.current();
      if (!token) throw new Error('Not signed in');
      await apiRequest({ method: 'post', url: `/api/essentials/${e.id}/paid`, token, data: { paid: next } });
      emitAppEvent('profile:changed');
    } catch {
      // Revert on failure.
      setEssentials((cur) => cur.map((x) => (x.id === e.id ? { ...x, paidThisMonth: !next } : x)));
      setError('Could not update that bill. Try again.');
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setDeleting(true);
    const previous = essentials;
    setEssentials((cur) => cur.filter((x) => x.id !== target.id));
    try {
      const token = await getTokenRef.current();
      if (!token) throw new Error('Not signed in');
      await apiRequest({ method: 'delete', url: `/api/essentials/${target.id}`, token });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      emitAppEvent('profile:changed');
      setPendingDelete(null);
    } catch (e: any) {
      setEssentials(previous);
      setError(e?.message || 'Could not delete this bill. Try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  // Finish onboarding — valid even with zero bills ("I have no recurring bills").
  const finishOnboarding = async () => {
    setFinishing(true);
    try {
      const token = await getTokenRef.current();
      if (!token) throw new Error('Not signed in');
      await apiRequest({ method: 'post', url: '/api/essentials/complete-onboarding', token });
      emitAppEvent('profile:changed');
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.message || 'Could not save. Try again.');
      setFinishing(false);
    }
  };

  const monthlyTotal = essentials.reduce((sum, e) => sum + e.amount, 0);
  const unpaidTotal = essentials.reduce((sum, e) => sum + (e.paidThisMonth ? 0 : e.amount), 0);

  return (
    <ScreenContainer
      contentStyle={{ gap: spacing.md }}
      header={<View style={{ paddingHorizontal: layout.gutter }}><Navbar /></View>}
    >
      <View style={styles.topBar}>
        {isOnboarding ? (
          <View style={styles.iconPlaceholder} />
        ) : (
          <PressableScale style={styles.iconButton} onPress={() => router.back()} accessibilityLabel="Go back">
            <Icon name="ChevronLeft" size={20} color={palette.textPrimary} />
          </PressableScale>
        )}
        <AppText variant="title" color="textPrimary" weight="bold">
          {isOnboarding ? 'Your monthly bills' : 'Essentials & bills'}
        </AppText>
        <View style={styles.iconPlaceholder} />
      </View>

      {isOnboarding && (
        <AppText variant="caption" color="textSecondary">
          Add the recurring costs you have to cover every month — rent, groceries, phone,
          utilities, EMIs, subscriptions. We reserve these from your &quot;safe to spend&quot; so the
          app never tells you money is free when it&apos;s already spoken for. You can change these anytime.
        </AppText>
      )}

      {error ? (
        <AppText variant="caption" weight="bold" style={{ color: palette.danger }}>{error}</AppText>
      ) : null}

      {/* Summary strip */}
      {essentials.length > 0 && (
        <Card variant="flat" padding={14} style={styles.summaryCard}>
          <View style={styles.summaryCol}>
            <AppText variant="micro" color="textSecondary">Per month</AppText>
            <AppText variant="money" color="textPrimary" weight="bold">{inr(monthlyTotal)}</AppText>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <AppText variant="micro" color="textSecondary">Still to pay</AppText>
            <AppText variant="money" weight="bold" style={{ color: unpaidTotal > 0 ? palette.warning : palette.success }}>
              {inr(unpaidTotal)}
            </AppText>
          </View>
        </Card>
      )}

      {loading ? (
        <View style={styles.loadingWrap}><ActivityIndicator color={palette.primaryDeep} /></View>
      ) : essentials.length === 0 ? (
        <EmptyState
          icon="ReceiptText"
          title="No bills added yet"
          subtitle="Add a recurring bill, or if you have none, you can skip this below."
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {essentials.map((e) => {
            const meta = essentialCategoryMeta(e.category);
            return (
              <Card key={e.id} variant="elevated" padding={14} style={styles.row}>
                <View style={[styles.rowIcon, { backgroundColor: meta.color + '22' }]}>
                  <Icon name={meta.lucide} size={20} color={meta.color} clickable={false} />
                </View>
                <View style={styles.rowBody}>
                  <AppText variant="bodySm" color="textPrimary" weight="bold" numberOfLines={1}>{e.name}</AppText>
                  <AppText variant="micro" color="textSecondary">
                    {inr(e.amount)} · due {ordinal(e.dueDay)}
                  </AppText>
                </View>

                <Pressable
                  onPress={() => togglePaid(e)}
                  hitSlop={6}
                  style={[styles.paidPill, e.paidThisMonth ? styles.paidPillOn : styles.paidPillOff]}
                  accessibilityRole="button"
                  accessibilityLabel={e.paidThisMonth ? `Mark ${e.name} unpaid` : `Mark ${e.name} paid`}
                >
                  <Icon
                    name={e.paidThisMonth ? 'Check' : 'Circle'}
                    size={13}
                    color={e.paidThisMonth ? palette.white : palette.textSecondary}
                    clickable={false}
                  />
                  <AppText variant="micro" style={{ color: e.paidThisMonth ? palette.white : palette.textSecondary }}>
                    {e.paidThisMonth ? 'Paid' : 'Unpaid'}
                  </AppText>
                </Pressable>

                <View style={styles.rowActions}>
                  <PressableScale style={styles.actionButton} onPress={() => openEdit(e)} accessibilityLabel={`Edit ${e.name}`}>
                    <Icon name="Pencil" size={16} color={palette.textSecondary} clickable={false} />
                  </PressableScale>
                  <PressableScale
                    style={styles.actionButton}
                    onPress={() => { Haptics.selectionAsync().catch(() => {}); setPendingDelete(e); }}
                    accessibilityLabel={`Delete ${e.name}`}
                  >
                    <Icon name="Trash2" size={16} color={palette.danger} clickable={false} />
                  </PressableScale>
                </View>
              </Card>
            );
          })}
        </View>
      )}

      <Button variant="outline" size="md" onPress={openAdd}>
        + Add a bill
      </Button>

      {isOnboarding && (
        <Button variant="primary" size="md" onPress={finishOnboarding} loading={finishing}>
          {essentials.length === 0 ? "I have no recurring bills" : 'Done'}
        </Button>
      )}

      <Modal visible={formVisible} animationType="fade" transparent onRequestClose={() => setFormVisible(false)}>
        <View style={styles.modalOverlay} accessibilityViewIsModal={true}>
          <View style={styles.modalCard}>
            <AppText variant="title" color="textPrimary" weight="bold">
              {editingId ? 'Edit bill' : 'Add a bill'}
            </AppText>

            <Input
              label="Name"
              placeholder="e.g. Rent, Netflix, Phone recharge"
              value={nameInput}
              onChangeText={setNameInput}
              containerStyle={{ marginTop: spacing.md }}
            />
            <Input
              label="Amount (per month)"
              placeholder="e.g. 12000"
              keyboardType="numeric"
              value={amountInput}
              onChangeText={setAmountInput}
              containerStyle={{ marginTop: spacing.md }}
            />
            <Input
              label="Due day (of month)"
              placeholder="e.g. 5"
              keyboardType="numeric"
              value={dueDayInput}
              onChangeText={setDueDayInput}
              containerStyle={{ marginTop: spacing.md }}
            />

            <AppText variant="label" color="textSecondary" style={{ marginTop: spacing.md, marginBottom: spacing.xs }}>
              Category
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
              {ESSENTIAL_CATEGORIES.map((c) => {
                const active = c.key === categoryKey;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => setCategoryKey(c.key)}
                    style={[styles.catChip, active && { backgroundColor: c.color + '22', borderColor: c.color }]}
                    accessibilityRole="button"
                    accessibilityLabel={c.label}
                  >
                    <Icon name={c.lucide} size={15} color={active ? c.color : palette.textSecondary} clickable={false} />
                    <AppText variant="micro" style={{ color: active ? c.color : palette.textSecondary }}>{c.label}</AppText>
                  </Pressable>
                );
              })}
            </ScrollView>

            {!!formError && (
              <AppText variant="caption" color="danger" style={{ marginTop: spacing.sm }}>{formError}</AppText>
            )}

            <View style={styles.modalActions}>
              <Button variant="outline" size="md" onPress={() => setFormVisible(false)} style={{ flex: 1 }}>Cancel</Button>
              <Button variant="primary" size="md" onPress={handleSaveForm} loading={saving} style={{ flex: 1 }}>Save</Button>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={!!pendingDelete}
        title="Delete this bill?"
        message={pendingDelete ? `${pendingDelete.name} (${inr(pendingDelete.amount)}/mo) will be removed.` : ''}
        confirmText="Delete"
        cancelText="Keep it"
        destructive
        loading={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
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
  loadingWrap: { paddingVertical: spacing.xxxl, alignItems: 'center' },
  summaryCard: { flexDirection: 'row', alignItems: 'center' },
  summaryCol: { flex: 1, gap: 2 },
  summaryDivider: { width: 1, height: 34, backgroundColor: palette.border, marginHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
  paidPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill,
  },
  paidPillOn: { backgroundColor: palette.success },
  paidPillOff: { backgroundColor: palette.track },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionButton: { width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.lg },
  modalCard: { backgroundColor: palette.card, borderRadius: radius.xl, padding: spacing.lg },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.pill,
    borderWidth: 1, borderColor: palette.border, backgroundColor: palette.bg,
  },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
});
