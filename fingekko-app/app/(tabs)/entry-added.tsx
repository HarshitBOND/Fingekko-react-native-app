import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { formatAmount } from '@/components/streak/utils';
import AppText from '@/components/ui/AppText';
import Icon from '@/components/ui/Icon';
import PressableScale from '@/components/ui/PressableScale';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { palette, radius, shadows, spacing } from '@/constants/design';

// WebP instead of the SVG component: the source is ~400KB / 398 paths.
const CALENDAR_AVATAR = require('@/assets/images/calendarAvatar.webp');

const AVATAR_RATIO = 1122 / 1402;
/** Fill most of the screen width — capped so it doesn't balloon on tablets. */
const AVATAR_MAX_WIDTH = 360;

export default function EntryAddedScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const avatarWidth = Math.min(width - spacing.xl * 2, AVATAR_MAX_WIDTH);
  const avatarHeight = Math.round(avatarWidth * AVATAR_RATIO);
  const params = useLocalSearchParams<{
    type?: string;
    amount?: string;
    category?: string;
    celebrate?: string;
  }>();

  const isIncome = params.type === 'income';
  const amountNum = Number(params.amount);
  const amountLabel = Number.isFinite(amountNum) && amountNum > 0 ? formatAmount(amountNum) : null;
  const hasStreak = params.celebrate === '1';

  return (
    <ScreenContainer scroll={false} padForNav={false} contentStyle={styles.content}>
      <View style={styles.center}>
        <Animated.View
          entering={ZoomIn.duration(460)}
          style={[styles.avatarWrap, { width: avatarWidth, height: avatarHeight }]}
        >
          <Image
            source={CALENDAR_AVATAR}
            style={{ width: avatarWidth, height: avatarHeight }}
            contentFit="contain"
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(120)} style={styles.copy}>
          <AppText variant="h1" align="center">
            {isIncome ? 'Income added!' : 'Expense added!'}
          </AppText>
          <AppText variant="body" color="textSecondary" align="center">
            Nicely tracked — your Home and Insights are already updated. Congratulations! 🎉
          </AppText>
        </Animated.View>

        {(amountLabel || params.category) && (
          <Animated.View entering={FadeInDown.duration(400).delay(220)} style={styles.chipRow}>
            {amountLabel && (
              <View style={styles.chip}>
                <Icon name={isIncome ? 'ArrowDownLeft' : 'ArrowUpRight'} size={14} color={palette.primaryDeep} clickable={false} />
                <AppText variant="caption" weight="bold" color="primaryDeep">
                  {amountLabel}
                </AppText>
              </View>
            )}
            {params.category ? (
              <View style={styles.chip}>
                <AppText variant="caption" weight="bold" color="primaryDeep">
                  {params.category}
                </AppText>
              </View>
            ) : null}
          </Animated.View>
        )}
      </View>

      <View style={styles.actions}>
        {hasStreak && (
          <PressableScale
            style={styles.streakLink}
            onPress={() => router.replace('/(tabs)/streak-complete')}
          >
            <Icon name="Flame" size={16} color={palette.warning} clickable={false} />
            <AppText variant="bodySm" weight="bold" color="primaryDeep">
              View your streak
            </AppText>
          </PressableScale>
        )}

        <PressableScale style={styles.primaryBtn} onPress={() => router.replace('/(tabs)')}>
          <AppText variant="bodySm" weight="bold" color="onDark">
            Great, thanks!
          </AppText>
          <Icon name="Check" size={18} color={palette.white} clickable={false} />
        </PressableScale>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: spacing.xl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  avatarWrap: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    backgroundColor: palette.primaryLight,
  },
  copy: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  actions: {
    gap: spacing.md,
  },
  streakLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: palette.card,
    borderWidth: 1.5,
    borderColor: palette.primary,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 54,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryDeep,
    ...shadows.primary,
  },
});
