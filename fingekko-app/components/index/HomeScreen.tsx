import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { layout, palette, spacing } from '@/constants/design';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import Navbar from '@/components/Navbar';
import TodaysQuest from '@/components/TodaysQuest';
import LoadingScreen from '@/components/ui/LoadingScreen';
import ScreenContainer from '@/components/ui/ScreenContainer';
import SectionHeader from '@/components/ui/SectionHeader';
import BalanceCard from './BalanceCard';
import BillDueAlert from './BillDueAlert';
import EssentialsPrompt from './EssentialsPrompt';
import Header from './Header';
import QuickActions from './QuickActions';
import StatStrip from './StatStrip';
import SuggestionsBar from './SuggestionsBar';
import { useHomeScreen } from './hooks';

const Section = ({ delay, children }: { delay: number; children: React.ReactNode }) => {
  const reducedMotion = useReducedMotion();
  // Sections are visible by default; Reduce Motion just drops the staggered entrance.
  if (reducedMotion) return <View>{children}</View>;
  return <Animated.View entering={FadeInDown.duration(420).delay(delay)}>{children}</Animated.View>;
};

export function HomeScreen() {
  const home = useHomeScreen();
  const [refreshing, setRefreshing] = useState(false);

  if (home.initialLoading) {
    return <LoadingScreen label="Getting your finances ready..." />;
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    await home.refresh();
    setRefreshing(false);
  };

  const goToInsights = () => router.push('/insights');

  return (
    <ScreenContainer
      contentStyle={{ gap: spacing.lg }}
      header={
        <View style={{ paddingHorizontal: layout.gutter }}>
          <Navbar />
        </View>
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.primaryDeep} />
      }
    >
      <Header name={home.activeProfileName || 'there'} dateLabel={home.currentDateLabel} />

      {/* ─── Primary: the number the app exists to answer ─── */}
      <Section delay={40}>
        <BalanceCard
          balanceAmount={home.balanceAmount}
          monthlySpend={home.monthlySpend}
          monthlyBudget={home.monthlyBudget}
          daysLeftInMonth={home.daysLeftInMonth}
          avgDailySpend={home.avgDailySpend}
          spendProgress={home.spendProgress}
          remainingProgress={home.remainingProgress}
          hasIncomeSetup={home.hasIncomeSetup}
          baseIncome={home.baseIncome}
          incomeThisMonth={home.incomeThisMonth}
          cashInHand={home.cashInHand}
          unpaidEssentials={home.unpaidEssentials}
          payday={home.payday}
          savingIncome={home.savingIncome}
          onSaveIncome={home.saveIncomeSetup}
        />
      </Section>

      {/* ─── Gate: ask for recurring bills once income is set (item 10) ─── */}
      {home.needsEssentialsSetup && (
        <Section delay={65}>
          <EssentialsPrompt />
        </Section>
      )}

      {/* ─── Nudge: an unpaid bill you can cover — pay it first (item 11) ─── */}
      {home.showBillDueAlert && home.nextEssential && (
        <Section delay={65}>
          <BillDueAlert essential={home.nextEssential} />
        </Section>
      )}

      {/* ─── Secondary: act on it ─── */}
      <Section delay={90}>
        <QuickActions />
      </Section>

      {/* ─── Tertiary: how you're tracking ─── */}
      <Section delay={140}>
        <StatStrip
          dayStreak={home.visibleStats?.dayStreak}
          totalXp={home.visibleStats?.totalXp}
          questsDone={home.visibleStats?.questsDone}
          questsTarget={home.visibleStats?.questsTarget}
          betterThanYesterday={home.visibleStats?.betterThanYesterday}
          onViewStreak={() => router.push('/streak-calendar')}
        />
      </Section>

      {/* ─── Today: the two things asking for attention right now ─── */}
      <Section delay={200}>
        <View style={{ gap: spacing.md }}>
          <SectionHeader title="Today" />
          <TodaysQuest />
          <SuggestionsBar onViewInsights={goToInsights} />
        </View>
      </Section>

    </ScreenContainer>
  );
}

export default HomeScreen;
