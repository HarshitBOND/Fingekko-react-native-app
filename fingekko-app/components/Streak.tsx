import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  
} from 'react-native';

import {
  Flame,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const calendarDays = [
  { day: 13, active: true },
  { day: 14, active: true },
  { day: 15, active: true },
  { day: 16, active: true },
  { day: 17, active: true },
  { day: 18, active: true },
  { day: 19, active: false },
];

export default function StreakScreen({compact = false}) {
  return (
    <View style={styles.container}>
      {/* Top Text */}
      <Text style={styles.heading}>
        You’re on a roll! 🔥
      </Text>

      {/* Main Streak */}
      <View style={styles.streakRow}>
        <Text style={styles.streakNumber}>12</Text>
        <Text style={styles.daysText}>Days</Text>
      </View>

      <Text style={styles.subHeading}>
        On track streak
      </Text>

      {/* Week Progress */}
      <View style={styles.weekWrapper}>
        {weekDays.map((day, index) => (
          <View key={index} style={styles.weekItem}>
            <View
              style={[
                styles.circle,
                index === 6
                  ? styles.unfilledCircle
                  : styles.filledCircle,
              ]}
            >
              {index !== 6 && (
                <Check
                  size={14}
                  color="#fff"
                  strokeWidth={3}
                />
              )}
            </View>

            <Text style={styles.weekText}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Best Streak Card */}
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Flame
            size={22}
            color="#ff6b00"
            fill="#ff6b00"
          />
        </View>

        <View>
          <Text style={styles.cardTitle}>
            Best Streak
          </Text>

          <Text style={styles.cardValue}>
            12 Days
          </Text>
        </View>
      </View>

      {/* Motivation Card */}
      <View style={styles.card}>
        <View style={styles.avatarBox}>
          <Text style={styles.avatar}>🦎</Text>
        </View>

        <View>
          <Text style={styles.cardTitle}>
            Discipline today
          </Text>

          <Text style={styles.cardDesc}>
            Freedom tomorrow.
          </Text>
        </View>
      </View>

      {/* Calendar Header */}
      <View style={styles.calendarHeader}>
        <View>
          <Text style={styles.calendarTitle}>
            Streak Calendar
          </Text>

          <Text style={styles.monthText}>
            May 2024
          </Text>
        </View>

        <View style={styles.arrowRow}>
          <ChevronLeft size={20} color="#444" />
          <ChevronRight size={20} color="#444" />
        </View>
      </View>

      {/* Calendar Week Names */}
      <View style={styles.calendarWeekRow}>
        {weekDays.map((day, index) => (
          <Text
            key={index}
            style={styles.calendarWeekText}
          >
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar Dates */}
      <View style={styles.calendarDatesRow}>
        {calendarDays.map((item, index) => (
          <View
            key={index}
            style={[
              styles.dateCircle,
              item.active && styles.activeDateCircle,
            ]}
          >
            <Text
              style={[
                styles.dateText,
                item.active && styles.activeDateText,
              ]}
            >
              {item.day}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },

  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
  },

  streakRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: 20,
  },

  streakNumber: {
    fontSize: 80,
    fontWeight: '800',
    color: '#10B981',
    lineHeight: 85,
  },

  daysText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 10,
    marginLeft: 6,
  },

  subHeading: {
    textAlign: 'center',
    marginTop: 8,
    color: '#444',
    fontSize: 16,
    fontWeight: '500',
  },

  weekWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 28,
  },

  weekItem: {
    alignItems: 'center',
  },

  circle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filledCircle: {
    backgroundColor: '#16A34A',
  },

  unfilledCircle: {
    borderWidth: 2,
    borderColor: '#BDBDBD',
    backgroundColor: '#fff',
  },

  weekText: {
    marginTop: 8,
    color: '#777',
    fontSize: 13,
    fontWeight: '500',
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginTop: 18,
    padding: 16,
    borderRadius: 20,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,

    elevation: 3,
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFF4EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EEFBEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  avatar: {
    fontSize: 28,
  },

  cardTitle: {
    fontSize: 15,
    color: '#555',
    fontWeight: '500',
  },

  cardValue: {
    marginTop: 2,
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
  },

  cardDesc: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },

  calendarHeader: {
    marginTop: 34,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  calendarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },

  monthText: {
    marginTop: 6,
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },

  arrowRow: {
    flexDirection: 'row',
    gap: 12,
  },

  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
    paddingHorizontal: 4,
  },

  calendarWeekText: {
    width: 36,
    textAlign: 'center',
    color: '#666',
    fontWeight: '600',
  },

  calendarDatesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },

  dateCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },

  activeDateCircle: {
    backgroundColor: '#16A34A',
  },

  dateText: {
    color: '#444',
    fontWeight: '600',
  },

  activeDateText: {
    color: '#fff',
  },
});