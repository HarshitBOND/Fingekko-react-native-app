/**
 * Minimal server-side pay-cycle math, mirroring the client's utils/pay-cycle.ts.
 * Used by cash-in-hand settlement (AUDIT items 12/20) to know which cycles have
 * fully elapsed. Kept to just the boundaries the settlement needs.
 */

export interface PayCycle {
  start: Date;
  end: Date;
}

/** Clamp a day-of-month (1-31) to a real date in the month (e.g. 31 in Feb → 28/29). */
function dateForDayOfMonth(year: number, month: number, day: number): Date {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, daysInMonth), 12, 0, 0, 0);
}

/**
 * The pay cycle containing `now`. Without a payday we fall back to the calendar
 * month; with one, the cycle is anchored to the payday so a mid-month salary
 * isn't split across two calendar months.
 */
export function getCurrentPayCycle(payday: number | null | undefined, now: Date = new Date()): PayCycle {
  if (!payday || payday < 1 || payday > 31) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end };
  }

  let cycleStart = dateForDayOfMonth(now.getFullYear(), now.getMonth(), payday);
  if (cycleStart > now) {
    // This month's payday hasn't happened yet — the cycle started last month.
    cycleStart = dateForDayOfMonth(now.getFullYear(), now.getMonth() - 1, payday);
  }
  const nextPayday = dateForDayOfMonth(cycleStart.getFullYear(), cycleStart.getMonth() + 1, payday);
  const cycleEnd = new Date(nextPayday.getTime() - 86400000);
  return { start: cycleStart, end: cycleEnd };
}

/** Format a Date as a local YYYY-MM-DD calendar day. */
export function isoDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
