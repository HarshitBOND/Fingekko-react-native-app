import React, { useCallback, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import AppText from '@/components/ui/AppText';
import Icon from '@/components/ui/Icon';
import PressableScale from '@/components/ui/PressableScale';
import Card from '@/components/ui/Card';
import { palette, radius, shadows, spacing } from '@/constants/design';
import { useAppEvent } from '@/hooks/use-app-event';
import type { ShiftedGoalItem } from '@/lib/appEvents';

type PendingShift = {
  reason: 'bill' | 'quest' | 'activity';
  message: string;
  shiftedGoals: ShiftedGoalItem[];
} | null;

export default function GoalShiftModal() {
  const router = useRouter();
  const [pending, setPending] = useState<PendingShift>(null);

  useAppEvent('goal:shifted', (payload) => {
    if (payload && payload.shiftedGoals && payload.shiftedGoals.length > 0) {
      setPending(payload);
    }
  });

  const dismiss = useCallback(() => {
    setPending(null);
  }, []);

  const goToGoals = useCallback(() => {
    setPending(null);
    router.push('/(tabs)/goals');
  }, [router]);

  if (!pending) return null;

  const isBill = pending.reason === 'bill';
  const isQuest = pending.reason === 'quest';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <Animated.View entering={ZoomIn.duration(320)} style={styles.card}>
          <View style={[styles.badgeWrap, { backgroundColor: isBill ? palette.warningLight : palette.dangerLight }]}>
            <Icon
              name={isBill ? 'Calendar' : 'Clock'}
              size={36}
              color={isBill ? palette.warning : palette.danger}
              clickable={false}
            />
          </View>

          <Animated.View entering={FadeIn.duration(280).delay(80)} style={styles.headerArea}>
            <AppText variant="h2" align="center" weight="bold">
              Goal Timelines Shifted
            </AppText>
            <AppText variant="bodySm" color="textSecondary" align="center" style={styles.messageText}>
              {pending.message}
            </AppText>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(320).delay(120)} style={styles.goalsList}>
            {pending.shiftedGoals.map((item) => {
              const isPositive = item.shiftDays > 0;
              const absDays = Math.abs(item.shiftDays);

              return (
                <Card key={item.goalId} variant="flat" padding={12} style={styles.goalRow}>
                  <View style={styles.goalRowTop}>
                    <AppText variant="title" style={{ fontSize: 18 }}>
                      {item.emoji || '🎯'}
                    </AppText>
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodySm" weight="bold" color="textPrimary">
                        {item.title}
                      </AppText>
                      <AppText variant="micro" color="textSecondary">
                        {item.oldDeadline} ➔ {item.newDeadline}
                      </AppText>
                    </View>
                    <View
                      style={[
                        styles.shiftBadge,
                        { backgroundColor: isPositive ? palette.dangerLight : palette.successLight },
                      ]}
                    >
                      <AppText
                        variant="micro"
                        weight="bold"
                        style={{ color: isPositive ? palette.danger : palette.success }}
                      >
                        {isPositive ? `+${absDays}d` : `-${absDays}d`}
                      </AppText>
                    </View>
                  </View>
                </Card>
              );
            })}
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(320).delay(180)} style={styles.actions}>
            <PressableScale style={styles.primaryBtn} onPress={dismiss}>
              <AppText variant="bodySm" weight="bold" color="onDark">
                Understood, update my goals
              </AppText>
            </PressableScale>

            <PressableScale style={styles.secondaryBtn} onPress={goToGoals}>
              <AppText variant="bodySm" weight="bold" color="primaryDeep">
                View Goal Board
              </AppText>
            </PressableScale>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: palette.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radius.xxl,
    backgroundColor: palette.card,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    ...shadows.xl,
  },
  badgeWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerArea: {
    alignItems: 'center',
    gap: 6,
  },
  messageText: {
    lineHeight: 20,
    paddingHorizontal: spacing.xs,
  },
  goalsList: {
    alignSelf: 'stretch',
    gap: spacing.xs,
    maxHeight: 220,
  },
  goalRow: {
    backgroundColor: palette.bg,
  },
  goalRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  shiftBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  actions: {
    alignSelf: 'stretch',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryDeep,
    ...shadows.primary,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryLight,
  },
});
