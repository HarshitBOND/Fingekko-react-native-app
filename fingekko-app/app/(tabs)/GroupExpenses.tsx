import { useAuth } from '@clerk/clerk-expo';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { apiRequest } from '../../utils/api';
import Icon from '../../components/ui/Icon';
import Card from '../../components/ui/Card';
import AppText from '../../components/ui/AppText';
import ScreenContainer from '../../components/ui/ScreenContainer';
import { palette, spacing, radius, layout } from '../../constants/design';

type ExpenseItem = {
  id: string;
  groupId: string | null;
  description: string;
  amount: number;
  expenseDate: string;
  currency?: string;
  notes?: string;
  icon?: string;
  createdBy: { id: string; name: string; email: string };
  paidBy?: { userId: { id: string; name: string; email: string } | null; amount: number }[];
  yourAmountPaid?: number;
  netBalance?: number;
  isDeleted?: boolean;
};

// Who actually fronted the money — `yourAmountPaid` comes from the server, so
// this works without knowing our own DB id (the Clerk id never matches it).
function paidByLabel(item: ExpenseItem): string {
  const youPaid = (item.yourAmountPaid ?? 0) > 0;
  const names = (item.paidBy ?? [])
    .map((p) => p.userId?.name?.split(' ')[0])
    .filter(Boolean) as string[];
  if (youPaid) return names.length > 1 ? 'You & others' : 'You';
  if (names.length === 0) return item.createdBy?.name ?? 'Someone';
  return names.length > 2 ? `${names[0]} +${names.length - 1}` : names.join(' & ');
}

export default function GroupExpensesScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { groupId, groupName } = useLocalSearchParams<{ groupId?: string; groupName?: string }>();

  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchExpenses = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      const response = await apiRequest<{ expenses: ExpenseItem[] }>({
        method: 'get',
        url: '/api/expenses',
        token,
      });

      const forThisGroup = (response?.expenses || [])
        .filter((exp) => exp.groupId === groupId)
        .sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());

      setExpenses(forThisGroup);
    } catch (error) {
      console.error('Error fetching group expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh on focus so expenses added from the group's add screen show up on return.
  useFocusEffect(
    useCallback(() => {
      fetchExpenses();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupId])
  );

  return (
    <ScreenContainer
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: layout.gutter, paddingVertical: spacing.md, backgroundColor: palette.card, borderBottomWidth: 1, borderBottomColor: palette.divider }}>
          <Pressable style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }} onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
            <Icon name="ChevronLeft" size={22} color={palette.textPrimary} />
          </Pressable>
          <AppText variant="title" color="textPrimary" weight="bold">
            {groupName || 'Group expenses'}
          </AppText>
          <View style={{ width: 40 }} />
        </View>
      }
    >
      {loading ? (
        <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={palette.primaryDeep} />
        </View>
      ) : expenses.length === 0 ? (
        <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
          <AppText variant="caption" color="textSecondary">
            No expenses in this group yet.
          </AppText>
        </View>
      ) : (
        expenses.map((item) => (
          <Card
            key={item.id}
            variant="elevated"
            padding={16}
            style={{ marginBottom: spacing.sm, borderRadius: radius.lg }}
            onPress={() => router.push({ pathname: '/(tabs)/ExpenseDetail', params: { expenseId: item.id } })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: palette.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={item.icon?.trim() || 'Receipt'} size={18} color={palette.primaryDeep} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodySm" color="textPrimary" weight="bold">
                  {item.description}
                </AppText>
                <AppText variant="micro" color="textSecondary">
                  Paid by {paidByLabel(item)} on {new Date(item.expenseDate).toLocaleDateString('en-IN')}
                </AppText>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 2 }}>
                <AppText variant="bodySm" color="textPrimary" weight="bold">
                  ₹{item.amount.toFixed(2)}
                </AppText>
                {Math.abs(item.netBalance ?? 0) > 0.009 ? (
                  <AppText
                    variant="micro"
                    weight="bold"
                    style={{ color: (item.netBalance ?? 0) > 0 ? palette.success : palette.danger }}
                  >
                    {(item.netBalance ?? 0) > 0 ? 'you get back' : 'you owe'} ₹{Math.abs(item.netBalance ?? 0).toFixed(2)}
                  </AppText>
                ) : (
                  <AppText variant="micro" color="textTertiary">
                    settled
                  </AppText>
                )}
              </View>
            </View>
            {!!item.notes && item.notes.trim() !== '' && (
              <AppText variant="caption" color="textSecondary" style={{ marginTop: 8 }}>
                📝 {item.notes.trim()}
              </AppText>
            )}
          </Card>
        ))
      )}
    </ScreenContainer>
  );
}
