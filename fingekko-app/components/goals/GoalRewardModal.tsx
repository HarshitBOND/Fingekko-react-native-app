import { useEffect, useMemo } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { palette, radius, shadows, spacing } from '@/constants/design';
import AnimatedNumber from '../ui/AnimatedNumber';
import AppText from '../ui/AppText';
import Button from '../ui/Button';
import Icon from '../ui/Icon';

const CONFETTI_COLORS = [palette.primary, palette.warning, palette.info, palette.success, '#FFD166', '#EF476F', '#06D6A0', '#7B61FF'];

type Particle = {
  id: number;
  angle: number;
  distance: number;
  size: number;
  color: string;
  delay: number;
  rotate: number;
};

function buildParticles(count = 18): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6,
    distance: 70 + Math.random() * 90,
    size: 5 + Math.random() * 6,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: Math.random() * 120,
    rotate: Math.random() * 360 - 180,
  }));
}

function ConfettiParticle({ particle, active }: { particle: Particle; active: boolean }) {
  const t = useSharedValue(0);

  useEffect(() => {
    if (active) {
      t.value = 0;
      t.value = withDelay(particle.delay, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const style = useAnimatedStyle(() => {
    const progress = t.value;
    const dx = Math.cos(particle.angle) * particle.distance * progress;
    const dy = Math.sin(particle.angle) * particle.distance * progress + 50 * progress * progress;
    return {
      opacity: 1 - progress,
      transform: [
        { translateX: dx },
        { translateY: dy },
        { rotate: `${particle.rotate * progress}deg` },
        { scale: 0.6 + 0.6 * (1 - progress) },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: particle.color,
        },
        style,
      ]}
    />
  );
}

export type GoalRewardInfo = {
  xpEarned: number;
  justCompleted: boolean;
  leveledUp: boolean;
  newLevel?: number;
  goalTitle?: string;
};

type GoalRewardModalProps = {
  reward: GoalRewardInfo | null;
  onDismiss: () => void;
};

export default function GoalRewardModal({ reward, onDismiss }: GoalRewardModalProps) {
  const visible = !!reward;
  const particles = useMemo(() => buildParticles(), [reward]);
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSequence(withSpring(1.06, { damping: 8, stiffness: 180 }), withSpring(1, { damping: 14 }));
      opacity.value = withTiming(1, { duration: 180 });
    } else {
      scale.value = 0.6;
      opacity.value = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Animated.View style={[styles.card, cardStyle]}>
            <View style={styles.particleField}>
              {particles.map((particle) => (
                <ConfettiParticle key={particle.id} particle={particle} active={visible} />
              ))}
            </View>

            <View style={[styles.iconCircle, reward?.justCompleted && styles.iconCircleGold]}>
              <AppText style={{ fontSize: 34 }}>{reward?.justCompleted ? '🏆' : '⭐'}</AppText>
            </View>

            <AppText variant="title" color="textPrimary" weight="bold" align="center" style={{ marginTop: spacing.md }}>
              {reward?.justCompleted ? 'Goal Achieved!' : 'Nice progress!'}
            </AppText>

            {!!reward?.goalTitle && (
              <AppText variant="caption" color="textSecondary" align="center" style={{ marginTop: 2 }}>
                {reward.goalTitle}
              </AppText>
            )}

            <View style={styles.xpRow}>
              <Icon name="Zap" size={18} color={palette.warning} />
              <AnimatedNumber
                value={reward?.xpEarned ?? 0}
                format={(n) => `+${Math.round(n)} XP`}
                variant="title"
                color="primaryDeep"
                style={{ marginLeft: 6 }}
              />
            </View>

            {reward?.leveledUp && (
              <View style={styles.levelUpBanner}>
                <AppText variant="bodySm" color="onDark" weight="bold" align="center">
                  🎉 Level Up! You&apos;re now Level {reward.newLevel}
                </AppText>
              </View>
            )}

            <Button variant="primary" size="md" onPress={onDismiss} style={{ marginTop: spacing.lg }}>
              Nice!
            </Button>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: 300,
    backgroundColor: palette.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.md,
    overflow: 'visible',
  },
  particleField: {
    position: 'absolute',
    top: '30%',
    left: '50%',
    width: 0,
    height: 0,
  },
  particle: {
    position: 'absolute',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleGold: {
    backgroundColor: '#FFF3D6',
  },
  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  levelUpBanner: {
    marginTop: spacing.md,
    backgroundColor: palette.primaryDeep,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: '100%',
  },
});
