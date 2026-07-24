import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import AppText from '@/components/ui/AppText';
import Icon from '@/components/ui/Icon';
import { palette, radius, shadows, spacing } from '@/constants/design';
import { addDays, fromIso, toIso, type DayQuality } from './utils';

/** Monday-first, matching the reference calendar. */
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const CELL_PERCENT = `${100 / 7}%` as const;

type DayState = 'done' | 'partial' | 'missed' | 'blank';

export interface MonthCalendarProps {
  /** Every day (YYYY-MM-DD) that carries at least one entry. */
  tracked: Set<string>;
  /** How each tracked day was earned — logged live, or back-filled afterwards. */
  quality?: Map<string, DayQuality>;
  /** Currently selected day (YYYY-MM-DD). */
  value: string;
  onSelect: (iso: string) => void;
  /**
   * The first day worth judging — days before this render blank rather than as
   * a miss, so an account opened last week doesn't show a wall of red crosses.
   */
  startIso?: string;
  /**
   * Fired with the current month block's y offset (relative to this component)
   * once it has laid out, so the screen can scroll straight to it. Only fires
   * while the current year is on show.
   */
  onCurrentMonthLayout?: (y: number) => void;
}

/**
 * A year of months stacked vertically. Each day reads at a glance:
 *
 *   green   — logged on the day itself
 *   yellow  — the day is covered, but only by entries added later (partial)
 *   red     — missed entirely
 *   hollow  — hasn't happened yet, or predates your first entry
 */
export default function MonthCalendar({
  tracked,
  quality,
  value,
  onSelect,
  startIso,
  onCurrentMonthLayout,
}: MonthCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const todayIso = toIso(today);
  const [year, setYear] = useState(() => fromIso(value).getFullYear() || today.getFullYear());

  const months = useMemo(() => {
    return MONTHS.map((name, month) => {
      const firstWeekday = new Date(year, month, 1).getDay(); // Sun=0
      const leading = (firstWeekday + 6) % 7; // shift so Monday=0
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const cells: (number | null)[] = [];
      for (let i = 0; i < leading; i += 1) cells.push(null);
      for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

      return { name, month, cells };
    });
  }, [year]);

  // Only render months that could hold anything: everything up to the current
  // month this year, plus next month as a look-ahead (mirrors the reference).
  const visibleMonths = useMemo(() => {
    if (year < today.getFullYear()) return months;
    if (year > today.getFullYear()) return months;
    return months.filter((m) => m.month <= today.getMonth() + 1);
  }, [months, year, today]);

  const dayState = (iso: string): DayState => {
    if (tracked.has(iso)) return quality?.get(iso) === 'partial' ? 'partial' : 'done';
    if (iso >= todayIso) return 'blank';
    if (startIso && iso < startIso) return 'blank';
    return 'missed';
  };

  return (
    <View style={{ gap: spacing.lg }}>
      {/* Year picker */}
      <View style={styles.yearBar}>
        <Pressable onPress={() => setYear((y) => y - 1)} hitSlop={10} accessibilityLabel="Previous year">
          <Icon name="ChevronLeft" size={18} color={palette.primaryDeep} clickable={false} />
        </Pressable>
        <View style={styles.yearLabel}>
          <Icon name="CalendarDays" size={15} color={palette.textSecondary} clickable={false} />
          <AppText variant="bodySm" numeric="serif" weight="bold">
            {year}
          </AppText>
        </View>
        <Pressable onPress={() => setYear((y) => y + 1)} hitSlop={10} accessibilityLabel="Next year">
          <Icon name="ChevronRight" size={18} color={palette.primaryDeep} clickable={false} />
        </Pressable>
      </View>

      {/* Weekday header — sticky-feeling row shared by every month below */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map((w, i) => (
          <View key={i} style={styles.cell}>
            <AppText variant="micro" color="textTertiary">
              {w}
            </AppText>
          </View>
        ))}
      </View>

      {visibleMonths.map(({ name, month, cells }) => (
        <View
          key={name}
          style={styles.monthBlock}
          onLayout={
            // A year of months is several screens tall, so opening on January
            // buries the month people came to look at.
            month === today.getMonth() && year === today.getFullYear()
              ? (e) => onCurrentMonthLayout?.(e.nativeEvent.layout.y)
              : undefined
          }
        >
          <AppText variant="h2" style={styles.monthTitle}>
            {name}
          </AppText>
          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (day === null) return <View key={`pad-${i}`} style={styles.cell} />;

              const iso = toIso(new Date(year, month, day));
              const state = dayState(iso);
              const isSelected = iso === value;
              const isToday = iso === todayIso;

              return (
                <Pressable
                  key={iso}
                  style={styles.cell}
                  onPress={() => onSelect(iso)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${name} ${day}, ${year} — ${STATE_LABEL[state]}`}
                >
                  <AppText
                    variant="micro"
                    numeric="serif"
                    style={{ color: isToday ? palette.primaryDeep : palette.textSecondary }}
                  >
                    {day}
                  </AppText>
                  <View
                    style={[
                      styles.mark,
                      state === 'done' && styles.markDone,
                      state === 'partial' && styles.markPartial,
                      state === 'missed' && styles.markMissed,
                      state === 'blank' && styles.markBlank,
                      isSelected && styles.markSelected,
                    ]}
                  >
                    {state === 'done' && <Icon name="Check" size={13} color={palette.white} clickable={false} />}
                    {state === 'partial' && <Icon name="Minus" size={13} color={palette.white} clickable={false} />}
                    {state === 'missed' && <Icon name="X" size={13} color={palette.white} clickable={false} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      {/* Legend — the marks mean nothing without it */}
      <View style={styles.legend}>
        {LEGEND.map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, item.style]}>
              {item.icon ? <Icon name={item.icon} size={10} color={palette.white} clickable={false} /> : null}
            </View>
            <AppText variant="micro" color="textSecondary">
              {item.label}
            </AppText>
          </View>
        ))}
      </View>
      <AppText variant="micro" color="textTertiary" align="center" style={styles.legendNote}>
        Partial days are covered by entries you added afterwards.
      </AppText>
    </View>
  );
}

/** The earliest day worth marking as "missed" — the user's first ever entry. */
export function firstTrackedIso(tracked: Set<string>): string | undefined {
  if (tracked.size === 0) return toIso(addDays(new Date(), 0));
  return Array.from(tracked).sort()[0];
}

const styles = StyleSheet.create({
  yearBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    ...shadows.xs,
  },
  yearLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  weekRow: { flexDirection: 'row' },
  monthBlock: { gap: spacing.sm },
  monthTitle: { marginBottom: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: CELL_PERCENT,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 5,
    paddingVertical: spacing.xs,
  },
  mark: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markDone: { backgroundColor: palette.primary },
  markPartial: { backgroundColor: palette.warning },
  markMissed: { backgroundColor: palette.danger },
  markBlank: {
    borderWidth: 1.5,
    borderColor: palette.borderStrong,
    backgroundColor: 'transparent',
  },
  markSelected: {
    borderWidth: 2.5,
    borderColor: palette.primaryDeep,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendNote: { marginTop: -spacing.sm },
});

const STATE_LABEL: Record<DayState, string> = {
  done: 'logged on the day',
  partial: 'added afterwards',
  missed: 'missed',
  blank: 'no entry yet',
};

const LEGEND = [
  { label: 'Logged', icon: 'Check', style: styles.markDone },
  { label: 'Partial', icon: 'Minus', style: styles.markPartial },
  { label: 'Missed', icon: 'X', style: styles.markMissed },
  { label: 'Upcoming', icon: null, style: styles.markBlank },
] as const;
