export type ApiUser = {
	id: string;
	name: string;
	email: string;
	monthlyIncome?: number;
	payday?: number | null;
	currency?: string;
	level: number;
	xp: number;
	points: number;
	userGekko: string;
	avatarKey: string;
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

export type QuestStateResponse = {
	state: {
		date: string;
		difficultyByType: Record<string, number>;
		quests: { questId: number; status: string; progress: number }[];
	} | null;
};
