import type { Transaction } from '@/constants/types';
import { Check, ChevronLeft, ChevronRight, Flame, Star } from 'lucide-react-native';
import { JSX, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MONTH_NAMES, Theme, WEEK_DAY_LABELS } from './constants';
import { styles } from './styles';

type StreakCardProps = {
  visibleDayStreak?: number;
  activeTransactions: Transaction[];
  useDummyData: boolean;
};

export default function StreakCard({ visibleDayStreak, activeTransactions, useDummyData }: StreakCardProps) {
  const now = useMemo(() => new Date(), []);
  const [calendarMonth, setCalendarMonth] = useState({ month: now.getMonth(), year: now.getFullYear() });

  // Which days in the selected calendar month have a transaction
  const completedDays = useMemo(() => {
    if (!useDummyData) return [13, 14, 15, 16, 17, 18];
    const days = new Set<number>();
    activeTransactions.forEach((item) => {
      const date = new Date(item.date);
      if (date.getFullYear() === calendarMonth.year && date.getMonth() === calendarMonth.month) {
        days.add(date.getDate());
      }
    });
    return Array.from(days).sort((a, b) => a - b);
  }, [activeTransactions, calendarMonth.month, calendarMonth.year, useDummyData]);

  // Which of the last 7 days (Mon–Sun) have a transaction
  const weekChecked = useMemo(() => {
    if (!useDummyData) return [true, true, true, true, true, false, false];
    return WEEK_DAY_LABELS.map((_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - 6 + index);
      return activeTransactions.some(
        (item) => new Date(item.date).toDateString() === date.toDateString(),
      );
    });
  }, [activeTransactions, now, useDummyData]);

  // Calendar grid cells
  const renderCalendarDays = () => {
    const daysInMonth = new Date(calendarMonth.year, calendarMonth.month + 1, 0).getDate();
    const firstDay    = new Date(calendarMonth.year, calendarMonth.month, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const cells: JSX.Element[] = [];

    for (let i = 0; i < startOffset; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.calDay} />);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const done = completedDays.includes(d);
      cells.push(
        <View key={d} style={[styles.calDay, done && styles.calDayDone]}>
          <Text style={[styles.calDayText, done && styles.calDayTextDone]}>{d}</Text>
        </View>,
      );
    }
    return cells;
  };

  return (
    <View style={styles.streakCard}>

      {/* header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Flame size={20} color={Theme.primaryDark} />
        <Text style={styles.streakHeaderText}>You&apos;re on a roll!</Text>
      </View>

      {/* big number */}
      <View style={styles.streakRow}>
        <Text style={styles.streakNumber}>{visibleDayStreak ?? 12}</Text>
        <Text style={styles.daysText}>Days</Text>
      </View>
      <Text style={styles.onTrackLabel}>On track streak</Text>

      {/* week dot row */}
      <View style={styles.weekDotsRow}>
        {WEEK_DAY_LABELS.map((lbl, i) => (
          <View key={i} style={styles.weekDotCol}>
            <View style={[styles.weekDot, weekChecked[i] && styles.weekDotDone]}>
              {weekChecked[i] ? <Check size={11} color="#fff" strokeWidth={3} /> : null}
            </View>
            <Text style={styles.weekDayLbl}>{lbl}</Text>
          </View>
        ))}
      </View>

      {/* best streak row */}
      <View style={styles.bestStreakRow}>
        <View style={styles.bestStreakIconWrap}>
          {/* TODO: replace with <Image source={require('../../assets/images/bestStreakIcon.png')} style={{width:36,height:36,borderRadius:12}}/> */}
          <Flame size={18} color={Theme.primaryDark} />
        </View>
        <View>
          <Text style={styles.bestStreakTitle}>Best Streak</Text>
          <Text style={styles.bestStreakVal}>{visibleDayStreak ?? 12} Days</Text>
        </View>
      </View>

      {/* gecko motivation row */}
      <View style={styles.geckoMotivRow}>
        <View style={styles.geckoAvatarWrap}>
          {/* TODO: replace with <Image source={require('../../assets/images/geckoStreakAvatar.png')} style={{width:36,height:36,borderRadius:12}}/> */}
          <Star size={18} color={Theme.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.geckoMotivLine}>Discipline today.</Text>
          <Text style={styles.geckoMotivLine}>Freedom tomorrow.</Text>
        </View>
      </View>

      {/* ── Streak Calendar ──────────────────────────────────────────────── */}
      <View style={styles.calendarSection}>
        <View style={styles.calendarHeader}>
          <Text style={styles.calendarTitle}>Streak Calendar</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => setCalendarMonth((prev) => ({
                month: prev.month === 0 ? 11 : prev.month - 1,
                year:  prev.month === 0 ? prev.year - 1 : prev.year,
              }))}
            >
              <ChevronLeft size={18} color={Theme.whiteSoft} />
            </Pressable>
            <Pressable
              onPress={() => setCalendarMonth((prev) => ({
                month: prev.month === 11 ? 0 : prev.month + 1,
                year:  prev.month === 11 ? prev.year + 1 : prev.year,
              }))}
            >
              <ChevronRight size={18} color={Theme.whiteSoft} />
            </Pressable>
          </View>
        </View>

        <Text style={styles.calendarMonthLabel}>
          {MONTH_NAMES[calendarMonth.month]} {calendarMonth.year}
        </Text>

        {/* day-of-week headers */}
        <View style={styles.calWeekRow}>
          {WEEK_DAY_LABELS.map((d, i) => (
            <Text key={i} style={styles.calWeekLbl}>{d}</Text>
          ))}
        </View>

        {/* calendar grid */}
        <View style={styles.calGrid}>
          {renderCalendarDays()}
        </View>
      </View>
    </View>
  );
}
