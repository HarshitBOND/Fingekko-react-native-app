import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { palette, radius, spacing } from '@/constants/design';
import AppText from '../ui/AppText';
import { fromIso, toIso } from './utils';

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const ITEM_WIDTH = 46;
const ITEM_GAP = spacing.sm;

export interface DateStripProps {
  /** Days to show, oldest first, as YYYY-MM-DD. */
  dates: string[];
  /** Currently selected day (YYYY-MM-DD). */
  value: string;
  onSelect: (iso: string) => void;
  /** Days that carry at least one entry — shown with a dot. */
  marked?: Set<string>;
}

/**
 * A horizontal week-style date rail: weekday initial over a numbered pill, the
 * selected day filled with brand green. Mirrors the "My Journals" reference
 * strip and doubles as the compact date picker on the Add screen.
 */
export default function DateStrip({ dates, value, onSelect, marked }: DateStripProps) {
  const scrollRef = useRef<ScrollView>(null);
  const todayIso = toIso(new Date());

  // Center the selected day when it changes (and on first paint).
  useEffect(() => {
    const index = dates.indexOf(value);
    if (index < 0) return;
    const x = Math.max(0, index * (ITEM_WIDTH + ITEM_GAP) - ITEM_WIDTH * 2);
    const id = setTimeout(() => scrollRef.current?.scrollTo({ x, animated: true }), 60);
    return () => clearTimeout(id);
  }, [value, dates]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {dates.map((iso) => {
        const d = fromIso(iso);
        const selected = iso === value;
        const isToday = iso === todayIso;
        const hasEntry = marked?.has(iso);
        return (
          <Pressable
            key={iso}
            onPress={() => onSelect(iso)}
            style={styles.item}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={d.toDateString()}
          >
            <AppText
              variant="micro"
              style={{ color: selected ? palette.primaryDeep : palette.textTertiary }}
            >
              {WEEKDAY_INITIALS[d.getDay()]}
            </AppText>
            <View
              style={[
                styles.pill,
                isToday && !selected && styles.pillToday,
                selected && styles.pillSelected,
              ]}
            >
              <AppText
                variant="bodySm"
                numeric="serif"
                weight={selected ? 'bold' : 'semibold'}
                style={{
                  color: selected
                    ? palette.white
                    : isToday
                      ? palette.primaryDeep
                      : palette.textPrimary,
                }}
              >
                {d.getDate()}
              </AppText>
            </View>
            <View style={[styles.dot, hasEntry && !selected && styles.dotActive]} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: ITEM_GAP,
    paddingVertical: spacing.xs,
    paddingHorizontal: 2,
  },
  item: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    gap: 6,
  },
  pill: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: palette.border,
  },
  pillToday: {
    borderColor: palette.primary,
    backgroundColor: palette.primaryLight,
  },
  pillSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
  },
  dotActive: {
    backgroundColor: palette.primary,
  },
});
