import type { Transaction } from '@/constants/types';

export interface CategoryRow {
  label: string;
  amount: number;
  share: number;
  barPercent: number;
}

export interface InsightData {
  expensesThisMonth: number;
  expensesLastMonth: number;
  avgLastMonth: number;
  avgThisMonth: number;
  savedAmount: number;
  savedPercent: number;
  weeklySpend: number;
  weeklyBudget: number;
  weeklyLeft: number;
  weeklyProgress: number;
  categoryRows: CategoryRow[];
  biggestSpendsCount: number;
  transactionCount: number;
  totalExpenses: number;
  weekendEstimate: number;
  chartData: any;
  weekStart: Date;
}

export interface SpendingComparisonProps {
  insights: InsightData;
  currency: string;
  formatAmount: (v: number) => string;
}