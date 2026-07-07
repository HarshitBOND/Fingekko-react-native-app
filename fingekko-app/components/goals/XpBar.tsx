import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { palette, radius, spacing } from '@/constants/design';
import AppText from '../ui/AppText';
import Icon from '../ui/Icon';
import { getLevelProgress } from '@/utils/gamification';

type XpBarProps = {
  xp: number;
  contributionStreak?: number;
  onPressHistory?: () => void;
};

export default function XpBar({ xp, contributionStreak, onPressHistory }: XpBarProps) {
  const { level, xpIntoLevel, xpForNextLevel, progress } = getLevelProgress(xp);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: progress,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [progress, anim]);

  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const content = (
    <>
      <View style={styles.topRow}>
        <View style={styles.badgesGroup}>
          <View style={styles.levelBadge}>
            <Icon name="Star" size={13} color={palette.white} />
            <AppText variant="caption" color="onDark" weight="bold">
              Level {level}
            </AppText>
          </View>
          {!!contributionStreak && contributionStreak > 0 && (
            <View style={styles.streakBadge}>
              <Icon name="Flame" size={13} color={palette.white} />
              <AppText variant="caption" color="onDark" weight="bold">
                {contributionStreak}w
              </AppText>
            </View>
          )}
        </View>
        <View style={styles.rightGroup}>
          <AppText variant="micro" color="textSecondary">
            {xpIntoLevel} / {xpForNextLevel} XP
          </AppText>
          {!!onPressHistory && <Icon name="ChevronRight" size={14} color={palette.textTertiary} />}
        </View>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width }]} />
      </View>
    </>
  );

  if (onPressHistory) {
    return (
      <Pressable style={styles.card} onPress={onPressHistory}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.card}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  badgesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: palette.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: palette.warning,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  track: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: palette.track,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: palette.primary,
  },
});
