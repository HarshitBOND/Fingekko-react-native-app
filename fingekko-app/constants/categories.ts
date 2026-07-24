import { Category } from './types';

/**
 * `icon` is an Ionicons glyph (legacy — still read by a couple of older split
 * screens); `lucide` is the name in the app's own `Icon` component, which is
 * what every new surface renders. Keep both in sync when adding a category.
 */
export const EXPENSE_CATEGORIES: Category[] = [
  { id: 'food',          label: 'Food',          emoji: '🍔', icon: 'fast-food',      lucide: 'UtensilsCrossed', color: '#F97316', type: 'expense' },
  { id: 'transport',     label: 'Transport',     emoji: '🚗', icon: 'car-sport',      lucide: 'Car',             color: '#3B82F6', type: 'expense' },
  { id: 'shopping',      label: 'Shopping',      emoji: '🛍️', icon: 'bag-handle',     lucide: 'ShoppingBag',     color: '#EC4899', type: 'expense' },
  { id: 'entertainment', label: 'Entertainment', emoji: '🎬', icon: 'film',           lucide: 'Clapperboard',    color: '#8B5CF6', type: 'expense' },
  { id: 'health',        label: 'Health',        emoji: '💊', icon: 'medkit',         lucide: 'HeartPulse',      color: '#EF4444', type: 'expense' },
  { id: 'education',     label: 'Education',     emoji: '📚', icon: 'school',         lucide: 'GraduationCap',   color: '#0EA5E9', type: 'expense' },
  { id: 'bills',         label: 'Bills',         emoji: '💡', icon: 'flash',          lucide: 'Zap',             color: '#EAB308', type: 'expense' },
  { id: 'rent',          label: 'Rent',          emoji: '🏠', icon: 'home',           lucide: 'House',           color: '#14B8A6', type: 'expense' },
  { id: 'other',         label: 'Other',         emoji: '📦', icon: 'cube',           lucide: 'Package',         color: '#6B7280', type: 'expense' },
];

export const INCOME_CATEGORIES: Category[] = [
  { id: 'salary',     label: 'Salary',     emoji: '💼', icon: 'briefcase',   lucide: 'Briefcase',  color: '#22C55E', type: 'income' },
  { id: 'freelance',  label: 'Freelance',  emoji: '💻', icon: 'laptop',      lucide: 'Laptop',     color: '#6366F1', type: 'income' },
  { id: 'gift',       label: 'Gift',       emoji: '🎁', icon: 'gift',        lucide: 'Gift',       color: '#F43F5E', type: 'income' },
  { id: 'investment', label: 'Investment', emoji: '📈', icon: 'trending-up', lucide: 'TrendingUp', color: '#10B981', type: 'income' },
  { id: 'other',      label: 'Other',      emoji: '💰', icon: 'cash',        lucide: 'Coins',      color: '#84CC16', type: 'income' },
];
