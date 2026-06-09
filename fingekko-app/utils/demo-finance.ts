import type { Transaction } from '@/constants/types';
import type { ApiUser } from '@/types';

type ExpenseSummary = {
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

const makeDate = (year: number, month: number, day: number) => {
	const date = new Date(year, month, day, 12, 0, 0, 0);
	if (date.getMonth() === month) {
		return date;
	}

	return new Date(year, month, 1, 12, 0, 0, 0);
};

const toTransaction = (
	baseDate: Date,
	monthOffset: number,
	day: number,
	amount: number,
	category: string,
	id: string,
): Transaction => {
	const date = makeDate(baseDate.getFullYear(), baseDate.getMonth() + monthOffset, day);
	return {
		id,
		type: 'expense',
		amount,
		category,
		date: date.toISOString(),
		createdAt: date.getTime(),
	};
};

export const createDummyProfile = (overrides: Partial<ApiUser> = {}): ApiUser => ({
	id: 'dummy-user',
	name: 'Demo User',
	email: 'demo@example.com',
	monthlyIncome: 20000,
	currency: '₹',
	level: 2,
	xp: 420,
	points: 1200,
	userGekko: 'gekko-demo',
	avatarKey: '',
	...overrides,
});

export const createDummyTransactions = (baseDate = new Date()): Transaction[] => {
	const today = baseDate.getDate();
	const thisMonthDay = (offset: number) => Math.max(1, today - offset);

	return [
		toTransaction(baseDate, -1, 4, 3200, 'Shopping', 'demo-lm-1'),
		toTransaction(baseDate, -1, 9, 850, 'Food', 'demo-lm-2'),
		toTransaction(baseDate, -1, 14, 1400, 'Home', 'demo-lm-3'),
		toTransaction(baseDate, -1, 19, 2600, 'Shopping', 'demo-lm-4'),
		toTransaction(baseDate, -1, 23, 1100, 'Food', 'demo-lm-5'),
		toTransaction(baseDate, -1, 27, 900, 'Home', 'demo-lm-6'),
		toTransaction(baseDate, 0, thisMonthDay(1), 1800, 'Shopping', 'demo-tm-1'),
		toTransaction(baseDate, 0, thisMonthDay(3), 650, 'Food', 'demo-tm-2'),
		toTransaction(baseDate, 0, thisMonthDay(5), 1200, 'Home', 'demo-tm-3'),
		toTransaction(baseDate, 0, thisMonthDay(7), 900, 'Food', 'demo-tm-4'),
		toTransaction(baseDate, 0, thisMonthDay(10), 1400, 'Shopping', 'demo-tm-5'),
		toTransaction(baseDate, 0, thisMonthDay(13), 1000, 'Home', 'demo-tm-6'),
		toTransaction(baseDate, 0, thisMonthDay(16), 750, 'Food', 'demo-tm-7'),
		toTransaction(baseDate, 0, thisMonthDay(18), 2100, 'Shopping', 'demo-tm-8'),
	];
};

export const appendDummyExpense = (
	transactions: Transaction[],
	amount: number,
	category: string,
	at = new Date(),
): Transaction[] => [
	...transactions,
	{
		id: `manual-${at.getTime()}`,
		type: 'expense',
		amount: Math.round(amount),
		category: category || 'Misc',
		date: at.toISOString(),
		createdAt: at.getTime(),
	},
];

export const summarizeExpenses = (
	transactions: Transaction[],
	profile: ApiUser,
	now = new Date(),
): ExpenseSummary => {
	const expenses = transactions.filter((item) => item.type === 'expense');
	const parse = (value: string) => {
		const parsed = new Date(value);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	};
	const inRange = (date: Date | null, start: Date, end: Date) =>
		date ? date >= start && date <= end : false;

	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
	const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

	const expensesThisMonth = expenses.reduce((sum, item) => {
		const date = parse(item.date);
		return inRange(date, startOfMonth, now) ? sum + item.amount : sum;
	}, 0);

	const expensesLastMonth = expenses.reduce((sum, item) => {
		const date = parse(item.date);
		return inRange(date, startOfLastMonth, endOfLastMonth) ? sum + item.amount : sum;
	}, 0);

	const daysElapsed = Math.max(1, now.getDate());
	const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() || 1;
	const monthlyBudget = profile.monthlyIncome && profile.monthlyIncome > 0 ? profile.monthlyIncome : 20000;
	const remainingBalance = Math.max(0, monthlyBudget - expensesThisMonth);
	const spendProgress = monthlyBudget > 0 ? Math.min(1, expensesThisMonth / monthlyBudget) : 0;
	const remainingProgress = 1 - spendProgress;
	const avgDailySpend = expensesThisMonth / daysElapsed;
	const daysLeftInMonth = Math.max(0, daysInMonth - now.getDate());

	const weekStart = new Date(now);
	weekStart.setDate(now.getDate() - 6);
	weekStart.setHours(0, 0, 0, 0);

	const weeklySpend = expenses.reduce((sum, item) => {
		const date = parse(item.date);
		return date && date >= weekStart ? sum + item.amount : sum;
	}, 0);

	const weeklyBudget = monthlyBudget / 4;
	const weeklyLeft = Math.max(0, weeklyBudget - weeklySpend);

	return {
		expensesThisMonth,
		expensesLastMonth,
		monthlyBudget,
		remainingBalance,
		spendProgress,
		remainingProgress,
		avgDailySpend,
		daysLeftInMonth,
		weeklySpend,
		weeklyBudget,
		weeklyLeft,
	};
};