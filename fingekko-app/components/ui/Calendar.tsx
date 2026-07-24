import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { palette, radius, spacing } from '../../constants/design';
import AppText from './AppText';
import Icon from './Icon';

/** Monday-first weekday initials, matching the reference calendar. */
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const CELL_PERCENT = `${100 / 7}%`;

const pad = (n: number) => String(n).padStart(2, '0');
/** Local-time ISO (YYYY-MM-DD) — `month` is 0-based. Avoids the UTC shift of Date.toISOString(). */
const toIso = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;

const parseIso = (iso: string): { year: number; month: number; day: number } | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  return { year, month, day };
};

export interface CalendarProps {
  /** Selected date as YYYY-MM-DD. */
  value: string;
  /** Fired with the tapped date as YYYY-MM-DD. */
  onChange: (iso: string) => void;
}

/**
 * A calm month-grid date picker: a labelled month header with prev/next
 * navigation, a Monday-first weekday row, and circular day cells. The selected
 * day fills with brand green; today wears a soft tinted ring.
 */
function Calendar({ value, onChange }: CalendarProps) {
  const selected = parseIso(value);

  const now = new Date();
  const todayKey = toIso(now.getFullYear(), now.getMonth(), now.getDate());

  // Which month the grid is showing — starts on the selected date's month (or today).
  const [view, setView] = useState(() =>
    selected
      ? { year: selected.year, month: selected.month }
      : { year: now.getFullYear(), month: now.getMonth() },
  );

  // Keep the grid in sync when the value jumps to another month (e.g. a "Today"
  // shortcut outside this component). Selecting a day in the visible month never
  // changes the month, so this won't fight the user's own navigation.
  useEffect(() => {
    if (selected && (selected.year !== view.year || selected.month !== view.month)) {
      setView({ year: selected.year, month: selected.month });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const cells = useMemo(() => {
    const firstWeekday = new Date(view.year, view.month, 1).getDay(); // Sun=0..Sat=6
    const leading = (firstWeekday + 6) % 7; // shift so Monday=0
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

    const out: (number | null)[] = [];
    for (let i = 0; i < leading; i += 1) out.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) out.push(d);
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [view]);

  const goPrev = () =>
    setView((v) => (v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 }));
  const goNext = () =>
    setView((v) => (v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 }));

  return (
    <View>
      <View style={styles.header}>
        <Pressable
          onPress={goPrev}
          hitSlop={10}
          style={styles.navBtn}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <Icon name="ChevronLeft" size={18} color={palette.primaryDeep} clickable={false} />
        </Pressable>
        <AppText variant="title" weight="bold" color="textPrimary">
          {MONTHS[view.month]}{' '}
          <AppText variant="title" numeric weight="bold" color="textPrimary">
            {view.year}
          </AppText>
        </AppText>
        <Pressable
          onPress={goNext}
          hitSlop={10}
          style={styles.navBtn}
          accessibilityRole="button"
          accessibilityLabel="Next month"
        >
          <Icon name="ChevronRight" size={18} color={palette.primaryDeep} clickable={false} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((w, i) => (
          <View key={i} style={styles.cell}>
            <AppText variant="micro" color="textTertiary" align="center">
              {w}
            </AppText>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (day === null) return <View key={i} style={styles.cell} />;

          const iso = toIso(view.year, view.month, day);
          const isSelected = iso === value;
          const isToday = iso === todayKey;

          return (
            <Pressable
              key={i}
              style={styles.cell}
              onPress={() => onChange(iso)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${MONTHS[view.month]} ${day}, ${view.year}`}
            >
              <View
                style={[
                  styles.dayCircle,
                  isToday && !isSelected && styles.dayToday,
                  isSelected && styles.daySelected,
                ]}
              >
                <AppText
                  variant="bodySm"
                  numeric
                  weight={isSelected ? 'bold' : 'semibold'}
                  style={{
                    color: isSelected
                      ? palette.white
                      : isToday
                        ? palette.primaryDeep
                        : palette.textPrimary,
                  }}
                >
                  {day}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default React.memo(Calendar);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.md,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: CELL_PERCENT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: {
    backgroundColor: palette.primaryLight,
  },
  daySelected: {
    backgroundColor: palette.primary,
  },
});
