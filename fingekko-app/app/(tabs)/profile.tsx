import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, FontSizes, Spacing } from '../../constants/Colors';
import { Goal, Transaction, UserProfile } from '../../constants/types';
import { formatCurrency } from '../../utils/helpers';
import { getGoals, getProfile, getTransactions } from '../../utils/storage';

const CHARACTER_ROSTER = [
    {
        id: 'gekkopale',
        name: 'GekkoPale',
        vibe: 'Balanced spender',
        description: 'Not too wild, not too strict.',
    },
    {
        id: 'mintmiser',
        name: 'MintMiser',
        vibe: 'Good saver',
        description: 'Stacks calm, saves steady.',
    },
    {
        id: 'blazeburner',
        name: 'BlazeBurner',
        vibe: 'Heavy spender',
        description: 'Lives loud, spends fast.',
    },
    {
        id: 'foggyfingers',
        name: 'FoggyFingers',
        vibe: 'Clumsy spender',
        description: 'Money leaks in the fog.',
    },
    {
        id: 'vaultsage',
        name: 'VaultSage',
        vibe: 'Strategic saver',
        description: 'Plans ahead and builds cushion.',
    },
];

const BASE_XP = 200;
const XP_STEP = 150;
const MS_IN_DAY = 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function parseDate(value: string): Date | null {
    if (!value) {
        return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addDays(date: Date, days: number) {
    const next = new Date(date.getTime());
    next.setDate(next.getDate() + days);
    return next;
}

function getLevelProgress(totalXp: number) {
    let level = 1;
    let xpForNext = BASE_XP;
    let remaining = Math.max(0, Math.floor(totalXp));

    while (remaining >= xpForNext && level < 50) {
        remaining -= xpForNext;
        level += 1;
        xpForNext = BASE_XP + (level - 1) * XP_STEP;
    }

    return {
        level,
        xpInto: remaining,
        xpForNext,
    };
}

type Persona = {
    tag: string;
    character: string;
    description: string;
    vibe: string;
};

function derivePersona(income: number, expenses: number, personalityType: string | null): Persona {
    if (personalityType) {
        return {
            tag: personalityType,
            character: 'GekkoPale',
            description: 'Predicted from your recent patterns.',
            vibe: 'Custom vibe',
        };
    }

    if (income <= 0 && expenses > 0) {
        return {
            tag: 'Clumsy spender',
            character: 'FoggyFingers',
            description: 'Expenses without steady income need attention.',
            vibe: 'Clumsy spender',
        };
    }

    const ratio = income > 0 ? expenses / income : 1;

    if (ratio >= 0.9) {
        return {
            tag: 'Heavy spender',
            character: 'BlazeBurner',
            description: 'Most income is spent. Tighten the loop.',
            vibe: 'Heavy spender',
        };
    }

    if (ratio >= 0.7) {
        return {
            tag: 'Balanced spender',
            character: 'GekkoPale',
            description: 'Not too wild, not too strict. Push for more savings.',
            vibe: 'Balanced spender',
        };
    }

    if (ratio >= 0.45) {
        return {
            tag: 'Steady saver',
            character: 'MintMiser',
            description: 'Savings are steady. Keep the rhythm.',
            vibe: 'Good saver',
        };
    }

    return {
        tag: 'Good saver',
        character: 'VaultSage',
        description: 'Strong savings buffer. Build the next goal.',
        vibe: 'Strategic saver',
    };
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);

    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            async function loadData() {
                const [nextProfile, nextTransactions, nextGoals] = await Promise.all([
                    getProfile(),
                    getTransactions(),
                    getGoals(),
                ]);

                if (!isActive) {
                    return;
                }

                setProfile(nextProfile);
                setTransactions(nextTransactions);
                setGoals(nextGoals);
            }

            loadData();

            return () => {
                isActive = false;
            };
        }, [])
    );

    const currency = profile?.currency ?? '₹';
    const formatAmount = (value: number) => formatCurrency(Math.round(value), currency);

    const recentStats = useMemo(() => {
        const today = new Date();
        const start = addDays(today, -29);
        const recent = transactions.filter(transaction => {
            const parsed = parseDate(transaction.date);
            return parsed ? parsed >= start && parsed <= today : false;
        });

        const income = recent
            .filter(transaction => transaction.type === 'income')
            .reduce((sum, transaction) => sum + transaction.amount, 0);
        const expenses = recent
            .filter(transaction => transaction.type === 'expense')
            .reduce((sum, transaction) => sum + transaction.amount, 0);
        const net = income - expenses;
        const avgDaily = expenses / 30;

        return {
            income,
            expenses,
            net,
            avgDaily,
        };
    }, [transactions]);

    const persona = useMemo(
        () => derivePersona(recentStats.income, recentStats.expenses, profile?.personalityType ?? null),
        [profile?.personalityType, recentStats.expenses, recentStats.income]
    );

    const xpData = useMemo(() => {
        const baseXp = profile?.xp ?? 0;
        const activityXp = transactions.length * 12 + goals.length * 40 + (profile?.streak.currentStrak ?? 0) * 20;
        const totalXp = baseXp > 0 ? baseXp : activityXp;
        const isEstimated = baseXp === 0 && activityXp > 0;
        const progress = getLevelProgress(totalXp);

        return {
            totalXp,
            isEstimated,
            ...progress,
        };
    }, [goals.length, profile?.streak.currentStrak, profile?.xp, transactions.length]);

    const streak = profile?.streak.currentStrak ?? 0;
    const badges = profile?.achievements?.length ?? 0;
    const completedGoals = goals.filter(goal => goal.currentAmount >= goal.targetAmount).length;

    const personaScores = useMemo(() => {
        const ratio = recentStats.income > 0 ? recentStats.expenses / recentStats.income : 1;
        const savingScore = clamp((1 - ratio) * 100, 0, 100);
        const disciplineScore = clamp((streak / 14) * 100, 0, 100);
        const growthScore = clamp((goals.length / 5) * 100, 0, 100);

        return {
            savingScore,
            disciplineScore,
            growthScore,
        };
    }, [goals.length, recentStats.expenses, recentStats.income, streak]);

    const nextGoalAlert = useMemo(() => {
        const today = new Date();
        const upcoming = goals
            .map(goal => ({
                goal,
                deadline: parseDate(goal.deadline),
            }))
            .filter(item => item.deadline && item.deadline >= today)
            .sort((a, b) => a.deadline!.getTime() - b.deadline!.getTime());

        if (upcoming.length === 0) {
            return null;
        }

        const target = upcoming[0];
        const daysLeft = Math.max(0, Math.ceil((target.deadline!.getTime() - today.getTime()) / MS_IN_DAY));

        return {
            title: target.goal.title,
            daysLeft,
        };
    }, [goals]);

    const avatarInitial = profile?.name ? profile.name.trim().charAt(0).toUpperCase() : 'F';

    return (
        <SafeAreaView style={styles.container}>
            <View pointerEvents="none" style={styles.backgroundLayer}>
                <View style={styles.greenGlow} />
            </View>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <Text style={styles.headerSubtitle}>Level up your money habits.</Text>
                </View>

                <View style={styles.heroCard}>
                    <View style={styles.avatarRow}>
                        <View style={styles.avatarCircle}>
                            <Text style={styles.avatarInitial}>{avatarInitial}</Text>
                        </View>
                        <View style={styles.avatarText}>
                            <Text style={styles.nameText}>{profile?.name ?? 'FinGekko User'}</Text>
                            <Text style={styles.characterText}>{persona.character}</Text>
                            <View style={styles.tagRow}>
                                <View style={styles.tagChip}>
                                    <Text style={styles.tagText}>{persona.tag}</Text>
                                </View>
                                <View style={[styles.tagChip, styles.tagChipAlt]}>
                                    <Text style={styles.tagTextAlt}>{persona.vibe}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.avatarButton} disabled>
                        <Text style={styles.avatarButtonText}>Avatar coming soon</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.levelCard}>
                    <View style={styles.levelRow}>
                        <Text style={styles.levelTitle}>Level {xpData.level}</Text>
                        <Text style={styles.levelXp}>{xpData.totalXp} XP</Text>
                    </View>
                    <View style={styles.progressTrack}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${(xpData.xpInto / xpData.xpForNext) * 100}%` },
                            ]}
                        />
                    </View>
                    <Text style={styles.levelHint}>
                        {Math.max(0, xpData.xpForNext - xpData.xpInto)} XP to level {xpData.level + 1}
                    </Text>
                    {xpData.isEstimated ? (
                        <Text style={styles.levelFootnote}>Estimated from recent activity.</Text>
                    ) : null}
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Streak</Text>
                        <Text style={styles.statValue}>{streak} days</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Goals</Text>
                        <Text style={styles.statValue}>{completedGoals}/{goals.length}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Badges</Text>
                        <Text style={styles.statValue}>{badges}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Personality profile</Text>
                    <View style={styles.personaCard}>
                        <Text style={styles.personaTitle}>{persona.tag}</Text>
                        <Text style={styles.personaDescription}>{persona.description}</Text>
                        <View style={styles.meterRow}>
                            <View style={styles.meterBlock}>
                                <Text style={styles.meterLabel}>Saving</Text>
                                <Text style={styles.meterValue}>{Math.round(personaScores.savingScore)}%</Text>
                            </View>
                            <View style={styles.meterBlock}>
                                <Text style={styles.meterLabel}>Discipline</Text>
                                <Text style={styles.meterValue}>{Math.round(personaScores.disciplineScore)}%</Text>
                            </View>
                            <View style={styles.meterBlock}>
                                <Text style={styles.meterLabel}>Growth</Text>
                                <Text style={styles.meterValue}>{Math.round(personaScores.growthScore)}%</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Character lineup</Text>
                    <View style={styles.characterGrid}>
                        {CHARACTER_ROSTER.map(character => {
                            const isActive = character.name === persona.character;
                            return (
                                <View
                                    key={character.id}
                                    style={[styles.characterCard, isActive && styles.characterCardActive]}
                                >
                                    <Text style={styles.characterName}>{character.name}</Text>
                                    <Text style={styles.characterVibe}>{character.vibe}</Text>
                                    <Text style={styles.characterDesc}>{character.description}</Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Upcoming alerts</Text>
                    <View style={styles.alertCard}>
                        {nextGoalAlert ? (
                            <>
                                <Text style={styles.alertTitle}>Next goal check</Text>
                                <Text style={styles.alertValue}>
                                    {nextGoalAlert.title} in {nextGoalAlert.daysLeft} days
                                </Text>
                            </>
                        ) : (
                            <Text style={styles.alertValue}>No goal deadlines yet. Add one to get reminders.</Text>
                        )}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Daily quests</Text>
                    <View style={styles.questCard}>
                        <View style={styles.questRow}>
                            <Text style={styles.questTitle}>Log 1 transaction</Text>
                            <Text style={styles.questXp}>+40 XP</Text>
                        </View>
                        <View style={styles.questRow}>
                            <Text style={styles.questTitle}>Save above {formatAmount(recentStats.avgDaily)}</Text>
                            <Text style={styles.questXp}>+60 XP</Text>
                        </View>
                        <View style={styles.questRow}>
                            <Text style={styles.questTitle}>Review goals</Text>
                            <Text style={styles.questXp}>+30 XP</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    backgroundLayer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    greenGlow: {
        position: 'absolute',
        top: -120,
        right: -140,
        width: 280,
        height: 240,
        borderRadius: 200,
        backgroundColor: Colors.primary,
        opacity: 0.18,
    },
    scrollContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xxl,
    },
    header: {
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.base,
    },
    headerTitle: {
        fontSize: FontSizes.xxl,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    headerSubtitle: {
        marginTop: 4,
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    heroCard: {
        backgroundColor: Colors.surface,
        borderRadius: 24,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 6,
        gap: Spacing.base,
    },
    avatarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.base,
    },
    avatarCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: FontSizes.xxl,
        fontWeight: '700',
        color: Colors.primaryDark,
    },
    avatarText: {
        flex: 1,
        gap: 6,
    },
    nameText: {
        fontSize: FontSizes.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    characterText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    tagChip: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: Colors.primaryLight,
    },
    tagChipAlt: {
        backgroundColor: 'rgba(52, 152, 219, 0.18)',
    },
    tagText: {
        fontSize: FontSizes.xs,
        fontWeight: '600',
        color: Colors.primaryDark,
    },
    tagTextAlt: {
        fontSize: FontSizes.xs,
        fontWeight: '600',
        color: Colors.savings,
    },
    avatarButton: {
        alignSelf: 'flex-start',
        paddingHorizontal: Spacing.base,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    avatarButtonText: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    levelCard: {
        marginTop: Spacing.lg,
        backgroundColor: Colors.surface,
        borderRadius: 20,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.sm,
    },
    levelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
    },
    levelTitle: {
        fontSize: FontSizes.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    levelXp: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    progressTrack: {
        height: 8,
        backgroundColor: Colors.border,
        borderRadius: 999,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: Colors.primary,
        borderRadius: 999,
    },
    levelHint: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    levelFootnote: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
    },
    statsRow: {
        marginTop: Spacing.lg,
        flexDirection: 'row',
        gap: Spacing.base,
    },
    statCard: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: Spacing.base,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        gap: 4,
    },
    statLabel: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
    },
    statValue: {
        fontSize: FontSizes.md,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    section: {
        marginTop: Spacing.xl,
        gap: Spacing.base,
    },
    sectionTitle: {
        fontSize: FontSizes.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    personaCard: {
        backgroundColor: Colors.surface,
        borderRadius: 20,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.sm,
    },
    personaTitle: {
        fontSize: FontSizes.md,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    personaDescription: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    meterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: Spacing.sm,
    },
    meterBlock: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    meterLabel: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
    },
    meterValue: {
        fontSize: FontSizes.sm,
        fontWeight: '600',
        color: Colors.textPrimary,
    },
    characterGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.base,
    },
    characterCard: {
        width: '48%',
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: Spacing.base,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: 4,
    },
    characterCardActive: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primaryLight,
    },
    characterName: {
        fontSize: FontSizes.md,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    characterVibe: {
        fontSize: FontSizes.xs,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    characterDesc: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
    },
    alertCard: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: 6,
    },
    alertTitle: {
        fontSize: FontSizes.sm,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    alertValue: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    questCard: {
        backgroundColor: Colors.surface,
        borderRadius: 18,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.sm,
    },
    questRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    questTitle: {
        fontSize: FontSizes.sm,
        color: Colors.textPrimary,
    },
    questXp: {
        fontSize: FontSizes.sm,
        fontWeight: '700',
        color: Colors.primary,
    },
});