import { FontSizes } from '@/constants/Colors';
import Icon from '../ui/Icon';
import { Text, View } from 'react-native';
import { Theme } from './constants';
import { styles } from './styles';

type HeaderProps = {
  name: string;
  dateLabel: string;
};

export default function Header({ name, dateLabel }: HeaderProps) {
  return (
    <View style={styles.headerCard}>
      <View style={styles.headerTextWrap}>
        <Text style={styles.headerGreeting}>Good Morning, {name}!</Text>
        <Text style={styles.headerTitle}>Let&apos;s make today</Text>
        <Text style={styles.headerSubtitle}>
          a <Text style={styles.headerAccent}>smart money</Text> day
        </Text>
      </View>
      <View style={styles.datePill}>
        <Icon name="CalendarDays" style={{ marginHorizontal: 2 }} size={12} color={Theme.textMuted} />
        <Text style={{ color: Theme.textMuted, fontSize: FontSizes.xs }}>{dateLabel}</Text>
      </View>
    </View>
  );
}