import { Category } from './types';

export const EXPENSE_CATEGORIES: Category[] = [
  { id: 'food',          label: 'Food',          emoji: '🍔', icon: 'fast-food',       color: '#F97316', type: 'expense' },
  { id: 'transport',     label: 'Transport',     emoji: '🚗', icon: 'car-sport',        color: '#3B82F6', type: 'expense' },
  { id: 'shopping',      label: 'Shopping',      emoji: '🛍️', icon: 'bag-handle',       color: '#EC4899', type: 'expense' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎬', icon: 'film',             color: '#8B5CF6', type: 'expense' },
  { id: 'health',        label: 'Health',        emoji: '💊', icon: 'medkit',           color: '#EF4444', type: 'expense' },
  { id: 'education',     label: 'Education',     emoji: '📚', icon: 'school',           color: '#0EA5E9', type: 'expense' },
  { id: 'bills',         label: 'Bills',         emoji: '💡', icon: 'flash',            color: '#EAB308', type: 'expense' },
  { id: 'rent',          label: 'Rent',          emoji: '🏠', icon: 'home',             color: '#14B8A6', type: 'expense' },
  { id: 'other',         label: 'Other',         emoji: '📦', icon: 'cube',             color: '#6B7280', type: 'expense' },
];

export const INCOME_CATEGORIES: Category[] = [
  { id: 'salary',     label: 'Salary',     emoji: '💼', icon: 'briefcase',    color: '#22C55E', type: 'income' },
  { id: 'freelance',  label: 'Freelance',  emoji: '💻', icon: 'laptop',       color: '#6366F1', type: 'income' },
  { id: 'gift',       label: 'Gift',       emoji: '🎁', icon: 'gift',         color: '#F43F5E', type: 'income' },
  { id: 'investment', label: 'Investment', emoji: '📈', icon: 'trending-up', color: '#10B981', type: 'income' },
  { id: 'other',      label: 'Other',      emoji: '💰', icon: 'cash',        color: '#84CC16', type: 'income' },
];
