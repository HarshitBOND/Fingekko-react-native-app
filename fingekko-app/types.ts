export type ApiUser = {
	id: string;
	name: string;
	email: string;
	monthlyIncome?: number;
	payday?: number | null;
	currency?: string;
	/** Persistent untracked-cash buffer, drawn down at payday (AUDIT items 12/20). */
	cashInHand?: number;
	/** Sum of all recurring essentials/bills per month (AUDIT item 10). */
	monthlyEssentials?: number;
	/** Essentials not yet marked paid this month — money still committed to go out. */
	unpaidEssentials?: number;
	/** The most urgent unpaid bill, for the Home bill-due nudge (AUDIT item 11). */
	nextEssential?: NextEssential | null;
	/** Whether the user has completed the essentials onboarding form. */
	essentialsOnboarded?: boolean;
	level: number;
	xp: number;
	points: number;
	userGekko: string;
	avatarKey: string;
	/** Account creation timestamp — the personality engine's signup date. */
	createdAt?: string | null;
};

export type AuthSession = {
	token: string;
	user: ApiUser;
};

export type AuthResponse = {
	token: string;
	user: ApiUser;
};

export type HomeStats = {
	dayStreak: number;
	bestStreak: number;
	totalXp: number;
	questsDone: number;
	questsTarget: number;
	betterThanYesterday: number;
};

export type HomeResponse = {
	user: ApiUser;
	stats: HomeStats;
};

export type ProfileResponse = {
	user: ApiUser;
};

export type FriendStatus = 'pending' | 'accepted' | 'declined';

export type ApiFriend = {
	id: string;
	name: string;
	email: string;
	avatarKey?: string;
};

export type FriendRelationship = {
	id: string;
	status: FriendStatus;
	direction: 'incoming' | 'outgoing' | 'accepted';
	friend: ApiFriend;
	createdAt: string;
	updatedAt: string;
};

export type FriendsResponse = {
	friends: FriendRelationship[];
	incomingRequests: FriendRelationship[];
	outgoingRequests: FriendRelationship[];
};

export type FriendSearchResponse = {
	user: ApiFriend;
	relationship: FriendRelationship | null;
};

export type SplitParticipant = {
	userId: ApiFriend;
	amount: number;
	settled: boolean;
};

export type CommunityExpense = {
	id: string;
	description: string;
	amount: number;
	expenseDate: string;
	currency: string;
	notes: string;
	createdBy: ApiFriend;
	paidBy: ApiFriend;
	participants: SplitParticipant[];
	createdAt: string;
	updatedAt: string;
};

export type CommunityExpensesResponse = {
	expenses: CommunityExpense[];
};

export type CommunityExpenseResponse = {
	expense: CommunityExpense;
};

export type ApiTransaction = {
	id: string;
	type: 'income' | 'expense';
	amount: number;
	category: string;
	date: string;
	/** True when this row mirrors the user's share of a shared expense. */
	isSplit?: boolean;
	createdAt: number;
};

export type ApiGoal = {
	id: string;
	title: string;
	targetAmount: number;
	currentAmount: number;
	deadline: string;
	createdAt: number;
	emoji: string;
};

export type TransactionsResponse = {
	transactions: ApiTransaction[];
};

// Bulk plain-text import (AUDIT item 14). A parsed draft row the user reviews
// before it's ever written; `ok` is false when the parser couldn't read an amount.
export type ParsedImportRow = {
	raw: string;
	type: 'income' | 'expense';
	amount: number;
	category: string;
	ok: boolean;
	note?: string;
};

export type ImportPreviewResponse = {
	rows: ParsedImportRow[];
	/** A balance figure detected in the paste, for the reconcile note (or null). */
	detectedBalance: number | null;
	/** Existing manual (non-split) entries on the target day — the collision set. */
	existingForDate: ApiTransaction[];
};

export type ImportCommitResponse = {
	created: number;
	removed: number;
};

// Recurring essential / bill (AUDIT item 10). `paidThisMonth` is derived
// server-side from the current calendar month, so it resets on its own.
export type ApiEssential = {
	id: string;
	name: string;
	amount: number;
	dueDay: number;
	category: string;
	paidThisMonth: boolean;
	createdAt: number;
};

export type EssentialsSummary = {
	monthlyTotal: number;
	unpaidTotal: number;
	count: number;
};

// The single most urgent unpaid bill surfaced on /home (AUDIT item 11).
export type NextEssential = {
	id: string;
	name: string;
	amount: number;
	dueDay: number;
	category: string;
	/** True when the due day has already passed this month. */
	overdue: boolean;
};

export type EssentialsResponse = {
	essentials: ApiEssential[];
	summary: EssentialsSummary;
	onboarded: boolean;
};

export type EssentialResponse = {
	essential: ApiEssential;
};

export type BadgeDefinition = {
	id: string;
	label: string;
	description: string;
	icon: string;
};

export type EarnedBadge = {
	id: string;
	earnedAt: string;
};

export type EarnedBadgeInfo = {
	id: string;
	label: string;
	icon: string;
};

export type GoalStats = {
	contributionStreak: number;
	bestContributionStreak: number;
};

export type XpEventDto = {
	id: string;
	type: string;
	amount: number;
	description: string;
	goalId: string | null;
	createdAt: number;
};

export type XpEventsResponse = {
	events: XpEventDto[];
};

export type GoalsResponse = {
	goals: ApiGoal[];
	goalStats: GoalStats;
	badges: EarnedBadge[];
	badgeCatalog: BadgeDefinition[];
};

// The server now owns the whole board and ships each quest fully enriched — the
// client renders what it's given and never sources XP / difficulty / type / the
// board itself (AUDIT items 29–31).
export type QuestVerifyKind = 'self' | 'auto';

export type ApiQuest = {
	questId: number;
	id: number;
	title: string;
	description: string;
	icon: string;
	type: string;
	difficulty: number;
	xp: number;
	verify: QuestVerifyKind;
	status: 'pending' | 'completed' | 'failed';
	progress: number;
};

export type ApiQuestState = {
	date: string;
	difficultyByType: Record<string, number>;
	quests: ApiQuest[];
};

export type QuestStateResponse = {
	state: ApiQuestState | null;
};

// Response to a self-quest action (complete / skip / undo).
export type QuestActionResponse = {
	state: ApiQuestState;
	xp: number;
	level: number;
	leveledUp: boolean;
};
