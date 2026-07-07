import type { Transaction } from '@/constants/types';
import type { ApiUser } from '@/types';

export type PayCycle = {
	start: Date;
	end: Date;
	/** total days in this cycle (inclusive of both ends) */
	daysInCycle: number;
	/** days elapsed so far, including today */
	daysElapsed: number;
	/** days remaining until (and including) the day before the next payday */
	daysLeft: number;
};

/** Clamp a day-of-month (1-31) to a real date in the given month, e.g. 31 in Feb -> last day of Feb. */
function dateForDayOfMonth(year: number, month: number, day: number): Date {
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	return new Date(year, month, Math.min(day, daysInMonth), 12, 0, 0, 0);
}

function startOfDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from: Date, to: Date): number {
	return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000);
}

/**
 * Works out the user's current pay cycle. If they haven't told us their payday,
 * we fall back to a calendar-month cycle so the app still behaves sensibly
 * before setup — but once a payday is set, the cycle is anchored to it, so a
 * salary landing mid-month (e.g. the 25th) doesn't get artificially split
 * across two calendar months.
 */
export function getCurrentPayCycle(payday: number | null | undefined, now = new Date()): PayCycle {
	if (!payday || payday < 1 || payday > 31) {
		const start = new Date(now.getFullYear(), now.getMonth(), 1);
		const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		return {
			start,
			end,
			daysInCycle: daysBetween(start, end) + 1,
			daysElapsed: Math.max(1, daysBetween(start, now) + 1),
			daysLeft: Math.max(0, daysBetween(now, end)),
		};
	}

	let cycleStart = dateForDayOfMonth(now.getFullYear(), now.getMonth(), payday);
	if (cycleStart > now) {
		// This month's payday hasn't happened yet — the current cycle started last month.
		cycleStart = dateForDayOfMonth(now.getFullYear(), now.getMonth() - 1, payday);
	}

	const nextPayday = dateForDayOfMonth(cycleStart.getFullYear(), cycleStart.getMonth() + 1, payday);
	const cycleEnd = new Date(nextPayday.getTime() - 86400000);

	return {
		start: cycleStart,
		end: cycleEnd,
		daysInCycle: daysBetween(cycleStart, cycleEnd) + 1,
		daysElapsed: Math.max(1, daysBetween(cycleStart, now) + 1),
		daysLeft: Math.max(0, daysBetween(now, cycleEnd)),
	};
}

export type CycleSpendSummary = {
	expensesThisMonth: number;
	expensesLastMonth: number;
	monthlyBudget: number;
	remainingBalance: number;
	spendProgress: number;
	remainingProgress: number;
	avgDailySpend: number;
	daysLeftInMonth: number;
	weeklySpend: number;
	weeklyBudget: number;
	weeklyLeft: number;
};

/** Summarizes real spend/budget figures scoped to the user's pay cycle instead of the calendar month. */
export function summarizeByPayCycle(
	transactions: Transaction[],
	profile: ApiUser | null,
	now = new Date(),
): CycleSpendSummary {
	const cycle = getCurrentPayCycle(profile?.payday, now);
	const previousCycleAnchor = new Date(cycle.start.getTime() - 86400000);
	const previousCycle = getCurrentPayCycle(profile?.payday, previousCycleAnchor);

	const expenses = transactions.filter((item) => item.type === 'expense');
	const parse = (value: string) => {
		const parsed = new Date(value);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	};
	const inRange = (date: Date | null, start: Date, end: Date) => (date ? date >= start && date <= end : false);

	const expensesThisMonth = expenses.reduce((sum, item) => {
		const date = parse(item.date);
		return inRange(date, cycle.start, now) ? sum + item.amount : sum;
	}, 0);

	const expensesLastMonth = expenses.reduce((sum, item) => {
		const date = parse(item.date);
		return inRange(date, previousCycle.start, previousCycle.end) ? sum + item.amount : sum;
	}, 0);

	const monthlyBudget = profile?.monthlyIncome && profile.monthlyIncome > 0 ? profile.monthlyIncome : 0;
	const remainingBalance = Math.max(0, monthlyBudget - expensesThisMonth);
	const spendProgress = monthlyBudget > 0 ? Math.min(1, expensesThisMonth / monthlyBudget) : 0;
	const remainingProgress = 1 - spendProgress;
	const avgDailySpend = expensesThisMonth / cycle.daysElapsed;

	const weekStart = new Date(now);
	weekStart.setDate(now.getDate() - 6);
	weekStart.setHours(0, 0, 0, 0);

	const weeklySpend = expenses.reduce((sum, item) => {
		const date = parse(item.date);
		return date && date >= weekStart ? sum + item.amount : sum;
	}, 0);

	const weeklyBudget = monthlyBudget > 0 ? monthlyBudget / 4 : 0;
	const weeklyLeft = Math.max(0, weeklyBudget - weeklySpend);

	return {
		expensesThisMonth,
		expensesLastMonth,
		monthlyBudget,
		remainingBalance,
		spendProgress,
		remainingProgress,
		avgDailySpend,
		daysLeftInMonth: cycle.daysLeft,
		weeklySpend,
		weeklyBudget,
		weeklyLeft,
	};
}
