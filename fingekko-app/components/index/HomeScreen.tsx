import { router } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { layout, spacing } from '@/constants/design';
import Navbar from '@/components/Navbar';
import TodaysProgress from '@/components/TodaysProgress';
import TodaysQuest from '@/components/TodaysQuest';
import ScreenContainer from '@/components/ui/ScreenContainer';
import BalanceCard from './BalanceCard';
import Header from './Header';
import PlannerCard from './PlannerCard';
import StreakCard from './StreakCard';
import SuggestionsBar from './SuggestionsBar';
import { useHomeScreen } from './hooks';

const Section = ({ delay, children }: { delay: number; children: React.ReactNode }) => (
  <Animated.View entering={FadeInDown.duration(420).delay(delay)}>{children}</Animated.View>
);

export function HomeScreen() {
  const home = useHomeScreen();

  return (
    <ScreenContainer
      contentStyle={{ gap: spacing.lg }}
      header={
        <View style={{ paddingHorizontal: layout.gutter }}>
          <Navbar />
        </View>
      }
    >
      <Header name={home.activeProfileName} dateLabel={home.currentDateLabel} />

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

      <Section delay={100}>
        <TodaysProgress items={home.progressItems} />
      </Section>

      <Section delay={130}>
        <TodaysQuest />
      </Section>

      <Section delay={220}>
        <PlannerCard onViewInsights={() => router.push('/insights')} />
      </Section>

      <Section delay={280}>
        <StreakCard
          visibleDayStreak={home.visibleStats?.dayStreak}
          visibleBestStreak={home.visibleStats?.bestStreak}
          activeTransactions={home.activeTransactions}
        />
      </Section>

      <Section delay={340}>
        <SuggestionsBar onViewInsights={() => router.push('/insights')} />
      </Section>
    </ScreenContainer>
  );
}

export default HomeScreen;
