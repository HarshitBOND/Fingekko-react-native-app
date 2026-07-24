import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import Confetti from '@/components/streak/Confetti';
import { toIso } from '@/components/streak/utils';
import AppText from '@/components/ui/AppText';
import Icon from '@/components/ui/Icon';
import PressableScale from '@/components/ui/PressableScale';
import { palette, radius, shadows, spacing } from '@/constants/design';
import { useAppEvent } from '@/hooks/use-app-event';

const YAY = require('@/assets/images/yay.webp');

/**
 * Mounted once inside the tab layout, this listens for the two moments worth
 * interrupting for — the day's streak being kept alive, and the whole quest
 * board being cleared — and pops the celebration itself, wherever the user
 * happens to be. Each fires at most once a day (remembered across restarts), so
 * re-opening the app or toggling a quest off and on doesn't re-trigger it.
 */

const SEEN_STREAK_KEY = 'celebration:streak:lastShown';
const SEEN_QUESTS_KEY = 'celebration:quests:lastShown';

const YAY_BG = '#F4F0E9';
const YAY_RATIO = 720 / 1459;

type Pending = { kind: 'streak' } | { kind: 'quests'; earnedXp: number; totalCount: number } | null;

export default function CelebrationHost() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [pending, setPending] = useState<Pending>(null);
  // Guards a second event arriving while the modal is still animating in.
  const showingRef = useRef(false);

  const bgWidth = Math.max(width, height * YAY_RATIO);
  const bgHeight = bgWidth / YAY_RATIO;

  const showOncePerDay = useCallback(async (key: string, next: Exclude<Pending, null>) => {
    if (showingRef.current) return;
    const today = toIso(new Date());
    try {
      const lastShown = await AsyncStorage.getItem(key);
      if (lastShown === today) return;
      await AsyncStorage.setItem(key, today);
    } catch {
      // A storage failure shouldn't cost the user their celebration — the worst
      // case is seeing it twice.
    }
    showingRef.current = true;
    setPending(next);
  }, []);

  useAppEvent('streak:advanced', () => {
    void showOncePerDay(SEEN_STREAK_KEY, { kind: 'streak' });
  });

  useAppEvent('quests:allComplete', ({ earnedXp, totalCount }) => {
    void showOncePerDay(SEEN_QUESTS_KEY, { kind: 'quests', earnedXp, totalCount });
  });

  const dismiss = useCallback(() => {
    showingRef.current = false;
    setPending(null);
  }, []);

  // Reset the in-flight guard if the modal is ever unmounted some other way.
  useEffect(() => {
    if (!pending) showingRef.current = false;
  }, [pending]);

  if (!pending) return null;

  const isStreak = pending.kind === 'streak';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <Animated.View entering={ZoomIn.duration(340)} style={styles.sheet}>
          {/* yay.svg sits behind both celebrations, clipped to the card. */}
          <View pointerEvents="none" style={styles.bg}>
            <Image source={YAY} style={{ width: bgWidth, height: bgHeight }} contentFit="cover" />
            <View style={styles.bgScrim} />
          </View>
          <Confetti />

          <Animated.View entering={FadeIn.duration(300).delay(80)} style={styles.badge}>
            <Icon
              name={isStreak ? 'Flame' : 'Trophy'}
              size={40}
              color={palette.white}
              clickable={false}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(340).delay(140)} style={styles.copy}>
            <AppText variant="h1" align="center">
              {isStreak ? 'Streak kept alive!' : 'Board cleared!'}
            </AppText>
            <AppText variant="body" color="textSecondary" align="center">
              {isStreak
                ? "That's today logged. Come back tomorrow to keep the run going. 🔥"
                : `Every quest done today${
                    pending.kind === 'quests' && pending.earnedXp > 0
                      ? ` — ${pending.earnedXp} XP banked.`
                      : '.'
                  } Tomorrow's board gets a little harder.`}
            </AppText>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(340).delay(220)} style={styles.actions}>
            <PressableScale
              style={styles.primaryBtn}
              onPress={() => {
                dismiss();
                router.push(isStreak ? '/(tabs)/streak-complete' : '/(tabs)/quests');
              }}
            >
              <AppText variant="bodySm" weight="bold" color="onDark">
                {isStreak ? 'See my streak' : 'See the board'}
              </AppText>
              <Icon name="ArrowRight" size={17} color={palette.white} clickable={false} />
            </PressableScale>

            <PressableScale style={styles.secondaryBtn} onPress={dismiss}>
              <AppText variant="bodySm" weight="bold" color="primaryDeep">
                Nice — carry on
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
  sheet: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.xxl,
    backgroundColor: YAY_BG,
    overflow: 'hidden',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
    ...shadows.xl,
  },
  bg: {
    // Absolute children sit inside the parent's padding box, so the sheet's own
    // padding is cancelled out to let the illustration reach the card edges.
    position: 'absolute',
    top: -spacing.xxl,
    bottom: -spacing.xxl,
    left: -spacing.lg,
    right: -spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bgScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(244, 240, 233, 0.66)',
  },
  badge: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.primary,
  },
  copy: { gap: spacing.sm, paddingHorizontal: spacing.sm },
  actions: { alignSelf: 'stretch', gap: spacing.sm },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 52,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryDeep,
    ...shadows.primary,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1.5,
    borderColor: palette.primary,
  },
});
