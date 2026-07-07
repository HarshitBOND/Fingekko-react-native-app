import type { Transaction } from '@/constants/types';
import { JSX, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { palette, radius, shadows, spacing } from '@/constants/design';
import AppText from '../ui/AppText';
import Icon from '../ui/Icon';
import { MONTH_NAMES, WEEK_DAY_LABELS } from './constants';

type StreakCardProps = {
  visibleDayStreak?: number;
  visibleBestStreak?: number;
  activeTransactions: Transaction[];
};

export default function StreakCard({ visibleDayStreak, visibleBestStreak, activeTransactions }: StreakCardProps) {
  const now = useMemo(() => new Date(), []);
  const [calendarMonth, setCalendarMonth] = useState({ month: now.getMonth(), year: now.getFullYear() });

  // Always derive the calendar/week dots from whichever transactions are
  // active (demo or real) — there is no separate "fake" data path here.
  const completedDays = useMemo(() => {
    const days = new Set<number>();
    activeTransactions.forEach((item) => {
      const date = new Date(item.date);
      if (date.getFullYear() === calendarMonth.year && date.getMonth() === calendarMonth.month) {
        days.add(date.getDate());
      }
    });
    return Array.from(days).sort((a, b) => a - b);
  }, [activeTransactions, calendarMonth.month, calendarMonth.year]);

  const weekChecked = useMemo(() => {
    return WEEK_DAY_LABELS.map((_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - 6 + index);
      return activeTransactions.some((item) => new Date(item.date).toDateString() === date.toDateString());
    });
  }, [activeTransactions, now]);

  const renderCalendarDays = () => {
    const daysInMonth = new Date(calendarMonth.year, calendarMonth.month + 1, 0).getDate();
    const firstDay = new Date(calendarMonth.year, calendarMonth.month, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const cells: JSX.Element[] = [];

    for (let i = 0; i < startOffset; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.calDay} />);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const done = completedDays.includes(d);
      cells.push(
        <View key={d} style={[styles.calDay, done && styles.calDayDone]}>
          <AppText variant="micro" style={{ color: done ? palette.white : palette.textOnDarkMuted }}>
            {d}
          </AppText>
        </View>,
      );
    }
    return cells;
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.flameWrap}>
          <Icon name="Flame" size={18} color={palette.warning} />
        </View>
        <AppText variant="title" color="onDark">
          You&apos;re on a roll!
        </AppText>
      </View>

      <View style={styles.numberRow}>
        <AppText variant="display" color="onDark">
          {visibleDayStreak ?? 0}
        </AppText>
        <AppText variant="h2" color="onDarkMuted" style={styles.daysWord}>
          days
        </AppText>
      </View>
      <AppText variant="caption" color="onDarkMuted">
        On-track streak
      </AppText>

      <View style={styles.weekRow}>
        {WEEK_DAY_LABELS.map((lbl, i) => (
          <View key={i} style={styles.weekCol}>
            <View style={[styles.weekDot, weekChecked[i] && styles.weekDotDone]}>
              {weekChecked[i] ? <Icon name="Check" size={12} color={palette.white} /> : null}
            </View>
            <AppText variant="micro" color="onDarkMuted">
              {lbl}
            </AppText>
          </View>
        ))}
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoChip}>
          <View style={styles.infoIcon}>
            <Icon name="Flame" size={16} color={palette.warning} />
          </View>
          <View>
            <AppText variant="micro" color="onDarkMuted">
              Best streak
            </AppText>
            <AppText variant="label" color="onDark">
              {visibleBestStreak ?? visibleDayStreak ?? 0} days
            </AppText>
          </View>
        </View>
        <View style={styles.infoChip}>
          <View style={styles.infoIcon}>
            <Icon name="Star" size={16} color={palette.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="micro" color="onDark">
              Discipline today.
            </AppText>
            <AppText variant="micro" color="onDark">
              Freedom tomorrow.
            </AppText>
          </View>
        </View>
      </View>

      {/* Streak Calendar */}
      <View style={styles.calendarSection}>
        <View style={styles.calendarHeader}>
          <AppText variant="label" color="onDark">
            Streak Calendar
          </AppText>
          <View style={styles.calNav}>
            <Pressable
              hitSlop={6}
              onPress={() =>
                setCalendarMonth((prev) => ({
                  month: prev.month === 0 ? 11 : prev.month - 1,
                  year: prev.month === 0 ? prev.year - 1 : prev.year,
                }))
              }
            >
              <Icon name="ChevronLeft" size={18} color={palette.textOnDarkMuted} />
            </Pressable>
            <Pressable
              hitSlop={6}
              onPress={() =>
                setCalendarMonth((prev) => ({
                  month: prev.month === 11 ? 0 : prev.month + 1,
                  year: prev.month === 11 ? prev.year + 1 : prev.year,
                }))
              }
            >
              <Icon name="ChevronRight" size={18} color={palette.textOnDarkMuted} />
            </Pressable>
          </View>
        </View>

        <AppText variant="caption" color="onDarkMuted" style={styles.monthLabel}>
          {MONTH_NAMES[calendarMonth.month]} {calendarMonth.year}
        </AppText>

        <View style={styles.calWeekRow}>
          {WEEK_DAY_LABELS.map((d, i) => (
            <AppText key={i} variant="micro" color="onDarkMuted" style={styles.calWeekLbl}>
              {d}
            </AppText>
          ))}
        </View>

        <View style={styles.calGrid}>{renderCalendarDays()}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.primaryDeep,
    borderRadius: radius.xxl,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.md,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flameWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  daysWord: { paddingBottom: 5 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  weekCol: { alignItems: 'center', gap: 6, flex: 1 },
  weekDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  weekDotDone: { backgroundColor: palette.primary, borderColor: palette.primary },
  infoRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  infoChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarSection: {
    marginTop: spacing.xs,
    paddingTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.14)',
  },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calNav: { flexDirection: 'row', gap: spacing.md },
  monthLabel: { marginTop: 6, marginBottom: spacing.md },
  calWeekRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.sm },
  calWeekLbl: { width: 30, textAlign: 'center' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  calDay: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  calDayDone: { backgroundColor: palette.primary },
});
