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
	/** Income transactions logged inside the current cycle. */
	incomeThisMonth: number;
	/** Income transactions logged inside the previous cycle. */
	incomeLastMonth: number;
	/** The income the user told us about (profile setup), before logged income. */
	baseIncome: number;
	/** What there actually is to spend this cycle: base income + income logged. */
	monthlyBudget: number;
	/** Persistent untracked cash the user has declared (AUDIT items 12/20). */
	cashInHand: number;
	/** Total recurring essentials/bills per month (AUDIT item 10). */
	monthlyEssentials: number;
	/** Essentials not yet marked paid this month — money still committed to go out. */
	unpaidEssentials: number;
	remainingBalance: number;
	/** remainingBalance with unpaid bills reserved out — what's truly free to spend. */
	remainingAfterEssentials: number;
	spendProgress: number;
	remainingProgress: number;
	avgDailySpend: number;
	daysLeftInMonth: number;
	weeklySpend: number;
	weeklyBudget: number;
	weeklyLeft: number;
};

/**
 * Parse a transaction date in *local* time.
 *
 * `new Date('2026-07-23')` is parsed as UTC midnight, which lands on the
 * previous day for anyone west of UTC — enough to push an entry out of its own
 * pay cycle. A plain YYYY-MM-DD string is a calendar day, so build it as one.
 */
function parseTransactionDate(value: string): Date | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value?.trim() ?? '');
	if (match) {
		return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
	}
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

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
	const income = transactions.filter((item) => item.type === 'income');
	const parse = parseTransactionDate;
	const inRange = (date: Date | null, start: Date, end: Date) => (date ? date >= start && date <= end : false);
	const sumInRange = (items: Transaction[], start: Date, end: Date) =>
		items.reduce((sum, item) => (inRange(parse(item.date), start, end) ? sum + item.amount : sum), 0);

	// The cycle runs to its own end, not to `now` — an entry dated later today
	// (or a couple of days ahead) still belongs to this cycle and must count.
	const expensesThisMonth = sumInRange(expenses, cycle.start, cycle.end);
	const expensesLastMonth = sumInRange(expenses, previousCycle.start, previousCycle.end);
	const incomeThisMonth = sumInRange(income, cycle.start, cycle.end);
	const incomeLastMonth = sumInRange(income, previousCycle.start, previousCycle.end);

	// Money in = what the user told us they earn + anything they actually logged
	// as income this cycle (a bonus, freelance payment, a gift). Before this,
	// logging income changed nothing anywhere, which is why it looked broken.
	const baseIncome = profile?.monthlyIncome && profile.monthlyIncome > 0 ? profile.monthlyIncome : 0;
	const monthlyBudget = baseIncome + incomeThisMonth;
	// Untracked cash the user declared (via the overspend prompt). It's real money
	// available on top of income, so it lifts what's left to spend — but it's not
	// recurring income, so it's kept out of `monthlyBudget` / spend-progress and
	// only added to the remaining balance (AUDIT items 12/20).
	const cashInHand = profile?.cashInHand && profile.cashInHand > 0 ? profile.cashInHand : 0;
	// Recurring essentials committed this month (AUDIT items 10/19). Totals are
	// derived server-side and delivered on the profile, so every surface reads the
	// same figure. `monthlyEssentials` is the full recurring load; `unpaidEssentials`
	// is what hasn't gone out yet and so should be reserved from what's free to spend.
	const monthlyEssentials = profile?.monthlyEssentials && profile.monthlyEssentials > 0 ? profile.monthlyEssentials : 0;
	const unpaidEssentials = profile?.unpaidEssentials && profile.unpaidEssentials > 0 ? profile.unpaidEssentials : 0;
	// Do NOT clamp: when a user overspends they're in debt, and the app must be
	// able to say so. A floor at 0 silently reads overspend as "₹0 left, 100% used".
	// `spendProgress` is likewise allowed past 1 — the ring/bar cap the visual
	// (see ProgressRing/ProgressBar), but callers can detect "over budget" from it.
	const remainingBalance = monthlyBudget + cashInHand - expensesThisMonth;
	// Reserve unpaid bills so "free to spend" doesn't count money already spoken
	// for. Kept as a separate figure — remainingBalance stays the honest cash
	// position; this is the after-bills view (Safe-to-Spend / the Home reserve pill).
	const remainingAfterEssentials = remainingBalance - unpaidEssentials;
	const spendProgress = monthlyBudget > 0 ? expensesThisMonth / monthlyBudget : 0;
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
		incomeThisMonth,
		incomeLastMonth,
		baseIncome,
		monthlyBudget,
		cashInHand,
		monthlyEssentials,
		unpaidEssentials,
		remainingBalance,
		remainingAfterEssentials,
		spendProgress,
		remainingProgress,
		avgDailySpend,
		daysLeftInMonth: cycle.daysLeft,
		weeklySpend,
		weeklyBudget,
		weeklyLeft,
	};
}
