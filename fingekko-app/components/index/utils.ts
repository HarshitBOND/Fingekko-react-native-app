import { MONTH_NAMES } from './constants';

export const formatDateLabel = (date: Date) =>
  date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

export const getFirstName = (fullName?: string | null) => fullName?.split(' ')[0] ?? 'Arjun';

export const getMonthLabel = (month: number, year: number) => `${MONTH_NAMES[month]} ${year}`;