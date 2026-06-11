import Navbar from '@/components/Navbar';
import TodaysProgress from '@/components/TodaysProgress';
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BalanceCard from './BalanceCard';
import DemoDataCard from './DemoDataCard';
import Header from './Header';
import PlannerCard from './PlannerCard';
import StreakCard from './StreakCard';
import SuggestionsBar from './SuggestionsBar';
import { useHomeScreen } from './hooks';
import { styles } from './styles';

export function HomeScreen() {
  const home = useHomeScreen();

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Navbar />
        <Header name={home.activeProfileName} dateLabel={home.currentDateLabel} />
        <DemoDataCard
          useDummyData={home.useDummyData}
          dummyAmount={home.dummyAmount}
          dummyCategory={home.dummyCategory}
          onToggleDemo={home.handleToggleDemo}
          onAmountChange={home.setDummyAmount}
          onCategoryChange={home.setDummyCategory}
          onAddExpense={home.handleAddExpense}
          onResetSample={home.resetDemoTransactions}
        />
        <BalanceCard
          balanceAmount={home.balanceAmount}
          monthlySpend={home.monthlySpend}
          monthlyBudget={home.monthlyBudget}
          daysLeftInMonth={home.daysLeftInMonth}
          avgDailySpend={home.avgDailySpend}
          spendProgress={home.spendProgress}
          remainingProgress={home.remainingProgress}
        />
        <TodaysProgress items={home.progressItems} />

        <View style={styles.insightGrid}>
          <PlannerCard onViewInsights={() => router.push('/insights')} />
          <StreakCard
            visibleDayStreak={home.visibleStats?.dayStreak}
            activeTransactions={home.activeTransactions}
            useDummyData={home.useDummyData}
          />
        </View>

        <SuggestionsBar onViewInsights={() => router.push('/insights')} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default HomeScreen;