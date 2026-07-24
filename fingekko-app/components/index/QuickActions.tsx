import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { palette, radius, shadows, spacing } from '@/constants/design';
import { PERSONALITIES, type PersonalityType } from '@/constants/personality';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { usePersonality } from '@/hooks/usePersonality';
import AppText from '../ui/AppText';
import Icon from '../ui/Icon';

type Action = {
  icon: string;
  label: string;
  href: string;
  tint: string;
  fill: string;
  /** Renders the animated Lordicon and a resting nudge, so the tile invites a tap. */
  animated?: boolean;
  /** Character art shown instead of the icon (personality tile only). */
  avatar?: ReturnType<typeof require>;
};

/**
 * The four things people actually open the app to do, sitting directly under
 * the balance. Each one goes somewhere the rest of the app doesn't already
 * duplicate — adding an expense is the centre FAB's job, splitting lives in the
 * Split tab, so these are friends, the calendar, the safe-to-spend check and
 * the money personality (which used to be a card taking up the home screen).
 */
const buildActions = (personality: PersonalityType | null): Action[] => [
  { icon: 'UserPlus', label: 'Friends', href: '/(tabs)/Friends', tint: palette.info, fill: palette.infoLight },
  {
    icon: 'CalendarDays',
    label: 'Calendar',
    href: '/(tabs)/streak-calendar?view=month',
    tint: palette.primaryDeep,
    fill: palette.primaryLight,
  },
  { icon: 'Wallet', label: 'Can I spend?', href: '/(tabs)/safe-to-spend', tint: palette.warning, fill: palette.warningLight },
  {
    icon: 'Sparkles',
    label: 'Personality',
    href: '/(tabs)/personality',
    tint: palette.success,
    fill: palette.successLight,
    animated: true,
    // Falls back to the Sparkles glyph until the engine has enough data.
    avatar: personality ? PERSONALITIES[personality].avatar : undefined,
  },
];

/**
 * The personality tile's icon bubble. It breathes on a slow loop — a small,
 * repeating "press me" cue rather than a constant animation competing with the
 * balance above it. Under Reduce Motion it simply sits still.
 */
function ActionIcon({ action }: { action: Action }) {
  const reducedMotion = useReducedMotion();
  const animate = !!action.animated && !reducedMotion;
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!animate) return;
    scale.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(1.08, { duration: 520, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 520, easing: Easing.in(Easing.quad) }),
          // A long hold between pulses keeps it a hint, not a distraction.
          withTiming(1, { duration: 1800 }),
        ),
        -1,
        false,
      ),
    );
  }, [animate, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.iconWrap, { backgroundColor: action.fill }, style]}>
      {action.avatar ? (
        // The personality tile shows the user's own character instead of a
        // generic glyph — it's the one action whose value is personal.
        <Image source={action.avatar} style={styles.avatar} contentFit="contain" transition={180} />
      ) : (
        <Icon name={action.icon} size={20} color={action.tint} clickable={!!action.animated} />
      )}
    </Animated.View>
  );
}

export default function QuickActions() {
  const { result } = usePersonality();
  const personality = result?.status === 'ok' ? result.type : null;
  const actions = buildActions(personality);

  return (
    <View style={styles.row}>
      {actions.map((action) => (
        <Pressable
          key={action.label}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          onPress={() => router.push(action.href as never)}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <ActionIcon action={action} />
          <AppText variant="micro" color="textSecondary" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {action.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: palette.card,
    borderRadius: radius.xl,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.sm,
    ...shadows.sm,
  },
  action: { flex: 1, alignItems: 'center', gap: 7 },
  actionPressed: { opacity: 0.6 },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Fills the bubble edge to edge. At 42px inside a clipped 46px square the
  // character was unreadable — the tile looked empty.
  avatar: { width: 58, height: 58 },
});
