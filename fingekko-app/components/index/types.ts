import type { Transaction } from '@/constants/types';
import type { HomeResponse } from '@/types';
import type { LucideIcon } from 'lucide-react-native';

export type HomeStats = NonNullable<HomeResponse['stats']>;

export type ProgressItem = {
  icon: LucideIcon;
  value: string;
  label: string;
  color: string;
};

export type HomeScreenState = {
  useDummyData: boolean;
  demoTransactions: Transaction[];
  dummyAmount: string;
  dummyCategory: string;
  activeProfileName: string;
  currentDateLabel: string;
  balanceAmount: number;
  monthlySpend: number;
  monthlyBudget: number;
  daysLeftInMonth: number;
  avgDailySpend: number;
  spendProgress: number;
  remainingProgress: number;
  visibleStats: HomeStats | null;
  activeTransactions: Transaction[];
  progressItems: ProgressItem[] | undefined;
};