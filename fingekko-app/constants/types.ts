export type TransactionType = "income"|"expense";

export interface Transaction{
    id: string ;
    type : TransactionType;
    amount: number;
    category: string;
    date: string;
    createdAt: number;
}

export interface Goal{
    id: string;
    title: string;
    targetAmount: number;
    currentAmount: number;
    deadline: string;
    createdAt: number;
    emoji: string ;
}
    

export interface StreakData{
    currentStrak: number;
    bestStreak: number;
    lastTrackedDate: string ;
    trackedDates: string[]; // Array of dates in ISO format (e.g., "2024-06-01")
}

export interface Achievement{
    id: string;
    title: string;
    description: string;
    icon: string;
    unlockedAt: number| null;
    progress: number;
}


export interface UserProfile{
    name: string;
    monthlyIncome: number;
    xp: number;
    level: number;
    currency: string;
    streak: StreakData;
    achievements: Achievement[];
    personalityType: string| null;
}

export interface Category{
    id: string;
    label: string;
    emoji : string;
    icon: string;
    color: string;
    type: TransactionType;
}

export type QuestType =
    | 'saving'
        | 'discipline'
            | 'tracking'
                | 'engagement'
                    | 'budgeting'
                        | 'challenge'
                            | 'lifestyle'
                                | 'mindfulness'
                                |'learning'
                                    

export type QuestStatus = 'pending' | 'completed' | 'failed';

export interface QuestDefinition {
    id: number;
    text: string;
    difficulty: number;
    type: QuestType;
    xp: number;
}

export interface DailyQuest {
    questId: number;
    status: QuestStatus;
    progress: number;
}

export interface QuestState {
    date: string;
    difficultyByType: Record<QuestType, number>;
    quests: DailyQuest[];
}