import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { layout, palette, spacing } from '@/constants/design';
import Navbar from '@/components/Navbar';
import TodaysQuest from '@/components/TodaysQuest';
import LoadingScreen from '@/components/ui/LoadingScreen';
import ScreenContainer from '@/components/ui/ScreenContainer';
import SectionHeader from '@/components/ui/SectionHeader';
import BalanceCard from './BalanceCard';
import Header from './Header';
import PlannerCard from './PlannerCard';
import QuickActions from './QuickActions';
import StatStrip from './StatStrip';
import StreakCard from './StreakCard';
import SuggestionsBar from './SuggestionsBar';
import { useHomeScreen } from './hooks';

const Section = ({ delay, children }: { delay: number; children: React.ReactNode }) => (
  <Animated.View entering={FadeInDown.duration(420).delay(delay)}>{children}</Animated.View>
);

export function HomeScreen() {
  const home = useHomeScreen();
  const [refreshing, setRefreshing] = useState(false);
  const [streakOpen, setStreakOpen] = useState(false);

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
          payday={home.payday}
          savingIncome={home.savingIncome}
          onSaveIncome={home.saveIncomeSetup}
        />
      </Section>

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
          streakOpen={streakOpen}
          onToggleStreak={() => setStreakOpen((open) => !open)}
        />
      </Section>

      {streakOpen && (
        <Section delay={0}>
          <StreakCard
            visibleDayStreak={home.visibleStats?.dayStreak}
            visibleBestStreak={home.visibleStats?.bestStreak}
            activeTransactions={home.activeTransactions}
          />
        </Section>
      )}

      {/* ─── Today: the two things asking for attention right now ─── */}
      <Section delay={200}>
        <View style={{ gap: spacing.md }}>
          <SectionHeader title="Today" />
          <TodaysQuest />
          <SuggestionsBar onViewInsights={goToInsights} />
        </View>
      </Section>

      {/* ─── Looking ahead ─── */}
      <Section delay={260}>
        <View style={{ gap: spacing.md }}>
          <SectionHeader title="Coming up" actionLabel="Insights" onAction={goToInsights} />
          <PlannerCard onViewInsights={goToInsights} />
        </View>
      </Section>
    </ScreenContainer>
  );
}

export default HomeScreen;
