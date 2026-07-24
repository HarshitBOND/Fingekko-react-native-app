import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { fromIso, toIso } from '@/components/streak/utils';
import { palette, radius, spacing } from '@/constants/design';
import AppText from './AppText';
import Icon from './Icon';

/** Monday-first, matching the streak calendar elsewhere in the app. */
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;
const CELL = `${100 / 7}%` as const;
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface CalendarPickerProps {
  /** Selected day (YYYY-MM-DD). */
  value: string;
  onSelect: (iso: string) => void;
  /** Inclusive lower bound; days before it are disabled. */
  minIso?: string;
  /** Inclusive upper bound; days after it are disabled. */
  maxIso?: string;
}

/**
 * A proper one-month calendar with month navigation and real bounds (AUDIT
 * item 16). Every day it yields is a genuine calendar date, so the old
 * "valid-format-but-nonsense" dates (2026-13-40) can't happen, and any past or
 * future day inside the bounds is one tap away — not just the last 14 days.
 */
export default function CalendarPicker({ value, onSelect, minIso, maxIso }: CalendarPickerProps) {
  const today = useMemo(() => new Date(), []);
  const todayIso = toIso(today);
  const base = value && ISO_RE.test(value) ? fromIso(value) : today;
  const [view, setView] = useState({ year: base.getFullYear(), month: base.getMonth() });

  const cells = useMemo(() => {
    const firstWeekday = new Date(view.year, view.month, 1).getDay(); // Sun=0
    const leading = (firstWeekday + 6) % 7; // shift so Monday=0
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const out: (number | null)[] = [];
    for (let i = 0; i < leading; i += 1) out.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) out.push(d);
    return out;
  }, [view]);

  const inRange = (iso: string) => (!minIso || iso >= minIso) && (!maxIso || iso <= maxIso);

  // Disable a nav arrow when the adjacent month holds no selectable day.
  const prevMonthLastIso = toIso(new Date(view.year, view.month, 0));
  const nextMonthFirstIso = toIso(new Date(view.year, view.month + 1, 1));
  const canPrev = !minIso || prevMonthLastIso >= minIso;
  const canNext = !maxIso || nextMonthFirstIso <= maxIso;

  const step = (delta: number) => {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  return (
    <View style={{ gap: spacing.md }}>
      {/* Month navigation */}
      <View style={styles.header}>
        <Pressable
          onPress={() => canPrev && step(-1)}
          disabled={!canPrev}
          hitSlop={10}
          accessibilityLabel="Previous month"
          style={[styles.navBtn, !canPrev && styles.navDisabled]}
        >
          <Icon name="ChevronLeft" size={18} color={palette.primaryDeep} clickable={false} />
        </Pressable>
        <AppText variant="bodySm" color="textPrimary" weight="bold">
          {MONTHS[view.month]} {view.year}
        </AppText>
        <Pressable
          onPress={() => canNext && step(1)}
          disabled={!canNext}
          hitSlop={10}
          accessibilityLabel="Next month"
          style={[styles.navBtn, !canNext && styles.navDisabled]}
        >
          <Icon name="ChevronRight" size={18} color={palette.primaryDeep} clickable={false} />
        </Pressable>
      </View>

      {/* Weekday header */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map((w, i) => (
          <View key={i} style={styles.cell}>
            <AppText variant="micro" color="textTertiary">{w}</AppText>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (day === null) return <View key={`pad-${i}`} style={styles.cell} />;
          const iso = toIso(new Date(view.year, view.month, day));
          const selected = iso === value;
          const isToday = iso === todayIso;
          const disabled = !inRange(iso);
          return (
            <View key={iso} style={styles.cell}>
              <Pressable
                onPress={() => !disabled && onSelect(iso)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled }}
                accessibilityLabel={`${MONTHS[view.month]} ${day}, ${view.year}`}
                style={[styles.day, selected && styles.daySelected, disabled && styles.dayDisabled]}
              >
                <AppText
                  variant="bodySm"
                  numeric="serif"
                  style={{
                    color: selected
                      ? palette.white
                      : disabled
                        ? palette.textTertiary
                        : isToday
                          ? palette.primaryDeep
                          : palette.textPrimary,
                  }}
                >
                  {day}
                </AppText>
                {isToday && !selected ? <View style={styles.todayDot} /> : null}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: {
    width: 34, height: 34, borderRadius: radius.pill,
    alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primaryLight,
  },
  navDisabled: { opacity: 0.35 },
  weekRow: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: CELL, alignItems: 'center', justifyContent: 'center', paddingVertical: 3 },
  day: {
    width: 38, height: 38, borderRadius: radius.pill,
    alignItems: 'center', justifyContent: 'center',
  },
  daySelected: { backgroundColor: palette.primary },
  dayDisabled: { opacity: 0.5 },
  todayDot: {
    position: 'absolute', bottom: 5, width: 4, height: 4,
    borderRadius: 2, backgroundColor: palette.primaryDeep,
  },
});
