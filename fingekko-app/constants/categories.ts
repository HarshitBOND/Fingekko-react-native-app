import { Category } from './types';

export const EXPENSE_CATEGORIES: Category[] = [
  { id: 'food',          label: 'Food',          emoji: '🍔', type: 'expense' },
  { id: 'transport',     label: 'Transport',     emoji: '🚗', type: 'expense' },
  { id: 'shopping',      label: 'Shopping',      emoji: '🛍️', type: 'expense' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎬', type: 'expense' },
  { id: 'health',        label: 'Health',        emoji: '💊', type: 'expense' },
  { id: 'education',     label: 'Education',     emoji: '📚', type: 'expense' },
  { id: 'bills',         label: 'Bills',         emoji: '💡', type: 'expense' },
  { id: 'rent',          label: 'Rent',          emoji: '🏠', type: 'expense' },
  { id: 'other',         label: 'Other',         emoji: '📦', type: 'expense' },
];

export const INCOME_CATEGORIES: Category[] = [
  { id: 'salary',     label: 'Salary',     emoji: '💼', type: 'income' },
  { id: 'freelance',  label: 'Freelance',  emoji: '💻', type: 'income' },
  { id: 'gift',       label: 'Gift',       emoji: '🎁', type: 'income' },
  { id: 'investment', label: 'Investment', emoji: '📈', type: 'income' },
  { id: 'other',      label: 'Other',      emoji: '💰', type: 'income' },
];