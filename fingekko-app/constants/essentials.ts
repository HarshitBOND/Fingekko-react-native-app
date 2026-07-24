/**
 * Preset categories for recurring essentials / bills (AUDIT item 10). Free-form
 * on the server, but the app offers this fixed set so each bill gets a sensible
 * icon and colour. `key` is what we store; `lucide` is the shared Icon name.
 */
import { palette } from './design';

export type EssentialCategory = {
  key: string;
  label: string;
  lucide: string;
  color: string;
};

export const ESSENTIAL_CATEGORIES: EssentialCategory[] = [
  { key: 'rent', label: 'Rent', lucide: 'Home', color: '#8B5CF6' },
  { key: 'groceries', label: 'Groceries', lucide: 'ShoppingCart', color: '#D9811E' },
  { key: 'phone', label: 'Phone', lucide: 'Smartphone', color: '#3B82C4' },
  { key: 'utilities', label: 'Utilities', lucide: 'Zap', color: '#159E8C' },
  { key: 'emi', label: 'EMI / Loan', lucide: 'Landmark', color: '#E05561' },
  { key: 'subscription', label: 'Subscription', lucide: 'Repeat', color: '#43A047' },
  { key: 'other', label: 'Other', lucide: 'Coins', color: palette.textSecondary },
];

export const ESSENTIAL_CATEGORY_BY_KEY = new Map(ESSENTIAL_CATEGORIES.map((c) => [c.key, c]));

export function essentialCategoryMeta(key: string): EssentialCategory {
  return ESSENTIAL_CATEGORY_BY_KEY.get(key) ?? ESSENTIAL_CATEGORIES[ESSENTIAL_CATEGORIES.length - 1];
}
