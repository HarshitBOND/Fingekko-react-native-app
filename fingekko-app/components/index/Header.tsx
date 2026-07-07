import { StyleSheet, View } from 'react-native';
import { palette, radius, spacing } from '@/constants/design';
import AppText from '../ui/AppText';
import Icon from '../ui/Icon';

type HeaderProps = {
  name: string;
  dateLabel: string;
};

function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Header({ name, dateLabel }: HeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.textCol}>
        <AppText variant="caption" color="textSecondary">
          {greetingFor()},
        </AppText>
        <AppText variant="h1" numberOfLines={1}>
          {name} 👋
        </AppText>
      </View>
      <View style={styles.datePill}>
        <Icon name="CalendarDays" size={13} color={palette.primaryDeep} />
        <AppText variant="micro" color="primaryDeep">
          {dateLabel}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    marginBottom: spacing.base,
  },
  textCol: { flex: 1, gap: 2 },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: palette.primaryLight,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
  },
});
