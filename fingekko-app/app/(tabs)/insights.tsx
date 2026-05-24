import type { Transaction } from '@/constants/types';
import type { ApiUser, ProfileResponse, TransactionsResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { formatCurrency } from '@/utils/helpers';
import { useAuth } from '@clerk/clerk-expo';
import {
    ChevronRight,
    Flame,
    Home,
    Lightbulb,
    ShoppingBag,
    Utensils,
    Wallet,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Navbar from '../../components/Navbar';
import { FontSizes } from '../../constants/Colors';

export default function InsightsScreen() {
  const { getToken, isSignedIn } = useAuth();
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    let isActive = true;

    const loadData = async () => {
      if (!isSignedIn) {
        setProfile(null);
        setTransactions([]);
        return;
      }

      const token = await getToken();
      if (!token) {
        return;
      }

      try {
        const [profileResponse, transactionsResponse] = await Promise.all([
          apiRequest<ProfileResponse>('/api/profile', {}, token),
          apiRequest<TransactionsResponse>('/api/transactions', {}, token),
        ]);

        if (!isActive) {
          return;
        }

        setProfile(profileResponse.user);
        setTransactions(transactionsResponse.transactions);
      } catch (error) {
        console.warn('Failed to load insights:', error);
      }
    };

    loadData();

    return () => {
      isActive = false;
    };
  }, [getToken, isSignedIn]);

  const currency = profile?.currency ?? '₹';
  const formatAmount = (value: number) => formatCurrency(Math.round(value), currency);

  const insights = useMemo(() => {
    const now = new Date();
    const expenses = transactions.filter((item) => item.type === 'expense');

    const parse = (value: string) => {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const inRange = (date: Date | null, start: Date, end: Date) =>
      date ? date >= start && date <= end : false;

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const expensesThisMonth = expenses.reduce((sum, item) => {
      const date = parse(item.date);
      return inRange(date, startOfMonth, now) ? sum + item.amount : sum;
    }, 0);

    const expensesLastMonth = expenses.reduce((sum, item) => {
      const date = parse(item.date);
      return inRange(date, startOfLastMonth, endOfLastMonth) ? sum + item.amount : sum;
    }, 0);

    const daysInLastMonth = endOfLastMonth.getDate() || 1;
    const daysInThisMonth = Math.max(1, now.getDate());
    const avgLastMonth = expensesLastMonth / daysInLastMonth;
    const avgThisMonth = expensesThisMonth / daysInThisMonth;

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const weeklySpend = expenses.reduce((sum, item) => {
      const date = parse(item.date);
      return date && date >= weekStart ? sum + item.amount : sum;
    }, 0);

    const monthlyIncome = profile?.monthlyIncome ?? 0;
    const weeklyBudget = monthlyIncome > 0 ? monthlyIncome / 4 : Math.max(weeklySpend * 1.2, 1);
    const weeklyLeft = Math.max(0, weeklyBudget - weeklySpend);
    const weeklyProgress = weeklyBudget > 0 ? Math.min(1, weeklySpend / weeklyBudget) : 0;

    const savedAmount = Math.max(0, expensesLastMonth - expensesThisMonth);
    const savedPercent = expensesLastMonth > 0 ? Math.round((savedAmount / expensesLastMonth) * 100) : 0;

    const categoryTotals = expenses.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] ?? 0) + item.amount;
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label, amount]) => ({ label, amount }));

    const fallbackCategories = [
      { label: 'Shopping', amount: 0 },
      { label: 'Food', amount: 0 },
      { label: 'Home', amount: 0 },
    ];

    const categories = [...topCategories, ...fallbackCategories].slice(0, 3);
    const maxCategory = Math.max(1, ...categories.map((item) => item.amount));
    const categoryRows = categories.map((item) => ({
      ...item,
      percent: Math.max(20, Math.round((item.amount / maxCategory) * 100)),
    }));

    return {
      expensesThisMonth,
      expensesLastMonth,
      avgLastMonth,
      avgThisMonth,
      savedAmount,
      savedPercent,
      weeklySpend,
      weeklyBudget,
      weeklyLeft,
      weeklyProgress,
      categoryRows,
      biggestSpendsCount: Math.min(3, expenses.length),
      transactionCount: expenses.length,
    };
  }, [profile?.monthlyIncome, transactions]);

  const [firstName] = (profile?.name ?? 'Friend').split(' ');

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <Navbar />

        <View style={styles.header}>
          <View>
            <Text style={styles.heading}>Insights</Text>
            <Text style={styles.subHeading}>Understand. Improve. Level up.</Text>
          </View>
        </View>

        {/* TOP CARD */}
        <View style={styles.heroCard}>
          <Image
            source={require('../../assets/images/personalityThePlanner.png')}
            style={styles.heroImage}
            resizeMode="contain"
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>
              Great job, {firstName}! 👋
            </Text>

            <Text style={styles.heroText}>
              You spent {formatAmount(insights.savedAmount)} less than last month.
            </Text>

            <Text style={styles.heroText}>
              Keep it up!
            </Text>
          </View>

          <View style={styles.streakBox}>
            <View style={styles.fireBadge}>
              <Flame color="#fff" size={18} />
            </View>

            <Text style={styles.streakTitle}>On fire!</Text>
            <Text style={styles.streakSub}>{insights.savedPercent}% leaner</Text>
          </View>
        </View>

        {/* SPENDING COMPARISON */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            SPENDING COMPARISON
          </Text>

          <View style={styles.compareContainer}>
            {/* LAST MONTH */}
            <View style={styles.compareBox}>
              <Text style={styles.compareLabel}>
                Last Month (Apr)
              </Text>

              <Text style={styles.compareAmount}>
                {formatAmount(insights.expensesLastMonth)}
              </Text>

              <View style={{ marginTop: 18 }}>
                <View style={styles.blurLine} />
                <View style={[styles.blurLine, { width: '85%' }]} />
                <View style={[styles.blurLine, { width: '70%' }]} />
                <View style={[styles.blurLine, { width: '92%' }]} />
              </View>

              <Text style={styles.avgText}>
                Monthly avg {formatAmount(insights.avgLastMonth)} / day
              </Text>
            </View>

            {/* THIS MONTH */}
            <View style={styles.compareBox}>
              <Text style={[styles.compareLabel, { color: '#17A34A' }]}>
                This Month (May)
              </Text>

              <Text style={styles.compareAmount}>
                {formatAmount(insights.expensesThisMonth)}
              </Text>

              {/* GRAPH */}
              <View style={styles.graphContainer}>
                <View style={styles.dashedLine} />

                <View style={styles.graphBars}>
                  <View style={styles.barLight} />
                  <View style={[styles.barLight, { height: 60 }]} />
                  <View style={[styles.barLight, { height: 45 }]} />
                  <View style={[styles.barLight, { height: 50 }]} />

                  <View style={{ width: 18 }} />

                  <View style={[styles.barLight, { height: 40 }]} />
                  <View style={[styles.barLight, { height: 80 }]} />
                  <View style={[styles.barLight, { height: 42 }]} />

                  <View style={{ width: 18 }} />

                  <View style={styles.barDark} />
                  <View style={[styles.barDark, { height: 95 }]} />

                  <View style={{ width: 18 }} />

                  <View style={[styles.barLight, { height: 50 }]} />
                  <View style={[styles.barLight, { height: 65 }]} />
                </View>
              </View>

              <Text style={styles.avgText}>
                Monthly avg {formatAmount(insights.avgThisMonth)} / day
              </Text>
            </View>
          </View>

          {/* INSIGHT BOX */}
          <View style={styles.insightBox}>
            <View style={styles.insightLeft}>
              <Lightbulb color="#F6B100" size={20} />

              <View style={{ marginLeft: 10 }}>
                <Text style={styles.insightTitle}>
                  You're spending 12% less this month
                </Text>

                <Text style={styles.insightDesc}>
                  That's like saving ₹2,350 so far!
                </Text>
              </View>
            </View>

            <ChevronRight size={18} color="#17A34A" />
          </View>
        </View>

        {/* WEEKLY SNAPSHOT */}
        <View style={styles.card}>
          <View style={styles.snapshotHeader}>
            <Text style={styles.sectionTitle}>
              WEEKLY SNAPSHOT
            </Text>

            <Text style={styles.weekText}>This week</Text>
          </View>

          <View style={styles.snapshotRow}>
            <View style={styles.progressCircle}>
              <Text style={styles.progressText}>70%</Text>
            </View>

            <View style={styles.snapshotStats}>
              <Text style={styles.snapshotAmount}>
                ₹3,820 of ₹5,500
              </Text>

              <Text style={styles.snapshotSub}>
                weekly budget used
              </Text>

              <View style={styles.progressBarBg}>
                <View style={styles.progressBarFill} />
              </View>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>3</Text>
              <Text style={styles.statLabel}>Biggest spends</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statNumber}>6</Text>
              <Text style={styles.statLabel}>Transactions</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statNumber}>₹1,680</Text>
              <Text style={styles.statLabel}>Left for week</Text>
            </View>
          </View>
        </View>

        {/* CATEGORY + IMPACT */}
        <View style={styles.row}>
          {/* CATEGORY */}
          <View style={[styles.card, { flex: 1 }]}>
            <Text style={styles.sectionTitle}>
              TOP CATEGORIES
            </Text>

            <View style={styles.categoryItem}>
              <View style={styles.categoryIcon}>
                <ShoppingBag size={18} color="#16A34A" />
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.categoryRow}>
                  <Text style={styles.categoryName}>
                    Shopping
                  </Text>

                  <Text style={styles.categoryAmount}>
                    ₹6,240
                  </Text>
                </View>

                <View style={styles.categoryBarBg}>
                  <View
                    style={[
                      styles.categoryBarFill,
                      { width: '70%' },
                    ]}
                  />
                </View>
              </View>
            </View>

            <View style={styles.categoryItem}>
              <View
                style={[
                  styles.categoryIcon,
                  { backgroundColor: '#F4E8FF' },
                ]}
              >
                <Utensils size={18} color="#8B5CF6" />
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.categoryRow}>
                  <Text style={styles.categoryName}>
                    Food
                  </Text>

                  <Text style={styles.categoryAmount}>
                    ₹4,120
                  </Text>
                </View>

                <View style={styles.categoryBarBg}>
                  <View
                    style={[
                      styles.categoryBarFill,
                      {
                        width: '52%',
                        backgroundColor: '#8B5CF6',
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            <View style={styles.categoryItem}>
              <View
                style={[
                  styles.categoryIcon,
                  { backgroundColor: '#FFF3E1' },
                ]}
              >
                <Home size={18} color="#F59E0B" />
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.categoryRow}>
                  <Text style={styles.categoryName}>
                    Home
                  </Text>

                  <Text style={styles.categoryAmount}>
                    ₹2,980
                  </Text>
                </View>

                <View style={styles.categoryBarBg}>
                  <View
                    style={[
                      styles.categoryBarFill,
                      {
                        width: '40%',
                        backgroundColor: '#F59E0B',
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* IMPACT */}
          <View style={[styles.card, styles.impactCard]}>
            <Image
              source={require('../../assets/images/personalityThePlanner.png')}
              style={styles.treeImage}
              resizeMode="contain"
            />

            <Text style={styles.impactSave}>
              ₹2,350
            </Text>

            <Text style={styles.impactText}>
              saved this month 🌱
            </Text>
          </View>
        </View>

        {/* GUIDANCE */}
        <View style={styles.guidanceCard}>
          <Image
            source={require('../../assets/images/personalityThePlanner.png')}
            style={styles.guidanceImage}
            resizeMode="contain"
          />

          <View style={{ flex: 1 }}>
            <Text style={styles.guidanceTitle}>
              GEKKO GUIDANCE
            </Text>

            <Text style={styles.guidanceMain}>
              Try a no-spend weekend!
            </Text>

            <Text style={styles.guidanceSub}>
              You usually spend ₹1,200 on weekends.
            </Text>
          </View>

          <ChevronRight size={20} color="#17A34A" />
        </View>

        {/* BADGE CARD */}
        <View style={styles.rewardCard}>
          <View style={styles.rewardLeft}>
            <Wallet size={28} color="#fff" />

            <View style={{ marginLeft: 12 }}>
              <Text style={styles.rewardTitle}>
                Unlock “Smart Saver”
              </Text>

              <Text style={styles.rewardSub}>
                Save ₹3,000 more this month
              </Text>

              <View style={styles.rewardBarBg}>
                <View style={styles.rewardBarFill} />
              </View>
            </View>
          </View>

          <View style={styles.rewardBadge}>
            <Text style={styles.rewardBadgeText}>
              LV 2
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f4f6f5',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  heading: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: '#111827',
  },

  subHeading: {
    marginTop: 4,
    color: '#6B7280',
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },

  heroCard: {
    backgroundColor: '#0b5f4b',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  heroImage: {
    width: 95,
    height: 95,
    marginRight: 14,
  },

  heroTitle: {
    color: '#fff',
    fontSize: FontSizes.xl,
    fontWeight: '700',
    marginBottom: 8,
  },

  heroText: {
    color: '#D8F5E0',
    fontSize: FontSizes.md,
    lineHeight: 22,
  },

  streakBox: {
    alignItems: 'center',
  },

  fireBadge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },

  streakTitle: {
    color: '#FDE68A',
    fontWeight: '700',
    fontSize: FontSizes.base,
  },

  streakSub: {
    color: '#D1FAE5',
    fontSize: FontSizes.sm,
    marginTop: 4,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  compareContainer: {
    flexDirection: 'row',
    gap: 14,
  },

  compareBox: {
    flex: 1,
  },

  compareLabel: {
    color: '#6B7280',
    fontSize: FontSizes.md,
  },

  compareAmount: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    marginTop: 6,
    color: '#111827',
  },

  blurLine: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    marginBottom: 10,
    width: '80%',
  },

  avgText: {
    marginTop: 16,
    color: '#6B7280',
    fontSize: FontSizes.sm,
  },

  graphContainer: {
    marginTop: 18,
    height: 120,
    justifyContent: 'flex-end',
  },

  dashedLine: {
    position: 'absolute',
    top: '50%',
    width: '100%',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#16A34A',
  },

  graphBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  barLight: {
    width: 10,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#C7F0CF',
    marginRight: 4,
  },

  barDark: {
    width: 12,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#16A34A',
    marginRight: 4,
  },

  insightBox: {
    marginTop: 16,
    backgroundColor: '#F2FAF3',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  insightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  insightTitle: {
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },

  insightDesc: {
    color: '#6B7280',
    fontSize: FontSizes.sm,
  },

  snapshotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  weekText: {
    color: '#16A34A',
    fontWeight: '600',
  },

  snapshotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  progressCircle: {
    width: 86,
    height: 86,
    borderRadius: 999,
    borderWidth: 10,
    borderColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },

  progressText: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: '#16A34A',
  },

  snapshotStats: {
    flex: 1,
  },

  snapshotAmount: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: '#111827',
  },

  snapshotSub: {
    color: '#6B7280',
    marginTop: 4,
  },

  progressBarBg: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    marginTop: 14,
  },

  progressBarFill: {
    height: '100%',
    width: '70%',
    backgroundColor: '#16A34A',
    borderRadius: 999,
  },

  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
  },

  statBox: {
    alignItems: 'center',
    flex: 1,
  },

  statNumber: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: '#111827',
  },

  statLabel: {
    marginTop: 6,
    fontSize: FontSizes.sm,
    color: '#6B7280',
    textAlign: 'center',
  },

  row: {
    flexDirection: 'row',
    gap: 12,
  },

  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  categoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#E9F7EC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  categoryName: {
    fontWeight: '600',
    color: '#111827',
  },

  categoryAmount: {
    color: '#111827',
    fontWeight: '700',
  },

  categoryBarBg: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    marginTop: 10,
  },

  categoryBarFill: {
    height: '100%',
    backgroundColor: '#16A34A',
    borderRadius: 999,
  },

  impactCard: {
    width: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },

  treeImage: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },

  impactSave: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: '#16A34A',
  },

  impactText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 8,
  },

  guidanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  guidanceImage: {
    width: 70,
    height: 70,
    marginRight: 14,
  },

  guidanceTitle: {
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },

  guidanceMain: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: '#16A34A',
  },

  guidanceSub: {
    color: '#6B7280',
    marginTop: 4,
    fontSize: FontSizes.sm,
  },

  rewardCard: {
    backgroundColor: '#0b5f4b',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  rewardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  rewardTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FontSizes.base,
  },

  rewardSub: {
    color: '#D1FAE5',
    marginTop: 6,
    fontSize: FontSizes.sm,
  },

  rewardBarBg: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 10,
    width: 150,
  },

  rewardBarFill: {
    height: '100%',
    width: '35%',
    backgroundColor: '#B7FF6A',
    borderRadius: 999,
  },

  rewardBadge: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  rewardBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FontSizes.base,
  },
});