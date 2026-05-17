// utils/helpers.ts
// 🛠️ Small reusable helper functions

// Generate a unique ID for transactions, goals, etc.
// Uses timestamp + random number = practically unique every time
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Format a number as Indian currency
// e.g. 45000 → ₹45,000
export function formatCurrency(amount: number, currency = '₹'): string {
  return `${currency}${amount.toLocaleString('en-IN')}`;
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