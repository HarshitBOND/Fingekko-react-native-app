// utils/helpers.ts
// 🛠️ Small reusable helper functions

import { formatMoney } from './currency';

// Generate a unique ID for transactions, goals, etc.
// Uses timestamp + random number = practically unique every time
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Format a personal money figure in the user's profile currency (AUDIT item 17).
// Thin wrapper over the central formatter so existing callers keep working while
// respecting the user's currency instead of a hard-coded ₹.
export function formatCurrency(amount: number): string {
  return formatMoney(amount);
}

// Format date to readable string
// e.g. '2024-05-17' → 'May 17, 2024'
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Get today's date as ISO string (YYYY-MM-DD)
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// Check if two date strings are the same day
export function isSameDay(date1: string, date2: string): boolean {
  return date1.split('T')[0] === date2.split('T')[0];
}