import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import DateStrip from '@/components/streak/DateStrip';
import EntryRow from '@/components/streak/EntryRow';
import MonthCalendar, { firstTrackedIso } from '@/components/streak/MonthCalendar';
import { useStreakData } from '@/components/streak/useStreakData';
import { dateWindow, longDateLabel, normalizeDate, fromIso, toIso } from '@/components/streak/utils';
import AppText from '@/components/ui/AppText';
import Icon from '@/components/ui/Icon';
import LoadingScreen from '@/components/ui/LoadingScreen';
import PressableScale from '@/components/ui/PressableScale';
import ScreenContainer from '@/components/ui/ScreenContainer';
import { layout, palette, radius, shadows, spacing } from '@/constants/design';

type CalendarView = 'day' | 'month';

export default function StreakCalendarScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ view?: string }>();
  const { transactions, tracked, quality, streak, loading } = useStreakData();

  const todayIso = toIso(new Date());
  const [selected, setSelected] = useState(todayIso);
  // Opening from the home "Calendar" action lands straight on the month grid;
  // the streak flow still opens on the day rail.
  const [view, setView] = useState<CalendarView>(params.view === 'month' ? 'month' : 'day');

  // A rolling 30-day window ending today — enough history to browse without a
  // month grid, matching the reference's horizontal date rail.
  const days = useMemo(() => dateWindow(30, new Date()), []);
  const startIso = useMemo(() => firstTrackedIso(tracked), [tracked]);

  const entries = useMemo(
    () =>
      transactions
        .filter((t) => normalizeDate(t.date) === selected)
        .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)),
    [transactions, selected],
  );

  const selectedDate = fromIso(selected);
  const streakLive = streak > 0 && (tracked.has(todayIso) || tracked.has(toIso(new Date(Date.now() - 864e5))));

  // The month grid stacks a whole year, so it opens on January unless we move
  // it. Jump to the current month the first time it lays out — but only once,
  // or every re-layout (a tap, a year change) would yank the view back.
  const scrollRef = useRef<ScrollView>(null);
  const calendarTop = useRef(0);
  const jumped = useRef(false);

  const jumpToCurrentMonth = useCallback((offsetInCalendar: number) => {
    if (jumped.current) return;
    jumped.current = true;
    const y = Math.max(0, calendarTop.current + offsetInCalendar - spacing.md);
    // Next frame: the blocks below this one are still laying out, and
    // scrollTo before the content is its full height gets clamped.
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y, animated: false }));
  }, []);

  if (loading) return <LoadingScreen label="Loading your streak..." />;

  return (
    <ScreenContainer
      scrollRef={scrollRef}
      contentStyle={{ gap: spacing.lg }}
      header={
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerBtn} accessibilityLabel="Go back">
            <Icon name="ChevronLeft" size={22} color={palette.textPrimary} clickable={false} />
          </Pressable>
          <AppText variant="title" weight="bold">
            {view === 'month' ? 'Calendar' : 'Streak Calendar'}
          </AppText>
          <Pressable
            onPress={() => router.push('/(tabs)/Notifications')}
            hitSlop={10}
            style={styles.headerBtn}
            accessibilityLabel="Notifications"
          >
            <Icon name="Bell" size={20} color={palette.textPrimary} clickable={false} />
          </Pressable>
        </View>
      }
    >
      {/* View switcher — the screen used to offer no way out of the day rail,
          which made "where's the actual calendar?" a fair question. */}
      <View style={styles.segment}>
        {(
          [
            { key: 'day', label: 'Day', icon: 'CalendarDays' },
            { key: 'month', label: 'Month', icon: 'Calendar' },
          ] as const
        ).map((option) => {
          const active = view === option.key;
          return (
            <Pressable
              key={option.key}
              style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              onPress={() => {
                // Coming back to the month grid should land on the current
                // month again, same as opening the screen fresh.
                if (option.key === 'month') jumped.current = false;
                setView(option.key);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Icon
                name={option.icon}
                size={15}
                color={active ? palette.primaryDeep : palette.textTertiary}
                clickable={false}
              />
              <AppText
                variant="bodySm"
                weight="bold"
                style={{ color: active ? palette.primaryDeep : palette.textSecondary }}
              >
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {view === 'day' ? (
        <DateStrip dates={days} value={selected} onSelect={setSelected} marked={tracked} />
      ) : (
        <View onLayout={(e) => (calendarTop.current = e.nativeEvent.layout.y)}>
          <MonthCalendar
            tracked={tracked}
            quality={quality}
            value={selected}
            onSelect={setSelected}
            startIso={startIso}
            onCurrentMonthLayout={jumpToCurrentMonth}
          />
        </View>
      )}

      {/* Live-streak banner → celebration screen */}
      {streakLive && (
        <PressableScale style={styles.streakBanner} onPress={() => router.push('/(tabs)/streak-complete')}>
          <View style={styles.flameWrap}>
            <Icon name="Flame" size={18} color={palette.warning} clickable={false} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="bodySm" weight="bold" color="onDark">
              {streak}-day streak going strong
            </AppText>
            <AppText variant="micro" color="onDarkMuted">
              Tap to see your progress
            </AppText>
          </View>
          <Icon name="ChevronRight" size={18} color={palette.textOnDarkMuted} clickable={false} />
        </PressableScale>
      )}

      <AppText variant="label" color="textSecondary">
        {selected === todayIso ? 'Today' : longDateLabel(selectedDate)}
      </AppText>

      {entries.length > 0 ? (
        <Animated.View entering={FadeIn.duration(240)} style={styles.timeline}>
          {entries.map((t) => (
            // `id` comes from the server; the composite fallback keeps keys
            // stable if the app is talking to a build that predates it.
            <EntryRow key={t.id ?? `${t.date}-${t.createdAt}-${t.amount}`} transaction={t} />
          ))}
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(240)} style={styles.empty}>
          <View style={styles.emptyCircle}>
            <Icon name="X" size={34} color={palette.white} clickable={false} />
          </View>
          <AppText variant="h2" align="center" style={{ marginTop: spacing.lg }}>
            You have no entries for this date.
          </AppText>
          <AppText variant="bodySm" color="textSecondary" align="center" style={{ marginTop: spacing.xs }}>
            Please add a transaction to keep your streak alive.
          </AppText>
          <PressableScale style={styles.emptyBtn} onPress={() => router.push('/(tabs)/add')}>
            <AppText variant="bodySm" weight="bold" color="onDark">
              Add Transaction
            </AppText>
            <Icon name="ArrowRight" size={18} color={palette.white} clickable={false} />
          </PressableScale>
        </Animated.View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingVertical: spacing.sm,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: palette.card,
    borderRadius: radius.pill,
    padding: 5,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.xs,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 40,
    borderRadius: radius.pill,
  },
  segmentBtnActive: {
    backgroundColor: palette.primaryLight,
  },
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.primaryDeep,
    borderRadius: radius.xl,
    padding: spacing.base,
    ...shadows.md,
  },
  flameWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeline: {
    gap: spacing.md,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyCircle: {
    width: 84,
    height: 84,
    borderRadius: radius.pill,
    backgroundColor: palette.danger,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryDeep,
    ...shadows.primary,
  },
});
