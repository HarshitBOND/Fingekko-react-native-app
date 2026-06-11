import type { Transaction } from '@/constants/types';

export const buildCumulativeForRange = (
  expList: Transaction[],
  start: Date,
  end: Date
) => {
  const totalDays =
    Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

  const result: { value: number }[] = [];

  let running = 0;

  for (let d = 0; d < totalDays; d++) {
    const dayStart = new Date(start);

    dayStart.setDate(start.getDate() + d);

    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);

    dayEnd.setHours(23, 59, 59, 999);

    expList.forEach((item) => {
      const date = new Date(item.date);

      if (date >= dayStart && date <= dayEnd) {
        running += item.amount;
      }
    });

    result.push({ value: running });
  }

  return result;
};

export const formatShortDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  });