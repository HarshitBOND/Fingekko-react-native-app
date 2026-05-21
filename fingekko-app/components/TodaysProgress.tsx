
import { Colors, FontSizes } from '@/constants/Colors';
import { BarChart3, Flame, Target, Zap } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import Divider from './Divider';

const progressItems = [
  {
    icon: Flame,
    value: '12',
    label: 'Day Streak',
    color: '#16a34a',
  },
  {
    icon: Zap,
    value: '320',
    label: 'Total XP',
    color: '#f59e0b',
  },
  {
    icon: Target,
    value: '3 / 4',
    label: 'Quests Done',
    color: '#10b981',
  },
  {
    icon: BarChart3,
    value: '78%',
    label: 'Better than\nyesterday',
    color: '#8b5cf6',
  },
];

export default function TodaysProgress() {
  const rowItems = progressItems.flatMap((item, index) => {
    const Icon = item.icon;
    const content = (
      <View key={item.label} style={styles.item}>
        <View style={styles.valueRow}>
          <Icon size={16} color={item.color} />
          <Text style={styles.value}>{item.value}</Text>
        </View>
        <Text style={styles.label}>{item.label}</Text>
      </View>
    );

    if (index === progressItems.length - 1) {
      return [content];
    }

    return [
      content,
      <Divider
        key={`${item.label}-divider`}
        orientation="vertical"
        thickness={1}
        color="#e5e7eb"
        inset={6}
        length="100%"
        style={styles.itemDivider}
      />,
    ];
  });

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Today's Progress</Text>
      <View style={styles.itemsRow}>{rowItems}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  title: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: '#323947',
    letterSpacing: .5,
    textTransform: 'uppercase',
  },
  itemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 5,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  value: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  label: {
    fontSize: FontSizes.xs,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 14,
  },
  itemDivider: {
    alignSelf: 'stretch',
  },
});