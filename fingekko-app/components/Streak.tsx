import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame, Check } from 'lucide-react-native';

const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function Streak({ compact = false, days = 12 }) {
  const small = !!compact;

  const size = small ? 34 : 48;
  const circleSize = small ? 28 : 34;
  const numberFont = small ? 36 : 56;
  const labelFont = small ? 14 : 18;

  return (
    <View style={[styles.root, small && styles.rootCompact]}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, small && styles.titleSmall]}>You’re on a roll! 🔥</Text>
          <View style={styles.streakRowCentered}>
            <Text style={[styles.streakNumber, { fontSize: numberFont }]}>{days}</Text>
            <Text style={[styles.daysText, { fontSize: labelFont }]}>Days</Text>
          </View>
          <Text style={[styles.subHeading, small && styles.subHeadingSmall]}>On track streak</Text>
        </View>
        <View style={styles.bestBox}>
          <View style={styles.iconWrap}>
            <Flame size={small ? 18 : 22} color="#ff6b00" />
          </View>
          <View>
            <Text style={styles.bestLabel}>Best</Text>
            <Text style={styles.bestValue}>12d</Text>
          </View>
        </View>
      </View>

      <View style={styles.weekRow}>
        {weekDays.map((d, i) => (
          <View key={i} style={styles.weekItem}>
            <View
              style={[
                styles.dayCircle,
                { width: circleSize, height: circleSize, borderRadius: circleSize / 2 },
                i === 6 ? styles.unfilled : styles.filled,
              ]}
            >
              {i !== 6 && <Check size={small ? 12 : 14} color="#fff" />}
            </View>
            <Text style={[styles.weekLabel, small && styles.weekLabelSmall]}>{d}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  rootCompact: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 6,
  },
  titleSmall: {
    fontSize: 14,
  },
  streakRowCentered: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  streakNumber: {
    color: '#10B981',
    fontWeight: '800',
    lineHeight: 1,
  },
  daysText: {
    color: '#10B981',
    fontWeight: '700',
    marginLeft: 8,
  },
  subHeading: {
    color: '#4b5563',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  subHeadingSmall: {
    fontSize: 12,
  },
  bestBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 8,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF4EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bestLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
  },
  bestValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111',
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  weekItem: {
    alignItems: 'center',
    flex: 1,
  },
  dayCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: {
    backgroundColor: '#16A34A',
  },
  unfilled: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  weekLabel: {
    marginTop: 6,
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '600',
  },
  weekLabelSmall: {
    fontSize: 11,
  },
});